// front-end/src/products/Products.jsx
import { useState, useEffect, useCallback } from "react";
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Header from "../components/Header";
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Inventory, ViewModule, ViewList, GridView, List } from '@mui/icons-material';
import { CircularProgress, Box } from '@mui/material';
import { api } from '../services/api';

const StyledPage = styled.div`
    background-color: ${props => props.theme.background}; 
    color: ${props => props.theme.text}; 
    min-height: 100vh;
    display: flex; 
    flex-direction: column;
    align-items: center;
    padding-bottom: 30px;
    width: 100%;
    box-sizing: border-box;
    
    @media (max-width: 768px) {
        padding-bottom: 20px;
    }
`;

const MainContainer = styled.div`
    width: 90%;
    max-width: 1200px; 
    margin-top: 20px;
    box-sizing: border-box;

    h1 {
        font-size: 2.2em;
        color: ${props => props.theme.primary};
        margin: 15px 0;
        text-align: center;
        
        @media (max-width: 768px) {
            font-size: 1.8em;
            margin: 10px 0;
        }
        
        @media (max-width: 480px) {
            font-size: 1.6em;
        }
    }

    @media (max-width: 768px) {
        width: 95%;
        padding: 0 10px;
    }
    
    @media (max-width: 480px) {
        width: 100%;
        padding: 0 12px;
    }
`;

const ChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 25px;

    & > div {
        background-color: ${props => props.theme.surface};
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
        min-height: 280px;
    }
    
    & > div .MuiTypography-root {
        margin-bottom: 15px;
        font-weight: 600;
        color: ${props => props.theme.primary};
        text-align: center;
    }

    @media (max-width: 1024px) {
        grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 15px;
        margin-bottom: 20px;
        
        & > div {
            padding: 12px;
            min-height: 250px;
        }
        
        .MuiChartsSurface-root {
            width: 100% !important;
            max-width: 100%;
        }
    }
    
    @media (max-width: 480px) {
        gap: 12px;
        
        & > div {
            min-height: 220px;
        }
    }
`;

const ProductHeader = styled.div`
    display: flex;
    justify-content: space-between; 
    align-items: center; 
    margin: 25px 0 20px 0;
    flex-wrap: wrap;
    gap: 15px;
    
    h2 {
        margin: 0;
        font-size: 1.5em;
        color: ${props => props.theme.primary};
        
        @media (max-width: 768px) {
            font-size: 1.3em;
        }
        
        @media (max-width: 480px) {
            font-size: 1.2em;
        }
    }
    
    @media (max-width: 480px) {
        margin: 20px 0 15px 0;
    }
`;

const ViewToggleGroup = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    
    @media (max-width: 480px) {
        width: 100%;
        justify-content: space-between;
    }
`;

const ToggleButton = styled.button`
    padding: 10px 15px;
    background-color: ${props => props.$active ? props.theme.primary : props.theme.surface};
    color: ${props => props.$active ? 'white' : props.theme.text};
    border: 1px solid ${props => props.theme.primary}${props.$active ? 'ff' : '40'};
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: 100px;
    justify-content: center;
    
    &:hover {
        background-color: ${props => props.$active ? props.theme.primary : props.theme.surfaceHover};
    }
    
    @media (max-width: 768px) {
        padding: 8px 12px;
        min-width: 90px;
        font-size: 0.85em;
    }
    
    @media (max-width: 480px) {
        padding: 8px;
        min-width: auto;
        flex: 1;
        
        span {
            display: none;
        }
    }
`;

const ProductList = styled.div`
    display: grid;
    grid-template-columns: ${props => (props.$view === 'grid' 
        ? 'repeat(auto-fill, minmax(180px, 1fr))' 
        : '1fr')};
    gap: 15px;
    width: 100%;

    @media (max-width: 1024px) {
        grid-template-columns: ${props => (props.$view === 'grid' 
            ? 'repeat(auto-fill, minmax(160px, 1fr))' 
            : '1fr')};
    }
    
    @media (max-width: 768px) {
        grid-template-columns: ${props => (props.$view === 'grid' 
            ? 'repeat(2, 1fr)' 
            : '1fr')};
        gap: 12px;
    }
    
    @media (max-width: 480px) {
        grid-template-columns: ${props => (props.$view === 'grid' 
            ? 'repeat(2, 1fr)' 
            : '1fr')};
        gap: 10px;
    }
    
    @media (max-width: 360px) {
        grid-template-columns: ${props => (props.$view === 'grid' 
            ? '1fr' 
            : '1fr')};
    }
`;

