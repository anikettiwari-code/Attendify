"""
Enterprise Analytics API
========================
Comprehensive attendance analytics, anomaly detection dashboard,
and reporting endpoints for administrators and faculty.

Endpoints:
- GET /anomalies - Recent security anomalies
- GET /stats - Overall statistics
- GET /dashboard - Complete dashboard data
- GET /reports/attendance - Attendance reports
- GET /reports/security - Security audit reports
- GET /trends - Time-series trend analysis
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, and_, case, extract
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.database import get_db
from app.models.attendance import AttendanceLog, Student
from app.models.session import AttendanceSession, SessionStatus
from app.services.anomaly_service import RiskLevel

router = APIRouter()


@router.get("/anomalies")
def get_anomalies(
    limit: int = Query(50, le=200),
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Fetch recent security anomalies for the dashboard.
    Optionally filter by risk level.
    """
    query = db.query(AttendanceLog).options(
        joinedload(AttendanceLog.student)
    ).filter(AttendanceLog.is_anomaly == True)
    
    if risk_level:
        # Filter by anomaly reason containing risk indicators
        if risk_level == "CRITICAL":
            query = query.filter(AttendanceLog.anomaly_reason.like("%🚨%") | 
                                AttendanceLog.anomaly_reason.like("%🔴%"))
        elif risk_level == "HIGH":
            query = query.filter(AttendanceLog.anomaly_reason.like("%Impossible%"))
    
    anomalies = query.order_by(desc(AttendanceLog.timestamp)).limit(limit).all()
    
    return [{
        "id": a.id,
        "timestamp": a.timestamp.isoformat(),
        "student_name": a.student.name if a.student else "Unknown",
        "student_roll": a.student.roll_number if a.student else None,
        "status": a.status,
        "confidence": a.confidence,
        "anomaly_reason": a.anomaly_reason,
        "verification_method": a.verification_method,
        "ip_address": a.ip_address[:8] + "***" if a.ip_address else None,  # Masked for privacy
        "location": {"lat": a.latitude, "lon": a.longitude} if a.latitude else None
    } for a in anomalies]


