import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import type { User } from '../types/auth.types';
import './ProfilePage.css';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(authService.getStoredUser());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains('dark-mode'));

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // Start with cached user so UI is instant
                const cached = authService.getStoredUser();
                if (cached) setUser(cached);

                // Refresh from backend to guarantee correctness
                const fresh = await authService.getCurrentUser();
                setUser(fresh);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load profile';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        setIsDarkMode(!isDarkMode);
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="profile-page">
                <p>Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-page">
                <p>You are not logged in. Please sign in to view your profile.</p>
                <button className="setting-btn" onClick={() => navigate('/login')}>Go to Login</button>
            </div>
        );
    }

    const displayName = user.full_name || user.name || user.username;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fff&color=3B753D&size=128`;
    const roleLabel = user.role?.toLowerCase?.() || 'user';

    return (
        <div className="profile-page">
            <div className="profile-header-card">
                <div className="profile-avatar-large">
                    <img src={avatarUrl} alt="Profile" />
                </div>
                <h2 className="profile-name">{displayName}</h2>
                <span className="profile-role-badge">{roleLabel}</span>
            </div>

            {error && <div className="mup-error" style={{ marginTop: '12px' }}>{error}</div>}

            <div className="profile-grid">
                <div className="glass-card">
                    <h3>
                        <i className='bx bx-id-card'></i>
                        <span style={{ marginLeft: 8 }}>Personal Information</span>
                    </h3>
                    <div className="info-list">
                        <div className="info-group">
                            <span className="info-label">Full Name</span>
                            <span className="info-value">{displayName}</span>
                        </div>
                        <div className="info-group">
                            <span className="info-label">User ID / Roll Number</span>
                            <span className="info-value">{user.id}</span>
                        </div>
                        <div className="info-group">
                            <span className="info-label">Email</span>
                            <span className="info-value">{user.email || 'Not provided'}</span>
                        </div>
                        <div className="info-group">
                            <span className="info-label">Username</span>
                            <span className="info-value">{user.username}</span>
                        </div>
                        {user.department && (
                            <div className="info-group">
                                <span className="info-label">Department</span>
                                <span className="info-value">{user.department}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <h3>
                        <i className='bx bx-cog'></i>
                        <span style={{ marginLeft: 8 }}>Settings</span>
                    </h3>
                    <div className="settings-list">
                        <button className="setting-btn">
                            <span>Change Password</span>
                            <i className='bx bx-chevron-right'></i>
                        </button>
                        <button className="setting-btn">
                            <span>Notification Preferences</span>
                            <i className='bx bx-chevron-right'></i>
                        </button>
                        <button className="setting-btn" onClick={toggleTheme}>
                            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                            <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'}`}></i>
                        </button>
                        <button className="setting-btn">
                            <span>Privacy Settings</span>
                            <i className='bx bx-chevron-right'></i>
                        </button>
                        <button className="setting-btn danger" onClick={handleLogout}>
                            <span>Log Out</span>
                            <i className='bx bx-log-out'></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
