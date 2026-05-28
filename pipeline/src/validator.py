import re
from pathlib import Path
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

if __name__ == "__main__":
    for name, path in MATH_CHAPTERS.items():
        if path.exists() and name != "unknown_chapter":
            validate_chapter(name, path)