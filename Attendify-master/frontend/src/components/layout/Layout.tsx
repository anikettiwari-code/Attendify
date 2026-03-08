import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import './Layout.css';

const Layout = () => {
    // Get role from localStorage or default to student for safety
    const role = (localStorage.getItem('userRole') || 'student').toLowerCase();

    return (
        <div className="dashboard-layout">
            <main className="dashboard-content">
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
            <BottomNav role={role as 'student' | 'faculty' | 'admin'} />
        </div>
    );
};

export default Layout;
