from fastapi import APIRouter, Depends, HTTPException, status
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

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Comprobar si el email ya existe
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con este correo electrónico"
        )
    
    # Comprobar si es el primer usuario de la base de datos (para hacerlo ADMIN automáticamente)
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
async def login(login_in: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_in.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales incorrectas o cuenta registrada exclusivamente mediante OAuth"
        )
    
    if not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciales incorrectas"
        )
    
    token = create_access_token(subject=str(user.id))
    return Token(access_token=token, token_type="bearer", user=UserRead.model_validate(user))

@router.post("/oauth/google", response_model=Token)
async def oauth_google(oauth_in: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """Verifica el token de Google y vincula/crea la cuenta del usuario."""
    # Verificar token con la API oficial de Google
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": oauth_in.id_token}
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de Google inválido o expirado"
            )
        google_data = resp.json()

    google_sub = google_data.get("sub") # ID único de Google
    email = google_data.get("email")
    full_name = google_data.get("name", "Google User")
    picture = google_data.get("picture")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Datos incompletos de Google")

    # 1. Buscar si ya existe la cuenta OAuth registrada
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
        # 2. Si no existe por OAuth, buscar si ya existe un User con ese email
        user_res = await db.execute(select(User).where(User.email == email))
        user = user_res.scalar_one_or_none()

        if not user:
            # Comprobar si es el primer usuario para darle ADMIN
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

        # Vincular cuenta OAuth
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
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.id == current_admin.id and role_in.role != UserRole.ADMIN:
        admin_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.ADMIN))
        if (admin_count.scalar() or 0) <= 1:
            raise HTTPException(
                status_code=400,
                detail="No puedes removerte a ti mismo de administrador si eres el único en el sistema"
            )

    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)
