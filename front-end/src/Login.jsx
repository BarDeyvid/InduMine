
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import bar_chart from './assets/bar_chart.svg';
import './Login.css';
import PI from './Password_In';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';

function Login() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate(); 

  const handleSignIn = () => {
    console.log('--- Sign In Attempt ---');
    console.log('Email:', email);
    console.log('PIN:', pin);
    console.log('Remember Me:', rememberMe);

    if (email === "admin@weg.com" && pin === "1234") {
      console.log('Log In Successful');
      navigate('/dashboard'); 
    } else {
      console.log("Bad Credentials");
      alert("Invalid email or PIN");
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
