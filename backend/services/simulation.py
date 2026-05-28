import json
import os
import random
import re
from pathlib import Path
from typing import Dict

ROOT_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = Path(os.getenv("PROCESSED_DATA_PATH", str(ROOT_DIR / "data" / "processed")))
ANSWERS_PATH = PROCESSED_DIR / "final_answers.json"

_active_sessions: Dict[str, list] = {}


def get_chapter_dirs() -> Dict[str, Path]:
    chapters = {}
    if not PROCESSED_DIR.exists():
        return chapters
    for item in PROCESSED_DIR.iterdir():
        if item.is_dir() and item.name not in ["unknown", "db"]:
            chapters[item.name] = item
    return chapters


CHAPTER_DIRS = get_chapter_dirs()


def _load_answers() -> dict:
    if not ANSWERS_PATH.exists():
        return {}
    with open(ANSWERS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _scan_inventory() -> list:
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


def create_simulation_session(total_quizzes: int, chapter_weights: Dict[str, float]) -> dict:
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


def grade_session(session_id: str, submitted_answers: list) -> dict:
    session = _active_sessions.get(session_id)
    if not session:
        raise KeyError("Session not found or expired.")

    correct_answers = {}
    grid_to_chapter = {}
    for item in session:
        for gid, ans in item["answers"].items():
            correct_answers[str(gid)] = ans
            grid_to_chapter[str(gid)] = item["chapter"]

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
            "submitted": sub.answer,
            "expected": expected,
            "is_correct": is_correct,
        })

    score = round((correct / total) * 10, 2) if total > 0 else 0

    del _active_sessions[session_id]

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "details": details,
    }


def get_session(session_id: str) -> list | None:
    return _active_sessions.get(session_id)
