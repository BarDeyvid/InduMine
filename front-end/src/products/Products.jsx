// front-end/src/products/Products.jsx
import { useState, useCallback, useEffect } from "react";
import styled from 'styled-components';
import Header from "../components/Header"
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Link } from 'react-router-dom';
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
        list-style: none;
        margin: 0;        
        padding: 0;       
        flex-direction: row;
        display: flex;
        gap: 5vw;         
        width: auto;
        justify-content: center; 
    }

    /* Optional: Style individual list items */
    li {
        margin: 0;        
        padding: 2vw;       
        text-align: center; 
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
        gap: 2vw; 
    }

    .ChartContainer > ul > li {
        padding: 1vw;
        flex-grow: 1; 
        flex-basis: 0; 
        min-width: 0; 
        max-width: 33%; 
    }
    
    .products.grid ul {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px; 
        padding: 0;
        margin: 0;
    }
    
    .products.grid ul li {
        display: flex;              
        flex-direction: column;
        align-items: center;       
        justify-content: center; 
        padding: 1rem;
        }

        .products.grid ul li img {
        width: 100px;              
        height: auto;
        margin: 0 0 10px 0; 
        border-radius: 8px;          
        }

        .products.grid ul li span {
        text-align: center;
        font-weight: bold;
        }

    .products.list ul {
        display: flex;
        flex-direction: column; 
        gap: 8px;
        padding: 0;
        margin: 0;
    }

    .products.list ul li {
        display: flex; 
        align-items: center;
        text-align: left;
        padding: 1rem;
        width: 100%;
        box-sizing: border-box;
    }

    .products.list ul li img {
        width: 60px;         
        height: auto;
        margin-right: 20px; 
        border-radius: 8px;
    }

    .products-header {
        display: flex;
        justify-content: space-between; 
        align-items: center; 
        padding: 0 20px;
        margin-bottom: 20px;
    }

    .list-info {
        flex: 1; 
        text-align: left;
    }

    .list-info h3, .list-info p {
        margin: 0;
    }

    .list-info p {
        font-size: 0.9em;
        color: ${props => props.theme.textSecondary};
    }
    
    .toggle-button {
        padding: 8px 12px;
        background-color: ${props => props.theme.primary};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .toggle-button:hover {
        background-color: ${props => props.theme.primaryDark};
    }

`;


const DUMMY_PRODUCTS = [
    { id: 1, name: "Produto 1", photo: "../src/assets/dummyPhoto1.png", description: "Descrição detalhada do Produto 1. Um motor de alta potência e eficiência." },
    { id: 2, name: "Produto 2", photo: "../src/assets/dummyPhoto2.png", description: "Descrição detalhada do Produto 2. Inversor de frequência inteligente e compacto." },
    { id: 3, name: "Produto 3", photo: "../src/assets/dummyPhoto3.png", description: "Descrição detalhada do Produto 3. Gerador confiável para aplicações críticas." },
    { id: 4, name: "Produto 4", photo: "../src/assets/dummyPhoto4.png", description: "Descrição detalhada do Produto 4. Transformador de energia de baixo ruído." },
    { id: 5, name: "Produto 5", photo: "../src/assets/dummyPhoto5.png", description: "Descrição detalhada do Produto 5. Motor trifásico com proteção IP65." },
    { id: 6, name: "Produto 6", photo: "../src/assets/dummyPhoto6.png", description: "Descrição detalhada do Produto 6. Inversor solar para sistemas fotovoltaicos." },
    { id: 7, name: "Produto 7", photo: "../src/assets/dummyPhoto7.png", description: "Descrição detalhada do Produto 7. Gerador portátil a diesel." },
    { id: 8, name: "Produto 8", photo: "../src/assets/dummyPhoto8.png", description: "Descrição detalhada do Produto 8. Transformador de isolamento para segurança." },
    { id: 9, name: "Produto 9", photo: "../src/assets/dummyPhoto9.png", description: "Descrição detalhada do Produto 9. Motor de passo para automação precisa." },
    { id: 10, name: "Produto 10", photo: "../src/assets/dummyPhoto10.png", description: "Descrição detalhada do Produto 10. Inversor de alta tensão para indústria pesada." },
];

function Products() {
    const [apiRows, setApiRows] = useState({});
    const [loadingError, setLoadingError] = useState(null);
    const [productView, setProductView] = useState('grid');

    const toggleProductView = useCallback(() => {
        setProductView((prevView) => (prevView === 'grid' ? 'list' : 'grid'));
    }, []);

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
                            xAxis={[{ scaleType:"band", data: ["Seg", "Ter", "Qua", "Qui", "Sex"] }]}
                            series={[
                                {
                                data: [1,2, 5.5, 2, 8.5, 1.5, 5],
                                },
                            ]}
                            height={200}
                            />
                        </li>
                    </ul>
            </div>
            <hr style={{width: "90%", marginBottom: "20px"}}/>

            <div className={`products ${productView}`}> 
                <div className="products-header"> 
                    <h2 style={{textAlign: "center"}}>Lista de Produtos</h2>
                    <button onClick={toggleProductView} className="toggle-button">
                        {productView === 'grid' ? 'Mudar para Vista em Coluna' : 'Mudar para Vista em Grade'}
                    </button>
                </div>
                
                <ul>
                    {DUMMY_PRODUCTS.map((product, index) => (
                        <li key={index}>
                            <Link 
                                to={`/products/${product.id}`} 
                                style={{ 
                                    textDecoration: 'none', 
                                    color: 'inherit',
                                    display: 'flex', 
                                    flexDirection: productView === 'grid' ? 'column' : 'row',
                                    alignItems: 'center',
                                    width: '100%' 
                                }}
                            >
                                <img src={product.photo} alt={product.name} />
                                {productView === 'grid' ? (
                                    <span>{product.name}</span>
                                ) : (
                                    <div className="list-info">
                                        <h3>{product.name}</h3>
                                        <p>{product.description}</p>
                                    </div>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </StyledPage>
    );
}

export default Products;