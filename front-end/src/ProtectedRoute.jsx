import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './auth/authContext';

export default function ProtectedRoute({ children }) {
  const { isAuth } = useContext(AuthContext);
  if (!isAuth) return <Navigate to="/" replace />;
  return children;
}