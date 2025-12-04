import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import styled from 'styled-components';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { authApi } from '../services/api';

const StyledLogin = styled.div`
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
    max-width: 420px;
    width: 90%;
    margin: 20px;
  }
  
  .role-info {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
    text-align: left;
    
    h4 {
      margin: 0 0 8px 0;
      color: #667eea;
    }
    
    ul {
      margin: 0;
      padding-left: 20px;
      font-size: 0.9em;
      color: #666;
    }
  }
  
  .demo-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 10px;
    
    button {
      flex: 1;
      min-width: 80px;
    }
  }
`;

// Informações das roles
const roleInfo = {
  admin: {
    name: 'Administrador',
    description: 'Acesso completo ao sistema',
    categories: ['Motores', 'Drives', 'Softstarters', 'Painéis', 'Geradores', 'Transformadores']
  },
  engineer: {
    name: 'Engenheiro',
    description: 'Acesso técnico completo',
    categories: ['Motores', 'Drives', 'Softstarters']
  },
  sales: {
    name: 'Vendas',
    description: 'Acesso comercial',
    categories: ['Motores', 'Drives', 'Painéis']
  },
  guest: {
    name: 'Visitante',
    description: 'Acesso limitado',
    categories: ['Motores']
  }
};

// Usuários demo (compatíveis com o Express)
const demoUsers = {
  admin: {
    email: 'admin@weg.com',
    password: '1234',
    role: 'admin'
  },
  engineer: {
    email: 'engineer@weg.com',
    password: 'engineer123',
    role: 'engineer'
  },
  sales: {
    email: 'sales@weg.com',
    password: 'sales123',
    role: 'sales'
  },
  guest: {
    email: 'guest@weg.com',
    password: 'guest123',
    role: 'guest'
  }
};

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('guest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Limpar tokens antigos ao carregar
  useEffect(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }, []);

  // Preencher credenciais demo quando mudar role
  useEffect(() => {
    if (demoUsers[selectedRole]) {
      setEmail(demoUsers[selectedRole].email);
      setPassword(demoUsers[selectedRole].password);
    }
  }, [selectedRole]);

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await authApi.login(email, password);
      
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      setError('Error connecting to server. Please check your connection.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setSelectedRole(role);
    setError('');
    setSuccess('');
    setLoading(true);

    const demoUser = demoUsers[role];
    if (!demoUser) {
      setError('Demo user not found for this role');
      setLoading(false);
      return;
    }

    try {
      const result = await authApi.login(demoUser.email, demoUser.password);
      
      if (result.success) {
        setSuccess(`Logged in as ${roleInfo[role].name}! Redirecting...`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(result.error || 'Quick login failed. Try manual login.');
      }
    } catch (error) {
      setError('Error connecting to server. Please check your connection.');
      console.error('Quick login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const currentRoleInfo = roleInfo[selectedRole] || roleInfo.guest;

  return (
    <StyledLogin>
      <div className="contentbox">
        <Box sx={{ mb: 3 }}>
          <h1 style={{ color: '#333', marginBottom: '8px' }}>🏭 InduMine</h1>
          <h3 style={{ color: '#666', fontWeight: 400 }}>Industrial Product Catalog</h3>
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

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="role-select-label">Select Your Profile</InputLabel>
          <Select
            labelId="role-select-label"
            value={selectedRole}
            label="Select Your Profile"
            onChange={handleRoleChange}
            disabled={loading}
          >
            <MenuItem value="admin">Administrator</MenuItem>
            <MenuItem value="engineer">Engineer</MenuItem>
            <MenuItem value="sales">Sales</MenuItem>
            <MenuItem value="guest">Visitor</MenuItem>
          </Select>
        </FormControl>
        
        <div className="role-info">
          <h4>{currentRoleInfo.description}</h4>
          <p><strong>Accessible Categories:</strong></p>
          <ul>
            {currentRoleInfo.categories.map((category, index) => (
              <li key={index}>{category}</li>
            ))}
          </ul>
        </div>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="Email"
            autoComplete="email"
            required
            disabled={loading}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            autoComplete="current-password"
            required
            disabled={loading}
            sx={{ mb: 2 }}
            InputProps={{
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
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              mb: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <h4 style={{ marginBottom: '10px' }}>Quick Login (Demo)</h4>
          <div className="demo-buttons">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
              sx={{ borderColor: '#667eea', color: '#667eea' }}
            >
              Admin
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleQuickLogin('engineer')}
              disabled={loading}
              sx={{ borderColor: '#667eea', color: '#667eea' }}
            >
              Engineer
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleQuickLogin('sales')}
              disabled={loading}
              sx={{ borderColor: '#667eea', color: '#667eea' }}
            >
              Sales
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleQuickLogin('guest')}
              disabled={loading}
              sx={{ borderColor: '#667eea', color: '#667eea' }}
            >
              Visitor
            </Button>
          </div>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '10px' }}>Don't have an account?</h3>
          <Button
            onClick={handleRegister}
            variant="text"
            disabled={loading}
            sx={{ color: '#667eea' }}
          >
            Register Now
          </Button>
        </Box>

        <Box sx={{ mt: 2, fontSize: '0.8em', color: '#999' }}>
          <p>Using Express/MongoDB for authentication and FastAPI for product data</p>
        </Box>
      </div>
    </StyledLogin>
  );
}

export default Login;