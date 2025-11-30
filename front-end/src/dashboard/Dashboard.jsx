// front-end/src/dashboard/Dashboard.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import styled from 'styled-components'
import Header from "../components/Header"

const DUMMY_PRODUCTS = [
    "Paris", "London", "New York", "Tokyo", "Berlin", 
    "Buenos Aires", "Cairo", "Canberra", "Rio de Janeiro", "Dublin"
];

const StyledPage = styled.div`
  background-color: ${props => props.theme.surface}; 
  color: ${props => props.theme.text}; 
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex; 
  flex-direction: column;
  
  hr {
    border-color: ${props => props.theme.textSecondary};
    opacity: 0.5;
  }
`;

function Dashboard() {
    const navigate = useNavigate();

    const [loadingError, setLoadingError] = useState(null);

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
        <StyledPage className="">
            <Header />
            <div className="Shower">
                <h3>Showing {TotalRows} of {TotalRows} products</h3>
                    <Button variant="contained" onClick={() => console.log("Pretty PDF")}>
                        PDF 
                    </Button>
            </div>

            <div style={{ padding: '0 20px' }}>
                <h1>Welcome to the Dashboard!</h1>
                <p>This is your analytics dashboard.</p>
            </div>
    </StyledPage>
    );
}

export default Dashboard;