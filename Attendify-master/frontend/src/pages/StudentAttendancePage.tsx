import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton } from '../styles/glassmorphism';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceLogEntry } from '../types';

const Container = styled.div`
  padding: 32px;
`;

const ActionsHeader = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

const LogItem = styled(GlassCard)`
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StudentAttendancePage = () => {
    const [logs, setLogs] = useState<AttendanceLogEntry[]>([]);
    const navigate = useNavigate();
    
    // Get user role
    const role = localStorage.getItem('userRole') || 'student';
    const isStudent = role === 'student';
    const isStaff = role === 'admin' || role === 'faculty';

    useEffect(() => {
        // ideally fetch logs for *this* student. 
        // For hackathon/demo, we'll fetch all and maybe filter client side or show all
        attendanceService.getLogs()
            .then(data => setLogs(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <Container>
            <h1>📅 Attendance Management</h1>
            
            <ActionsHeader>
                {/* Available for Everyone (Context: Student marks self, Staff marks others manually or supervises) */}
                <GlassButton 
                    onClick={() => navigate('/dashboard/mark-attendance')}
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                >
                    📷 Mark Attendance {isStudent && "(Self)"}
                </GlassButton>

                {/* Only for Staff */}
                {isStaff && (
                    <GlassButton 
                        onClick={() => navigate('/dashboard/register-student')}
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                        👤 Register New Student
                    </GlassButton>
                )}
            </ActionsHeader>

            <h2>Attendance History</h2>
            <div style={{ marginTop: '16px' }}>
                {logs.length === 0 ? <p>No records found.</p> : (
                    logs.map((log) => (
                        <LogItem key={log.id}>
                            <div>
                                <h3>{new Date(log.timestamp).toLocaleDateString()}</h3>
                                <p style={{ opacity: 0.7 }}>{new Date(log.timestamp).toLocaleTimeString()}</p>
                            </div>
                            <span style={{ 
                                color: log.status === 'Present' ? '#4caf50' : '#f44336', 
                                fontWeight: 'bold' 
                            }}>
                                {log.status}
                            </span>
                        </LogItem>
                    ))
                )}
            </div>
        </Container>
    );
};

export default StudentAttendancePage;
