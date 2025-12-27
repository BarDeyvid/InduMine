import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './auth/authContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function ProtectedRoute({ children }) {
  const { isAuth, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  return children;
}