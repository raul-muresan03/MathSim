from pydantic import BaseModel

class ChapterWeight(BaseModel):
    weight: float

class SimulationConfig(BaseModel):
    total_quizzes: int
    chapters: dict[str, ChapterWeight]

class StudentAnswer(BaseModel):
    grid_id: str
    answer: str

class SimulationResult(BaseModel):
    session_id: str
    answers: list[StudentAnswer]
    elapsed: int | None = 0

class LoginRequest(BaseModel):
    username: str
    password: str