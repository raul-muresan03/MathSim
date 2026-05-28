import cv2
import pytesseract
import re
import json
from pathlib import Path
import numpy as np
from multiprocessing import Pool
from .configs.config import *

def extract_answer_bboxes_from_page(image_path, out_path, page_num):
    img = cv2.imread(str(image_path))
    if img is None:
        return

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV)

    kernel = np.ones((2, 3), np.uint8)
    dilated = cv2.dilate(binary, kernel, iterations=14)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for i, c in enumerate(contours):
        x, y, w, h = cv2.boundingRect(c)
        if w > 200 or h > 500:
            continue

        ROI = img[y:y+h, x:x+w]
        padded_roi = cv2.copyMakeBorder(ROI, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=[255, 255, 255])

        filename = f"page_{page_num:03d}_bbox_{i:03d}.png"
        cv2.imwrite(str(out_path / filename), padded_roi)

def bbox2json(image_path):
    ROI = cv2.imread(str(image_path))
    if ROI is None: return {}

    ROI = cv2.copyMakeBorder(ROI, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
    gray = cv2.cvtColor(ROI, cv2.COLOR_BGR2GRAY)

    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

    text = pytesseract.image_to_string(thresh, config='--psm 6').strip()

    matches = re.findall(r'([A-Za-z\d&\?]*)\s*[\W\_]*\s*([A-Ea-e])', text)

    results = {}
    for num_raw, letter in matches:
        for char, val in OCR_REPLACEMENTS.items():
            num_raw = num_raw.replace(char, val)

        clean_num = re.sub(r'\D', '', num_raw)
        if clean_num:
            val_num = int(clean_num)
            if val_num > 959:
                val_num = int(clean_num[-3:])
            results[val_num] = letter.upper()

    return results

def process_answer_page(page_num):
    page_img = PAGES_DIR / f"page_{page_num:03d}.png"
    if not page_img.exists():
        print(f"Warning: {page_img} not found.")
        return {}

    extract_answer_bboxes_from_page(page_img, ANSWER_BBOXES, page_num)
    page_ranges = {
        153: (1, 180),
        154: (181, 444),
        155: (445, 708),
        156: (709, 959)
    }
    min_n, max_n = page_ranges.get(page_num, (1, 959))

    page_results = {}
    for box_file in sorted(ANSWER_BBOXES.glob(f"page_{page_num:03d}_bbox_*.png")):
        res = bbox2json(box_file)
        for num, letter in res.items():
            if min_n <= num <= max_n:
                page_results[num] = letter
            else:
                pass

    return page_results

if __name__ == "__main__":
    start, end = ANSWERS_PAGES
    pages = list(range(start, end + 1))

    with Pool() as pool:
        results = pool.map(process_answer_page, pages)

    final_answers = {}
    for r in results:
        final_answers.update(r)

    sorted_answers = dict(sorted(final_answers.items()))

    output_path = PROCESSED_DIR / "final_answers.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sorted_answers, f, indent=4)

    print(f"\nGenerat {output_path} cu {len(sorted_answers)} răspunsuri.")
