import { useEffect, useState } from 'react';
import { apiClient } from '../../utils/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const userName = localStorage.getItem('userName') || 'Student';
    
    const [stats, setStats] = useState({
        totalClasses: 0,
        classesAttended: 0,
        attendanceRate: 0,
        rateChange: 0
    });
    
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

    useEffect(() => {
        fetchStudentData();
    }, []);

    const fetchStudentData = async () => {
        try {
            // Fetch recent attendance logs
            const logsResponse = await apiClient.get('/api/attendance/logs', {
                params: { limit: 5 }
            });
            const logs = logsResponse.data;
            
            // Transform logs to recent attendance format
            const recent = logs.map((log: any) => ({
                subject: 'Class', // In production, we would link this to actual subject via session
                date: new Date(log.timestamp).toLocaleDateString(),
                time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: log.status.includes('Verified') ? 'present' : 'absent'
            }));
            setRecentAttendance(recent);

            // Calculate simple stats from logs
            const totalLogs = logs.length;
            const presentCount = logs.filter((log: any) => log.status.includes('Verified')).length;
            const rate = totalLogs > 0 ? (presentCount / totalLogs) * 100 : 0;

            setStats({
                totalClasses: totalLogs,
                classesAttended: presentCount,
                attendanceRate: parseFloat(rate.toFixed(1)),
                rateChange: 0 // Would need historical data for real change calculation
            });
        } catch (error) {
            console.error("Failed to fetch student data:", error);
        }
    };

    return (
        <div className="student-dashboard">
            {/* Header */}
            <div className="sd-header">
                <div className="sd-header-content">
                    <div className="sd-brand">
                        <img src="/logo.png" alt="Attendify" className="app-logo" />
                        <span className="app-name">Attendify</span>
                    </div>
                    <div className="sd-user-section">
                        <div className="sd-user-info">
                            <span className="user-name">{userName}</span>
                            <span className="user-role">Student</span>
                        </div>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=fff&color=3B753D&size=40`}
                            alt="Profile"
                            className="user-avatar"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="sd-main-content">
                {/* Welcome Section */}
                <div className="sd-welcome">
                    <h1>Welcome back, {userName.split(' ')[0]}!</h1>
                    <p>Here's your attendance overview</p>
                </div>

                {/* Stats Cards */}
                <div className="sd-stats-row">
                    <div className="sd-stat-card">
                        <div className="stat-header">
                            <span>Total Classes</span>
                            <i className='bx bx-calendar'></i>
                        </div>
                        <div className="stat-value">{stats.totalClasses}</div>
                        <div className="stat-sub">This semester</div>
                    </div>
                    <div className="sd-stat-card">
                        <div className="stat-header">
                            <span>Classes Attended</span>
                            <i className='bx bx-check-circle success'></i>
                        </div>
                        <div className="stat-value">{stats.classesAttended}</div>
                        <div className="stat-sub">Verified attendance</div>
                    </div>
                    <div className="sd-stat-card">
                        <div className="stat-header">
                            <span>Attendance Rate</span>
                            <i className='bx bx-trending-up'></i>
                        </div>
                        <div className="stat-value">{stats.attendanceRate}%</div>
                        <div className="stat-sub positive">Based on recent records</div>
                    </div>
                </div>

                {/* Attendance Progress */}
                <div className="sd-card">
                    <div className="card-header">
                        <h3>Attendance Progress</h3>
                        <p>Your overall attendance for this semester</p>
                    </div>
                    <div className="progress-section">
                        <div className="progress-label">
                            <span>Overall Progress</span>
                            <span className="progress-value">{stats.classesAttended} / {stats.totalClasses}</span>
                        </div>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${stats.totalClasses > 0 ? (stats.classesAttended / stats.totalClasses) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Recent Attendance */}
                <div className="sd-card">
                    <div className="card-header">
                        <h3>Recent Attendance</h3>
                        <p>Your attendance record for recent classes</p>
                    </div>
                    <div className="attendance-list">
                        {recentAttendance.length > 0 ? (
                            recentAttendance.map((record, index) => (
                                <div className="attendance-item" key={index}>
                                    <div className="attendance-info">
                                        <span className="subject-name">{record.subject}</span>
                                        <span className="attendance-datetime">{record.date} • {record.time}</span>
                                    </div>
                                    <span className={`status-badge ${record.status}`}>
                                        <i className={`bx ${record.status === 'present' ? 'bx-check-circle' : 'bx-x-circle'}`}></i>
                                        {record.status === 'present' ? 'Present' : 'Absent'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p style={{ textAlign: 'center', color: '#999' }}>No recent attendance records</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
