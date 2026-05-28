import cv2
import pytesseract
import re
import shutil
import logging
from pathlib import Path
from collections import defaultdict, Counter
from .configs.config import *

LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(exist_ok=True)
logger = logging.getLogger("indexer")
logger.addHandler(logging.FileHandler(LOG_DIR / "errors.log"))
logger.setLevel(logging.WARNING)


def _page_num_from_path(image_path: str) -> str:
    m = re.search(r"page_(\d+)", str(image_path))
    return m.group(1) if m else "?"

def extract_circle_ROIs(image_path):
    original = cv2.imread(image_path)
    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, BINARY_THRESHOLD, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    ROI_list = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if MIN_CIRCLE_SIZE < w < MAX_CIRCLE_SIZE and MIN_CIRCLE_SIZE < h < MAX_CIRCLE_SIZE:
            aspect_ratio = float(w) / h
            if ASPECT_RATIO_MIN < aspect_ratio < ASPECT_RATIO_MAX:
                if x < MAX_CIRCLE_X:
                    ROI = original[y:y+h, x:x+w]
                    ROI_list.append((y, ROI))

    ROI_list.sort(key=lambda item: item[0])
    return [item[1] for item in ROI_list]

def extract_quiz_numbers_with_ocr(image_path):
    page = _page_num_from_path(image_path)
    ROIs = extract_circle_ROIs(image_path)
    extracted = []
    for i, ROI in enumerate(ROIs):
        try:
            h, w = ROI.shape[:2]
            margin = 15
            inner = ROI[margin:h-margin, margin:w-margin]
            inner = cv2.resize(inner, (300, 300), interpolation=cv2.INTER_CUBIC)

            inner_gray = cv2.cvtColor(inner, cv2.COLOR_BGR2GRAY)
            _, inner_bin_no_pad = cv2.threshold(inner_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            inner_bin_pad = cv2.copyMakeBorder(inner_bin_no_pad, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=255)

            ocr_text = pytesseract.image_to_string(inner_bin_pad, config='--psm 8')

            for char, num in OCR_REPLACEMENTS.items():
                ocr_text = ocr_text.replace(char, num)

            clean_num = re.sub(r'\D', '', ocr_text)

            if clean_num:
                extracted.append(int(clean_num))
            else:
                extracted.append(None)
        except Exception:
            logger.exception("OCR error: page=%s circle=%d image=%s", page, i, image_path)
            extracted.append(None)

    return extracted

def rename_and_move_image(original_image_path, quiz_numbers, destination_folder):
    original_path = Path(original_image_path)
    original_stem = original_path.stem

    page_prefix = "_".join(original_stem.split("_")[:2])

    if not quiz_numbers:
        unknown_folder = Path(destination_folder) / "unknown_quizzes"
        unknown_folder.mkdir(parents=True, exist_ok=True)
        new_image_path = unknown_folder / f"{original_stem}_unknown.png"
    else:
        dest_folder = Path(destination_folder)
        dest_folder.mkdir(parents=True, exist_ok=True)
        quiz_numbers.sort(key=int)
        joined_numbers = "_".join(quiz_numbers)
        new_image_path = dest_folder / f"{page_prefix}_quiz_{joined_numbers}.png"

    shutil.copy(original_image_path, new_image_path)

def process_page_group(item):
    page_num, images_for_page = item
    images_for_page.sort()

    all_extracted = []
    image_roi_counts = []

    for image_path in images_for_page:
        extracted = extract_quiz_numbers_with_ocr(str(image_path))
        all_extracted.extend(extracted)
        image_roi_counts.append((image_path, len(extracted)))

    c_votes = []
    for i, num in enumerate(all_extracted):
        if num is not None:
            c_votes.append(num - i)

    if not c_votes:
        best_c = 0
    else:
        best_c = Counter(c_votes).most_common(1)[0][0]

    reconstructed = [str(best_c + i) for i in range(len(all_extracted))]

    idx = 0
    chapter = get_chapter_by_page(int(page_num))
    destination = MATH_CHAPTERS[chapter]

    for image_path, count in image_roi_counts:
        quiz_numbers = reconstructed[idx : idx+count]
        idx += count
        rename_and_move_image(str(image_path), quiz_numbers, destination)

    return len(images_for_page)