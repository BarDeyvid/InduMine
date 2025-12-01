// front-end/src/categories/categoryDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; 
import styled from 'styled-components';
import Header from "../components/Header";
import { Button } from '@mui/material';
import { CheckCircleOutline, CancelOutlined, AccessTimeOutlined } from '@mui/icons-material';
import SearchBar from '../components/SearchBar';
import { api } from '../services/api';

const HISTORY_KEY = 'recentcategories';

const updateRecentcategories = (category) => {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const filteredHistory = history.filter(item => item.id !== category.id);
    const newHistory = [category, ...filteredHistory];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(0, 5)));
};

const DetailWrapper = styled.div`
    background-color: ${props => props.theme.surface}; 
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

const RelatedCategoryItem = styled(Link)`
    display: flex; 
    align-items: center;
    padding: 15px;
    margin-bottom: 10px;
    background-color: ${props => props.theme.surface}; 
    border-radius: 8px;
    text-decoration: none; 
    color: inherit;
    transition: all 0.3s ease;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);

    &:hover {
        background-color: ${props => props.theme.surfaceHover}; 
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }
    
    img {
        width: 80px; 
        height: auto;
        border-radius: 6px;
        margin-right: 15px; 
    }
    
    div {
        flex: 1; 
    }
    
    h3 {
        margin: 0;
        color: ${props => props.theme.primary};
        font-size: 1.1em;
    }
    
    p {
        margin: 5px 0 0 0;
        font-size: 0.85em;
        color: ${props => props.theme.textSecondary};
    }
`;

const ProductItem = styled(Link)`
    display: flex; 
    align-items: center;
    padding: 15px;
    margin-bottom: 10px;
    background-color: ${props => props.theme.surface}; 
    border-radius: 8px;
    text-decoration: none; 
    color: inherit;
    transition: all 0.3s ease;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);

    &:hover {
        background-color: ${props => props.theme.surfaceHover}; 
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }
    
    img {
        width: 80px; 
        height: auto;
        border-radius: 6px;
        margin-right: 15px; 
    }
    
    div {
        flex: 1; 
    }
    
    h3 {
        margin: 0;
        color: ${props => props.theme.primary};
        font-size: 1.1em;
    }
    
    p {
        margin: 5px 0 0 0;
        font-size: 0.85em;
        color: ${props => props.theme.textSecondary};
    }
`;

const ProductGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 20px;
`;

const ProductCard = styled(Link)`
    background-color: ${props => props.theme.surface};
    border-radius: 8px;
    padding: 15px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;

    &:hover {
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }

    img {
        width: 100%;
        height: 150px;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 10px;
    }

    h3 {
        margin: 0 0 8px 0;
        color: ${props => props.theme.primary};
        font-size: 1em;
    }

    p {
        margin: 0;
        font-size: 0.85em;
        color: ${props => props.theme.textSecondary};
        flex-grow: 1;
    }

    .specs {
        margin-top: 10px;
        font-size: 0.8em;
        color: ${props => props.theme.textSecondary};
    }
`;

function CategoryDetail() {
    const { categoryId } = useParams(); 
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [relatedCategories, setRelatedCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategoryData = async () => {
            try {
                setLoading(true);
                const data = await api.getCategoryDetail(categoryId);
                
                if (data.error) {
                    setError(data.error);
                } else {
                    setCategory(data);
                    setProducts(data.products || []);
                    setRelatedCategories(data.related_categories || []);
                    
                    // Atualizar histórico
                    const activityData = {
                        id: data.id,
                        name: data.name,
                        status: "Ativo",
                        timestamp: new Date().toISOString(),
                        type: "category"
                    };
                    updateRecentcategories(activityData);
                }
            } catch (err) {
                console.error('Erro ao buscar detalhes da categoria:', err);
                setError('Erro ao carregar dados da categoria');
            } finally {
                setLoading(false);
            }
        };

        if (categoryId) {
            fetchCategoryData();
        }
    }, [categoryId]);

    if (loading) {
        return <DetailWrapper><Header /><h1>Carregando...</h1></DetailWrapper>;
    }

    if (error || !category) {
        return <DetailWrapper><Header /><h1>{error || 'Categoria não encontrada!'}</h1></DetailWrapper>;
    }

    return (
        <DetailWrapper>
            <Header />
            <MainContainer>
                <div>
                    <h1>{category.name}</h1>
                    <p>{category.description}</p>
                    <p><strong>{category.product_count || 0} produtos nesta categoria</strong></p>
                    <SearchBar width={"100%"} style={{ marginBottom: '30px' }} />
                </div>
                
                <hr />
                
                <div>
                    <h2>Produtos nesta Categoria ({products.length})</h2>
                    {products.length > 0 ? (
                        <ProductGrid>
                            {products.map((product) => (
                                <ProductCard key={product.id} to={`/products/${product.id}`}>
                                    <img src={product.photo} alt={product.name} />
                                    <h3>{product.name}</h3>
                                    <p>{product.description.substring(0, 100)}...</p>
                                    {product.main_specs && Object.keys(product.main_specs).length > 0 && (
                                        <div className="specs">
                                            <strong>Especificações:</strong>
                                            <ul>
                                                {Object.entries(product.main_specs).slice(0, 2).map(([key, value]) => (
                                                    <li key={key}>{key}: {value}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </ProductCard>
                            ))}
                        </ProductGrid>
                    ) : (
                        <p>Nenhum produto encontrado nesta categoria.</p>
                    )}
                </div>
                
                <hr />
                
                {relatedCategories.length > 0 && (
                    <div>
                        <h2>Categorias Relacionadas</h2>
                        <div>
                            {relatedCategories.map((relCat) => (
                                <RelatedCategoryItem key={relCat.id} to={`/categories/${relCat.id}`}>
                                    <img 
                                        src={`../src/assets/dummyPhoto${relCat.id % 6 + 1}.png`} 
                                        alt={relCat.name} 
                                    />
                                    <div>
                                        <h3>{relCat.name}</h3>
                                        <p>{relCat.description}</p>
                                    </div>
                                </RelatedCategoryItem>
                            ))}
                        </div>
                    </div>
                )}
                
            </MainContainer>
        </DetailWrapper>
    );
}

export default CategoryDetail;