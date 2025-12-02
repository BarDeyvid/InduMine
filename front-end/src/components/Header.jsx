import { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Button, Avatar } from "@mui/material";
import { Settings, Brightness4, Logout, ChevronRight } from '@mui/icons-material';
import { useTheme } from '../context/themeProvider';
import useAnimatedToggle from '../components/useAnimatedToggle';
import SearchBar from "../components/SearchBar";
import UserSettings from './UserSettings'; 

const slideDown = keyframes`
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
`;

const StyledHeader = styled.header`
    background-color: ${props => props.theme.surface}; 
    color: ${props => props.theme.text}; 
    width: 100%; 
    padding: 10px 5vw; 
    box-sizing: border-box; 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
    flex-wrap: wrap; /* Permite quebrar linha no mobile */
    gap: 15px;

    .logo-placeholder {
        font-size: 1.5em;
        font-weight: bold;
        color: ${props => props.theme.primary};
        margin-left: 40px; /* Espaço para o botão do menu hamburger */
    }

    @media (max-width: 768px) {
        padding: 10px 15px;
        
        .logo-placeholder {
            font-size: 1.2em;
            margin-left: 50px;
        }
    }
`;

const SearchArea = styled.div`
    width: 25vw;

    @media (max-width: 768px) {
        order: 3; /* Joga a busca para baixo no mobile */
        width: 100%;
        margin-top: 5px;
    }
`;

const UserProfileSection = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
`;

const UserAvatarButton = styled(Button)`
    && {
        color: ${props => props.theme.text};
        padding: 4px 8px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        text-transform: none;
        transition: background-color 0.3s;
        
        &:hover {
            background-color: ${props => props.theme.surfaceHover};
        }
    }
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 8px;
    margin-right: 8px;
    text-align: left;

    @media (max-width: 600px) {
        display: none; /* Esconde texto em telas muito pequenas */
    }
`;

const UserSubMenu = styled.div`
    position: absolute;
    top: 100%; 
    right: 0;
    z-index: 10;
    background-color: ${({ theme }) => theme.surface};
    display: flex;
    flex-direction: column;
    border: 1px solid ${({ theme }) => theme.textSecondary}40;
    border-radius: 8px;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
    width: 250px;
    margin-top: 10px;
    overflow: hidden;
    animation: ${({ $isclosing }) => $isclosing ? slideUp : slideDown} 0.3s ease-out forwards;

    button {
        color: ${({ theme }) => theme.text};
        width: 100%;
        justify-content: flex-start;
        padding: 15px; /* Aumentado touch target */
        border-radius: 0;
        text-transform: none;
        display: flex;
        align-items: center;
        gap: 10px;
        
        &:hover {
            background-color: ${({ theme }) => theme.primary};
            color: white;
        }
    }
`;

export default function Header() {
    const [userInfo, setUserInfo] = useState({ name: "Usuário", cargo: "Visitante" });
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [username, setUserName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [country, setCountry] = useState('');
    const [gender, setGender] = useState('');

    const saveChanges = useCallback(() => {
        console.log("Salvando alterações do usuário...");
        // settingsMenu.close();
    }, [email, username, phone, birthdate, country, gender]);

    const userSubMenu = useAnimatedToggle(300);
    const settingsMenu = useAnimatedToggle(300); 

    const handleLogOut = () => {
        localStorage.clear();
        navigate("/");
    };

    const handleOpenSettings = () => {
        userSubMenu.close();
        settingsMenu.open();
    };
    
    useEffect(() => {
        const userName = localStorage.getItem('userName');
        const userRole = localStorage.getItem('userRole'); 
        const token = localStorage.getItem('token');
        
        if (!token) {
            navigate('/');
            return;
        }
        
        if (userName && userRole) {
            setUserInfo({ name: userName, cargo: userRole });
        }
    }, [navigate]);
    
    const { toggleTheme } = useTheme();

    return (
        <StyledHeader>
            <div className="logo-placeholder">InduMine</div>

            <SearchArea>
                <SearchBar width="100%" placeholder="Buscar..." /> 
            </SearchArea>

            <UserProfileSection>
                <UserAvatarButton onClick={userSubMenu.toggle}>
                    <Avatar alt={userInfo.name} src="/static/images/avatar/1.jpg" sx={{ width: 32, height: 32 }} />
                    <UserInfo>
                        <span style={{ fontSize: 14, fontWeight: "bold" }}>{userInfo.name}</span>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{userInfo.cargo}</span>
                    </UserInfo>
                    <ChevronRight style={{ transform: userSubMenu.isOpen ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s' }}/>
                </UserAvatarButton>

                {userSubMenu.isOpen && (
                    <UserSubMenu ref={userSubMenu.ref} $isclosing={userSubMenu.isClosing}>
                        <Button onClick={handleOpenSettings}>
                            <Settings /> Configurações
                        </Button>
                        <Button onClick={toggleTheme}>
                            <Brightness4 /> Trocar Tema
                        </Button>
                        <Button onClick={handleLogOut}>
                            <Logout /> Sair
                        </Button>
                    </UserSubMenu>
                )}

                {settingsMenu.isOpen && (
                    <UserSettings
                        ref={settingsMenu.ref}
                        itsclosing={settingsMenu.isClosing}
                        onClose={settingsMenu.close}
                        email={email}
                        setEmail={setEmail}
                        username={username}
                        setUserName={setUserName}
                        phone={phone}
                        setPhone={setPhone}
                        birthdate={birthdate}
                        setBirthdate={setBirthdate}
                        country={country}
                        setCountry={setCountry}
                        gender={gender}
                        setGender={setGender}
                        saveChanges={saveChanges}
                    />
                )}
            </UserProfileSection>
        </StyledHeader>
    );
}