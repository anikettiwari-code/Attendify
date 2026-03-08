# Attendify Backend

Enterprise-grade unified system for Attendance Verification & Timetable Generation using AI-powered constraint solving.

## Features

- **Face Recognition Attendance**: Secure biometric attendance verification
- **AI-Powered Timetable Generation**: Constraint-based scheduling using Google OR-Tools
- **RESTful API**: FastAPI-based modern API with automatic documentation
- **Database Integration**: SQLAlchemy ORM with SQLite/PostgreSQL support (Supabase ready)
- **Enterprise Architecture**: Modular, scalable, and maintainable codebase

## Database Configuration

The system supports both SQLite (default) and PostgreSQL (e.g., Supabase).

### Supabase Setup
To use Supabase, set the `DATABASE_URL` environment variable in your `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
```

If the connection to the configured database fails, the system automatically falls back to the local SQLite database (`attendance.db`).

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── attendance.py    # Attendance endpoints
│   │   │   └── timetable.py     # Timetable management
│   │   └── __init__.py
│   ├── core/
│   │   ├── config.py            # Configuration management
│   │   ├── database.py          # Database setup
│   │   └── logging.py           # Logging configuration
│   ├── models/
│   │   ├── attendance.py        # Attendance models
│   │   └── timetable.py         # Timetable models
│   ├── schemas/
│   │   ├── attendance.py        # Attendance schemas
│   │   └── timetable.py         # Timetable schemas
│   ├── services/
│   │   ├── face_recognition.py  # Face recognition service
│   │   └── timetable_solver.py  # OR-Tools solver
│   └── main.py                  # FastAPI application
├── main.py                      # Entry point
├── pyproject.toml               # Project configuration
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd attendify/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -e .
   ```

4. **For face recognition (production)**
   ```bash
   pip install -e ".[face-recognition]"
   ```

## Running the Application

```bash
python main.py
```

The API will be available at `http://localhost:8000`

- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

## API Endpoints

### Attendance
- `POST /api/attendance/register` - Register student with face
- `POST /api/attendance/mark_attendance` - Mark attendance
- `GET /api/attendance/logs` - Get attendance logs
- `GET /api/attendance/students` - Get registered students

### Timetable
- `GET /api/timetable/teachers` - List teachers
- `POST /api/timetable/teachers` - Create teacher
- `GET /api/timetable/rooms` - List rooms
- `POST /api/timetable/rooms` - Create room
- `GET /api/timetable/subjects` - List subjects
- `POST /api/timetable/subjects` - Create subject
- `GET /api/timetable/class-groups` - List class groups
- `POST /api/timetable/class-groups` - Create class group
- `POST /api/timetable/generate` - Generate timetable
- `GET /api/timetable/schedule` - Get generated schedule

### Utilities
- `POST /api/seed` - Seed database with sample data
- `GET /` - Health check

## Configuration

Environment variables:
- `DATABASE_URL`: Database connection string (default: sqlite:///attendance.db)
- `DEBUG_MODE`: Enable debug logging (default: false)
- `CORS_ORIGINS`: Allowed CORS origins (default: *)

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
isort .
```

### Linting
```bash
flake8 .
```

## Production Deployment

1. Install face recognition dependencies
2. Set environment variables
3. Use production WSGI server (e.g., gunicorn)
4. Configure reverse proxy (nginx)

## License

MIT License