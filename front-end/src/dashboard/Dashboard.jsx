// front-end/src/dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import { Category, History, Warning, AutoAwesomeMosaic, Inventory, Search } from '@mui/icons-material';
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
    
    @media (max-width: 768px) {
        padding-bottom: 20px;
    }
`;

const MainContainer = styled.div`
    width: 90%;
    max-width: 1200px;
    margin-top: 20px;

    h1 {
        font-size: 2.2em;
        color: ${props => props.theme.primary};
        margin: 20px 0 10px 0;
        text-align: center;
    }
    
    h2 {
        font-size: 1.5em;
        margin: 30px 0 15px 0;
        display: flex;
        align-items: center;
        gap: 10px;
        
        svg {
            font-size: 1.2em;
        }
    }

    @media (max-width: 768px) {
        width: 95%;
        padding: 0 10px;
        margin-top: 10px;
        
        h1 { 
            font-size: 1.8em; 
            margin: 10px 0 5px 0;
        }
        h2 { 
            font-size: 1.3em; 
            margin: 20px 0 10px 0;
            gap: 8px;
        }
    }
    
    @media (max-width: 480px) {
        width: 100%;
        padding: 0 12px;
        
        h1 { font-size: 1.6em; }
        h2 { 
            font-size: 1.2em; 
            margin: 16px 0 8px 0;
        }
    }
`;

const SearchContainer = styled.div`
    width: 100%;
    margin-bottom: 20px;
    
    @media (max-width: 768px) {
        margin-bottom: 15px;
    }
    
    @media (max-width: 480px) {
        margin-bottom: 12px;
    }
`;

const InfoCardsContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 30px;

    @media (max-width: 768px) {
        gap: 15px;
        margin-bottom: 25px;
    }
    
    @media (max-width: 600px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    
    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: 10px;
    }
`;

const InfoCard = styled.div`
    background-color: ${props => props.theme.surface}; 
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 120px;
    
    .icon { 
        color: ${props => props.theme.primary}; 
        font-size: 2.5rem; 
        margin-bottom: 10px;
    }
    .value { 
        font-size: 2em; 
        font-weight: bold; 
        margin: 5px 0;
        line-height: 1.2;
    }
    .title { 
        font-size: 0.9em; 
        color: ${props => props.theme.textSecondary}; 
        margin-top: 5px;
    }

    @media (max-width: 768px) {
        padding: 16px;
        min-height: 110px;
        
        .icon { font-size: 2.2rem; }
        .value { font-size: 1.8em; }
        .title { font-size: 0.85em; }
    }
    
    @media (max-width: 480px) {
        padding: 14px;
        min-height: 100px;
        
        .icon { font-size: 2rem; }
        .value { font-size: 1.6em; }
        .title { font-size: 0.8em; }
    }
`;

const CategoryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;

    @media (max-width: 768px) {
        gap: 12px;
    }
    
    @media (max-width: 600px) {
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
    }
    
    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    
    @media (max-width: 360px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
    }
`;

const CategoryCard = styled(Link)`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    background-color: ${props => props.theme.surface};
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 10px;
    }
    
    h3 { 
        font-size: 1em; 
        text-align: center; 
        margin: 0 0 4px 0;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        max-width: 100%;
    }
    
    p { 
        font-size: 0.8em; 
        color: ${props => props.theme.textSecondary}; 
        margin: 0;
    }

    @media (max-width: 768px) {
        padding: 12px;
        
        img {
            width: 50px;
            height: 50px;
            margin-bottom: 8px;
        }
        
        h3 { font-size: 0.9em; }
        p { font-size: 0.75em; }
    }
    
    @media (max-width: 480px) {
        padding: 10px;
        
        img {
            width: 45px;
            height: 45px;
            margin-bottom: 6px;
        }
        
        h3 { font-size: 0.85em; }
        p { font-size: 0.7em; }
    }
`;

const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;
    
    @media (max-width: 768px) {
        border-radius: 6px;
        margin-bottom: 15px;
    }
`;

