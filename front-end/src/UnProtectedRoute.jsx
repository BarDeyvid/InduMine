import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './auth/authContext';

export default function UnprotectedRoute({ children }) {
  const { isAuth } = useContext(AuthContext);
  return isAuth ? <Navigate to="/dashboard" replace /> : children;
}
