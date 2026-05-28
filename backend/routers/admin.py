import json
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from database import get_db
from models import User, Simulation
from dependencies import require_admin

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/stats")
async def platform_stats(db: Session = Depends(get_db)):
    total_users = db.query(sql_func.count(User.id)).scalar() or 0
    total_simulations = db.query(sql_func.count(Simulation.id)).scalar() or 0
    total_grids_solved = db.query(sql_func.sum(Simulation.correct)).scalar() or 0
    total_grids_generated = db.query(sql_func.sum(Simulation.total_grids)).scalar() or 0

    avg_score = db.query(sql_func.avg(Simulation.score)).scalar()
    avg_score = round(avg_score, 1) if avg_score else 0
    avg_elapsed = db.query(sql_func.avg(Simulation.elapsed_seconds)).scalar()
    avg_elapsed_min = round(avg_elapsed / 60, 1) if avg_elapsed else 0

    today = datetime.now().date()
    days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]

    recent_sims = db.query(Simulation).filter(
        Simulation.created_at >= (today - timedelta(days=6))
    ).all()

    sims_by_date = defaultdict(list)
    for sim in recent_sims:
        sims_by_date[sim.created_at.date()].append(sim)

    day_names = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"]
    activity_chart = []

    for d in days:
        daily_sims = sims_by_date.get(d, [])
        activity_chart.append({
            "zi": day_names[d.weekday()],
            "simulari": len(daily_sims),
            "studenti": len(set(s.user_id for s in daily_sims))
        })

    total_elapsed_seconds = db.query(sql_func.sum(Simulation.elapsed_seconds)).scalar() or 0
    total_study_hours = round(total_elapsed_seconds / 3600, 1)

    all_sims = db.query(Simulation).all()
    chapter_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    for sim in all_sims:
        if sim.details_json:
            details = json.loads(sim.details_json)
            for d in details:
                ch = d.get("chapter", "unknown")
                chapter_stats[ch]["total"] += 1
                if d.get("is_correct"):
                    chapter_stats[ch]["correct"] += 1

    easiest_chapter = None
    hardest_chapter = None
    max_correct = -1
    max_wrong = -1

    for ch, stats in chapter_stats.items():
        if stats["correct"] > max_correct:
            max_correct = stats["correct"]
            easiest_chapter = ch
        wrong = stats["total"] - stats["correct"]
        if wrong > max_wrong:
            max_wrong = wrong
            hardest_chapter = ch

    return {
        "total_users": total_users,
        "total_simulations": total_simulations,
        "total_grids_solved": total_grids_solved,
        "total_grids_generated": total_grids_generated,
        "total_study_hours": total_study_hours,
        "avg_score": avg_score,
        "avg_elapsed_min": avg_elapsed_min,
        "activity_chart": activity_chart,
        "easiest_chapter": easiest_chapter,
        "easiest_correct_count": max_correct,
        "hardest_chapter": hardest_chapter,
        "hardest_wrong_count": max_wrong
    }


@router.get("/users")
async def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        sims = db.query(Simulation).filter(Simulation.user_id == u.id).all()
        total_sims = len(sims)
        total_grile = sum(s.total_grids for s in sims)
        avg_score = round(sum(s.score for s in sims) / total_sims, 1) if total_sims > 0 else 0
        result.append({
            "name": u.username,
            "simulari": total_sims,
            "grile": total_grile,
            "media": f"{avg_score}",
        })
    return {"users": result}


@router.get("/users/{username}/stats")
async def user_stats(username: str, days: Optional[int] = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    query = db.query(Simulation).filter(Simulation.user_id == user.id)
    if days:
        cutoff = datetime.now() - timedelta(days=days)
        query = query.filter(Simulation.created_at >= cutoff)

    sims = query.order_by(Simulation.created_at.asc()).all()

    if not sims:
        return {
            "username": username,
            "total_simulations": 0,
            "avg_score": 0,
            "total_grids": 0,
            "total_correct": 0,
            "best_chapter": None,
            "worst_chapter": None,
            "trend": [],
            "chapter_breakdown": [],
        }

    total_sims = len(sims)
    avg_score = round(sum(s.score for s in sims) / total_sims, 1)
    total_grids = sum(s.total_grids for s in sims)
    total_correct = sum(s.correct for s in sims)

    chapter_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    for sim in sims:
        if not sim.details_json:
            continue
        details = json.loads(sim.details_json)
        for d in details:
            ch = d.get("chapter", "unknown")
            chapter_stats[ch]["total"] += 1
            if d.get("is_correct"):
                chapter_stats[ch]["correct"] += 1

    chapter_breakdown = []
    for ch, data in chapter_stats.items():
        accuracy = round((data["correct"] / data["total"]) * 100, 1) if data["total"] > 0 else 0
        chapter_breakdown.append({
            "chapter": ch,
            "correct": data["correct"],
            "total": data["total"],
            "accuracy": accuracy,
        })

    chapter_breakdown.sort(key=lambda x: x["accuracy"], reverse=True)
    best_chapter = chapter_breakdown[0] if chapter_breakdown else None
    worst_chapter = chapter_breakdown[-1] if chapter_breakdown else None

    trend = []
    for i, sim in enumerate(sims, 1):
        trend.append({
            "sim": f"#{i}",
            "score": sim.score,
            "date": sim.created_at.strftime("%d/%m") if sim.created_at else "",
        })

    return {
        "username": username,
        "total_simulations": total_sims,
        "avg_score": avg_score,
        "total_grids": total_grids,
        "total_correct": total_correct,
        "best_chapter": best_chapter,
        "worst_chapter": worst_chapter,
        "trend": trend,
        "chapter_breakdown": chapter_breakdown,
    }


@router.put("/users/{username}/role")
async def promote_user(username: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = "admin"
    db.commit()
    return {"message": f"User {username} promoted to admin."}


@router.delete("/users/{username}")
async def delete_user(username: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    sims = db.query(Simulation).filter(Simulation.user_id == user.id).all()
    for s in sims:
        db.delete(s)
    db.delete(user)
    db.commit()
    return {"message": f"User {username} and associated data deleted."}
