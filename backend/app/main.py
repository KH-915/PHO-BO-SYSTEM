from fastapi import FastAPI

from . import models
from .database import engine
from .routes import router

# Ensure tables exist at startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PHO-BO Backend", version="0.1.0")
app.include_router(router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok"}
