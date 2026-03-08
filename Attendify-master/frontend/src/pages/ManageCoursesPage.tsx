import { useEffect, useState } from 'react';
import { courseService, type CourseRecord } from '../services/courseService';
import { TOKEN_KEY } from '../utils/constants';
import './ManageCoursesPage.css';

const defaultNewCourse = {
    name: '',
    code: '',
    weekly_sessions: 3,
    requires_lab: false,
};

const ManageCoursesPage = () => {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newCourse, setNewCourse] = useState({ ...defaultNewCourse });

    const storedRole = (localStorage.getItem('userRole') || '').toUpperCase();
    const isAdmin = storedRole === 'ADMIN';
    const hasToken = !!localStorage.getItem(TOKEN_KEY);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const data = await courseService.list();
            setCourses(data);
            setError(null);
        } catch (err: any) {
            const detail = err?.message || 'Failed to load courses';
            setError(detail);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            setError('Admin access required to view and manage courses.');
            return;
        }

        if (!hasToken) {
            setLoading(false);
            setError('You are not authenticated. Please log in again.');
            return;
        }

        loadCourses();
    }, [isAdmin, hasToken]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourse.name || !newCourse.code) {
            setError('Name and code are required');
            return;
        }
        try {
            setCreating(true);
            setError(null);
            const created = await courseService.create({
                name: newCourse.name.trim(),
                code: newCourse.code.trim().toUpperCase(),
                weekly_sessions: Number(newCourse.weekly_sessions) || 1,
                requires_lab: newCourse.requires_lab,
            });
            setCourses(prev => [...prev, created]);
            setNewCourse({ ...defaultNewCourse });
        } catch (err: any) {
            setError(err?.message || 'Create failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this course?')) return;
        try {
            await courseService.remove(id);
            setCourses(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            setError(err?.message || 'Delete failed');
        }
    };

    if (!isAdmin) {
        return (
            <div className="manage-courses-page">
                <div className="mcp-header">
                    <div>
                        <h1>Manage Courses</h1>
                        <p>Admin only: Add or remove courses.</p>
                    </div>
                </div>
                <div className="mcp-card" style={{ marginTop: '16px' }}>
                    <p>{error || 'You need admin privileges to view this page.'}</p>
                    <button className="btn-primary" onClick={() => { globalThis.location.href = '/login'; }}>Go to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-courses-page">
            <div className="mcp-header">
                <div>
                    <h1>Manage Courses</h1>
                    <p>Admin only: Add or remove courses.</p>
                </div>
            </div>

            <div className="mcp-grid">
                <section className="mcp-card">
                    <h3>Current Courses</h3>
                    {loading && <p>Loading...</p>}
                    {!loading && courses.length === 0 && <p>No courses found.</p>}
                    {!loading && courses.length > 0 && (
                        <div className="mcp-table-wrapper">
                            <table className="mcp-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Weekly Sessions</th>
                                        <th>Lab</th>
                                        <th>Teachers</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map(course => (
                                        <tr key={course.id}>
                                            <td>{course.id}</td>
                                            <td>{course.name}</td>
                                            <td><span className="role-pill">{course.code}</span></td>
                                            <td>{course.weekly_sessions}</td>
                                            <td>{course.requires_lab ? 'Yes' : 'No'}</td>
                                            <td>{course.teachers?.map(t => t.name).join(', ') || '-'}</td>
                                            <td>
                                                <button className="btn-danger" onClick={() => handleDelete(course.id)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {error && <div className="mcp-error">{error}</div>}
                </section>

                <section className="mcp-card">
                    <h3>Create Course</h3>
                    <form className="mcp-form" onSubmit={handleCreate}>
                        <div className="form-row">
                            <label htmlFor="course-name">Course Name</label>
                            <input
                                id="course-name"
                                value={newCourse.name}
                                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <label htmlFor="course-code">Course Code</label>
                            <input
                                id="course-code"
                                value={newCourse.code}
                                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <label htmlFor="weekly-sessions">Weekly Sessions</label>
                            <input
                                id="weekly-sessions"
                                type="number"
                                min={1}
                                value={newCourse.weekly_sessions}
                                onChange={(e) => setNewCourse({ ...newCourse, weekly_sessions: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="form-row mcp-checkbox">
                            <input
                                id="requires-lab"
                                type="checkbox"
                                checked={newCourse.requires_lab}
                                onChange={(e) => setNewCourse({ ...newCourse, requires_lab: e.target.checked })}
                            />
                            <label htmlFor="requires-lab">Requires Lab</label>
                        </div>
                        <button className="btn-primary" type="submit" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Course'}
                        </button>
                        {error && <div className="mcp-error">{error}</div>}
                    </form>
                </section>
            </div>
        </div>
    );
};

export default ManageCoursesPage;
