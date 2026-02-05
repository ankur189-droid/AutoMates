import re
import pytesseract
from PIL import Image

def process_image(image_path):
    """
    Reads the image using pytesseract and extracts subject marks.
    Returns a dict containing the sorted subjects (Best of 5 logic enforced later or here).
    """
    try:
        text = pytesseract.image_to_string(Image.open(image_path))
        print(f"Extracted Text:\n{text}") # Debug logging
        
        subjects = parse_marks(text)
        return subjects
    except Exception as e:
        print(f"Error in OCR: {e}")
        return {}

def parse_marks(text):
    """
    Parses the text to find subject names and their Total marks.
    Logic ported from ocr.js.
    """
    lines = text.split('\n')
    subjects = {}
    
    # Regex to match a Subject line:
    # Group 1: Optional Subject Code (3 digits)
    # Group 2: Subject Name (UPPERCASE text, spaces, &)
    # Group 3: Marks chunk (e.g. 057 019 076)
    # Python Re: ^\s*(\d{3}\s+)?([A-Z\s&]+[A-Z])\s+((?:\d{2,3}\s*)+)
    row_regex = re.compile(r'^\s*(\d{3}\s+)?([A-Z\s&]+[A-Z])\s+((?:\d{2,3}\s*)+)')

    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue
            
        match = row_regex.search(clean_line)
        if match:
            # group(2) is Subject Name
            # group(3) is string of numbers
            subject_name = match.group(2).strip()
            numbers_str = match.group(3).strip()
            
            # Split numbers by whitespace
            numbers = [int(n) for n in re.split(r'\s+', numbers_str) if n.isdigit()]
            
            if numbers:
                total_mark = numbers[-1] # Take last number
                
                # Filter headers
                if subject_name not in ['THEORY', 'SUBJECT', 'TOTAL', 'SUBJECT NAME', 'POSITIONAL']:
                    subjects[subject_name] = total_mark

    return subjects
