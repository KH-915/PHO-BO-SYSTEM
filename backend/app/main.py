from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routes import router

# Ensure tables exist at startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PHO-BO Backend", version="0.1.0")

# Allow local frontend dev server to send credentials (cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok"}
