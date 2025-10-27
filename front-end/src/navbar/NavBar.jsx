import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import menuIcon from './assets/menu.svg';
import './NavBar.css';
import Button from '@mui/material/Button';

export default function NavBar() {
  const navigate = useNavigate(); 
  const handleDashboard = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleAnalytics = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleProducts = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleScrapers = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleActivityLog = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleSettings = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleLogOut = async () => {
    console.log("Jumping");
    try {
      navigate('/dashboard')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }

  return (
    <>
      <div className="navbar">
        <h1>WEG Mine</h1>
        <ul className="navs justify-center">
                <div>
                    <Button startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleDashboard} type='Button'>Dashboard</Button>
                    <Button startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleAnalytics} type='Button'>Analytics</Button>
                    <Button startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleProducts} type='Button'>Products</Button>
                    <Button startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleScrapers} type='Button'>Scrapers</Button>
                    <Button startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleActivityLog} type='Button'>Activity Log</Button>
                    <Button style={{marginTop: '2em'}} startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={handleSettings} type='Button'>Settings</Button>
                </div>
                <div className='signout'>
                    <Button type='Button' onClick={handleLogOut}>Logout</Button>
                </div>
            </ul>
      </div>
    </>
  )
}