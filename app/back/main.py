from fastapi.responses import JSONResponse
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from src.internal.logger import log_failed_login
from src.internal.config import limiter
from src.router.routes import router as api_router
import os

load_dotenv()

app = FastAPI(title="Comparat'air")

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    ip_address = request.client.host if request.client else "unknown"

    email_attempt = "unknown_user"
    try:
        body = await request.json()
        email_attempt = body.get("email", "unknown_user")
    except Exception:
        pass

    log_failed_login(email_attempt, ip_address, "brute_force_blocked")

    return JSONResponse(
        status_code=429, content={"detail": "Trop de requêtes. Veuillez patienter."}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
