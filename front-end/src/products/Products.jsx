// front-end/src/products/Products.jsx
import { useState, useCallback, useEffect } from "react";
import styled from 'styled-components';
import Header from "../components/Header"
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import Typography from '@mui/material/Typography';

const dummyDataset = [
  { categoria: "motores", valor: 50 },
  { categoria: "inversores", valor: 30 },
  { categoria: "geradores", valor: 20 },
  { categoria: "transformadores", valor: 15 },
  { categoria: "outros", valor: 10 },
];

const dataset = [
{ month: 'Jan', london: 100, paris: 200 },
{ month: 'Feb', london: 150, paris: 250 },
];



const secondDummyDataset = [
{ id: 0, value: 82, label: "Ativos" },
{ id: 1, value: 10, label: "Em Revisao" },
{ id: 2, value: 8, label: "Descontinuados" },
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

    ul {
        list-style: none; /* Removes bullets */
        margin: 0;        /* Removes default margin */
        padding: 0;       /* Removes default padding */
        flex-direction: row;
        display: flex;
        gap: 5vw;         /* Space between items */
        width: auto;
        justify-content: center; /* Center items horizontally */
    }

    /* Optional: Style individual list items */
    li {
        margin: 0;        /* Reset margin */
        padding: 2vw;       /* Reset padding */
        text-align: center; /* Center text */
        border: 1px solid ${props => props.theme.textSecondary};
        border-radius: 16px;
        width: auto;
        height: auto;
    }
    
    li:hover {
        box-shadow: 0 4px 8px ${props => props.theme.primary};
        transform: translateY(-2px);
        transition: all 0.3s ease;
    }

    h3 {
        margin: 0;
        color: ${props => props.theme.primary};
    }
    h2 {
        margin: 0;
        color: ${props => props.theme.textSecondary};
    }

    .ChartContainer > ul { 
        gap: 2vw; /* Reduced gap for a tighter fit */
    }

    .ChartContainer > ul > li {
        padding: 1vw; /* Reduced padding on chart containers */
        /* Make all three chart LIs equally sized */
        flex-grow: 1; 
        flex-basis: 0; 
        min-width: 0; 
        max-width: 33%; 
    }
`;

const DUMMY_PRODUCTS = [
    "Paris", "London", "New York", "Tokyo", "Berlin", 
    "Buenos Aires", "Cairo", "Canberra", "Rio de Janeiro", "Dublin"
];

function Products() {
    const [apiRows, setApiRows] = useState({});
    const [loadingError, setLoadingError] = useState(null);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/total_rows")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                setApiRows(data); 
                setLoadingError(null);
            })
            .catch((err) => {
                console.error("Erro ao buscar dados da API.", err);
                setLoadingError(err.message);
            });
    }, []);

    const TotalRows = Object.entries(apiRows).length > 0
        ? Object.entries(apiRows).sort((a, b) => b[1] - a[1])[0][1]
        : 0;

    return (
        <StyledPage>
            <Header />
            <div style={{ padding: '0 20px' }}>
                <h1 style={{textAlign: "center"}}>Welcome to the Products sub-section!</h1>
            </div>

            <div className="InfoCards" style={{ padding: '20px' }}>
                <ul>
                    <li><h2>Produtos</h2><h3>{TotalRows}</h3></li>
                    <li><h2>Produtos Ativos</h2><h3>{TotalRows}</h3></li>
                    <li><h2>Categorias</h2><h3>{TotalRows}</h3></li>
                    <li><h2>Atualizações Hoje</h2><h3>{TotalRows}</h3></li>
                </ul>
            </div>

            <hr style={{width: "90%", marginBottom: "20px"}}/>

            <div className="ChartContainer" style={{ padding: '0 20px', width: "auto", marginBottom: '40px' }}>
                 <ul>
                    <li style={{height: "fit-content", width: "auto"}}>
                        <Typography>Produtos Por Categoria</Typography>
                        <BarChart
                            dataset={dummyDataset}
                            xAxis={[{ dataKey: "categoria" }]}
                            series={[{ dataKey: "valor" }]}
                            height={200}
                        />
                    </li>
                    <li style={{ height: "fit-content", width: "auto", listStyle: "none" }}>
                        <Typography>Status dos Produtos</Typography>
                        <PieChart
                            series={[{ data: secondDummyDataset }]}
                            width={200}
                            height={200}
                            sx={{
                            "& ul": {
                                marginLeft: '50px !important',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 1,
                            },
                            "& li": {
                                padding: 1,
                                borderRadius: 2,
                            },
                            }}
                        />
                        </li>
                    <li style={{height: "fit-content", width: "auto"}}>
                        <Typography>Atualizações Semanais</Typography>
                        <LineChart
                        xAxis={[{ data: [1, 2, 3, 5, 8, 10] }]}
                        series={[
                            {
                            data: [2, 5.5, 2, 8.5, 1.5, 5],
                            },
                        ]}
                        height={200}
                        />
                    </li>
                </ul>
            </div>
        </StyledPage>
    );
}


export default Products;