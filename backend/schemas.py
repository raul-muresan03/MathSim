from pydantic import BaseModel
from typing import Dict, List, Optional


class ChapterWeight(BaseModel):
    weight: float


class SimulationConfig(BaseModel):
    total_quizzes: int
    chapters: Dict[str, ChapterWeight]


class StudentAnswer(BaseModel):
    grid_id: str
    answer: str


class SimulationResult(BaseModel):
    session_id: str
    answers: List[StudentAnswer]
    elapsed: Optional[int] = 0


class LoginRequest(BaseModel):
    username: str
    password: str


class ChatRequest(BaseModel):
    username: str
    message: str
