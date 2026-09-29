from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from pydantic import BaseModel
import httpx

from app.db.session import get_db
from app.models.user import User, UserRole, OAuthAccount
from app.schemas.user import UserCreate, UserRead, Token, LoginRequest, OAuthLoginRequest
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user, get_current_admin
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Reject duplicate emails
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    # The very first user in the database automatically becomes ADMIN
    users_count = await db.execute(select(func.count(User.id)))
    is_first_user = (users_count.scalar() or 0) == 0
    role = UserRole.ADMIN if is_first_user else UserRole.READER

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        avatar_url=user_in.avatar_url,
        role=role,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(subject=str(new_user.id))
    return Token(access_token=token, token_type="bearer", user=UserRead.model_validate(new_user))

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, login_in: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_in.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials or account registered via OAuth only"
        )
    
    if not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials"
        )
    
    token = create_access_token(subject=str(user.id))
    return Token(access_token=token, token_type="bearer", user=UserRead.model_validate(user))

@router.post("/oauth/google", response_model=Token)
@limiter.limit("10/minute")
async def oauth_google(request: Request, oauth_in: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify the Google ID token and link or create the user account."""
    # Without a client ID we cannot check which app the token was issued for
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured"
        )

    # Verify the token with Google's official API
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": oauth_in.id_token}
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired Google token"
            )
        google_data = resp.json()

    # tokeninfo only checks signature and expiry: the token must also be issued for this app
    # (otherwise a token minted for any other app would work here) and carry a verified email,
    # because accounts are linked by email (ADMIN accounts included)
    if (
        google_data.get("aud") != settings.GOOGLE_CLIENT_ID
        or google_data.get("iss") not in ("accounts.google.com", "https://accounts.google.com")
        or str(google_data.get("email_verified", "")).lower() != "true"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token not valid for this application or email not verified"
        )

    google_sub = google_data.get("sub") # Stable Google account ID
    email = google_data.get("email")
    full_name = google_data.get("name", "Google User")
    picture = google_data.get("picture")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Incomplete data from Google")

    # 1. Look up an existing linked OAuth account
    oauth_res = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == google_sub
        )
    )
    oauth_acc = oauth_res.scalar_one_or_none()

    if oauth_acc:
        user_res = await db.execute(select(User).where(User.id == oauth_acc.user_id))
        user = user_res.scalar_one()
    else:
        # 2. No OAuth link yet: look for an existing user with that email
        user_res = await db.execute(select(User).where(User.email == email))
        user = user_res.scalar_one_or_none()

        if not user:
            # The very first user becomes ADMIN
            users_count = await db.execute(select(func.count(User.id)))
            role = UserRole.ADMIN if (users_count.scalar() or 0) == 0 else UserRole.READER

            user = User(
                email=email,
                hashed_password=None,
                full_name=full_name,
                avatar_url=picture,
                role=role,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            await db.flush()

        # Link the OAuth account
        new_oauth = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=google_sub,
            email_at_provider=email
        )
        db.add(new_oauth)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token, token_type="bearer", user=UserRead.model_validate(user))

@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)

class UserRoleUpdate(BaseModel):
    role: UserRole

@router.put("/me/role", response_model=UserRead)
async def update_my_role_for_testing(
    role_in: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Role switcher for quickly testing permissions locally:
    lets the authenticated user switch between ADMIN, AUTHOR and READER.
    Disabled unless ALLOW_ROLE_SELF_SWITCH=True (local test environments only).
    """
    if not settings.ALLOW_ROLE_SELF_SWITCH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Changing your own role is disabled. An ADMIN must assign roles."
        )
    current_user.role = role_in.role
    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)

@router.get("/users", response_model=list[UserRead])
async def list_users(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).order_by(User.created_at))
    return [UserRead.model_validate(u) for u in result.scalars().all()]

@router.put("/users/{user_id}/role", response_model=UserRead)
async def update_user_role(
    user_id: uuid.UUID,
    role_in: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id and role_in.role != UserRole.ADMIN:
        admin_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.ADMIN))
        if (admin_count.scalar() or 0) <= 1:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own ADMIN role while you are the only admin"
            )

    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)