const ProductItem = styled(Link)`
    display: flex;
    flex-direction: ${props => props.$view === 'grid' ? 'column' : 'row'};
    align-items: ${props => props.$view === 'grid' ? 'center' : 'flex-start'};
    text-decoration: none;
    color: inherit;
    background-color: ${props => props.theme.surface};
    border-radius: 10px;
    padding: ${props => props.$view === 'grid' ? '15px' : '12px'};
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    text-align: ${props => props.$view === 'grid' ? 'center' : 'left'};
    height: ${props => props.$view === 'grid' ? 'auto' : 'auto'};
    min-height: ${props => props.$view === 'grid' ? '220px' : 'auto'};
    
    &:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    img {
        width: ${props => props.$view === 'grid' ? '100%' : '80px'};
        height: ${props => props.$view === 'grid' ? '120px' : '80px'};
        object-fit: cover;
        border-radius: 8px;
        margin: ${props => props.$view === 'grid' ? '0 0 12px 0' : '0 15px 0 0'};
        flex-shrink: 0;
    }

    .list-info {
        flex: 1;
        width: 100%;
        
        h3 {
            margin: 0 0 6px 0; 
            font-size: ${props => props.$view === 'grid' ? '0.95em' : '1em'};
            color: ${props => props.theme.primary};
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        p {
            margin: 0; 
            font-size: ${props => props.$view === 'grid' ? '0.8em' : '0.85em'}; 
            color: ${props => props.theme.textSecondary};
            display: -webkit-box;
            -webkit-line-clamp: ${props => props.$view === 'grid' ? '1' : '2'};
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    }

    @media (max-width: 768px) {
        padding: ${props => props.$view === 'grid' ? '12px' : '10px'};
        min-height: ${props => props.$view === 'grid' ? '200px' : 'auto'};
        
        img {
            height: ${props => props.$view === 'grid' ? '100px' : '70px'};
            width: ${props => props.$view === 'grid' ? '100%' : '70px'};
        }
        
        .list-info h3 {
            font-size: ${props => props.$view === 'grid' ? '0.9em' : '0.95em'};
        }
    }
    
    @media (max-width: 480px) {
        min-height: ${props => props.$view === 'grid' ? '180px' : 'auto'};
        
        img {
            height: ${props => props.$view === 'grid' ? '90px' : '60px'};
            width: ${props => props.$view === 'grid' ? '100%' : '60px'};
            margin-right: ${props => props.$view === 'grid' ? '0' : '10px'};
        }
        
        .list-info h3 {
            font-size: 0.85em;
            -webkit-line-clamp: 1;
        }
        
        .list-info p {
            font-size: 0.75em;
            -webkit-line-clamp: 1;
        }
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    width: 100%;
`;

const ErrorMessage = styled.div`
    text-align: center;
    padding: 40px 20px;
    color: #f44336;
    
    h2 {
        margin-bottom: 15px;
    }
`;

const ChartContainer = styled.div`
    width: 100%;
    height: 250px;
    display: flex;
    justify-content: center;
    align-items: center;
    
    @media (max-width: 768px) {
        height: 220px;
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

    const toggleProductView = useCallback((view) => {
        setProductView(view);
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

    if (loading) {
        return (
            <StyledPage>
                <Header />
                <LoadingContainer>
                    <CircularProgress size={50} />
                </LoadingContainer>
            </StyledPage>
        );
    }

    if (error) {
        return (
            <StyledPage>
                <Header />
                <MainContainer>
                    <ErrorMessage>
                        <h2>Erro ao carregar produtos</h2>
                        <p>{error}</p>
                    </ErrorMessage>
                </MainContainer>
            </StyledPage>
        );
    }

    return (
        <StyledPage>
            <Header />
            <MainContainer>
                <h1>Produtos</h1>
                
                <ChartGrid>
                    <div>
                        <Typography variant="subtitle1">Produtos por Categoria</Typography>
                        <ChartContainer>
                            {chartData.byCategory.length > 0 ? (
                                <BarChart
                                    dataset={chartData.byCategory}
                                    xAxis={[{ dataKey: "categoria", scaleType: 'band' }]}
                                    series={[{ dataKey: "valor", label: "Qtd", color: '#4CAF50' }]}
                                    height={200}
                                    width={280}
                                    slotProps={{ legend: { hidden: true } }}
                                    margin={{ top: 20, bottom: 40, left: 40, right: 20 }}
                                />
                            ) : (
                                <p style={{ color: '#999', fontSize: '0.9em' }}>Sem dados disponíveis</p>
                            )}
                        </ChartContainer>
                    </div>
                    <div>
                        <Typography variant="subtitle1">Status dos Produtos</Typography>
                        <ChartContainer>
                            {chartData.byStatus.length > 0 ? (
                                <PieChart
                                    series={[{ 
                                        data: chartData.byStatus, 
                                        innerRadius: 30, 
                                        paddingAngle: 5,
                                        cornerRadius: 5
                                    }]}
                                    height={200}
                                    width={280}
                                    slotProps={{ legend: { hidden: true } }}
                                />
                            ) : (
                                <p style={{ color: '#999', fontSize: '0.9em' }}>Sem dados disponíveis</p>
                            )}
                        </ChartContainer>
                    </div>
                </ChartGrid>
                
                <ProductHeader> 
                    <h2>Catálogo ({products.length} produtos)</h2>
                    <ViewToggleGroup>
                        <ToggleButton 
                            onClick={() => toggleProductView('grid')}
                            $active={productView === 'grid'}
                            aria-label="Visualização em grade"
                        >
                            <GridView />
                            <span>Grade</span>
                        </ToggleButton>
                        <ToggleButton 
                            onClick={() => toggleProductView('list')}
                            $active={productView === 'list'}
                            aria-label="Visualização em lista"
                        >
                            <List />
                            <span>Lista</span>
                        </ToggleButton>
                    </ViewToggleGroup>
                </ProductHeader>
                
                <ProductList $view={productView}>
                    {products.map((product) => (
                        <ProductItem key={product.id} to={`/products/${product.id}`} $view={productView}>
                            <img 
                                src={product.photo} 
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/100x100/cccccc/969696?text=Produto';
                                }} 
                                alt={product.name}
                            />
                            <div className="list-info">
                                <h3>{product.name}</h3>
                                <p>{product.category || 'Sem categoria'}</p>
                                <p style={{ fontSize: '0.8em', marginTop: '4px', color: '#666' }}>
                                    {product.status || 'Ativo'}
                                </p>
                            </div>
                        </ProductItem>
                    ))}
                </ProductList>
                
                {products.length === 0 && (
                    <Box textAlign="center" py={5}>
                        <Typography variant="h6" color="textSecondary">
                            Nenhum produto encontrado
                        </Typography>
                    </Box>
                )}
                
            </MainContainer>
        </StyledPage>
    );
}

export default Products;