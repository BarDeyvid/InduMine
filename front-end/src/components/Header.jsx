// components/Header.jsx
import { useState, useCallback, useEffect, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Button, Avatar } from "@mui/material";
import { Settings, Brightness4, Logout, ChevronRight, Menu as MenuIcon, Search } from '@mui/icons-material';
import { useTheme } from '../context/themeProvider';
import useAnimatedToggle from '../components/useAnimatedToggle';
import SearchBar from "../components/SearchBar";
import UserSettings from './UserSettings'; 
import { AuthContext } from '../auth/authContext';

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
    padding: 12px 20px; 
    box-sizing: border-box; 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
    flex-wrap: wrap;
    gap: 15px;
    min-height: 70px;

    .logo-placeholder {
        font-size: 1.4em;
        font-weight: bold;
        color: ${props => props.theme.primary};
        flex-shrink: 0;
    }

    @media (max-width: 1024px) {
        padding: 10px 15px;
    }
    
    @media (max-width: 768px) {
        padding: 8px 12px;
        gap: 10px;
        min-height: 60px;
        
        .logo-placeholder {
            font-size: 1.2em;
            order: 1;
        }
    }
    
    @media (max-width: 480px) {
        .logo-placeholder {
            font-size: 1.1em;
        }
    }
`;

const HeaderControls = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
    justify-content: flex-end;
    
    @media (max-width: 768px) {
        order: 2;
        flex: none;
        width: auto;
    }
`;

const SearchArea = styled.div`
    width: 35vw;
    max-width: 400px;
    margin: 0 auto;

    @media (max-width: 1024px) {
        width: 40vw;
    }
    
    @media (max-width: 768px) {
        order: 3;
        width: 100%;
        margin-top: 10px;
        max-width: 100%;
        display: ${props => props.$showSearch ? 'block' : 'none'};
    }
`;

const MobileSearchToggle = styled(Button)`
    && {
        display: none;
        min-width: 40px;
        padding: 8px;
        border-radius: 50%;
        
        @media (max-width: 768px) {
            display: flex;
        }
    }
`;

const UserProfileSection = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
`;

const UserAvatarButton = styled(Button)`
    && {
        color: ${props => props.theme.text};
        padding: 6px 12px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        text-transform: none;
        transition: background-color 0.3s;
        
        &:hover {
            background-color: ${props => props.theme.surfaceHover};
        }
        
        @media (max-width: 768px) {
            padding: 4px 8px;
        }
    }
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 8px;
    margin-right: 8px;
    text-align: left;

    span:first-child {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    span:last-child {
        font-size: 12px;
        opacity: 0.8;
    }

    @media (max-width: 768px) {
        span:first-child {
            max-width: 80px;
        }
    }
    
    @media (max-width: 480px) {
        display: ${props => props.$hideOnMobile ? 'none' : 'flex'};
        
        span:first-child {
            max-width: 60px;
            font-size: 13px;
        }
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

    @media (max-width: 480px) {
        width: 220px;
        right: -10px;
    }

    button {
        color: ${({ theme }) => theme.text};
        width: 100%;
        justify-content: flex-start;
        padding: 12px 15px; /* Aumentado touch target */
        border-radius: 0;
        text-transform: none;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.95em;
        min-height: 48px;
        
        &:hover {
            background-color: ${({ theme }) => theme.primary};
            color: white;
        }
        
        @media (max-width: 480px) {
            padding: 10px 12px;
            min-height: 44px;
            font-size: 0.9em;
        }
    }
`;

const MenuToggleIcon = styled(ChevronRight)`
    transform: ${props => (props.$isopen ? 'rotate(-90deg)' : 'rotate(90deg)')};
    transition: transform 0.3s;
    font-size: 1.2em;
    
    @media (max-width: 768px) {
        margin-left: 0;
    }
`;

const MobileMenuContainer = styled.div`
    display: none;
    
    @media (max-width: 768px) {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 999;
        animation: fadeIn 0.3s ease-out;
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    }
`;

export default function Header() {
    const [userInfo, setUserInfo] = useState({ name: "Usuário", cargo: "Visitante" });
    const navigate = useNavigate();
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const { user, isAuth } = useContext(AuthContext);

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
        if (user) {
            setUserInfo({ 
                name: user.username || user.email || 'Usuário', 
                cargo: (user.roles?.[0] || 'Visitante').length > 20 
                    ? user.roles[0].substring(0, 20) + '...' 
                    : user.roles?.[0] || 'Visitante'
            });
        }
    }, [user]);
    
    const { toggleTheme } = useTheme();

    const toggleMobileSearch = () => {
        setShowMobileSearch(!showMobileSearch);
    };

    const handleSearchClick = () => {
        if (window.innerWidth <= 768) {
            setShowMobileSearch(true);
        }
    };

    return (
        <>
            <StyledHeader>
                <div className="logo-placeholder">InduMine</div>

                <HeaderControls>
                    <SearchArea $showSearch={showMobileSearch}>
                        <SearchBar 
                            width="100%" 
                            placeholder="Buscar..." 
                            onClick={handleSearchClick}
                        /> 
                    </SearchArea>
                    
                    <MobileSearchToggle onClick={toggleMobileSearch}>
                        <Search />
                    </MobileSearchToggle>
                    
                    <UserProfileSection>
                        <UserAvatarButton onClick={userSubMenu.toggle}>
                            <Avatar 
                                alt={userInfo.name} 
                                src="/static/images/avatar/1.jpg" 
                                sx={{ 
                                    width: 36, 
                                    height: 36,
                                    '@media (max-width: 768px)': {
                                        width: 32,
                                        height: 32
                                    }
                                }} 
                            />
                            <UserInfo $hideOnMobile={showMobileSearch}>
                                <span>{userInfo.name}</span>
                                <span>{userInfo.cargo}</span>
                            </UserInfo>
                            <MenuToggleIcon $isopen={userSubMenu.isOpen}/>
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
                </HeaderControls>
                
                {showMobileSearch && (
                    <MobileMenuContainer onClick={() => setShowMobileSearch(false)} />
                )}
            </StyledHeader>
        </>
    );
}