import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import axios from 'axios';

export default function Register() {
    const [email, setEmail] = useState('');
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [cpassword, setCPassword] = useState('');

    const navigate = useNavigate();

    const BACKEND_URL = 'https://wegmine.onrender.com/api/auth/register';

    const handleSignIn = async () => {
        console.log("Loging");
        try {
            navigate('/')
        } catch (error) {
            // Tratar erros do servidor (ex: status 400 ou 500)
            const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema de registro.';
            console.error("Login Failed:", errorMessage);
            alert(errorMessage)
        }
    }

    const handleRegister = async () => {
        console.log('--- Register Attempt ---');
        console.log('Email:', email);
        console.log('PIN:', password);
        console.log('User Name:', username);

        if (password !== cpassword) {
            alert("Passwords don't match!");
            return;
        }

        try {
            // 1. Enviar os dados para a API
            const response = await axios.post(BACKEND_URL, {
                username,
                email,
                password: password,
                role: 'user'
            });

            const { token, user } = response.data;

            console.log('Register Successful. Token received.');

            localStorage.setItem('token', token);
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('userName', user.username);
            // CORREÇÃO: Redireciona para o Dashboard após o registro.
            navigate('/dashboard')

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
                            Create Account
                        </h1>
                        <h3 className='rNT'>
                            Get started with your web scraper dashboard
                        </h3>
                        <Box sx={{ width: 250, maxWidth: '100%' }}>
                            <TextField style={{ width: "15.8rem", marginBottom: '0.5rem' }} fullWidth value={username} onChange={(e) => setUserName(e.target.value)} label="Full Name" id="username" />
                            <TextField fullWidth value={email} onChange={(e) => setEmail(e.target.value)} label="E-mail" id="email" />
                            <TextField fullWidth style={{ width: "15.8rem", marginTop: '0.5rem' }} value={password} type='password' onChange={(e) => setPassword(e.target.value)} label="Password" id="password" />
                            <TextField fullWidth style={{ width: "15.8rem", marginTop: '0.5rem' }} value={cpassword} type='password' onChange={(e) => setCPassword(e.target.value)} label="Confirm Password" id="cpassword" />
                            <button style={{ width: "15.8rem", marginTop: '0.5rem' }} onClick={handleRegister} type="button">Register</button>
                            <h3>Already have an account?</h3>
                            <Button onClick={handleSignIn}>Sign in</Button>
                        </Box>
                    </div>
                </div>
            </div>
        </>
    )
}