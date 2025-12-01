// front-end/src/Categories/Categories.jsx
import { useState, useCallback, useEffect } from "react";
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Header from "../components/Header";
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Inventory, Category, Update, CheckCircle, ViewModule, ViewList } from '@mui/icons-material';
import { api } from '../services/api';

const StyledPage = styled.div`
    background-color: ${props => props.theme.background}; 
    color: ${props => props.theme.text}; 
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    display: flex; 
    flex-direction: column;
    align-items: center;
    padding-bottom: 40px;
`;

const MainContainer = styled.div`
    width: 90%;
    max-width: 1200px; 
    margin-top: 20px;

    h1 {
        font-size: 2.5em;
        color: ${props => props.theme.primary};
        margin: 20px 0 10px 0;
        text-align: center;
    }
    
    h2 {
        font-size: 1.5em;
        color: ${props => props.theme.text};
        margin: 30px 0 15px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    hr {
        border-color: ${props => props.theme.textSecondary};
        opacity: 0.2;
        margin: 40px 0;
    }
`;

const InfoCardContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
`;

const InfoCard = styled.div`
    background-color: ${props => props.theme.surface}; 
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .icon {
        color: ${props => props.theme.primary};
        font-size: 3rem;
        flex-shrink: 0;
    }

    .data {
        text-align: right;
    }

    .value {
        font-size: 2em;
        font-weight: bold;
        color: ${props => props.theme.text};
        margin: 0;
    }

    .title {
        font-size: 0.9em;
        color: ${props => props.theme.textSecondary};
        margin: 0;
    }
`;

const ChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;

    & > div {
        background-color: ${props => props.theme.surface};
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        min-height: 280px;
        display: flex;
        flex-direction: column;
        align-items: center;
        
        & .MuiTypography-root {
            color: ${props => props.theme.primary};
            font-weight: bold;
            margin-bottom: 10px;
        }
    }
`;

const CategoryHeader = styled.div`
    display: flex;
    justify-content: space-between; 
    align-items: center; 
    margin: 20px 0 20px 0;
`;

const ToggleButton = styled.button`
    padding: 10px 15px;
    background-color: ${props => props.theme.primary};
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
        background-color: ${props => props.theme.primaryDark};
        transform: translateY(-1px);
    }
`;

