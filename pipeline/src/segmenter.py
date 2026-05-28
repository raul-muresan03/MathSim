import cv2
import numpy as np
from pathlib import Path
from .configs.config import *

def preprocess_image(image_path):
    original = cv2.imread(image_path)
    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, BINARY_THRESHOLD, 255, cv2.THRESH_BINARY_INV)

    return original, binary

def find_quiz_contours(binary):
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filtered = []
    for c in contours:
        area = cv2.contourArea(c)
        if area > MIN_CONTOUR_AREA:
            filtered.append(c)

    filtered.sort(key=lambda c: cv2.boundingRect(c)[1])
    return filtered

def extract_and_save_quizzes(original, binary, contours, output_dir, page_index):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    for i, c in enumerate(contours):
        x, y, w, h = cv2.boundingRect(c)
        mask = np.zeros(binary.shape, dtype = np.uint8)
        cv2.drawContours(mask, [c], -1, 255, cv2.FILLED)
        result = np.ones_like(original) * 255
        result[mask == 255] = original[mask == 255]
        crop = result[y:y+h, x:x+w]
        cv2.imwrite(str(out_path / f"page_{page_index:03d}_quiz_{i+1:03d}.png"), crop)

def process_single_page(page_index):
    image_path = str(PAGES_DIR / f"page_{page_index:03d}.png")
    original, binary = preprocess_image(image_path)
    contours = find_quiz_contours(binary)
    extract_and_save_quizzes(original, binary, contours, RAW_QUIZZES_DIR, page_index)