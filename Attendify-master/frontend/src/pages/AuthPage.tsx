import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth.types';
import './Auth.css';

const AuthPage = () => {
    const { login, loginWithGoogle, loading: authLoading, error: authError } = useAuth();
    // False = Student Login
    const [isFaculty, setIsFaculty] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); // Admin Toggle

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Form States
    const [studentUser, setStudentUser] = useState('');
    const [studentPass, setStudentPass] = useState('');
    const [facultyUser, setFacultyUser] = useState('');
    const [facultyPass, setFacultyPass] = useState('');
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    // Loading and error states
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const loading = authLoading || localLoading;
    const error = authError || localError;
    const setError = setLocalError;
    const setLoading = setLocalLoading;


    // Effect to apply theme to body/root
    useEffect(() => {
        document.body.dataset.theme = theme;
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogin = async (username: string, password: string, role: UserRole) => {
        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await login({ username, password, role });
            // Navigation is handled by useAuth hook
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentLogin = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin(studentUser, studentPass, 'STUDENT');
    };

    const handleFacultyLogin = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin(facultyUser, facultyPass, 'FACULTY');
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin(adminUser, adminPass, 'ADMIN');
    };

    if (isAdmin) {
        return (
            <div className="auth-page">
                <div className="container" id="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                 <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                    {theme === 'light' ? <i className='bx bxs-moon'></i> : <i className='bx bxs-sun'></i>}
                </button>
                <div className="form-container" style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}>
                    <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <h1 style={{ marginBottom: '20px' }}>Admin Portal</h1>
                        
                        {error && (
                            <div style={{ 
                                backgroundColor: '#f44336', 
                                color: 'white', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                marginBottom: '16px',
                                width: '100%',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}
                        <input
                            type="text"
                            placeholder="Admin Username"
                            value={adminUser}
                            onChange={(e) => setAdminUser(e.target.value)}
                            style={{ margin: '10px 0', padding: '12px 15px', width: '100%' }}
                            disabled={loading}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            style={{ margin: '10px 0', padding: '12px 15px', width: '100%' }}
                            disabled={loading}
                            required
                        />
                        <button 
                            style={{ marginTop: '20px' }}
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login to Dashboard'}
                        </button>
                        <button 
                            type="button" 
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    await loginWithGoogle();
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Google login failed');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            style={{ marginTop: '10px', background: '#DB4437', color: 'white', border: 'none' }}
                            disabled={loading}
                        >
                            <i className='bx bxl-google' style={{ marginRight: '8px' }}></i>
                            <span>Sign in with Google</span>
                        </button>
                        <button 
                            type="button" 
                            onClick={() => { setIsAdmin(false); setError(null); }}
                            style={{ marginTop: '10px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--text-secondary)' }}
                            disabled={loading}
                        >
                            Back to Standard Login
                        </button>
                    </form>
                </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className={`container ${isFaculty ? 'right-panel-active' : ''}`} id="container">

            {/* Theme Toggle Button */}
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                {theme === 'light' ? (
                    <i className='bx bxs-moon'></i>
                ) : (
                    <i className='bx bxs-sun'></i>
                )}
            </button>

            {/* Admin Toggle (Added) */}
            <button 
                onClick={() => setIsAdmin(true)}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 100,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px'
                }}
            >
                <i className='bx bxs-lock-alt'></i> Admin Login
            </button>

            {/* Faculty Form Container (Sign Up position) */}
            <div className="form-container sign-up-container">
                <form onSubmit={handleFacultyLogin}>
                    <h1>Faculty Login</h1>
                    <div className="social-container">
                        <button type="button" className="social" onClick={loginWithGoogle}>
                            <i className='bx bxl-google'></i>
                        </button>
                        <button type="button" className="social">
                            <i className='bx bxl-linkedin'></i>
                        </button>
                    </div>
                    <span>or use your email for registration</span>
                    {error && (
                        <div style={{ 
                            background: '#fee', 
                            color: '#c33', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            marginBottom: '10px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder="Faculty ID / Username"
                        value={facultyUser}
                        onChange={(e) => setFacultyUser(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={facultyPass}
                        onChange={(e) => setFacultyPass(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <a href="/reset-password">Forgot your password?</a>
                    <button disabled={loading}>
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>
            </div>

            {/* Student Form Container (Sign In position) */}
            <div className="form-container sign-in-container">
                <form onSubmit={handleStudentLogin}>
                    <h1>Student Login</h1>
                    <div className="social-container">
                        <button type="button" className="social" onClick={loginWithGoogle}>
                            <i className='bx bxl-google'></i>
                        </button>
                        <button type="button" className="social">
                            <i className='bx bxl-linkedin'></i>
                        </button>
                    </div>
                    <span>or use your account</span>
                    {error && (
                        <div style={{ 
                            background: '#fee', 
                            color: '#c33', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            marginBottom: '10px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder="Student ID / Username"
                        value={studentUser}
                        onChange={(e) => setStudentUser(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={studentPass}
                        onChange={(e) => setStudentPass(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <a href="/reset-password">Forgot your password?</a>
                    <button disabled={loading}>
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>
            </div>

            {/* Overlay Container */}
            <div className="overlay-container">
                <div className="overlay">
                    {/* Left Overlay Panel (Visible when Faculty Active) */}
                    <div className="overlay-panel overlay-left">
                        <h1>Welcome Student!</h1>
                        <p>To keep connected with us please login with your personal info</p>
                        <button
                            className="ghost"
                            id="signIn"
                            onClick={() => setIsFaculty(false)}
                        >
                            Sign In (Student)
                        </button>
                    </div>

                    {/* Right Overlay Panel (Visible when Student Active) */}
                    <div className="overlay-panel overlay-right">
                        <h1>Welcome Faculty!</h1>
                        <p>Enter your personal details and start journey with us</p>
                        <button
                            className="ghost"
                            id="signUp"
                            onClick={() => setIsFaculty(true)}
                        >
                            Sign In (Faculty)
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default AuthPage;
