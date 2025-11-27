import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SearchIcon from "@mui/icons-material/Search";
import Button from '@mui/material/Button';
import { TextField, IconButton } from "@mui/material";
import styled from 'styled-components';
import ThemeSwitcher from "../components/ThemeSwitcher";

const StyledHeader = styled.header`
  background-color: ${props => props.theme.surface}; 
  color: ${props => props.theme.text}; 
  padding: 10px 20px;
  display: flex;
  padding-left: 50vw;
  align-items: center;
  gap: 20px;

  hr {
    border-color: ${props => props.theme.textSecondary};
  }
`;

const StyledForm = styled.form`
  display: flex;
  gap: 8px;
  color: ${({ theme }) => theme.text};
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
    const [userInfo, setUserInfo] = useState({ name: 'Carregando...', cargo: '' });
    const navigate = useNavigate();

    const [apiProducts, setApiProducts] = useState(DUMMY_PRODUCTS); 
    const [loadingError, setLoadingError] = useState(null);

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
    
    return (
            <StyledHeader className="dashboard-header">
                <div className="left-side">
                    <ThemeSwitcher />
                </div>
                <div className="right-side">
                    <div style={{ width: "fit-content", padding: 0, position: 'relative' }}>
                        <SearchBar 
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onSubmit={handleSearchSubmit} 
                        />
                        {loadingError && <p style={{ color: "orange", fontSize: "small" }}>Aviso: Erro API. Usando dados temporários.</p>}

                        {searchQuery && dataFiltered.length > 0 && ( 
                            <div style={{ 
                                position: 'absolute', zIndex: 10, backgroundColor: 'white',
                                border: '1px solid #ccc', borderRadius: '4px',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', width: '250px', marginTop: '4px'
                            }}>
                                {dataFiltered.map((d) => (
                                    <div 
                                    key={d} 
                                    className="text"
                                    style={{ padding: '8px 12px', fontSize: 16, color: "blue", cursor: 'pointer', borderBottom: '1px solid #eee' }} 
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                                    onClick={() => navigate("products/" + d.replace(/ /g, "_"))}
                                    > 
                                    {d}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <hr style={{margin: 0}}/>
                <div>
                    <Button color="secondary">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 14, fontWeight: 'bold' }}>{userInfo.name}</span>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>{userInfo.cargo}</span> 
                        </div>
                    </Button>
                </div>
            </StyledHeader>
    );
}