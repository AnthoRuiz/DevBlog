"""RSS feeds (whole site and per section) and social preview pages for posts.

Nginx serves these at /feed.xml, /<section>/feed.xml and, for social bots only, /posts/<slug>.
"""
import html
from email.utils import format_datetime
from xml.etree.ElementTree import Element, SubElement, register_namespace, tostring

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.post import Post, PostStatus, Section

router = APIRouter(tags=["Feeds"])

FEED_SIZE = 20
ATOM_NS = "http://www.w3.org/2005/Atom"
MEDIA_NS = "http://search.yahoo.com/mrss/"
register_namespace("atom", ATOM_NS)
register_namespace("media", MEDIA_NS)


def _site_url() -> str:
    return settings.SITE_URL.rstrip("/")


def _absolute(url: str | None) -> str | None:
    """Covers are usually /uploads/... paths; feeds and previews need absolute URLs."""
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        return url
    return f"{_site_url()}/{url.lstrip('/')}"


def _post_url(post: Post) -> str:
    return f"{_site_url()}/posts/{post.slug}"


async def _latest_published(db: AsyncSession, section_id=None) -> list[Post]:
    query = select(Post).where(Post.status == PostStatus.PUBLISHED).options(selectinload(Post.tags))
    if section_id is not None:
        query = query.where(Post.section_id == section_id)
    query = query.order_by(desc(Post.published_at), desc(Post.created_at)).limit(FEED_SIZE)
    return list((await db.execute(query)).scalars().all())


def _rss(title: str, link: str, description: str, self_url: str, posts: list[Post]) -> Response:
    rss = Element("rss", {"version": "2.0"})
    channel = SubElement(rss, "channel")
    SubElement(channel, "title").text = title
    SubElement(channel, "link").text = link
    SubElement(channel, "description").text = description
    SubElement(channel, f"{{{ATOM_NS}}}link", {"href": self_url, "rel": "self", "type": "application/rss+xml"})
    if posts:
        newest = posts[0].published_at or posts[0].created_at
        SubElement(channel, "lastBuildDate").text = format_datetime(newest)
    for post in posts:
        item = SubElement(channel, "item")
        SubElement(item, "title").text = post.title
        SubElement(item, "link").text = _post_url(post)
        SubElement(item, "guid", {"isPermaLink": "true"}).text = _post_url(post)
        SubElement(item, "pubDate").text = format_datetime(post.published_at or post.created_at)
        SubElement(item, "description").text = post.summary
        if post.section:
            SubElement(item, "category").text = post.section.name
        for tag in post.tags:
            SubElement(item, "category").text = tag.name
        cover = _absolute(post.cover_image_url)
        if cover:
            SubElement(item, f"{{{MEDIA_NS}}}content", {"url": cover, "medium": "image"})
    body = b'<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(rss, encoding="utf-8")
    return Response(
        content=body,
        media_type="application/rss+xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=600"},
    )


@router.get("/feed.xml", include_in_schema=True)
async def site_feed(db: AsyncSession = Depends(get_db)):
    """RSS 2.0 feed of the latest 20 published posts (summary and link)."""
    return _rss(
        title=settings.SITE_NAME,
        link=_site_url(),
        description=settings.SITE_TAGLINE,
        self_url=f"{_site_url()}/feed.xml",
        posts=await _latest_published(db),
    )


@router.get("/sections/{slug}/feed.xml")
async def section_feed(slug: str, db: AsyncSession = Depends(get_db)):
    """RSS 2.0 feed of the latest 20 published posts of one section."""
    section = (await db.execute(select(Section).where(Section.slug == slug))).scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return _rss(
        title=f"{section.name} — {settings.SITE_NAME}",
        link=f"{_site_url()}/{section.slug}",
        description=section.description or settings.SITE_TAGLINE,
        self_url=f"{_site_url()}/{section.slug}/feed.xml",
        posts=await _latest_published(db, section.id),
    )


@router.get("/share/posts/{slug}", include_in_schema=False)
async def post_social_preview(slug: str, db: AsyncSession = Depends(get_db)):
    """Minimal HTML with OpenGraph/Twitter tags, served by Nginx to social bots (LinkedIn, Slack, X...)."""
    post = (
        await db.execute(select(Post).where(Post.slug == slug, Post.status == PostStatus.PUBLISHED))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    e = lambda value: html.escape(value or "", quote=True)  # noqa: E731
    url = _post_url(post)
    cover = _absolute(post.cover_image_url)
    image_tags = (
        f'<meta property="og:image" content="{e(cover)}">\n<meta name="twitter:image" content="{e(cover)}">\n'
        if cover
        else ""
    )
    page = f"""<!doctype html>
<html lang="{e(post.language)}">
<head>
<meta charset="utf-8">
<title>{e(post.title)} — {e(settings.SITE_NAME)}</title>
<meta name="description" content="{e(post.summary)}">
<link rel="canonical" href="{e(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{e(settings.SITE_NAME)}">
<meta property="og:title" content="{e(post.title)}">
<meta property="og:description" content="{e(post.summary)}">
<meta property="og:url" content="{e(url)}">
{image_tags}<meta name="twitter:card" content="{'summary_large_image' if cover else 'summary'}">
<meta name="twitter:title" content="{e(post.title)}">
<meta name="twitter:description" content="{e(post.summary)}">
</head>
<body>
<h1>{e(post.title)}</h1>
<p>{e(post.summary)}</p>
<p><a href="{e(url)}">{e(url)}</a></p>
</body>
</html>
"""
    return Response(content=page, media_type="text/html; charset=utf-8", headers={"Cache-Control": "public, max-age=600"})
