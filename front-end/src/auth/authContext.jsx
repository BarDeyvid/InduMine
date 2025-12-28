// auth/authContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar autenticação uma vez ao montar
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      setIsAuth(!!token);
      setLoading(false);
    };
    
    checkAuth();
  }, []); // Array vazio para rodar apenas uma vez

  const login = async (email, password) => {
    try {
      const result = await loginApi(email, password);
      if (result.success) {
        setIsAuth(true);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ isAuth, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};