@router.get("/stats")
def get_stats(
    days: int = Query(7, le=90),
    db: Session = Depends(get_db)
):
    """Get comprehensive statistics for analytics charts."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Base queries
    total_logs = db.query(AttendanceLog).filter(AttendanceLog.timestamp >= cutoff).count()
    total_anomalies = db.query(AttendanceLog).filter(
        AttendanceLog.is_anomaly == True,
        AttendanceLog.timestamp >= cutoff
    ).count()
    
    # Success rate
    successful = db.query(AttendanceLog).filter(
        AttendanceLog.timestamp >= cutoff,
        AttendanceLog.status.like("%Verified%")
    ).count()
    
    # Verification method breakdown
    method_stats = db.query(
        AttendanceLog.verification_method,
        func.count(AttendanceLog.id)
    ).filter(
        AttendanceLog.timestamp >= cutoff
    ).group_by(AttendanceLog.verification_method).all()
    
    # Proxy suspected count
    proxy_count = db.query(AttendanceLog).filter(
        AttendanceLog.timestamp >= cutoff,
        AttendanceLog.is_proxy_suspected == True
    ).count()
    
    # Average confidence
    avg_confidence = db.query(func.avg(AttendanceLog.confidence)).filter(
        AttendanceLog.timestamp >= cutoff,
        AttendanceLog.confidence > 0
    ).scalar() or 0
    
    # Unique students
    unique_students = db.query(func.count(func.distinct(AttendanceLog.student_id))).filter(
        AttendanceLog.timestamp >= cutoff
    ).scalar()
    
    return {
        "period_days": days,
        "total_logs": total_logs,
        "total_anomalies": total_anomalies,
        "anomaly_rate": round((total_anomalies / total_logs * 100) if total_logs > 0 else 0, 2),
        "success_rate": round((successful / total_logs * 100) if total_logs > 0 else 0, 2),
        "proxy_suspected": proxy_count,
        "avg_confidence": round(avg_confidence, 1),
        "unique_students": unique_students,
        "verification_methods": {m: c for m, c in method_stats if m}
    }


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """
    Complete dashboard data in a single call.
    Optimized for frontend rendering.
    """
    today = datetime.now(timezone.utc).date()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Today's stats
    today_logs = db.query(AttendanceLog).filter(
        func.date(AttendanceLog.timestamp) == today
    ).count()
    
    today_anomalies = db.query(AttendanceLog).filter(
        func.date(AttendanceLog.timestamp) == today,
        AttendanceLog.is_anomaly == True
    ).count()
    
    # Active sessions
    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == SessionStatus.ACTIVE.value
    ).count()
    
    # Weekly trend (daily counts)
    daily_trend = []
    for i in range(7):
        day = today - timedelta(days=i)
        count = db.query(AttendanceLog).filter(
            func.date(AttendanceLog.timestamp) == day
        ).count()
        anomaly_count = db.query(AttendanceLog).filter(
            func.date(AttendanceLog.timestamp) == day,
            AttendanceLog.is_anomaly == True
        ).count()
        daily_trend.append({
            "date": day.isoformat(),
            "attendance": count,
            "anomalies": anomaly_count
        })
    
    # Top anomaly types
    anomaly_reasons = db.query(AttendanceLog.anomaly_reason).filter(
        AttendanceLog.is_anomaly == True,
        AttendanceLog.timestamp >= week_ago
    ).all()
    
    reason_counts = {}
    for (reason,) in anomaly_reasons:
        if reason:
            for r in reason.split(", "):
                # Extract type from emoji prefix
                key = r.split(" ")[0] if r else "Unknown"
                reason_counts[key] = reason_counts.get(key, 0) + 1
    
    # Recent critical anomalies
    critical_anomalies = db.query(AttendanceLog).options(
        joinedload(AttendanceLog.student)
    ).filter(
        AttendanceLog.is_anomaly == True,
        AttendanceLog.anomaly_reason.like("%🚨%") | AttendanceLog.anomaly_reason.like("%🔴%")
    ).order_by(desc(AttendanceLog.timestamp)).limit(5).all()
    
    return {
        "today": {
            "total_attendance": today_logs,
            "anomalies": today_anomalies,
            "active_sessions": active_sessions,
            "security_score": 100 - (today_anomalies / today_logs * 100) if today_logs > 0 else 100
        },
        "weekly_trend": list(reversed(daily_trend)),
        "anomaly_breakdown": reason_counts,
        "critical_alerts": [{
            "id": a.id,
            "student": a.student.name if a.student else "Unknown",
            "reason": a.anomaly_reason,
            "time": a.timestamp.isoformat()
        } for a in critical_anomalies]
    }


@router.get("/reports/attendance")
def get_attendance_report(
    session_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate attendance report with detailed statistics."""
    query = db.query(AttendanceLog).options(joinedload(AttendanceLog.student))
    
    if session_id:
        query = query.filter(AttendanceLog.session_id == session_id)
    
    if start_date:
        query = query.filter(AttendanceLog.timestamp >= datetime.fromisoformat(start_date))
    
    if end_date:
        query = query.filter(AttendanceLog.timestamp <= datetime.fromisoformat(end_date))
    
    logs = query.order_by(desc(AttendanceLog.timestamp)).limit(500).all()
    
    # Calculate summary
    total = len(logs)
    verified = sum(1 for l in logs if "Verified" in l.status)
    rejected = sum(1 for l in logs if "Rejected" in l.status)
    
    return {
        "summary": {
            "total": total,
            "verified": verified,
            "rejected": rejected,
            "verification_rate": round(verified / total * 100, 1) if total > 0 else 0
        },
        "records": [{
            "id": l.id,
            "student_name": l.student.name if l.student else "Unknown",
            "roll_number": l.student.roll_number if l.student else None,
            "timestamp": l.timestamp.isoformat(),
            "status": l.status,
            "confidence": l.confidence,
            "method": l.verification_method,
            "is_anomaly": l.is_anomaly
        } for l in logs]
    }


