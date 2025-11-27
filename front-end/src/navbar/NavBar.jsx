import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components'; 
import menuIcon from './assets/menu.svg';
import Button from '@mui/material/Button';

const StyledNavBar = styled.div`
  background-color: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  width: 10vw;

  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000; 
  height: 100vh; 
  min-height: 100vh; 
  max-height: 100vh;

  padding: 20px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  
  h1 {
    color: ${props => props.theme.primary}; /* Usa a cor primária */
    margin-bottom: 2rem;
  }
  
  .navs {
    list-style: none;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
  }
  
  .signout {
    margin-top: auto; /* Empurra o logout para baixo */
    padding-bottom: 20px;
  }
`;
const NavButton = styled(Button)`
  width: 100%;
  justify-content: flex-start;
  padding: 10px 20px;
  color: ${props => props.theme.text} !important; /* Cor do texto do tema */
  
  &:hover {
    background-color: ${props => props.theme.surface}; /* Cor de superfície mais escura no hover */
  }
`;

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
      navigate('/analytics')
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
      navigate('/products')
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
      navigate('/scrapers')
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
      navigate('/activitylog')
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
      navigate('/settings')
    } catch (error) {
      // Tratar erros do servidor (ex: status 400 ou 500)
      const errorMessage = error.response?.data?.msg || 'Erro ao conectar ao sistema.';
      console.error("Jump Failed:", errorMessage);
      alert(errorMessage)
    }
  }
  const handleLogOut = async () => {
    console.log("Jumping Loging");
    try {
      localStorage.removeItem('token'); 
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      navigate('/')
    } catch (error) {
      const errorMessage = error.response?.data?.msg || 'Erro ao desconectar.';
      console.error("Logout Failed:", errorMessage);
      alert(errorMessage)
    }
  }

  return (
    <StyledNavBar> 
      <h1>WEG Mine</h1>
      <ul className="navs justify-center">
        <div>
          <NavButton startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/dashboard')} type='Button'>Dashboard</NavButton>
          <NavButton startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/analytics')} type='Button'>Analytics</NavButton>
          <NavButton startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/products')} type='Button'>Products</NavButton>
          <NavButton startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/scrapers')} type='Button'>Scrapers</NavButton>
          <NavButton startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/activitylog')} type='Button'>Activity Log</NavButton>
          <NavButton style={{marginTop: '2em'}} startIcon={<img src={menuIcon} style={{width:'2em'}}/>} onClick={() => navigate('/settings')} type='Button'>Settings</NavButton>
        </div>
        <div className='signout'>
          <Button variant="contained" color="error" onClick={handleLogOut}>Logout</Button>
        </div>
      </ul>
    </StyledNavBar>
  )
}