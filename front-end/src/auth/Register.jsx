import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import axios from 'axios';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import styled from 'styled-components';

const StyledRegister = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};

  .contentbox {
    background-color: ${props => props.theme.surface};
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    text-align: center;
    max-width: 350px;
    width: 100%;
  }
`;

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [cpassword, setCPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);

  const navigate = useNavigate();
  const BACKEND_URL = 'https://wegmine.onrender.com/api/auth/register';

  const handleSignIn = () => navigate('/');

  const handleRegister = async () => {
    if (password !== cpassword) {
      alert("Passwords don't match!");
      return;
    }
    try {
      const response = await axios.post(BACKEND_URL, {
        username,
        email,
        password,
        role: 'user'
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.username);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar. Credenciais Inválidas.';
      alert(errorMessage);
    }
  };

  return (
    <StyledRegister>
      <div className="contentbox">
        <h1>Create Account</h1>
        <h3>Get started!</h3>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            value={username}
            onChange={(e) => setUserName(e.target.value)}
            label="Full Name"
          />
          <TextField
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="E-mail"
            autoComplete="email"
          />
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disableRipple
                      sx={{
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        '&:hover': { backgroundColor: 'transparent' },
                      }}
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
            type={showCPassword ? 'text' : 'password'}
            value={cpassword}
            onChange={(e) => setCPassword(e.target.value)}
            label="Confirm Password"
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCPassword(!showCPassword)}
                      edge="end"
                      disableRipple
                      sx={{
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        '&:hover': { backgroundColor: 'transparent' },
                      }}
                    >
                      {showCPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button variant="contained" onClick={handleRegister}>Register</Button>
          <h3>Already have an account?</h3>
          <Button onClick={handleSignIn}>Sign in</Button>
        </Box>
      </div>
    </StyledRegister>
  );
}
