import { useState } from 'react'
import bar_chart from './assets/bar_chart.svg'
import './Login.css'

function Login() {
  const [count, setCount] = useState(0)

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
          <h4 className='rTN'>
            Email          
          </h4>
          <input type="email" className='rI' name="iEmail" placeholder='Enter your email'/>
          <h4 className='rTN'>
            Password
          </h4>
          <div>
          <input type="password" name="iPassword" className='rI' placeholder='Enter your password' id="" />
          <button type="button"></button> 
          <input type="checkbox" id="" /> Remember me
          </div>
          <button type="button">Sign In</button>
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
              Password: password123
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
