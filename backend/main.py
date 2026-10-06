import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, simulation, admin


app = FastAPI(
    title="MathSim API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(simulation.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
