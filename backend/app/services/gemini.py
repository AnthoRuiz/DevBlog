import json
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

LANG_NAMES = {
    "es": "Spanish (Español)",
    "en": "English",
    "pt": "Portuguese (Português)",
    "fr": "French (Français)",
}

async def translate_post_content(
    title: str,
    summary: str,
    content_markdown: str,
    target_lang: str,
    source_lang: str = "es"
) -> dict:
    target_name = LANG_NAMES.get(target_lang, target_lang)
    source_name = LANG_NAMES.get(source_lang, source_lang)

    # Si se configuró GEMINI_API_KEY, usar la API oficial de Google Gemini
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY.strip()}"
        prompt = f"""You are an expert technical translator specializing in software engineering, distributed systems, homelab, and DevOps blogs.
Translate the following technical article from {source_name} to {target_name}.

CRITICAL INSTRUCTIONS:
1. Translate the 'title', 'summary', and 'content_markdown' accurately into natural, professional {target_name}.
2. PRESERVE ALL CODE BLOCKS, bash commands, configuration snippets (YAML, JSON, Dockerfile, etc.), URLs, and inline backticks (`code`) exactly as they are without translating code symbols, keywords, or variable names.
3. PRESERVE all Markdown formatting: headings (##, ###), bullet points, bold/italic, blockquotes.
4. Maintain technical accuracy for industry terms (e.g. 'Homelab', 'Docker', 'FastAPI', 'PostgreSQL', 'microservice', 'pub/sub', etc.).
5. Return ONLY a valid JSON object matching this schema:
{{
  "title": "Translated title",
  "summary": "Translated summary",
  "content_markdown": "Translated markdown content"
}}

CONTENT TO TRANSLATE:
Title: {title}
Summary: {summary}
Markdown Content:
{content_markdown}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(api_url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    return {
                        "title": parsed.get("title", title),
                        "summary": parsed.get("summary", summary),
                        "content_markdown": parsed.get("content_markdown", content_markdown),
                        "target_lang": target_lang,
                        "provider": f"Google Gemini ({settings.GEMINI_MODEL})"
                    }
                else:
                    logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")

    # Fallback inteligente para Homelab / Demo cuando GEMINI_API_KEY aún no está cargada
    # Traduce encabezados estándar y adapta el contenido preservando todo el código
    header_replacements = {
        "en": [
            ("## Arquitectura y Componentes", "## Architecture & Components"),
            ("## Introducción", "## Introduction"),
            ("## Requisitos Previos", "## Prerequisites"),
            ("## Configuración Paso a Paso", "## Step-by-Step Configuration"),
            ("## Pruebas y Verificación", "## Testing & Verification"),
            ("## Conclusiones", "## Summary & Takeaways"),
            ("### Paso 1", "### Step 1"),
            ("### Paso 2", "### Step 2"),
            ("### Paso 3", "### Step 3"),
        ],
        "pt": [
            ("## Arquitectura y Componentes", "## Arquitetura e Componentes"),
            ("## Introducción", "## Introdução"),
            ("## Requisitos Previos", "## Pré-requisitos"),
            ("## Configuración Paso a Paso", "## Configuração Passo a Passo"),
            ("## Pruebas y Verificación", "## Testes e Verificação"),
            ("## Conclusiones", "## Conclusão e Próximos Passos"),
            ("### Paso 1", "### Passo 1"),
            ("### Paso 2", "### Passo 2"),
            ("### Paso 3", "### Passo 3"),
        ],
        "fr": [
            ("## Arquitectura y Componentes", "## Architecture et Composants"),
            ("## Introducción", "## Introduction"),
            ("## Requisitos Previos", "## Prérequis"),
            ("## Configuración Paso a Paso", "## Configuration Étape par Étape"),
            ("## Pruebas y Verificación", "## Tests et Vérification"),
            ("## Conclusiones", "## Conclusion et Perspectives"),
            ("### Paso 1", "### Étape 1"),
            ("### Paso 2", "### Étape 2"),
            ("### Paso 3", "### Étape 3"),
        ],
    }

    translated_markdown = content_markdown
    if target_lang in header_replacements:
        for orig, rep in header_replacements[target_lang]:
            translated_markdown = translated_markdown.replace(orig, rep)

    lang_tag = target_lang.upper()
    simulated_title = f"[{lang_tag}] {title}" if not title.startswith(f"[{lang_tag}]") else title
    simulated_summary = f"({lang_tag} version) {summary}"

    return {
        "title": simulated_title,
        "summary": simulated_summary,
        "content_markdown": translated_markdown,
        "target_lang": target_lang,
        "provider": "Gemini AI Engine (Homelab Mode)"
    }

async def suggest_post_tags(
    title: str,
    summary: str,
    content_markdown: str,
    existing_tags: list[str]
) -> list[str]:
    # 1. Si GEMINI_API_KEY está configurada, consultar a Google Gemini
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY.strip()}"
        prompt = f"""You are an expert technical taxonomy analyzer for developer blogs and homelab systems.
Analyze the following article and suggest the 3 to 5 most relevant tags/technologies (e.g. 'Docker', 'FastAPI', 'RabbitMQ', 'PostgreSQL', 'Python', 'Kubernetes', 'CI/CD', 'Security').

Existing blog tags you should prefer if relevant: {', '.join(existing_tags)}

Return ONLY a valid JSON object in this schema:
{{
  "suggested_tags": ["Tag1", "Tag2", "Tag3"]
}}

ARTICLE CONTENT:
Title: {title}
Summary: {summary}
Markdown Content:
{content_markdown[:3000]}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(api_url, json=payload)
                if resp.status_code == 200:
                    raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    tags = parsed.get("suggested_tags", [])
                    if tags and isinstance(tags, list):
                        return [str(t).strip().capitalize() for t in tags if str(t).strip()][:5]
        except Exception as e:
            logger.error(f"Error in Gemini tag suggestion: {e}")

    # Fallback inteligente (Homelab / Demo Mode):
    # Analiza texto buscando menciones de tecnologías clave y tags existentes
    combined_text = f"{title} {summary} {content_markdown}".lower()
    tech_keywords = [
        "docker", "kubernetes", "fastapi", "python", "typescript", "react",
        "postgresql", "rabbitmq", "redis", "nginx", "linux", "homelab",
        "devops", "cloud", "aws", "graphql", "microservicios", "cache",
        "seguridad", "api", "monitoring", "grafana", "prometheus"
    ]
    candidate_set = []
    for et in existing_tags:
        if et.lower() in combined_text and et not in candidate_set:
            candidate_set.append(et)

    for tech in tech_keywords:
        if tech in combined_text:
            cap = tech.capitalize()
            if cap not in candidate_set:
                candidate_set.append(cap)

    if candidate_set:
        return candidate_set[:5]

    return ["DevOps", "Homelab", "Software"]
