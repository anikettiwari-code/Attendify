import TeacherDashboard from '../components/dashboard/TeacherDashboard';
import StudentDashboard from '../components/dashboard/StudentDashboard';

const Dashboard = () => {
    // Normalize role casing to avoid visibility issues
    const storedRole = (localStorage.getItem('userRole') || 'STUDENT').toUpperCase();

    if (storedRole === 'FACULTY' || storedRole === 'ADMIN') {
        return <TeacherDashboard role={storedRole} />;
    }

    // Default student view
    return <StudentDashboard />;
};

export default Dashboard;
