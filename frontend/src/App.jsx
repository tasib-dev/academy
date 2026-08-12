import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Profile from './pages/Profile';
import CourseDetails from './pages/CourseDetails';
import CourseForm from './pages/CourseForm';
import ForgetPassword from './pages/ForgetPassword';
import ResetPassword from './pages/ResetPassword';
import LessonDetails from './pages/LessonDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />


            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CourseDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/lessons/:id"
              element={
                  <ProtectedRoute>
                      <LessonDetails />
                  </ProtectedRoute>
              }
          />

            <Route
              path="/create-course"
              element={
                <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                  <CourseForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/edit-course/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                  <CourseForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/courses" replace />} />

            {/* Unauthorized Page */}
            <Route
              path="/unauthorized"
              element={
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                  <div className="text-center bg-white p-8 rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-4xl font-bold text-red-600 mb-4">
                      Unauthorized Access
                    </h1>
                    <p className="text-gray-600 mb-6">
                      You don't have permission to access this page.
                    </p>
                    <button
                      onClick={() => window.history.back()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              }
            />

            {/* 404 Page */}
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                  <div className="text-center bg-white p-8 rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">404</div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                      Page Not Found
                    </h1>
                    <p className="text-gray-600 mb-6">
                      The page you're looking for doesn't exist.
                    </p>
                    <a
                      href="/"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;