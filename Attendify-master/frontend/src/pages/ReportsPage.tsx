import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GlassCard, GlassButton } from '../styles/glassmorphism';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceLogEntry } from '../types';

const Container = styled.div`
  padding: 32px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  th {
    font-weight: 600;
    opacity: 0.8;
  }
`;

const ReportsPage = () => {
    const [logs, setLogs] = useState<AttendanceLogEntry[]>([]);
    
    useEffect(() => {
        attendanceService.getLogs()
            .then(data => setLogs(data))
            .catch(err => console.error(err));
    }, []);

    const downloadCSV = () => {
        const headers = "ID,Name,Roll No,Status,Time\n";
        const rows = logs.map(l => `${l.id},${l.student_name},${l.roll_number},${l.status},${l.timestamp}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    return (
        <Container>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
                <h1>📊 Attendance Reports</h1>
                <GlassButton onClick={downloadCSV}>📥 Export CSV</GlassButton>
            </div>
            
            <GlassCard>
                <Table>
                    <thead>
                        <tr>
                            <th>Log ID</th>
                            <th>Student Name</th>
                            <th>Roll No</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td>#{log.id}</td>
                                <td>{log.student_name}</td>
                                <td>{log.roll_number}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        background: log.status === 'Present' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                        color: log.status === 'Present' ? '#4caf50' : '#f44336'
                                    }}>
                                        {log.status}
                                    </span>
                                </td>
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </GlassCard>
        </Container>
    );
};

export default ReportsPage;
