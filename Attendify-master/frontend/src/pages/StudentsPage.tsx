import { useState, useEffect } from 'react';
import './StudentsPage.css';
import { studentService } from '../services/studentService';

const StudentsPage = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            const data = await studentService.getAll();
            // Transform data to match UI needs - assuming backend stats or defaults
            // Real backend returns Student[]: { id, name, roll_number... }
            // We need to fetch attendance status separately or join it. 
            // For now, we'll map basic fields and default status until the join API exists.
            const uiData = data.map(s => ({
                id: s.roll_number,
                name: s.name,
                class: 'Unknown', // Backend doesn't store class yet?
                status: 'Not Marked', // Real status requires syncing with attendance logs
                time: '-',
                db_id: s.id
            }));
            setStudents(uiData);
        } catch (error) {
            console.error("Failed to load students:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Present': return 'status-badge present';
            case 'Absent': return 'status-badge absent';
            default: return 'status-badge not-marked';
        }
    };

    if (loading) return <div className="p-4">Loading students...</div>;

    return (
        <div className="students-page">
            <div className="sp-header">
                <h2>Student List</h2>
                <p>Manage and verify student attendance</p>
                <button onClick={loadStudents} className="btn-scan" style={{marginLeft: 'auto', padding: '8px 16px'}}>
                    <i className='bx bx-refresh'></i> Refresh
                </button>
            </div>

            <div className="sp-table-container">
                <table className="sp-table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Last Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student.db_id ?? student.id}>
                                <td className="text-secondary">{student.id}</td>
                                <td className="font-medium">{student.name}</td>
                                <td>{student.class}</td>
                                <td>
                                    <span className={getStatusClass(student.status)}>
                                        {student.status}
                                    </span>
                                </td>
                                <td>{student.time}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-icon check" aria-label="Mark Present">
                                            <i className='bx bx-check-circle'></i>
                                        </button>
                                        <button className="btn-icon x-mark" aria-label="Mark Absent">
                                            <i className='bx bx-x-circle'></i>
                                        </button>
                                        <button className="btn-icon qr" aria-label="QR Code">
                                            <i className='bx bx-qr-scan'></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentsPage;
