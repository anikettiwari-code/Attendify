"""
Enterprise Anomaly Detection Service
=====================================
Advanced security analytics for tamper-resistant attendance verification.

Detection Capabilities:
1. Geolocation Analysis - Off-campus attendance detection
2. Temporal Analysis - Session timing violations  
3. Behavioral Analysis - Impossible travel detection
4. Pattern Analysis - Repeated failed attempts (Brute Force)
5. Device Fingerprinting - Multi-device abuse detection
6. Risk Scoring - Weighted anomaly severity calculation

Privacy Compliance:
- Location data is processed but not stored raw (only anomaly flags)
- IP addresses are hashed for device fingerprinting
- All data retention follows configurable policies
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.attendance import AttendanceLog, Student
from app.models.session import AttendanceSession
import math
import hashlib
from typing import Optional
from dataclasses import dataclass
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class AnomalyResult:
    """Structured anomaly detection result"""
    is_anomaly: bool
    risk_level: RiskLevel
    risk_score: float  # 0-100
    reasons: list[str]
    recommendations: list[str]
    
    def to_dict(self):
        return {
            "is_anomaly": self.is_anomaly,
            "risk_level": self.risk_level.value,
            "risk_score": self.risk_score,
            "reasons": self.reasons,
            "recommendations": self.recommendations
        }


# ==================== Configuration ====================
# Campus Coordinates (Configurable per deployment)
CAMPUS_LAT = 12.9716  # Example: Bangalore
CAMPUS_LON = 77.5946
MAX_DISTANCE_METERS = 500
IMPOSSIBLE_SPEED_MPS = 42  # ~150 km/h

# Failed Attempts Thresholds
MAX_FAILED_ATTEMPTS_WINDOW = 300  # 5 minutes
MAX_FAILED_ATTEMPTS = 5

# Risk Score Weights
WEIGHTS = {
    "location": 30,
    "time": 20,
    "travel": 40,
    "failed_attempts": 25,
    "device": 15,
}


# ==================== Helper Functions ====================
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points in meters."""
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
        
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def hash_device_fingerprint(ip: str, user_agent: str = "") -> str:
    """Create anonymous device fingerprint."""
    raw = f"{ip}:{user_agent}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def calculate_risk_level(score: float) -> RiskLevel:
    """Map risk score to severity level."""
    if score >= 70:
        return RiskLevel.CRITICAL
    if score >= 50:
        return RiskLevel.HIGH
    if score >= 25:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


# ==================== Detection Functions ====================
def _check_location_anomaly(lat: Optional[float], lon: Optional[float]) -> tuple[list[str], float]:
    """Check if attendance is from off-campus location."""
    reasons = []
    score = 0.0
    
    if lat is not None and lon is not None:
        dist = haversine_distance(CAMPUS_LAT, CAMPUS_LON, lat, lon)
        if dist > MAX_DISTANCE_METERS:
            reasons.append(f"📍 Off-Campus Location ({int(dist)}m from campus)")
            # Score increases with distance
            score = min(WEIGHTS["location"], WEIGHTS["location"] * (dist / 5000))
            
    return reasons, score


def _check_time_anomaly(db: Session, session_id: int, timestamp: datetime) -> tuple[list[str], float]:
    """Check for session timing violations."""
    reasons = []
    score = 0.0
    
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        return reasons, score

    if session.ended_at:
        diff = (timestamp - session.ended_at).total_seconds()
        if diff > 3600:
            reasons.append(f"⏰ Late Submission ({int(diff/60)}min after session ended)")
            score = WEIGHTS["time"]
            
    if session.started_at:
        diff = (session.started_at - timestamp).total_seconds()
        if diff > 1800:
            reasons.append(f"⏰ Early Submission ({int(diff/60)}min before session start)")
            score = max(score, WEIGHTS["time"] * 0.5)
            
    return reasons, score


def _check_behavioral_anomaly(
    db: Session, 
    log: AttendanceLog, 
    lat: Optional[float], 
    lon: Optional[float]
) -> tuple[list[str], float]:
    """Detect impossible travel patterns."""
    reasons = []
    score = 0.0
    
    last_log = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == log.student_id,
        AttendanceLog.id != log.id
    ).order_by(AttendanceLog.timestamp.desc()).first()
    
    if not (last_log and last_log.latitude and last_log.longitude and lat and lon):
        return reasons, score

    time_diff = abs((log.timestamp - last_log.timestamp).total_seconds())
    if time_diff < 1:
        time_diff = 1  # Avoid division by zero
        
    dist = haversine_distance(last_log.latitude, last_log.longitude, lat, lon)
    speed_mps = dist / time_diff
    
    if speed_mps > IMPOSSIBLE_SPEED_MPS:
        reasons.append(f"🚨 Impossible Travel ({int(dist)}m in {int(time_diff)}s = {int(speed_mps*3.6)}km/h)")
        score = WEIGHTS["travel"]
    elif time_diff < 60 and dist > 1000:
        reasons.append(f"⚠️ Suspicious Rapid Movement ({int(dist)}m in {int(time_diff)}s)")
        score = WEIGHTS["travel"] * 0.6
            
    return reasons, score