@router.get("/reports/security")
def get_security_report(
    days: int = Query(7, le=30),
    db: Session = Depends(get_db)
):
    """Generate security audit report."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # All anomalies in period
    anomalies = db.query(AttendanceLog).options(
        joinedload(AttendanceLog.student)
    ).filter(
        AttendanceLog.is_anomaly == True,
        AttendanceLog.timestamp >= cutoff
    ).all()
    
    # Categorize by type
    location_anomalies = [a for a in anomalies if a.anomaly_reason and "📍" in a.anomaly_reason]
    time_anomalies = [a for a in anomalies if a.anomaly_reason and "⏰" in a.anomaly_reason]
    travel_anomalies = [a for a in anomalies if a.anomaly_reason and ("🚨" in a.anomaly_reason or "Impossible" in a.anomaly_reason)]
    device_anomalies = [a for a in anomalies if a.anomaly_reason and "🔄" in a.anomaly_reason]
    
    # Students with most anomalies
    student_anomaly_counts = {}
    for a in anomalies:
        if a.student:
            key = (a.student.id, a.student.name)
            student_anomaly_counts[key] = student_anomaly_counts.get(key, 0) + 1
    
    top_flagged = sorted(student_anomaly_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "period_days": days,
        "total_anomalies": len(anomalies),
        "breakdown": {
            "location": len(location_anomalies),
            "timing": len(time_anomalies),
            "impossible_travel": len(travel_anomalies),
            "device": len(device_anomalies)
        },
        "risk_assessment": {
            "critical": len([a for a in anomalies if a.anomaly_reason and "🚨" in a.anomaly_reason]),
            "high": len([a for a in anomalies if a.anomaly_reason and "🔴" in a.anomaly_reason]),
            "medium": len([a for a in anomalies if a.anomaly_reason and "🟡" in a.anomaly_reason])
        },
        "flagged_students": [
            {"student_id": sid, "name": name, "anomaly_count": count}
            for (sid, name), count in top_flagged
        ],
        "recommendations": [
            "Review impossible travel cases for potential credential sharing",
            "Verify off-campus attendance manually",
            "Consider enabling liveness detection for high-risk students"
        ] if len(anomalies) > 10 else []
    }


@router.get("/trends")
def get_trends(
    metric: str = Query("attendance", regex="^(attendance|anomalies|confidence)$"),
    period: str = Query("week", regex="^(day|week|month)$"),
    db: Session = Depends(get_db)
):
    """Get time-series trend data for charts."""
    if period == "day":
        intervals = 24
        delta = timedelta(hours=1)
        date_fmt = "%H:00"
    elif period == "week":
        intervals = 7
        delta = timedelta(days=1)
        date_fmt = "%a"
    else:  # month
        intervals = 30
        delta = timedelta(days=1)
        date_fmt = "%d"
    
    now = datetime.now(timezone.utc)
    data = []
    
    for i in range(intervals):
        start = now - delta * (intervals - i)
        end = start + delta
        
        query = db.query(AttendanceLog).filter(
            AttendanceLog.timestamp >= start,
            AttendanceLog.timestamp < end
        )
        
        if metric == "attendance":
            value = query.count()
        elif metric == "anomalies":
            value = query.filter(AttendanceLog.is_anomaly == True).count()
        else:  # confidence
            value = query.with_entities(func.avg(AttendanceLog.confidence)).scalar() or 0
        
        data.append({
            "label": start.strftime(date_fmt),
            "value": round(value, 1) if metric == "confidence" else value
        })
    
    return {
        "metric": metric,
        "period": period,
        "data": data
    }

