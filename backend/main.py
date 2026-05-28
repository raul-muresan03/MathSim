import json
import httpx
import os
import random
import re
import uvicorn
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import User, Simulation
from dependencies import verify_password, get_password_hash, create_access_token, get_current_user, require_admin

ROOT_DIR = Path(__file__).parent.parent
PROCESSED_DIR = Path(os.getenv("PROCESSED_DATA_PATH", str(ROOT_DIR / "data" / "processed")))
ANSWERS_PATH = PROCESSED_DIR / "final_answers.json"

def get_chapter_dirs():
    
    chapters = {}
    if not PROCESSED_DIR.exists():
        return chapters

    for item in PROCESSED_DIR.iterdir():
        if item.is_dir() and item.name not in ["unknown", "db"]:
            chapters[item.name] = item
    return chapters

CHAPTER_DIRS = get_chapter_dirs()

app = FastAPI(
    title="ToolGrile API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

def _load_answers() -> dict:
    if not ANSWERS_PATH.exists():
        return {}
    with open(ANSWERS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _scan_inventory():
    answers = _load_answers()
    inventory = []

    for chapter_name, chapter_path in CHAPTER_DIRS.items():
        if not chapter_path.exists():
            continue

        for file in sorted(chapter_path.glob("*.png")):
            match = re.search(r'quiz_([\d_]+)\.png', file.name)
            if not match:
                continue

            ids_str = match.group(1).split('_')
            grid_ids = [s for s in ids_str if s]
            has_answers = all(str(gid) in answers for gid in grid_ids)

            inventory.append({
                "chapter": chapter_name,
                "filename": file.name,
                "ids": grid_ids,
                "answers": {gid: answers.get(str(gid), None) for gid in grid_ids},
                "has_all_answers": has_answers,
            })

    return inventory

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
    username: Optional[str] = None
    elapsed: Optional[int] = 0

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    username: str
    message: str

@app.post("/api/login")
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

@app.post("/api/register")
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

_active_sessions: Dict[str, list] = {}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/api/stats")
async def platform_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func as sql_func
    from datetime import datetime, timedelta

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

    from collections import defaultdict
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
            import json
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

@app.get("/api/chapters")
async def list_chapters():
    result = {}
    for chapter_name, chapter_path in CHAPTER_DIRS.items():
        if not chapter_path.exists():
            result[chapter_name] = {"total_grids": 0}
            continue
        total_grids = 0
        for f in sorted(chapter_path.glob("*.png")):
            match = re.search(r'quiz_([\d_]+)\.png', f.name)
            if match:
                ids = [s for s in match.group(1).split('_') if s]
                total_grids += len(ids)
        result[chapter_name] = {"total_grids": total_grids}
    return {"chapters": result}

@app.post("/api/simulation/generate")
async def generate_simulation(config: SimulationConfig):
    inventory = _scan_inventory()
    if not inventory:
        raise HTTPException(status_code=500, detail="No quiz data found on disk.")

    by_chapter: Dict[str, list] = {}
    for item in inventory:
        if not item["has_all_answers"]:
            continue
        ch = item["chapter"]
        if ch not in by_chapter:
            by_chapter[ch] = []
        by_chapter[ch].append(item)

    active_weights = {}
    for ch_name, ch_cfg in config.chapters.items():
        if ch_name in by_chapter and by_chapter[ch_name]:
            active_weights[ch_name] = ch_cfg.weight

    if not active_weights:
        raise HTTPException(
            status_code=400,
            detail="None of the selected chapters have available quizzes with answers."
        )

    for ch in by_chapter:
        random.shuffle(by_chapter[ch])

    weighted_pool = []
    for chapter, weight in active_weights.items():
        weighted_pool.extend([chapter] * int(weight * 10))

    selected = []
    collected = 0
    used_files = set()

    while collected < config.total_quizzes and weighted_pool:
        target = random.choice(weighted_pool)

        if not by_chapter.get(target):
            weighted_pool = [c for c in weighted_pool if c != target]
            continue

        candidate = by_chapter[target].pop(0)
        if candidate["filename"] in used_files:
            continue

        selected.append(candidate)
        used_files.add(candidate["filename"])
        collected += len(candidate["ids"])

    session_id = f"sim_{random.randint(100000, 999999)}"
    _active_sessions[session_id] = selected

    grids = []
    for item in selected:
        grids.append({
            "chapter": item["chapter"],
            "filename": item["filename"],
            "grid_ids": item["ids"],
            "image_url": f"/api/grid/{item['chapter']}/{item['filename']}",
        })

    return {
        "session_id": session_id,
        "total_grids": collected,
        "grids": grids,
    }

@app.post("/api/simulation/grade")
async def grade_simulation(result: SimulationResult, db: Session = Depends(get_db)):
    session = _active_sessions.get(result.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    correct_answers = {}
    grid_to_chapter = {}
    for item in session:
        for gid, ans in item["answers"].items():
            correct_answers[str(gid)] = ans
            grid_to_chapter[str(gid)] = item["chapter"]

    total = len(correct_answers)
    correct = 0
    details = []

    for sub in result.answers:
        expected = correct_answers.get(str(sub.grid_id))
        chapter = grid_to_chapter.get(str(sub.grid_id), "unknown")
        is_correct = expected is not None and sub.answer.upper() == expected.upper()
        if is_correct:
            correct += 1
        details.append({
            "grid_id": sub.grid_id,
            "chapter": chapter,
            "submitted": sub.answer,
            "expected": expected,
            "is_correct": is_correct,
        })

    score = round((correct / total) * 10, 2) if total > 0 else 0

    if not result.username:
        raise HTTPException(status_code=401, detail="Trebuie să fii autentificat pentru a finaliza simularea.")

    user = db.query(User).filter(User.username == result.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilizator invalid.")

    sim = Simulation(
        session_id=result.session_id,
        user_id=user.id,
        total_grids=total,
        correct=correct,
        score=score,
        elapsed_seconds=result.elapsed or 0,
        details_json=json.dumps(details),
    )
    db.add(sim)
    db.commit()

    del _active_sessions[result.session_id]

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "details": details,
    }

@app.get("/api/users")
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

@app.get("/api/users/{username}/stats")
async def user_stats(username: str, days: Optional[int] = None, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from collections import defaultdict

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

@app.put("/api/users/{username}/role")
async def promote_user(username: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = "admin"
    db.commit()
    return {"message": f"User {username} promoted to admin."}

@app.delete("/api/users/{username}")
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

@app.get("/api/grid/{chapter}/{filename}")
async def serve_grid_image(chapter: str, filename: str):
    if chapter not in CHAPTER_DIRS:
        raise HTTPException(status_code=400, detail=f"Unknown chapter: {chapter}")

    image_path = CHAPTER_DIRS[chapter] / filename

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")

    return FileResponse(str(image_path), media_type="image/png")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

CHAPTER_LABELS_RO = {
    "algebra": "Algebră",
    "analiza": "Analiză Matematică",
    "geometrie": "Geometrie",
    "trigonometrie": "Trigonometrie",
    "admitere": "Admitere",
}

@app.post("/api/ai/chat")
async def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from collections import defaultdict

    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    sims = db.query(Simulation).filter(Simulation.user_id == user.id).order_by(Simulation.created_at.asc()).all()

    if not sims:
        stats_context = "Studentul nu a completat nicio simulare încă."
    else:
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

        chapter_lines = []
        for ch, data in chapter_stats.items():
            acc = round((data["correct"] / data["total"]) * 100, 1) if data["total"] > 0 else 0
            label = CHAPTER_LABELS_RO.get(ch, ch)
            chapter_lines.append(f"  - {label}: {acc}% acuratețe ({data['correct']}/{data['total']} corecte)")

        last_scores = [s.score for s in sims[-5:]]
        trend_str = ", ".join([f"{s}/10" for s in last_scores])

        stats_context = (
            f"Statisticile studentului {request.username}:\n"
            f"- Total simulări: {total_sims}\n"
            f"- Media generală: {avg_score}/10\n"
            f"- Grile rezolvate: {total_grids} (corecte: {total_correct})\n"
            f"- Acuratețe per capitol:\n" + "\n".join(chapter_lines) + "\n"
            f"- Ultimele note: {trend_str}\n"
        )

    system_prompt = (
        "Ești un asistent educațional pentru platforma ToolGrile, o platformă de pregătire pentru examenul de admitere de matematică la facultatea de Automatică și Calculatoare la Universitatea Tehnica din Cluj-Napoca."
        "Răspunzi DOAR în limba română. Ești concis, prietenos și motivant."
        "Poți sugera planuri de studiu, capitole de exersat, și simulări personalizate."
        "Când sugerezi simulări, specifică numărul de grile și capitolele (algebra, analiza, geometrie, trigonometrie, admitere)."
        "Nu inventa date. Bazează-te strict pe statisticile de mai jos.\n\n"
        f"{stats_context}"
    )

    async def generate_ollama_stream():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    OLLAMA_URL,
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": request.message},
                        ],
                        "stream": True,
                    },
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            yield line + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(
        generate_ollama_stream(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
