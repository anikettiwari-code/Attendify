import TeacherDashboard from '../../components/dashboard/TeacherDashboard';
import StudentDashboard from '../../components/dashboard/StudentDashboard';

const Dashboard = () => {
    // Get role from localStorage or default to student
    const role = localStorage.getItem('userRole') || 'student';

    if (role === 'faculty' || role === 'admin') {
        return <TeacherDashboard />;
    }

    // Default student view
    return <StudentDashboard />;
};

export default Dashboard;
