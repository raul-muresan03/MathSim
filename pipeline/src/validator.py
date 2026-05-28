import re
from pathlib import Path
from datetime import datetime
from .configs.config import MATH_CHAPTERS


def get_numbers_from_filename(filename: str):
    match = re.search(r'_quiz_([\d_]+)\.png$', filename)
    if match:
        numbers_str = match.group(1).split('_')
        return [int(n) for n in numbers_str if n.isdigit()]
    return []


def validate_chapter(chapter_name: str, chapter_path: Path):
    found = set()
    for f in chapter_path.glob("*.png"):
        found.update(get_numbers_from_filename(f.name))

    if not found:
        print(f"Chapter '{chapter_name}': Empty.")
        return

    low, high = min(found), max(found)
    missing = [i for i in range(low, high + 1) if i not in found]

    status = f"MISSING: {missing}" if missing else "OK (0 missing)"
    print(f"Chapter '{chapter_name}': {low}-{high} -> {status}")

    output_path = chapter_path / "missing_grile.txt"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"Chapter: {chapter_name}\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Range: {low}–{high}\n")
        f.write(f"Total found: {len(found)}\n")
        f.write(f"Total missing: {len(missing)}\n")
        if missing:
            f.write(f"Missing IDs: {', '.join(str(m) for m in missing)}\n")
        else:
            f.write("Status: Complete (no missing grids)\n")

    return missing