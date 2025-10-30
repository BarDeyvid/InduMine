import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import NavBar from './NavBar';
// Importe outros componentes de rotas aqui (Analytics, Products, etc.)

// Componente para proteger rotas
const ProtectedRoute = ({ children }) => {
    // Verifica se o token existe no localStorage para determinar se o usuário está logado
    const isAuthenticated = localStorage.getItem('token');

    // Se não estiver autenticado, redireciona para a tela de login
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default function AppRouter() {
    return (
        <Router>
            <Routes>
                {/* Rotas de Autenticação (Login e Register) - Sem NavBar */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Rotas Protegidas - Com NavBar */}
                <Route
                    path="*" // Isso irá englobar todas as rotas restantes
                    element={
                        <ProtectedRoute>
                            {/* Renderiza a NavBar e depois as rotas protegidas */}
                            <div style={{ display: 'flex' }}>
                                <NavBar />
                                <main style={{ flexGrow: 1, padding: '20px' }}>
                                    <Routes>
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        {/* Adicione suas outras rotas protegidas aqui */}
                                        <Route path="/analytics" element={<div>Analytics Page</div>} />
                                        <Route path="/products" element={<div>Products Page</div>} />
                                        <Route path="/scrapers" element={<div>Scrapers Page</div>} />
                                        <Route path="/activitylog" element={<div>Activity Log Page</div>} />
                                        <Route path="/settings" element={<div>Settings Page</div>} />

                                        {/* Rota de fallback para qualquer rota protegida não definida */}
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                </main>
                            </div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}