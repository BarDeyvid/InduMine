import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    setIsAuth(!!localStorage.getItem('token'));
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    setIsAuth(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
