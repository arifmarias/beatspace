import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from './utils/auth';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import MarketplacePage from './components/MarketplacePage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Placeholder components for different dashboards
const BuyerDashboard = () => (
  <div className="min-h-screen bg-gray-100 p-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Buyer Dashboard</h1>
    <p className="text-gray-600">Coming soon in Phase 2...</p>
  </div>
);

const SellerDashboard = () => (
  <div className="min-h-screen bg-gray-100 p-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Seller Dashboard</h1>
    <p className="text-gray-600">Coming soon in Phase 2...</p>
  </div>
);

const AdminDashboard = () => (
  <div className="min-h-screen bg-gray-100 p-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
    <p className="text-gray-600">Coming soon in Phase 2...</p>
  </div>
);

const UnauthorizedPage = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Unauthorized</h1>
      <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Go Home
      </button>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route 
            path="/buyer/dashboard" 
            element={
              <ProtectedRoute requiredRole="buyer">
                <BuyerDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/seller/dashboard" 
            element={
              <ProtectedRoute requiredRole="seller">
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirect authenticated users to appropriate dashboard */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated() ? (
                <Navigate 
                  to={`/${getUserRole()}/dashboard`} 
                  replace 
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;