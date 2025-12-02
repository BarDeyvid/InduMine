// front-end/src/products/Products.jsx
import { useState, useEffect, useCallback } from "react";
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Header from "../components/Header";
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Inventory, ViewModule, ViewList } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { api } from '../services/api';

const StyledPage = styled.div`
    background-color: ${props => props.theme.background}; 
    color: ${props => props.theme.text}; 
    min-height: 100vh;
    display: flex; 
    flex-direction: column;
    align-items: center;
    padding-bottom: 40px;
`;

const MainContainer = styled.div`
    width: 90%;
    max-width: 1200px; 
    margin-top: 20px;

    @media (max-width: 768px) {
        width: 95%;
        padding: 0 10px;
    }
`;

const ChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;

    & > div {
        background-color: ${props => props.theme.surface};
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden; /* Evita que o gráfico quebre o container */
    }

    @media (max-width: 768px) {
        grid-template-columns: 1fr; /* 1 por linha no mobile */
        
        /* Ajuste para o gráfico caber na tela do celular */
        .MuiChartsSurface-root {
            width: 100% !important;
            max-width: 85vw; 
        }
    }
`;

const ProductHeader = styled.div`
    display: flex;
    justify-content: space-between; 
    align-items: center; 
    margin: 20px 0;
    flex-wrap: wrap;
    gap: 15px;
`;

const ToggleButton = styled.button`
    padding: 10px 15px;
    background-color: ${props => props.theme.primary};
    color: white;
    border: none;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    @media (max-width: 480px) {
        width: 100%;
        justify-content: center;
    }
`;

const ProductList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    /* Grid dinâmico baseado na view e tamanho da tela */
    grid-template-columns: ${props => (props.$view === 'grid' 
        ? 'repeat(auto-fill, minmax(200px, 1fr))' 
        : '1fr')};
    gap: 15px;

    @media (max-width: 480px) {
        /* No mobile muito pequeno, grid vira 2 colunas pequenas ou 1 grande */
        grid-template-columns: ${props => (props.$view === 'grid' 
            ? 'repeat(2, 1fr)' 
            : '1fr')};
    }
`;

const ProductItem = styled(Link)`
    display: flex;
    flex-direction: ${props => props.$view === 'grid' ? 'column' : 'row'};
    align-items: center;
    text-decoration: none;
    color: inherit;
    background-color: ${props => props.theme.surface};
    border-radius: 10px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    text-align: ${props => props.$view === 'grid' ? 'center' : 'left'};

    img {
        width: ${props => props.$view === 'grid' ? '100px' : '80px'};
        height: ${props => props.$view === 'grid' ? '100px' : '80px'};
        object-fit: cover;
        margin-right: ${props => props.$view === 'grid' ? '0' : '15px'};
        margin-bottom: ${props => props.$view === 'grid' ? '10px' : '0'};
        border-radius: 8px;
    }

    .list-info h3 { margin: 0 0 5px 0; font-size: 1em; }
    .list-info p { margin: 0; font-size: 0.8em; color: ${props => props.theme.textSecondary}; }

    @media (max-width: 480px) {
        /* Ajuste fino para lista em mobile */
        img {
            width: ${props => props.$view === 'grid' ? '100%' : '60px'};
            height: auto;
            max-width: ${props => props.$view === 'grid' ? '120px' : '60px'};
        }
    }
`;

function Products() {
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalCategories: 0,
        activePercentage: 0,
        updatesToday: 0
    });
    const [chartData, setChartData] = useState({
        byCategory: [],
        byStatus: [],
        weeklyUpdates: []
    });
    
    const [productView, setProductView] = useState('grid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const toggleProductView = useCallback(() => {
        setProductView((prevView) => (prevView === 'grid' ? 'list' : 'grid'));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // 1. Buscar Lista de Produtos (paginação inicial de 50)
                const productsData = await api.getProducts(1, 50);
                setProducts(productsData.products || []);
                
                // 2. Buscar Estatísticas do Dashboard para os Gráficos
                const statsData = await api.getDashboardStats();
                setStats({
                    totalProducts: statsData.total_products,
                    totalCategories: statsData.total_categories,
                    activePercentage: statsData.active_products_percentage,
                    updatesToday: statsData.updates_today
                });
                
                // CORREÇÃO AQUI: Mapear os dados que vêm em snake_case para camelCase
                if (statsData.chart_data) {
                    setChartData({
                        byCategory: statsData.chart_data.by_category || [],
                        byStatus: statsData.chart_data.by_status || [],
                        weeklyUpdates: statsData.chart_data.weekly_updates || []
                    });
                }

                setError(null);
            } catch (err) {
                console.error("Erro ao carregar dados dos produtos:", err);
                setError("Erro ao conectar com o servidor. Verifique se a API está online.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <StyledPage><Header /><CircularProgress style={{marginTop: 50}}/></StyledPage>;

    return (
        <StyledPage>
            <Header />
            <MainContainer>
                <h1>Produtos</h1>
                
                <ChartGrid>
                    <div>
                        <Typography variant="subtitle1">Categorias</Typography>
                        <BarChart
                            dataset={chartData.byCategory}
                            xAxis={[{ dataKey: "categoria", scaleType: 'band' }]}
                            series={[{ dataKey: "valor", label: "Qtd" }]}
                            height={250}
                            width={300}
                            slotProps={{ legend: { hidden: true } }}
                        />
                    </div>
                    <div>
                        <Typography variant="subtitle1">Status</Typography>
                        <PieChart
                            series={[{ data: chartData.byStatus, innerRadius: 30, paddingAngle: 5 }]}
                            height={200}
                            width={300}
                            slotProps={{ legend: { hidden: true } }}
                        />
                    </div>
                </ChartGrid>
                
                <ProductHeader> 
                    <h2>Catálogo</h2>
                    <ToggleButton onClick={() => setProductView(v => v === 'grid' ? 'list' : 'grid')}>
                        {productView === 'grid' ? <ViewList /> : <ViewModule />}
                        {productView === 'grid' ? 'Lista' : 'Grade'}
                    </ToggleButton>
                </ProductHeader>
                
                <ProductList $view={productView}>
                    {products.map((product) => (
                        <ProductItem key={product.id} to={`/products/${product.id}`} $view={productView}>
                            <img src={product.photo} onError={(e) => e.target.src = 'https://via.placeholder.com/100'} alt=""/>
                            <div className="list-info">
                                <h3>{product.name}</h3>
                                <p>{product.category}</p>
                            </div>
                        </ProductItem>
                    ))}
                </ProductList>
                
            </MainContainer>
        </StyledPage>
    );
}

export default Products;