// src/AppRouter.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './auth/Login';
import Register from './auth/Register';
import Dashboard from './dashboard/Dashboard';
import Products from './products/Products';
import ProductDetail from './products/ProductDetail';
import Categories from './categories/Categories';
import CategoryDetail from './categories/CategoryDetail';
import NavBar from './navbar/NavBar';
import { ThemeProvider } from './context/themeProvider';
import ProtectedRoute from './ProtectedRoute';
import UnprotectedRoute from './UnprotectedRoute';

const NAVBAR_WIDTH_OPEN = '250px';
const NAVBAR_WIDTH_CLOSED = '60px';

export default function AppRouter() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const mainMarginLeft = isNavOpen ? NAVBAR_WIDTH_OPEN : NAVBAR_WIDTH_CLOSED;

  const isDeploy = import.meta.env.MODE === 'deploy' || import.meta.env.VITE_DEPLOY === 'true';

  return (
    <ThemeProvider>
      <Router basename={isDeploy ? '/InduMine' : '/'}>
        <Routes>
          {/* Rotas Públicas usando UnprotectedRoute */}
          <Route path="/" element={
            <UnprotectedRoute>
              <Login />
            </UnprotectedRoute>
          } />
          <Route path="/register" element={
            <UnprotectedRoute>
              <Register />
            </UnprotectedRoute>
          } />

          {/* Rotas Protegidas */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
                  <NavBar
                    isopen={isNavOpen}
                    setisopen={setIsNavOpen}
                    toggleNavbar={toggleNav}
                  />
                  <main
                    style={{
                      flexGrow: 1,
                      padding: '20px',
                      marginLeft: mainMarginLeft,
                      transition: 'margin-left 0.3s ease',
                    }}
                  >
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/categories/:categoryId" element={<CategoryDetail />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:productId" element={<ProductDetail />} />
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
