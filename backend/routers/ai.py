import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import User, Simulation
from schemas import ChatRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

CHAPTER_LABELS_RO = {
    "algebra": "Algebră",
    "analiza": "Analiză Matematică",
    "geometrie": "Geometrie",
    "trigonometrie": "Trigonometrie",
    "admitere": "Admitere",
}


@router.post("/chat")
async def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
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
