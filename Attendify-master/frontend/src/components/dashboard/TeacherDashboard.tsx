import { useEffect, useState } from 'react';
import { attendanceStatsService } from '../../services/attendanceStatsService';
import type { AttendanceStats } from '../../services/attendanceStatsService';
import './TeacherDashboard.css';

interface TeacherDashboardProps {
    role?: string;
}

const TeacherDashboard = ({ role }: TeacherDashboardProps) => {
    const [stats, setStats] = useState<AttendanceStats>({
        total_students: 0,
        present_today: 0,
        absent_today: 0,
        attendance_rate: 0,
        weekly_data: [],
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await attendanceStatsService.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch attendance stats:", error);
        }
    };

    const maxVal = 60; // Max value for chart scale
    const userName = localStorage.getItem('userName') || 'Faculty';
    const roleLabel = role === 'ADMIN' ? 'Admin' : 'Faculty';

    return (
        <div className="teacher-dashboard">
            <div className="td-header">
                <div className="td-header-content">
                    {/* Left side - Logo and App Name */}
                    <div className="td-brand">
                        <img src="/logo.png" alt="Attendify" className="app-logo" />
                        <span className="app-name">Attendify</span>
                    </div>

                    {/* Right side - User Info */}
                    <div className="td-user-section">
                        <div className="td-user-info">
                            <span className="user-name">{userName}</span>
                            <span className="user-role">{roleLabel}</span>
                        </div>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=fff&color=3B753D&size=40`}
                            alt="Profile"
                            className="user-avatar"
                        />
                    </div>
                </div>
            </div>

            <div className="td-main-content">
                {/* Summary Cards Row */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-header">
                            <span>Total Students</span>
                            <i className='bx bx-group'></i>
                        </div>
                        <div className="stat-value">{stats.total_students}</div>
                        <div className="stat-sub">Registered in system</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <span>Present Today</span>
                            <i className='bx bx-check-circle success'></i>
                        </div>
                        <div className="stat-value">{stats.present_today}</div>
                        <div className="stat-sub">Verified attendance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <span>Absent Today</span>
                            <i className='bx bx-x-circle error'></i>
                        </div>
                        <div className="stat-value">{stats.absent_today}</div>
                        <div className="stat-sub">Not marked present</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <span>Attendance Rate</span>
                            <i className='bx bx-calendar'></i>
                        </div>
                        <div className="stat-value">{stats.attendance_rate}%</div>
                        <div className="stat-sub">Today's overall rate</div>
                    </div>
                </div>

                {/* Weekly Trend Chart */}
                <div className="chart-section">
                    <div className="chart-header">
                        <h3>Weekly Attendance Trend</h3>
                        <span>Last 7 days attendance overview</span>
                    </div>

                    <div className="chart-container">
                        <div className="y-axis">
                            <span>60</span>
                            <span>45</span>
                            <span>30</span>
                            <span>15</span>
                            <span>0</span>
                        </div>
                        <div className="bars-container">
                            {/* Grid lines */}
                            <div className="grid-lines">
                                <div className="line"></div>
                                <div className="line"></div>
                                <div className="line"></div>
                                <div className="line"></div>
                                <div className="line"></div>
                            </div>

                            {stats.weekly_data.map((d, i) => (
                                <div className="bar-group" key={i}>
                                    <div className="bars-wrapper">
                                        <div
                                            className="bar present"
                                            style={{ height: `${(d.present / maxVal) * 100}%` }}
                                        ></div>
                                        <div
                                            className="bar absent"
                                            style={{ height: `${(d.absent / maxVal) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="day-label">{d.day}</span>

                                    {/* Tooltip for hover */}
                                    <div className="chart-tooltip">
                                        <h4>{d.day}</h4>
                                        <div className="tooltip-item present">Present: {d.present}</div>
                                        <div className="tooltip-item absent">Absent: {d.absent}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
