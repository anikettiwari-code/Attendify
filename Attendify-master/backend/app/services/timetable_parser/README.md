# Timetable Parser Module

This module handles parsing college timetable images into structured JSON data.

## How It Works

1. **Tesseract OCR** extracts raw text from timetable images
2. **Groq Llama 3.3 70B** structures the text into JSON format

## Usage

```bash
# From the backend directory
..\venv_new\Scripts\python timetable_parser\parse_timetable.py "path\to\timetable.jpeg"
```

## Dependencies

- `pytesseract` - Python wrapper for Tesseract OCR
- `groq` - Groq API client for fast LLM inference
- `pillow` - Image processing
- `python-dotenv` - Environment variable loading

## Required Environment Variables

Create a `.env` file in the `backend` directory:

```
GROQ_API_KEY=your_groq_api_key_here
```

## Output

The parser outputs:
1. **JSON format** - Structured schedule data
2. **Table format** - Pretty-printed table in CLI

### JSON Structure:
```json
{
  "college_name": "...",
  "total_slots": 10,
  "schedule": [
    {
      "day": "Monday",
      "time": "09:00 - 10:00",
      "period": 1,
      "subject": "Subject Name",
      "teacher": "Prof. Name",
      "room": "101",
      "class_group": "CSE-A"
    }
  ]
}
```
