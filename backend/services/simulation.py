import json
import random
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from sqlalchemy.orm import Session

from models import SessionData

ROOT_DIR = Path(__file__).parent.parent
INVENTORY_PATH = ROOT_DIR / "data" / "inventory.json"
SESSION_TTL = timedelta(hours=24)


def _load_inventory() -> List[dict]:
    if not INVENTORY_PATH.exists():
        return []
    with open(INVENTORY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _scan_inventory() -> list:
    return _load_inventory()


def create_simulation_session(db: Session, total_quizzes: int, chapter_weights: Dict[str, float]) -> dict:
    inventory = _scan_inventory()
    if not inventory:
        raise ValueError("No quiz data found on disk.")

    by_chapter: Dict[str, list] = {}
    for item in inventory:
        if not item["has_all_answers"]:
            continue
        ch = item["chapter"]
        if ch not in by_chapter:
            by_chapter[ch] = []
        by_chapter[ch].append(item)

    active_weights = {}
    for ch_name, weight in chapter_weights.items():
        if ch_name in by_chapter and by_chapter[ch_name]:
            active_weights[ch_name] = weight

    if not active_weights:
        raise ValueError("None of the selected chapters have available quizzes with answers.")

    for ch in by_chapter:
        random.shuffle(by_chapter[ch])

    weighted_pool = []
    for chapter, weight in active_weights.items():
        weighted_pool.extend([chapter] * int(weight * 10))

    selected = []
    collected = 0
    used_files = set()

    while collected < total_quizzes and weighted_pool:
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

    session_id = f"sim_{secrets.token_hex(8)}"
    while db.query(SessionData).filter(SessionData.session_id == session_id).first():
        session_id = f"sim_{secrets.token_hex(8)}"

    session_record = SessionData(session_id=session_id, data_json=json.dumps(selected))
    db.query(SessionData).filter(SessionData.created_at < datetime.now() - SESSION_TTL).delete()
    db.add(session_record)
    db.commit()

    grids = []
    for item in selected:
        grids.append({
            "chapter": item["chapter"],
            "filename": item["filename"],
            "grid_ids": item["ids"],
            "image_url": f"/grids/{item['chapter']}/{item['filename']}",
        })

    return {
        "session_id": session_id,
        "total_grids": collected,
        "grids": grids,
    }


def grade_session(db: Session, session_id: str, submitted_answers: list) -> dict:
    session_record = db.query(SessionData).filter(SessionData.session_id == session_id).first()
    if not session_record:
        raise KeyError("Session not found or expired.")

    if datetime.now() - session_record.created_at > SESSION_TTL:
        db.delete(session_record)
        db.commit()
        raise KeyError("Session not found or expired.")

    session = json.loads(session_record.data_json)

    correct_answers = {}
    grid_to_chapter = {}
    grid_to_filename = {}
    for item in session:
        for gid, ans in item["answers"].items():
            correct_answers[str(gid)] = ans
            grid_to_chapter[str(gid)] = item["chapter"]
            grid_to_filename[str(gid)] = item["filename"]

    total = len(correct_answers)
    correct = 0
    details = []

    for sub in submitted_answers:
        expected = correct_answers.get(str(sub.grid_id))
        chapter = grid_to_chapter.get(str(sub.grid_id), "unknown")
        is_correct = expected is not None and sub.answer.upper() == expected.upper()
        if is_correct:
            correct += 1
        details.append({
            "grid_id": sub.grid_id,
            "chapter": chapter,
            "filename": grid_to_filename.get(str(sub.grid_id), ""),
            "submitted": sub.answer,
            "expected": expected,
            "is_correct": is_correct,
        })

    score = round((correct / total) * 10, 2) if total > 0 else 0

    db.delete(session_record)
    db.commit()

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "details": details,
    }
