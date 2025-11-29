// src/AppRouter.jsx 
import React, { useState } from 'react';
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

// Estes valores devem corresponder aos do seu componente NavBar/SidebarContainer
const NAVBAR_WIDTH_OPEN = '250px';
const NAVBAR_WIDTH_CLOSED = '60px';


export default function AppRouter() {
    const [isNavOpen, setIsNavOpen] = useState(false);
    
    const toggleNav = () => setIsNavOpen(!isNavOpen);
    
    const mainMarginLeft = isNavOpen ? NAVBAR_WIDTH_OPEN : NAVBAR_WIDTH_CLOSED;

    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Rotas Protegidas (Layout) */}
                    <Route
                        path="*"
                        element={
                            <ProtectedRoute>
                                <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
                                    <NavBar 
                                        isopen={isNavOpen} 
                                        setisopen={setIsNavOpen} // Se quiser que a NavBar controle
                                        toggleNavbar={toggleNav} // Se a NavBar usar apenas a função
                                    /> 
                                    
                                    <main style={{ 
                                        flexGrow: 1, 
                                        padding: '20px', 
                                        // A margem esquerda empurra o conteúdo para fora da navbar
                                        marginLeft: mainMarginLeft, 
                                        transition: 'margin-left 0.3s ease' 
                                    }}>
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