const ActivityTableStyle = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;

    thead th {
        background-color: ${props => props.theme.primary};
        color: white;
        padding: 12px 8px;
        text-align: left;
        font-size: 0.95em;
        font-weight: 600;
        white-space: nowrap;
    }

    tbody td {
        padding: 10px 8px;
        border-bottom: 1px solid ${props => props.theme.textSecondary}20;
        background-color: ${props => props.theme.surface};
        font-size: 0.9em;
    }
    
    tbody tr:last-child td {
        border-bottom: none;
    }
    
    @media (max-width: 768px) {
        min-width: 500px;
        
        thead th {
            padding: 10px 6px;
            font-size: 0.9em;
        }
        
        tbody td {
            padding: 8px 6px;
            font-size: 0.85em;
        }
    }
    
    @media (max-width: 480px) {
        min-width: 450px;
        
        thead th {
            padding: 8px 5px;
            font-size: 0.85em;
        }
        
        tbody td {
            padding: 7px 5px;
            font-size: 0.8em;
        }
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    width: 100%;
    
    h1 {
        font-size: 1.5em;
        margin-top: 20px;
        color: ${props => props.theme.textSecondary};
    }
    
    @media (max-width: 768px) {
        min-height: 50vh;
        
        h1 {
            font-size: 1.3em;
        }
    }
`;

const NoDataMessage = styled.div`
    text-align: center;
    padding: 30px;
    color: ${props => props.theme.textSecondary};
    font-style: italic;
    
    @media (max-width: 768px) {
        padding: 20px;
        font-size: 0.95em;
    }
`;

const MobileOptimizedLink = styled(Link)`
    display: inline-block;
    padding: 6px 12px;
    background-color: ${props => props.theme.primary};
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.85em;
    font-weight: 500;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: ${props => props.theme.primaryDark || props.theme.primary}cc;
    }
    
    @media (max-width: 768px) {
        padding: 5px 10px;
        font-size: 0.8em;
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
                <LoadingContainer>
                    <h1>Carregando...</h1>
                </LoadingContainer>
            </StyledPage>
        );
    }

    return (
        <StyledPage>
            <Header />
            <MainContainer>
                <h1>Dashboard</h1>
                
                <SearchContainer>
                    <SearchBar width="100%" placeholder="Pesquisa rápida..." />
                </SearchContainer>
                
                <h2><AutoAwesomeMosaic /> Visão Geral</h2>
                <InfoCardsContainer>
                    <InfoCard>
                        <Inventory className="icon"/>
                        <div className="value">{stats.totalProducts}</div>
                        <div className="title">Produtos</div>
                    </InfoCard>
                    <InfoCard>
                        <Category className="icon"/>
                        <div className="value">{stats.totalCategories}</div>
                        <div className="title">Categorias</div>
                    </InfoCard>
                    <InfoCard>
                        <History className="icon"/>
                        <div className="value">{stats.activeProductsPercentage}%</div>
                        <div className="title">Ativos</div>
                    </InfoCard>
                </InfoCardsContainer>

                <h2><Category /> Categorias</h2>
                {categories.length > 0 ? (
                    <CategoryGrid>
                        {categories.map(cat => (
                            <CategoryCard key={cat.id} to={`/categories/${cat.id}`}>
                                <img 
                                    src={cat.photo || "placeholder.png"} 
                                    alt={cat.name} 
                                    onError={(e) => {
                                        e.target.src = 'placeholder.png';
                                        e.target.onerror = null;
                                    }}
                                />
                                <h3>{cat.name}</h3>
                                <p>{cat.product_count || 0} itens</p>
                            </CategoryCard>
                        ))}
                    </CategoryGrid>
                ) : (
                    <NoDataMessage>Nenhuma categoria encontrada</NoDataMessage>
                )}

                <h2><History /> Recentes</h2>
                {combinedHistory.length > 0 ? (
                    <TableWrapper>
                        <ActivityTableStyle>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Data</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinedHistory.map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.name}
                                        </td>
                                        <td>{item.type === 'product' ? 'Produto' : 'Categoria'}</td>
                                        <td>{new Date(item.timestamp).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <MobileOptimizedLink 
                                                to={item.type === 'product' ? `/products/${item.id}` : `/categories/${item.id}`}
                                            >
                                                Ver
                                            </MobileOptimizedLink>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </ActivityTableStyle>
                    </TableWrapper>
                ) : (
                    <NoDataMessage>Nenhuma atividade recente</NoDataMessage>
                )}
            </MainContainer>
        </StyledPage>
    );
}

export default Dashboard;