import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.simulation import CHAPTER_DIRS

router = APIRouter(prefix="/api", tags=["grids"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/chapters")
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


@router.get("/grid/{chapter}/{filename}")
async def serve_grid_image(chapter: str, filename: str):
    if chapter not in CHAPTER_DIRS:
        raise HTTPException(status_code=400, detail=f"Unknown chapter: {chapter}")

    image_path = CHAPTER_DIRS[chapter] / filename

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")

    return FileResponse(str(image_path), media_type="image/png")