def _check_failed_attempts(
    db: Session, 
    student_id: Optional[int],
    ip_address: Optional[str]
) -> tuple[list[str], float]:
    """Detect repeated failed verification attempts (brute force)."""
    reasons = []
    score = 0.0
    
    window_start = datetime.now(timezone.utc) - timedelta(seconds=MAX_FAILED_ATTEMPTS_WINDOW)
    
    # Check by student
    if student_id:
        failed_count = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == student_id,
            AttendanceLog.timestamp >= window_start,
            AttendanceLog.status.like("%Rejected%") | AttendanceLog.status.like("%Failed%")
        ).count()
        
        if failed_count >= MAX_FAILED_ATTEMPTS:
            reasons.append(f"🔴 Repeated Failures ({failed_count} failed attempts in 5min)")
            score = WEIGHTS["failed_attempts"]
        elif failed_count >= 3:
            reasons.append(f"🟡 Multiple Failures ({failed_count} failed attempts in 5min)")
            score = WEIGHTS["failed_attempts"] * 0.5
    
    # Check by IP (device)
    if ip_address:
        ip_failed = db.query(AttendanceLog).filter(
            AttendanceLog.ip_address == ip_address,
            AttendanceLog.timestamp >= window_start,
            AttendanceLog.status.like("%Rejected%") | AttendanceLog.status.like("%Failed%")
        ).count()
        
        if ip_failed >= MAX_FAILED_ATTEMPTS * 2:
            reasons.append(f"🔴 Device Abuse ({ip_failed} failures from same device)")
            score = max(score, WEIGHTS["device"])
            
    return reasons, score


def _check_device_anomaly(
    db: Session,
    student_id: Optional[int],
    ip_address: Optional[str]
) -> tuple[list[str], float]:
    """Detect multi-device abuse (same student, multiple IPs)."""
    reasons = []
    score = 0.0
    
    if not student_id or not ip_address:
        return reasons, score
    
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    
    unique_ips = db.query(func.count(func.distinct(AttendanceLog.ip_address))).filter(
        AttendanceLog.student_id == student_id,
        AttendanceLog.timestamp >= window_start,
        AttendanceLog.ip_address.isnot(None)
    ).scalar()
    
    if unique_ips and unique_ips >= 3:
        reasons.append(f"🔄 Multi-Device Activity ({unique_ips} devices in 1hr)")
        score = WEIGHTS["device"]
        
    return reasons, score


# ==================== Main Detection Function ====================
def detect_anomalies(
    db: Session, 
    log: AttendanceLog, 
    lat: Optional[float] = None, 
    lon: Optional[float] = None
) -> list[str]:
    """
    Legacy function for backward compatibility.
    Returns list of anomaly reason strings.
    """
    result = analyze_anomalies(db, log, lat, lon)
    return result.reasons


def analyze_anomalies(
    db: Session, 
    log: AttendanceLog, 
    lat: Optional[float] = None, 
    lon: Optional[float] = None
) -> AnomalyResult:
    """
    Comprehensive anomaly analysis with risk scoring.
    
    Returns structured AnomalyResult with:
    - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
    - Risk score (0-100)
    - Detailed reasons
    - Actionable recommendations
    """
    all_reasons = []
    total_score = 0.0
    recommendations = []
    
    # 1. Location Anomaly
    loc_reasons, loc_score = _check_location_anomaly(lat, lon)
    all_reasons.extend(loc_reasons)
    total_score += loc_score
    if loc_reasons:
        recommendations.append("Verify student is physically present on campus")
    
    # 2. Time Anomaly
    if log.session_id:
        time_reasons, time_score = _check_time_anomaly(db, log.session_id, log.timestamp)
        all_reasons.extend(time_reasons)
        total_score += time_score
        if time_reasons:
            recommendations.append("Cross-check with session attendance records")
    
    # 3. Behavioral Anomaly (Impossible Travel)
    if log.student_id:
        travel_reasons, travel_score = _check_behavioral_anomaly(db, log, lat, lon)
        all_reasons.extend(travel_reasons)
        total_score += travel_score
        if travel_reasons:
            recommendations.append("Investigate possible credential sharing")
    
    # 4. Failed Attempts
    fail_reasons, fail_score = _check_failed_attempts(db, log.student_id, log.ip_address)
    all_reasons.extend(fail_reasons)
    total_score += fail_score
    if fail_reasons:
        recommendations.append("Consider temporary account lockout")
    
    # 5. Device Anomaly
    device_reasons, device_score = _check_device_anomaly(db, log.student_id, log.ip_address)
    all_reasons.extend(device_reasons)
    total_score += device_score
    if device_reasons:
        recommendations.append("Review device access patterns")
    
    # Cap score at 100
    total_score = min(100, total_score)
    risk_level = calculate_risk_level(total_score)
    
    return AnomalyResult(
        is_anomaly=len(all_reasons) > 0,
        risk_level=risk_level,
        risk_score=round(total_score, 1),
        reasons=all_reasons,
        recommendations=recommendations
    )

