
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import bar_chart from './assets/bar_chart.svg';
import './Login.css';
import PI from './Password_In';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate(); 

  const BACKEND_URL = 'https://wegmine.onrender.com/api/auth/login';

  const handleSignIn = async () => {
    console.log('--- Sign In Attempt ---');
    console.log('Email:', email);
    console.log('PIN:', pin);
    console.log('Remember Me:', rememberMe);

    try {
      // 1. Enviar os dados para a API
      const response = await axios.post(BACKEND_URL, {
        email,
        password: pin // O backend espera 'password', então usamos o valor do 'pin'
      });
      
      const { token, user } = response.data;

      console.log('Log In Successful. Token received.');
      
      localStorage.setItem('token', token); 
      localStorage.setItem('userRole', user.role); 
      localStorage.setItem('userName', user.username); 

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
      <div id="left">
        <div className="title">
          <img src={bar_chart} className='logo' />
          <h1 className='title'>
            ProdDash
          </h1>
          <h3 className='sub-title'>
            Product Analytics Platform
          </h3>
        </div>
        <div className='middle'>
          <h2>
            Enterprise-Grade Analytics
          </h2>
          <h3>
            Comprehensive dashboard for analyzing industrial accessories and components with advanced visualizations and insights.
          </h3>
          <ul>
            <li>
              <img src={bar_chart}/>
              <h4>
                Advanced Security & Compliance
              </h4>
            </li>
            <li>
              <img src={bar_chart}/>
              <h4>
                Real-time Analytics & Monitoring
              </h4>
            </li>
            <li>
              <img src={bar_chart}/>
              <h4>
                Multi-team Collaboration
              </h4>
            </li>
            <li>
              <img src={bar_chart}/>
              <h4>
                AI-Powered Insights 
              </h4>
            </li>
          </ul>
        </div>
      </div>
      <div id="right">
        <div className="contentbox">
          <h1 className='rBT'>
            Welcome Back
          </h1>
          <h3 className='rNT'>
            Sign in to your analytics dashboard
          </h3>
          <Box sx={{ width: 500, maxWidth: '100%' }}>
            <TextField fullWidth value={email} onChange={(e) => setEmail(e.target.value)} label="E-mail" id="fullWidth" />
          </Box>
          <h4 className='rTN'>PIN</h4>
          <div>
          <PI onChange={setPin}/>
          <FormControlLabel control={<Checkbox />} label="Remember Me"/>
          </div>
          <button onClick={handleSignIn} type="button">Sign In</button>
          <h3>
            Demo Access
          </h3>
          <div id='credentials'>
            <h5>
              Demo Credentials:
            </h5>
            <h6>
              Email: admin@weg.com
            </h6>
            <h6>
              PIN: 1234
            </h6>
          </div>
          </div>
          <h4>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </h4>
      </div>
    </>
  )
}

export default Login
