#!/usr/bin/env python
"""
Standalone Timetable Parser using OCR + Groq LLM
Step 1: Tesseract OCR extracts raw text from image
Step 2: Groq LLM structures the text into JSON format

Usage:
    python parse_timetable.py "path/to/timetable_image.jpeg"
"""

import sys
import json
import os
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

import pytesseract
from PIL import Image
from groq import Groq

def extract_text_with_ocr(image_path: str) -> str:
    """Extract text from image using Tesseract OCR."""
    print(f"\n📷 Loading image: {image_path}")
    img = Image.open(image_path)
    
    print("🔍 Running OCR (Tesseract)...")
    # Use detailed config for better table extraction
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(img, config=custom_config)
    
    return text


def structure_with_groq(raw_text: str) -> dict:
    """Use Groq LLM to structure OCR text into JSON."""
    
    # Check API key
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("ERROR: GROQ_API_KEY not found in .env file!")
        sys.exit(1)
    
    # Initialize Groq client
    client = Groq(api_key=api_key)
    
    # Create prompt for structuring
    prompt = f"""You are a timetable parsing expert. I have extracted the following raw text from a college timetable image using OCR. 
Please analyze it and convert it into a structured JSON format.

RAW OCR TEXT:
---
{raw_text}
---

IMPORTANT RULES:
1. Extract every class/slot you can identify
2. Look for patterns like: Day names, Time slots, Subject names, Teacher names, Room numbers, Class/Batch names
3. If any field cannot be determined, use "N/A"
4. Return ONLY valid JSON, no explanations

Required JSON structure:
{{
  "college_name": "extracted or N/A",
  "total_slots": number,
  "schedule": [
    {{
      "day": "Monday",
      "time": "09:00 - 10:00",
      "period": 1,
      "subject": "Subject Name",
      "subject_code": "CS101",
      "teacher": "Prof. Name",
      "room": "101",
      "class_group": "CSE-A"
    }}
  ]
}}"""
    
    print("🤖 Structuring with Groq Llama 3...")
    
    # Send to Groq
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an expert at parsing and structuring timetable data. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=4096,
        temperature=0.1  # Low temperature for more consistent output
    )
    
    # Parse response
    raw_text = response.choices[0].message.content.strip()
    
    # Clean JSON from markdown
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()
    
    return json.loads(raw_text)


def print_table(data: dict):
    """Print schedule in a beautiful table format."""
    schedule = data.get("schedule", [])
    
    if not schedule:
        print("No schedule data found!")
        return
    
    # Print header
    print("\n" + "═" * 100)
    print(f"  📚 TIMETABLE: {data.get('college_name', 'Unknown')} | Total Slots: {data.get('total_slots', len(schedule))}")
    print("═" * 100)
    
    # Column headers
    headers = ["Day", "Time", "Period", "Subject", "Teacher", "Room", "Class"]
    widths = [10, 15, 6, 20, 18, 8, 10]
    
    # Print header row
    header_row = "│"
    for h, w in zip(headers, widths):
        header_row += f" {h.center(w)} │"
    print("┌" + "─" * (sum(widths) + len(widths) * 3 + 1) + "┐")
    print(header_row)
    print("├" + "─" * (sum(widths) + len(widths) * 3 + 1) + "┤")
    
    # Print rows
    for entry in schedule:
        row = "│"
        values = [
            str(entry.get("day", "N/A"))[:widths[0]],
            str(entry.get("time", "N/A"))[:widths[1]],
            str(entry.get("period", "N/A"))[:widths[2]],
            str(entry.get("subject", "N/A"))[:widths[3]],
            str(entry.get("teacher", "N/A"))[:widths[4]],
            str(entry.get("room", "N/A"))[:widths[5]],
            str(entry.get("class_group", "N/A"))[:widths[6]]
        ]
        for v, w in zip(values, widths):
            row += f" {v.ljust(w)} │"
        print(row)
    
    print("└" + "─" * (sum(widths) + len(widths) * 3 + 1) + "┘")


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_timetable.py <image_path>")
        print("Example: python parse_timetable.py \"C:\\Users\\Downloads\\timetable.jpeg\"")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        print(f"ERROR: File not found: {image_path}")
        sys.exit(1)
    
    try:
        # Step 1: Extract raw text with OCR
        raw_text = extract_text_with_ocr(image_path)
        
        print("\n" + "═" * 50)
        print("  📝 RAW OCR TEXT")
        print("═" * 50)
        print(raw_text[:1000] + ("..." if len(raw_text) > 1000 else ""))
        
        # Step 2: Structure with Groq
        data = structure_with_groq(raw_text)
        
        # Print JSON output
        print("\n" + "═" * 50)
        print("  📋 STRUCTURED JSON OUTPUT")
        print("═" * 50)
        print(json.dumps(data, indent=2))
        
        # Print table output
        print_table(data)
        
        print("\n✅ Parsing complete!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
