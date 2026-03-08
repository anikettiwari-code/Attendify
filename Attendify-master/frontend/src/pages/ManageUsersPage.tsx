import { useEffect, useState } from 'react';
import { userService, type UserRecord } from '../services/userService';
import type { UserRole, User } from '../types/auth.types';
import * as authService from '../services/authService';
import { TOKEN_KEY } from '../utils/constants';
import './ManageUsersPage.css';

const defaultNewUser = { username: '', password: '', role: 'STUDENT' as UserRole, email: '', full_name: '' };

const ManageUsersPage = () => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({ ...defaultNewUser });

    const [currentUser, setCurrentUser] = useState<User | null>(authService.getStoredUser());
    const storedRole = (currentUser?.role || localStorage.getItem('userRole') || '').toUpperCase();
    const isAdmin = storedRole === 'ADMIN';
    const hasToken = !!localStorage.getItem(TOKEN_KEY);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.list();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message || 'Failed to load users';
            setError(detail);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const validateAndLoad = async () => {
            if (!hasToken) {
                setLoading(false);
                setError('You are not authenticated. Please log in again.');
                return;
            }

            try {
                const me = await authService.getCurrentUser();
                setCurrentUser(me);

                if (me.role !== 'ADMIN') {
                    setLoading(false);
                    setError('Admin access required to view and manage users.');
                    return;
                }

                await loadUsers();
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Could not validate credentials.';
                setError(message);
                setLoading(false);
            }
        };

        validateAndLoad();
    }, [hasToken]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) {
            setError('Username and password are required');
            return;
        }
        try {
            setCreating(true);
            setError(null);
            const created = await userService.create({
                username: newUser.username.trim(),
                password: newUser.password,
                role: newUser.role,
                email: newUser.email || undefined,
                full_name: newUser.full_name || undefined,
                is_active: true,
            });
            setUsers(prev => [...prev, created]);
            setNewUser({ ...defaultNewUser });
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || 'Create failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this user?')) return;
        try {
            await userService.remove(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Delete failed');
        }
    };

    if (!isAdmin && !loading) {
        return (
            <div className="manage-users-page">
                <div className="mup-header">
                    <div>
                        <h1>Manage Users</h1>
                        <p>Admin only: Add or remove users.</p>
                    </div>
                </div>
                <div className="mup-card" style={{ marginTop: '16px' }}>
                    <p>{error || 'You need admin privileges to view this page.'}</p>
                    <button className="btn-primary" onClick={() => { globalThis.location.href = '/login'; }}>Go to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-users-page">
            <div className="mup-header">
                <div>
                    <h1>Manage Users</h1>
                    <p>Admin only: Add or remove users.</p>
                </div>
            </div>

            <div className="mup-grid">
                <section className="mup-card">
                    <h3>Current Users</h3>
                    {loading && <p>Loading...</p>}
                    {!loading && users.length === 0 && <p>No users found.</p>}
                    {!loading && users.length > 0 && (
                        <div className="mup-table-wrapper">
                            <table className="mup-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Email</th>
                                        <th>Active</th>
                                        <th>Created</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.username}</td>
                                            <td><span className="role-pill">{user.role}</span></td>
                                            <td>{user.email || '-'}</td>
                                            <td>{user.is_active ? 'Yes' : 'No'}</td>
                                            <td>{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</td>
                                            <td>
                                                <button className="btn-danger" onClick={() => handleDelete(user.id)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {error && <div className="mup-error">{error}</div>}
                </section>

                <section className="mup-card">
                    <h3>Create User</h3>
                    <form className="mup-form" onSubmit={handleCreate}>
                        <div className="form-row">
                            <label htmlFor="new-username">Username</label>
                            <input
                                id="new-username"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <label htmlFor="new-password">Password</label>
                            <input
                                id="new-password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <label htmlFor="new-role">Role</label>
                            <select
                                id="new-role"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                            >
                                <option value="ADMIN">ADMIN</option>
                                <option value="FACULTY">FACULTY</option>
                                <option value="STUDENT">STUDENT</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <label htmlFor="new-email">Email</label>
                            <input
                                id="new-email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            />
                        </div>
                        <div className="form-row">
                            <label htmlFor="new-full-name">Full Name</label>
                            <input
                                id="new-full-name"
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                            />
                        </div>
                        <button className="btn-primary" type="submit" disabled={creating}>
                            {creating ? 'Creating...' : 'Create User'}
                        </button>
                        {error && <div className="mup-error">{error}</div>}
                    </form>
                </section>
            </div>
        </div>
    );
};

export default ManageUsersPage;
