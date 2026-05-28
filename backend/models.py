from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role = Column(String, default="student")
    created_at = Column(DateTime, server_default=func.now())

    simulations = relationship("Simulation", back_populates="user")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_grids = Column(Integer, nullable=False)
    correct = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    elapsed_seconds = Column(Integer, default=0)
    details_json = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="simulations")
