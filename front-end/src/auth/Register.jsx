import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import styled from 'styled-components';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { authApi } from '../services/api';

const StyledRegister = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .contentbox {
    background-color: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 400px;
    width: 90%;
    margin: 20px;
  }
`;

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignIn = () => {
    navigate('/');
  };

  const validateForm = () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required!');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long!');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address!');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await authApi.register(username, email, password, 'guest');
      
      if (result.success) {
        setSuccess('Registration successful! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('Error connecting to server. Please check your connection.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledRegister>
      <div className="contentbox">
        <Box sx={{ mb: 3 }}>
          <h1 style={{ color: '#333', marginBottom: '8px' }}>Create Account</h1>
          <h3 style={{ color: '#666', fontWeight: 400 }}>Get started with InduMine</h3>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
            label="Full Name"
            disabled={loading}
          />
          
          <TextField
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="Email"
            autoComplete="email"
            disabled={loading}
          />
          
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            autoComplete="new-password"
            disabled={loading}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disableRipple
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          
          <TextField
            fullWidth
            variant="outlined"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm Password"
            autoComplete="new-password"
            disabled={loading}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disableRipple
                      disabled={loading}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          
          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={loading}
            fullWidth
            size="large"
            sx={{
              py: 1.5,
              mb: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
          
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
            <h3 style={{ marginBottom: '10px' }}>Already have an account?</h3>
            <Button
              onClick={handleSignIn}
              variant="text"
              disabled={loading}
              sx={{ color: '#667eea' }}
            >
              Sign in
            </Button>
          </Box>
        </Box>
      </div>
    </StyledRegister>
  );
}