"""
Application Entry Point (main.py)
---------------------------------
This module initializes the FastAPI application instance, configures global
middlewares (notably strict CORS policy for the Next.js frontend), registers
modular API routers, and provides basic health check endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="PixelWeaver API",
    description="Stateless image-to-bead physical matrix conversion API and mathematical engine.",
    version="1.0.0"
)

# Strict CORS policy allowing only the frontend development server
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular API routes
app.include_router(api_router)

@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint returning service status.
    """
    return {"status": "ok", "service": "PixelWeaver API"}
