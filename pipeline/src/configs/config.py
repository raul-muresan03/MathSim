from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"

RAW_DIR = DATA_DIR / "raw"
TEMP_DIR = DATA_DIR / "temp"
PROCESSED_DIR = DATA_DIR / "processed"

PAGES_DIR = TEMP_DIR / "pages"
RAW_QUIZZES_DIR = TEMP_DIR / "raw_quizzes"
INDEXED_QUIZZES_DIR = TEMP_DIR / "indexed_quizzes"

RAW_PDF_PATH = RAW_DIR / "culegere_grile_utcn.pdf"

ANSWER_BBOXES = TEMP_DIR / "answers_bboxes"

DPI = 300
MATH_CHAPTERS = {
    "algebra": PROCESSED_DIR / "algebra",
    "analiza": PROCESSED_DIR / "analiza",
    "geometrie": PROCESSED_DIR / "geometrie",
    "trigonometrie": PROCESSED_DIR / "trigonometrie",
    "admitere": PROCESSED_DIR / "admitere",
    "unknown_chapter": PROCESSED_DIR / "unknown"
}

CHAPTER_PAGES = {
    "algebra": (7, 37),
    "analiza": (39, 77),
    "geometrie": (79, 83),
    "trigonometrie": (85, 94),
    "admitere": (95, 148)
}

ANSWERS_PAGES = (153, 156)

ANSWERS_PAGE_RANGES = {
    153: (1, 180),
    154: (181, 444),
    155: (445, 708),
    156: (709, 959),
}

def get_chapter_by_page(page_num):
    for chapter, (start, end) in CHAPTER_PAGES.items():
        if start <= page_num <= end:
            return chapter
    return "unknown_chapter"

all_dirs = [
    RAW_DIR, TEMP_DIR, PAGES_DIR, RAW_QUIZZES_DIR,
    INDEXED_QUIZZES_DIR, ANSWER_BBOXES, PROCESSED_DIR
] + list(MATH_CHAPTERS.values())

for path in all_dirs:
    path.mkdir(parents=True, exist_ok=True)

BINARY_THRESHOLD = 240

MIN_CIRCLE_SIZE = 50
MAX_CIRCLE_SIZE = 150
ASPECT_RATIO_MIN = 0.85
ASPECT_RATIO_MAX = 1.15
MAX_CIRCLE_X = 350

MIN_CONTOUR_AREA = 10000

OCR_REPLACEMENTS = {
    'l': '1', 'L': '1', 'I': '1', '|': '1', 'i': '1',
    'A': '4', 'S': '5', 's': '5', 'O': '0', 'o': '0', 'Q': '0',
    'B': '8', 'Z': '2', 'z': '2',
    'T': '7', 't': '7', 'G': '6', 'g': '9',
    '&': '8', '?': '7', '>': '7',
}