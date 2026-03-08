import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import SplashScreen from './components/SplashScreen';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SchedulePage from './pages/SchedulePage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import MarkAttendancePage from './pages/MarkAttendancePage';
import RegisterPage from './pages/RegisterPage';
import PostNoticesPage from './pages/PostNoticesPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ProfilePage from './pages/ProfilePage';
import StudentsPage from './pages/StudentsPage';
import ManageCoursesPage from './pages/ManageCoursesPage';
import ManageUsersPage from './pages/ManageUsersPage';
import FaceRecognitionDemo from './pages/FaceRecognitionDemo';
import FaceRecognitionPage from './pages/FaceRecognitionPage';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true); // Disabled splash screen

  return (
    <>
      {loading && <SplashScreen onFinish={() => setLoading(false)} />}
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/demo" element={<FaceRecognitionDemo />} />

          {/* Dashboard Routes nested under 'Layout' */}
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="attendance" element={<StudentAttendancePage />} />
            <Route path="mark-attendance" element={<MarkAttendancePage />} />
            <Route path="register-student" element={<RegisterPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="notices" element={<PostNoticesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="manage-courses" element={<ManageCoursesPage />} />
            <Route path="manage-users" element={<ManageUsersPage />} />
            <Route path="face-demo" element={<FaceRecognitionDemo />} />
            <Route path="face-recognition" element={<FaceRecognitionPage />} />
          </Route>

        </Routes>
      </Router>
    </>
  );
}

export default App;
