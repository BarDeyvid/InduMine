import React, { createContext, useState, useEffect } from 'react';
import { authApi, removeToken, getCurrentUser, isAuthenticated } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validação inicial
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const currentUser = getCurrentUser();

      if (authenticated && currentUser) {
        setIsAuth(true);
        setUser(currentUser);
      } else {
        setIsAuth(false);
        setUser(null);
        removeToken(); // Limpa lixo se houver
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const result = await authApi.login(email, password);
    if (result.success) {
      setIsAuth(true);
      setUser(result.user);
      return { success: true };
    }
    return result;
  };

  const logout = () => {
    authApi.logout();
    setIsAuth(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuth, user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}