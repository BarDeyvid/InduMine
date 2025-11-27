import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SearchIcon from "@mui/icons-material/Search";
import Button from '@mui/material/Button';
import { TextField, IconButton } from "@mui/material";
import styled from 'styled-components';
import ThemeSwitcher from "../components/ThemeSwitcher";
import Header from "../components/Header"

const StyledPage = styled.div`
  background-color: ${props => props.theme.surface}; 
  color: ${props => props.theme.text}; 
  
  margin-left: 10vw; /* Desloca para a direita da NavBar (10vw) */
  width: 90vw; 
  min-height: 100vh; 
  box-sizing: border-box; 
  display: flex; 
  flex-direction: column; 

  hr {
    border-color: ${props => props.theme.textSecondary};
    opacity: 0.5;
  }`;

const DUMMY_PRODUCTS = [
    "Paris", "London", "New York", "Tokyo", "Berlin", 
    "Buenos Aires", "Cairo", "Canberra", "Rio de Janeiro", "Dublin"
];

function Products() {
    const [apiRows, setApiRows] = useState(DUMMY_PRODUCTS); 
    useEffect(() => {
        fetch("http://127.0.0.1:8000/total_rows")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                setApiRows(data); // mantém como objeto
                setLoadingError(null);
            })
            .catch((err) => {
                console.error("Erro ao buscar dados da API.", err);
                setLoadingError(err.message);
            });
    }, []);

    var TotalRows = apiRows && Object.entries(apiRows).length > 0 && (() => {
                        const [key, value] = Object.entries(apiRows).sort((a, b) => b[1] - a[1])[0];
                        return value;
                    })();
    
    return (
        <StyledPage className="products-container">
            <Header />
            
            <div style={{ padding: '0 20px' }}>
                <h1>Welcome to the Products sub-section!</h1>
            </div>
            <div className="Shower">
                <h3>
                    Showing {TotalRows} of {TotalRows} products
                </h3>
                <Button variant="contained" onClick={() => console.log("Pretty PDF")}>
                    PDF
                </Button>
            </div>
    </StyledPage>
    );
}

export default Products;