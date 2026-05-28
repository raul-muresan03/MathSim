from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest
from dependencies import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Username sau parolă incorectă.")
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "role": user.role,
        "username": user.username,
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/register")
async def register(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Username și parola sunt obligatorii.")
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Acest username există deja.")
    hashed_password = get_password_hash(request.password)
    new_user = User(username=request.username, password=hashed_password, role="student")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.username, "role": new_user.role})
    return {
        "message": "Cont creat cu succes!",
        "role": new_user.role,
        "username": new_user.username,
        "access_token": access_token,
        "token_type": "bearer",
    }
