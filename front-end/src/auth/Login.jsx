import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import axios from 'axios';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const BACKEND_URL = 'https://wegmine.onrender.com/api/auth/login';

    const handleRegister = async () => {
        console.log("Registering");
        try {
            navigate('/register')
        } catch (error) {
            // Tratar erros do servidor (ex: status 400 ou 500)
            const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema de registro.';
            console.error("Login Failed:", errorMessage);
            alert(errorMessage)
        }
    }

    const handleSignIn = async () => {
        console.log('--- Sign In Attempt ---');
        console.log('Email:', email);
        console.log('PIN:', password);

        try {
            // 1. Enviar os dados para a API
            const response = await axios.post(BACKEND_URL, {
                email,
                password: password
            });

            const { token, user } = response.data;

            console.log('Log In Successful. Token received.');

            localStorage.setItem('token', token);
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('userName', user.username);
            // localStorage.setItem('isAuthenticated', 'true'); // Linha removida

            // 3. Redirecionar para o Dashboard
            navigate('/dashboard');

        } catch (error) {
            // Tratar erros do servidor (ex: status 400 ou 500)
            const errorMessage = error.response?.data?.msg || 'Erro ao conectar. Credenciais Inválidas.';
            console.error("Login Failed:", errorMessage);
            alert(errorMessage);
        }
    };

    return (
        <>
            <div className="root">
                <div className="center-wrapper">
                    <div className="contentbox">
                        <h1 className='rBT'>
                            Welcome Back
                        </h1>
                        <h3 className='rNT'>
                            Sign in to your web scrapper dashboard
                        </h3>
                        <Box sx={{ width: 250, maxWidth: '100%' }}>
                            <FormControlLabel
                                control={
                                    <form>
                                        <TextField
                                            fullWidth
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            label="E-mail"
                                            id="email"
                                            autoComplete="email"
                                        />
                                        <TextField
                                            fullWidth
                                            style={{ width: "15.8rem", marginTop: '0.5rem' }}
                                            value={password}
                                            type='password'
                                            onChange={(e) => setPassword(e.target.value)}
                                            label="Password"
                                            id="password"
                                            autoComplete="current-password"
                                        />
                                        <button
                                            style={{ width: "15.8rem", marginTop: '0.5rem' }}
                                            onClick={handleSignIn}
                                            type="button"
                                        >
                                            Sign In
                                        </button>
                                        <h3>Don't have an account?</h3>
                                        <Button onClick={handleRegister}>Sign up</Button>
                                    </form>
                                }
                                label=""
                            />
                        </Box>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Login