import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Simulation
from schemas import SimulationConfig, SimulationResult
from dependencies import get_current_user
from services.simulation import create_simulation_session, grade_session

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/generate")
async def generate_simulation(config: SimulationConfig, db: Session = Depends(get_db)):
    try:
        result = create_simulation_session(
            db=db,
            total_quizzes=config.total_quizzes,
            chapter_weights={ch: cfg.weight for ch, cfg in config.chapters.items()},
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400 if "None" in str(e) else 500, detail=str(e))


@router.post("/grade")
async def grade_simulation(
    result: SimulationResult,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        graded = grade_session(db, result.session_id, result.answers)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    sim = Simulation(
        session_id=result.session_id,
        user_id=current_user.id,
        total_grids=graded["total"],
        correct=graded["correct"],
        score=graded["score"],
        elapsed_seconds=result.elapsed or 0,
        details_json=json.dumps(graded["details"]),
    )
    db.add(sim)
    db.commit()

    return graded
