import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
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
  }
`;

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    const { username, email, password, confirmPassword } = formData;

    if (!username || !email || !password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await authApi.register(username, email, password);

    if (result.success) {
      setSuccess('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => navigate('/'), 2000);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <StyledRegister>
      <div className="contentbox">
        <h2 style={{ color: '#333' }}>Criar Conta</h2>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Nome de Usuário"
            name="username"
            value={formData.username}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Senha"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Confirmar Senha"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            fullWidth
          />
          
          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={loading}
            size="large"
            sx={{ mt: 1, background: '#667eea' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Registrar'}
          </Button>

          <Button onClick={() => navigate('/')}>
            Já tem uma conta? Entrar
          </Button>
        </Box>
      </div>
    </StyledRegister>
  );
}