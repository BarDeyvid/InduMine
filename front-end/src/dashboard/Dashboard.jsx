// front-end/src/dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import { Category, History, Warning, AutoAwesomeMosaic, Inventory } from '@mui/icons-material';
import { api, handleApiError } from '../services/api';

const HISTORY_KEY = 'recentProducts';

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
        font-size: 2.2em;
        color: ${props => props.theme.primary};
        margin: 20px 0 10px 0;
        border-bottom: 2px solid ${props => props.theme.textSecondary}20;
        padding-bottom: 5px;
    }

    h2 {
        font-size: 1.5em;
        color: ${props => props.theme.text};
        margin: 30px 0 15px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    @media (max-width: 768px) {
        width: 100%;
        padding: 0 10px;
    }
`;

const InfoCardsContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
`;

const InfoCard = styled.div`
    background-color: ${props => props.theme.surface}; 
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100px;

    .icon {
        color: ${props => props.theme.primary};
        font-size: 2.5rem;
    }

    .value {
        font-size: 2.5em;
        font-weight: bold;
        color: ${props => props.theme.primary};
        margin-top: 5px;
    }

    .title {
        font-size: 1em;
        color: ${props => props.theme.textSecondary};
        margin-top: 5px;
    }
    
    &.error-card {
        background-color: #fcebeb; 
        color: #dc3545;
        border: 1px solid #dc3545;
        .icon { color: #dc3545; }
        .value, .title { color: #dc3545; }
    }
`;

const CategoryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 20px;
    list-style: none;
    padding: 0;
`;

const CategoryCard = styled(Link)`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 10px;
    background-color: ${props => props.theme.surface};
    border-radius: 12px;
    text-align: center;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    border: 1px solid ${props => props.theme.textSecondary}20;

    &:hover {
        box-shadow: 0 8px 16px ${props => props.theme.primary}40;
        transform: translateY(-4px);
        border-color: ${props => props.theme.primary};
    }

    img {
        width: 100%;
        max-width: 80px;
        height: auto;
        margin-bottom: 10px;
        border-radius: 6px;
    }

    h3 {
        font-size: 1.1em;
        margin: 5px 0 0 0;
        color: ${props => props.theme.text};
    }

    p {
        font-size: 0.8em;
        color: ${props => props.theme.textSecondary};
        margin: 5px 0 0 0;
    }
`;

const ActivityTableStyle = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 10px;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

    thead th {
        background-color: ${props => props.theme.primary};
        color: white;
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.9em;
    }

    tbody tr {
        background-color: ${props => props.theme.surface};
        border-bottom: 1px solid ${props => props.theme.textSecondary}20;
        transition: background-color 0.2s;
    }

    tbody tr:hover {
        background-color: ${props => props.theme.surfaceHover};
    }
    
    tbody tr:last-child {
        border-bottom: none;
    }

    td {
        padding: 12px 15px;
        color: ${props => props.theme.text};
        font-size: 0.95em;
    }

    td button {
        background-color: ${props => props.theme.primary};
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    td button:hover {
        background-color: ${props => props.theme.primaryDark};
    }
    
    td:nth-child(4) {
        font-weight: bold;
    }
    
    .empty-row td {
        text-align: center;
        color: ${props => props.theme.textSecondary};
    }
`;

function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalCategories: 0,
        totalProducts: 0,
        activeProductsPercentage: 0,
        updatesToday: 0
    });
    const [categories, setCategories] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [recentCategories, setRecentCategories] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                
                // Verificar saúde da API primeiro
                try {
                    await api.health();
                } catch (healthError) {
                    setError('API não está respondendo. Verifique se o servidor está rodando.');
                    setLoading(false);
                    return;
                }
                
                // Buscar estatísticas
                const statsData = await api.getDashboardStats();
                setStats({
                    totalCategories: statsData.total_categories,
                    totalProducts: statsData.total_products,
                    activeProductsPercentage: statsData.active_products_percentage,
                    updatesToday: statsData.updates_today
                });
                
                // Buscar categorias
                const categoriesData = await api.getCategories(1, 12);
                setCategories(categoriesData.categories || []);
                
                // Ler histórico do localStorage
                try {
                    const productsHistory = localStorage.getItem('recentProducts') || '[]';
                    const categoriesHistory = localStorage.getItem('recentcategories') || '[]';
                    
                    setRecentProducts(JSON.parse(productsHistory));
                    setRecentCategories(JSON.parse(categoriesHistory));
                } catch (e) {
                    console.error("Erro ao ler histórico:", e);
                }
                
                setError(null);
            } catch (err) {
                console.error('Erro ao buscar dados do dashboard:', err);
                const apiError = handleApiError(err);
                setError(apiError.message || 'Erro ao carregar dados da API');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const combinedHistory = [
        ...recentProducts.map(item => ({ ...item, type: 'product' })),
        ...recentCategories.map(item => ({ ...item, type: 'category' }))
    ].slice(0, 10);

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

    return (
        <StyledPage>
            <Header />
            <MainContainer>
                <h1>Dashboard - Visão Geral do Catálogo</h1>
                
                <SearchBar width={"100%"} style={{ marginBottom: '30px' }} />
                
                <h2><AutoAwesomeMosaic /> Visão Geral do Catálogo</h2>
                <InfoCardsContainer>
                    {error ? (
                        <InfoCard className="error-card">
                            <Warning className="icon" />
                            <div className="value">ERRO</div>
                            <div className="title">{error}</div>
                        </InfoCard>
                    ) : loading ? (
                        <InfoCard>
                            <div className="value">...</div>
                            <div className="title">Carregando...</div>
                        </InfoCard>
                    ) : (
                        <>
                            <InfoCard>
                                <Category className="icon" />
                                <div className="value">{stats.totalCategories}</div>
                                <div className="title">Categorias Registradas</div>
                            </InfoCard>
                            
                            <InfoCard>
                                <Inventory className="icon" />
                                <div className="value">{stats.totalProducts.toLocaleString()}</div>
                                <div className="title">Total de Produtos</div>
                            </InfoCard>
                            
                            <InfoCard>
                                <History className="icon" />
                                <div className="value">{stats.activeProductsPercentage}%</div>
                                <div className="title">Status Ativo</div>
                            </InfoCard>

                            <InfoCard>
                                <History className="icon" />
                                <div className="value">{stats.updatesToday}</div>
                                <div className="title">Atualizações Hoje</div>
                            </InfoCard>
                        </>
                    )}
                </InfoCardsContainer>

                
                <h2><Category /> Acesso Rápido por Categoria</h2>
                <CategoryGrid>
                    {categories.map((category) => (
                        <CategoryCard key={category.id} to={`/categories/${category.id}`}>
                            <img src={category.photo} alt={category.name} />
                            <h3>{category.name}</h3>
                            <p>{category.product_count || 0} Produtos</p>
                        </CategoryCard>
                    ))}
                </CategoryGrid>

                <h2><History /> Itens Acessados Recentemente</h2>
                <ActivityTableStyle>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Tipo</th>
                            <th>Último Acesso</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combinedHistory.map((item, index) => (
                            <tr key={index}>
                                <td>{item.name}</td>
                                <td>{item.type === 'product' ? 'Produto' : 'Categoria'}</td>
                                <td>
                                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    }) : 'N/A'}
                                </td>
                                <td>{item.status || 'Ativo'}</td>
                                <td>
                                    <button onClick={() => navigate(
                                        item.type === 'product' 
                                            ? `/products/${item.id}`
                                            : `/categories/${item.id}`
                                    )}>
                                        Ver Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {combinedHistory.length === 0 && (
                            <tr className="empty-row">
                                <td colSpan="5">
                                    Nenhum item acessado recentemente. Navegue para ver o histórico aqui.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </ActivityTableStyle>
            </MainContainer>
        </StyledPage>
    );
}

export default Dashboard;