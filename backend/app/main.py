from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.logging import configure_logging
from .api.v1 import router as api_router
from .services.summarizer.gemini_provider import GeminiSummarizer


def build_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="AI Study Buddy", version="0.2.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,  # parsed list from env
        allow_origin_regex=getattr(settings, "CORS_ORIGIN_REGEX", None),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # Inject Gemini summarizer
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in your environment (.env)")
    summarizer = GeminiSummarizer(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)

    # Make the summarizer available to API routes
    from .api import v1 as v1mod
    v1mod.router.summarizer = summarizer  # type: ignore[attr-defined]

    app.include_router(api_router)
    return app


app = build_app()