const CategoryList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: ${props => (props.$view === 'grid' ? 'grid' : 'flex')};
    grid-template-columns: ${props => (props.$view === 'grid' ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr')};
    flex-direction: ${props => (props.$view === 'list' ? 'column' : 'initial')};
    gap: 15px;
`;

const CategoryItem = styled(Link)`
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
    background-color: ${props => props.theme.surface};
    border: 1px solid ${props => props.theme.textSecondary}20;
    border-radius: 10px;
    padding: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    &:hover {
        box-shadow: 0 4px 12px ${props => props.theme.primary}30;
        transform: translateY(-2px);
    }

    img {
        width: 60px; 
        height: auto;
        margin-right: 15px; 
        border-radius: 6px;
        flex-shrink: 0;
    }

    .list-info {
        flex: 1; 
        text-align: left;
    }

    .list-info h3 {
        margin: 0 0 5px 0;
        font-size: 1.1em;
        color: ${props => props.theme.primary};
    }

    .list-info p {
        margin: 0;
        font-size: 0.85em;
        color: ${props => props.theme.textSecondary};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const CategoryCardGrid = styled(CategoryItem)`
    flex-direction: column;
    text-align: center;
    
    img {
        width: 100px;
        margin: 0 0 10px 0;
    }

    .list-info {
        text-align: center;
    }
    
    .list-info p {
        display: none;
    }
`;

function Categories() {
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState({
        totalCategories: 0,
        activePercentage: 82,
        updatesToday: 4
    });
    const [chartData, setChartData] = useState({
        byCategory: [],
        byStatus: [],
        weeklyUpdates: []
    });
    const [categoryView, setCategoryView] = useState('grid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const toggleCategoryView = useCallback(() => {
        setCategoryView((prevView) => (prevView === 'grid' ? 'list' : 'grid'));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Buscar categorias
                const categoriesData = await api.getCategories(1, 100);
                setCategories(categoriesData.categories || []);
                
                // Buscar estatísticas do dashboard
                const statsData = await api.getDashboardStats();
                setStats({
                    totalCategories: statsData.total_categories,
                    activePercentage: statsData.active_products_percentage,
                    updatesToday: statsData.updates_today
                });
                
                // Configurar dados dos gráficos
                if (statsData.chart_data) {
                    setChartData({
                        byCategory: statsData.chart_data.by_category,
                        byStatus: statsData.chart_data.by_status,
                        weeklyUpdates: statsData.chart_data.weekly_updates
                    });
                }
                
                setError(null);
            } catch (err) {
                console.error('Erro ao buscar dados:', err);
                setError('Erro ao carregar dados da API');
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
                <MainContainer>
                    <h1>Carregando...</h1>
                </MainContainer>
            </StyledPage>
        );
    }

    if (error) {
        return (
            <StyledPage>
                <Header />
                <MainContainer>
                    <h1>Erro: {error}</h1>
                </MainContainer>
            </StyledPage>
        );
    }

    return (
        <StyledPage>
            <Header />
            <MainContainer>
                
                <h1>Catálogo de Categorias</h1>
                
                <h2>Visão Geral Estatística</h2>
                <InfoCardContainer>
                    <InfoCard>
                        <Inventory className="icon" />
                        <div className="data">
                            <div className="value">{categories.length}</div>
                            <div className="title">Total de Categorias</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <CheckCircle className="icon" />
                        <div className="data">
                            <div className="value">{stats.activePercentage}%</div>
                            <div className="title">Status Ativo</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <Category className="icon" />
                        <div className="data">
                            <div className="value">{categories.length}</div>
                            <div className="title">Categorias</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <Update className="icon" />
                        <div className="data">
                            <div className="value">{stats.updatesToday}</div>
                            <div className="title">Atualizações Hoje</div>
                        </div>
                    </InfoCard>
                </InfoCardContainer>
                
                <hr/>
                <h2>Gráficos de Distribuição</h2>
                <ChartGrid>
                    <div>
                        <Typography variant="h6">Produtos por Categorias</Typography>
                        {chartData.byCategory.length > 0 ? (
                            <BarChart
                                dataset={chartData.byCategory}
                                xAxis={[{ dataKey: "categoria", scaleType: 'band' }]}
                                series={[{ dataKey: "valor", label: "Contagem", color: '#4CAF50' }]}
                                height={240}
                                width={300}
                            />
                        ) : (
                            <p>Sem dados disponíveis</p>
                        )}
                    </div>
                    <div>
                        <Typography variant="h6">Status das Categorias</Typography>
                        {chartData.byStatus.length > 0 ? (
                            <PieChart
                                series={[{ data: chartData.byStatus, innerRadius: 30, outerRadius: 80, paddingAngle: 5 }]}
                                width={300}
                                height={240}
                                margin={{ top: 10, bottom: 10, left: 100, right: 0 }}
                            />
                        ) : (
                            <p>Sem dados disponíveis</p>
                        )}
                    </div>
                    <div>
                        <Typography variant="h6">Atualizações Semanais (Qtd.)</Typography>
                        {chartData.weeklyUpdates.length > 0 ? (
                            <LineChart
                                xAxis={[{ scaleType: "band", data: chartData.weeklyUpdates.map(d => d.day) }]}
                                series={[
                                    { data: chartData.weeklyUpdates.map(d => d.updates), label: "Novos Registros", color: '#2196F3' },
                                ]}
                                height={240}
                                width={300}
                            />
                        ) : (
                            <p>Sem dados disponíveis</p>
                        )}
                    </div>
                </ChartGrid>
                
                <hr/>
                <CategoryHeader> 
                    <h2>Lista Detalhada de Categorias</h2>
                    <ToggleButton onClick={toggleCategoryView}>
                        {categoryView === 'grid' ? <ViewList /> : <ViewModule />}
                        {categoryView === 'grid' ? 'Mudar para Vista em Coluna' : 'Mudar para Vista em Grade'}
                    </ToggleButton>
                </CategoryHeader>
                
                <CategoryList $view={categoryView}>
                    {categories.map((category) => {
                        const ItemComponent = categoryView === 'grid' ? CategoryCardGrid : CategoryItem;
                        return (
                            <ItemComponent key={category.id} to={`/categories/${category.id}`}>
                                <img src={category.photo} alt={category.name} />
                                <div className="list-info">
                                    <h3>{category.name}</h3>
                                    <p>{category.description}</p>
                                    <p><strong>{category.product_count || 0} produtos</strong></p>
                                </div>
                            </ItemComponent>
                        );
                    })}
                </CategoryList>
                
            </MainContainer>
        </StyledPage>
    );
}

export default Categories;