import { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SearchIcon from "@mui/icons-material/Search";
import Button from '@mui/material/Button';
import { TextField, IconButton, Avatar } from "@mui/material";
import styled, { keyframes } from 'styled-components';
import { useTheme } from '../context/themeProvider';
import useAnimatedToggle from '../components/useAnimatedToggle';

const StyledHeader = styled.header`
  background-color: ${props => props.theme.surface}; 
  color: ${props => props.theme.text}; 
  
  width: 100%; 
  
  padding: 10px 5vw 10px 20px; 
  
  box-sizing: border-box; 
  display: flex; 
  
  justify-content: flex-end; 
  
  align-items: center;
  gap: 20px;


  hr {
    border-color: ${props => props.theme.textSecondary};
    height: 4vh;
  }
`;

const StyledForm = styled.form`
  display: flex;
  gap: 8px;
  color: ${({ theme }) => theme.text};
`;


const fadeInSlide = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOutSlide = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
`;

const UserSubMenu = styled.div`
  position: absolute;
  z-index: 10;
  background-color: ${({ theme }) => theme.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.textSecondary};
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 250px;
  margin-top: 4px;
  animation: ${({ itsclosing }) => itsclosing ? fadeOutSlide : fadeInSlide} 0.25s ease-out forwards;

  button {
    color: ${({ theme }) => theme.text};
    width: 100%;
    justify-content: flex-start;
    padding: 8px 12px;
    &:hover {
      background-color: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.surface};
    }
  }
`;

const SearchDropdown = styled.div`
  position: absolute;
  z-index: 10;
  background-color: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.textSecondary};
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 250px;
  margin-top: 4px;
  animation: ${({ itsclosing }) => itsclosing ? fadeOutSlide : fadeInSlide} 0.25s ease-out forwards;

  .item {
    padding: 8px 12px;
    font-size: 16px;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    border-bottom: 1px solid ${({ theme }) => theme.textSecondary};
    &:hover {
      background-color: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.surface};
    }
  }
`;



const DUMMY_PRODUCTS = [
    "Paris", "London", "New York", "Tokyo", "Berlin", 
    "Buenos Aires", "Cairo", "Canberra", "Rio de Janeiro", "Dublin"
];

const SearchBar = ({ value, onChange, onSubmit }) => {
  return (
    <StyledForm onSubmit={onSubmit}>
      <TextField
        id="search-bar"
        value={value}
        onChange={onChange}
        label="Search by Product ID or Model"
        variant="outlined"
        placeholder="Search"
        size="small"
        sx={{width: 250}}
      />
      <IconButton type="submit" aria-label="search">
        <SearchIcon style={{ fill: "blue" }} />
      </IconButton>
    </StyledForm>
  );
};


export default function Header() {
    const [searchQuery, setSearchQuery] = useState("");
    const [userInfo, setUserInfo] = useState({ name: "Carregando...", cargo: "" });
    const navigate = useNavigate();

    const [apiProducts, setApiProducts] = useState(DUMMY_PRODUCTS); 
    const [loadingError, setLoadingError] = useState(null);

    const userMenu = useAnimatedToggle(250);
    const searchMenu = useAnimatedToggle(250);

    const handleLogOut = () => {
        localStorage.clear();
        navigate("/");
    };

    useEffect(() => {
        // Fetching data from API
        fetch("http://127.0.0.1:8000/items")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data && data.length > 0 && typeof data[0] === 'object' && data[0].final_search) {
                 setApiProducts(data.map(item => item.final_search));
            } else {
                 setApiProducts(data); 
            }
            setLoadingError(null);
        })
        .catch((err) => {
            console.error("Erro ao buscar dados da API.", err);
            setLoadingError(err.message);
        });
    }, []);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value); 
    }, []);
    
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        console.log("Busca submetida:", searchQuery);
    };

    const filterData = (query, data) => {
        if (!query) return data;
        const lowerCaseQuery = query.toLowerCase();
        return data.filter((d) => d.toLowerCase().includes(lowerCaseQuery));
    };
    
    const dataFiltered = filterData(searchQuery, apiProducts);
    
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

    useEffect(() => {
        if (searchQuery && dataFiltered.length > 0) {
            searchMenu.open();
        } else {
            searchMenu.close();
        }
    }, [searchQuery, dataFiltered]);

    
    const { themeMode, toggleTheme } = useTheme();

    return (
        <StyledHeader className="dashboard-header">
        <div className="right-side">
            <div style={{ width: "fit-content", padding: 0, position: "relative" }}>
            <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
            />
            {loadingError && (
                <p style={{ color: "orange", fontSize: "small" }}>
                Aviso: Erro API. Usando dados temporários.
                </p>
            )}

            {searchQuery && dataFiltered.length > 0 && searchMenu.isOpen && (
                <SearchDropdown
                ref={searchMenu.ref}
                itsclosing={searchMenu.isClosing}
                >
                {dataFiltered.map((d) => (
                    <div
                    key={d}
                    className="item"
                    onClick={() => {
                        navigate("products/" + d.replace(/ /g, "_"));
                        searchMenu.close(); // fecha ao clicar em item
                    }}
                    >
                    {d}
                    </div>
                ))}
                </SearchDropdown>
            )}
            </div>
        </div>
        <hr style={{ margin: 0 }} />
        <div>
            <Button onClick={userMenu.toggle} color="secondary">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <Avatar alt={userInfo.name} src="/static/images/avatar/1.jpg" />
                <div style={{ display: "flex", flexDirection: "column", marginLeft: 8 }}>
                <span style={{ fontSize: 14, fontWeight: "bold" }}>{userInfo.name}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{userInfo.cargo}</span>
                </div>
            </div>
            </Button>

            {userMenu.isOpen && (
            <UserSubMenu ref={userMenu.ref} itsclosing={userMenu.isClosing}>
                <Button>Configurações</Button>
                <Button onClick={toggleTheme}>Trocar Tema</Button>
                <Button onClick={handleLogOut}>Log Out</Button>
            </UserSubMenu>
            )}
        </div>
        </StyledHeader>
    );
}