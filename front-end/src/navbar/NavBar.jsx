import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { api } from '../services/api';

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

const NavItemContainer = styled.div`
    width: 100%;
    padding: 0 ${props => (props.$isopen ? '0' : '0.5rem')}; 
`;

const NavButton = styled(Button)`
    color: ${props => props.theme.text} !important;
    width: 100%;
    justify-content: flex-start;
    padding: 10px 20px;
    margin: 0.2rem 0 !important;
    transition: background-color 0.2s ease;
    position: relative; 

    .MuiButton-label {
        opacity: ${props => (props.$isopen ? 1 : 0)};
        transition: opacity 0.3s ease;
    }

    ${props => !props.$isopen && css`
        justify-content: center;
        padding: 10px 0 !important;
    `}
`;

const SublistToggleButton = styled(IconButton)`
    position: absolute !important;
    right: 5px; 
    color: ${props => props.theme.text} !important;
    padding: 5px !important;
    z-index: 2; 

    transform: rotate(${props => (props.$islistopen ? '90deg' : '0deg')});
    transition: transform 0.3s ease;
`;

const SubCategoryList = styled(List)`
    width: 100%;
    background-color: ${props => props.theme.surfaceVariant}; 
    padding: 0 0 0 0.5rem !important; 

    .MuiListItemButton-root {
        padding-left: 1.5rem; 
    }
`;

const SidebarContainer = styled.div`
    background-color: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    height: 100vh;
    position: fixed; 
    top: 0;
    left: 0;
    transition: width 0.3s ease;
    overflow-y: auto; 
    overflow-x: hidden; 
    z-index: 1000;

    width: ${props => (props.$isopen ? '250px' : '60px')}; 

    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
    padding-top: 5rem; 

    h1 {
        font-size: 1.2rem;
        margin: 1rem 0;
        white-space: nowrap;
        opacity: ${props => (props.$isopen ? 1 : 0)};
        transition: opacity 0.3s ease, margin 0.3s ease;
    }

    ${props => !props.$isopen && css`
        h1 {
            display: none;
            padding-left: 10px;
        }
    `};
`;

export default function NavBar({ isopen, toggleNavbar }) {
    const navigate = useNavigate();
    const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await api.getCategories(1, 20);
                setCategories(data.categories || []);
            } catch (error) {
                console.error('Erro ao buscar categorias:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const navItems = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Categories', path: '/categories', hasSublist: true }, 
        { name: 'Products', path: '/products' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
    };

    const handleToggleCategoryList = (event) => {
        event.stopPropagation(); 
        setIsCategoryListOpen(!isCategoryListOpen);
    };

    const handleSubCategoryClick = (categoryId, categoryName) => {
        navigate(`/categories/${categoryId}`);
    };

    return (
        <>
            <ToggleButtonContainer>
                <IconButton
                    onClick={toggleNavbar}
                    aria-label={isopen ? "Fechar Menu" : "Abrir Menu"}
                    style={{ right: 9, backgroundColor: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                >
                    {isopen ? <MenuOpenIcon /> : <MenuIcon />}
                </IconButton>
            </ToggleButtonContainer>

            <SidebarContainer $isopen={isopen}> 
                <h1>WEG Mine</h1>

                <NavList>
                    {navItems.map((item) => (
                        <NavItemContainer key={item.name} $isopen={isopen}>
                            <NavButton
                                component={item.hasSublist ? 'div' : 'button'}
                                $isopen={isopen}
                                startIcon={<MenuIcon />}
                                onClick={() => !item.hasSublist && handleNavigation(item.path)}
                                variant="text"
                                style={{ zIndex: 1 }}
                            >
                                <h1>{item.name}</h1>
                                {item.hasSublist && isopen && (
                                    <SublistToggleButton
                                        onClick={handleToggleCategoryList}
                                        aria-label={isCategoryListOpen ? "Fechar Subcategorias" : "Abrir Subcategorias"}
                                        $islistopen={isCategoryListOpen}
                                    >
                                        <ChevronRightIcon />
                                    </SublistToggleButton>
                                )}
                            </NavButton>

                            {item.hasSublist && isCategoryListOpen && isopen && (
                                <SubCategoryList component="div" disablePadding>
                                    {loading ? (
                                        <ListItemButton>
                                            <ListItemText primary="Carregando..." />
                                        </ListItemButton>
                                    ) : categories.length > 0 ? (
                                        categories.map((category) => (
                                            <ListItemButton 
                                                key={category.id} 
                                                onClick={() => handleSubCategoryClick(category.id, category.name)}
                                                style={{ minHeight: '40px' }} 
                                            >
                                                <ListItemText primary={category.name} />
                                            </ListItemButton>
                                        ))
                                    ) : (
                                        <ListItemButton>
                                            <ListItemText primary="Nenhuma categoria" />
                                        </ListItemButton>
                                    )}
                                </SubCategoryList>
                            )}
                        </NavItemContainer>
                    ))}
                </NavList>
            </SidebarContainer>
        </>
    );
}