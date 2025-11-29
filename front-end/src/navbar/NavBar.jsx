import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuOpenIcon from '@mui/icons-material/MenuOpen'; 
import MenuIcon from '@mui/icons-material/Menu';


// --- Estilos ---
const ToggleButtonContainer = styled.div`
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1001; 
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  flex-grow: 1; 
  width: 100%;
  padding: 0 0.5rem; 
`;

const NavButton = styled(Button)`
  color: ${props => props.theme.text} !important;
  width: 100%;
  justify-content: flex-start;
  padding: 10px 20px;
  margin: 0.2rem 0 !important;
  transition: background-color 0.2s ease;
  
  .MuiButton-label {
    opacity: ${props => (props.isOpen ? 1 : 0)};
    transition: opacity 0.3s ease;
  }
  
  ${props => !props.isOpen && css`
    justify-content: center;
    padding: 10px 0 !important;
  `}
`;

const SidebarContainer = styled.div`
  background-color: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  height: 100vh;
  position: fixed; 
  top: 0;
  left: 0;
  transition: width 0.3s ease;
  overflow-x: hidden; 
  z-index: 1000;

  /* Largura padrão */
  width: ${props => (props.isOpen ? '250px' : '60px')}; 

  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 2px 0 5px rgba(0,0,0,0.2);
  padding-top: 5rem; 

  h1 {
    font-size: 1.2rem;
    margin: 1rem 0;
    white-space: nowrap;
    opacity: ${props => (props.isOpen ? 1 : 0)};
    transition: opacity 0.3s ease, margin 0.3s ease;
  }
`;

const LogoutContainer = styled.div`
  margin-top: auto;
  padding: 1rem;
  width: 100%;

  button {
    width: 100%;
    .MuiButton-label {
        opacity: ${props => (props.isOpen ? 1 : 0)};
        transition: opacity 0.3s ease;
    }
  }
`;

export default function NavBar({ isOpen, toggleNavbar }) {
  
  const navigate = useNavigate();

  const handleLogOut = () => {
    localStorage.clear(); 
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Products', path: '/products' },
    { name: 'Scrapers', path: '/scrapers' },
    { name: 'Activity Log', path: '/activitylog' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <ToggleButtonContainer>
        <IconButton 
          onClick={toggleNavbar} // << Usa a prop
          aria-label={isOpen ? "Fechar Menu" : "Abrir Menu"}
          style={{ backgroundColor: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          {isOpen ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
      </ToggleButtonContainer>
      
      <SidebarContainer isOpen={isOpen}> 
        <h1>WEG Mine</h1>
        
        <NavList>
          {navItems.map((item) => (
            <NavButton
              key={item.name}
              isOpen={isOpen}
              startIcon={<MenuIcon />} 
              onClick={() => navigate(item.path)}
              variant="text" 
            >
              {item.name}
            </NavButton>
          ))}
        </NavList>

        <LogoutContainer isOpen={isOpen}>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleLogOut}
            startIcon={<MenuIcon />}
          >
            Logout
          </Button>
        </LogoutContainer>
      </SidebarContainer>
    </>
  );
}