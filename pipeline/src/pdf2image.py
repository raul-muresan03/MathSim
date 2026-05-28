import fitz
from .configs.config import RAW_PDF_PATH, PAGES_DIR, DPI

def convert_pdf_to_images():
    if not RAW_PDF_PATH.exists():
        print(f"Error: PDF file not found at {RAW_PDF_PATH}")
        return

    print(f"Opening PDF: {RAW_PDF_PATH}")
    doc = fitz.open(RAW_PDF_PATH)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=DPI)
        
        filename = PAGES_DIR / f"page_{page_num + 1:03d}.png"
        pix.save(str(filename), "PNG")
        print(f"Saved: {filename}")

    print(f"Conversion complete. Total pages: {len(doc)}")

if __name__ == "__main__":
    convert_pdf_to_images()
