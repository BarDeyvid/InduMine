// src/AppRouter.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './auth/Login';
import Register from './auth/Register';
import Dashboard from './dashboard/Dashboard';
import Products from './products/Products'
import NavBar from './navbar/NavBar';
import { ThemeProvider } from './context/themeProvider';

// Componente para proteger rotas
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token');
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default function AppRouter() {
    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Rotas Protegidas */}
                    <Route
                        path="*"
                        element={
                            <ProtectedRoute>
                                <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
                                    <NavBar /> 
                                    <main style={{ flexGrow: 1, padding: '20px' }}>
                                        <Routes>
                                            <Route path="/dashboard" element={<Dashboard />} />
                                            <Route path="/analytics" element={<div>Analytics Page</div>} />
                                            <Route path="/products" element={<Products />} />
                                            <Route path="/scrapers" element={<div>Scrapers Page</div>} />
                                            <Route path="/activitylog" element={<div>Activity Log Page</div>} />
                                            <Route path="/settings" element={<div>Settings Page</div>} />
                                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                        </Routes>
                                    </main>
                                </div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}
