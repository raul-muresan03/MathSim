import argparse
import sys
import shutil
from pathlib import Path
from multiprocessing import Pool
from collections import defaultdict

from src.pdf2image import convert_pdf_to_images
from src.segmenter import process_single_page
from src.indexer import process_page_group
from src.answers import process_answer_page
from src.validator import validate_chapter
from src.configs.config import *

def run_segmentation():
    print("\n--- [STEP 2] Page Segmentation (7-148) ---")
    pages = range(7, 149)
    with Pool() as pool:
        pool.map(process_single_page, pages)

def run_indexing():
    print("\n--- [STEP 3] Indexing and Renaming (OCR + Voting) ---")
    images = list(RAW_QUIZZES_DIR.glob("*.png"))
    if not images:
        print("Warning: No raw quizzes found for indexing.")
        return

    pages_dict = defaultdict(list)
    for img in images:
        page_num = img.stem.split("_")[1]
        pages_dict[page_num].append(img)

    with Pool() as pool:
        pool.map(process_page_group, list(pages_dict.items()))

def run_answers():
    print("\n--- [STEP 4] Answer Key Extraction ---")
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
        import json
        json.dump(sorted_answers, f, indent=4)
    print(f"Generated {output_path} with {len(sorted_answers)} answers.")

def run_validation():
    print("\n--- [STEP 5] Data Integrity Validation ---")
    for name, path in MATH_CHAPTERS.items():
        if path.exists() and name != "unknown_chapter":
            validate_chapter(name, path)

def clean_data():
    print("\n--- Cleaning TEMP and PROCESSED directories ---")
    folders_to_clean = [TEMP_DIR, PROCESSED_DIR]
    for folder in folders_to_clean:
        if folder.exists():
            shutil.rmtree(folder)
            folder.mkdir(parents=True, exist_ok=True)
            print(f"Deleted and recreated: {folder}")

    for path in MATH_CHAPTERS.values():
        path.mkdir(parents=True, exist_ok=True)

def main():
    parser = argparse.ArgumentParser(description="ToolGrile")

    parser.add_argument("--step", type=int, choices=[1, 2, 3, 4, 5],
                        help="Run a Single Pipeline Step (1: PDF2Img, 2: Segment, 3: Index, 4: Answers, 5: Validate)")
    parser.add_argument("--all", action="store_true", help="Run the entire pipeline from scratch")
    parser.add_argument("--clean", action="store_true", help="Delete previously processed data")

    args = parser.parse_args()

    if len(sys.argv) == 1:
        parser.print_help()
        return

    if args.clean:
        clean_data()

    if args.all:
        print("=== Starting Full ToolGrile Pipeline ===")
        convert_pdf_to_images()
        run_segmentation()
        run_indexing()
        run_answers()
        run_validation()
        print("\n=== Pipeline Successfully Completed! ===")
        return

    if args.step == 1:
        convert_pdf_to_images()
    elif args.step == 2:
        run_segmentation()
    elif args.step == 3:
        run_indexing()
    elif args.step == 4:
        run_answers()
    elif args.step == 5:
        run_validation()

if __name__ == "__main__":
    main()