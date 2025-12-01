// front-end/src/categories/categoryDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; 
import styled from 'styled-components';
import Header from "../components/Header";
import { Button } from '@mui/material';
import { CheckCircleOutline, CancelOutlined, AccessTimeOutlined } from '@mui/icons-material';
import SearchBar from '../components/SearchBar';

const HISTORY_KEY = 'recentcategories';

const updateRecentcategories = (category) => {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    
    const filteredHistory = history.filter(item => item.id !== category.id);
    
    const newHistory = [category, ...filteredHistory];
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(0, 5)));
};

const DUMMY_Categories = [
    { id: 1, name: "Motores", photo: "../src/assets/dummyPhoto1.png", status: "Ativo", description: "Motores elétricos e de combustão" },
    { id: 2, name: "Inversores", photo: "../src/assets/dummyPhoto2.png", status: "Inativo", description: "Inversores de frequência e conversores" },
    { id: 3, name: "Geradores", photo: "../src/assets/dummyPhoto3.png", status: "Ativo", description: "Geradores a diesel e gasolina" },
    { id: 4, name: "Transformadores", photo: "../src/assets/dummyPhoto4.png", status: "Em Revisao", description: "Transformadores de força e isolamento" },
    { id: 5, name: "Motores Trifásicos", photo: "../src/assets/dummyPhoto5.png", status: "Ativo", description: "Motores com proteção IP65" },
    { id: 6, name: "Inversores Solares", photo: "../src/assets/dummyPhoto6.png", status: "Ativo", description: "Inversores para sistemas fotovoltaicos" },
];

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

const RelatedcategoryItem = styled(Link)`
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

const RelatedcategoriesSection = ({ category, DUMMY_Categories }) => (
    <section>
        <h2>Produtos Relacionados</h2>
        {category.related_categories && category.related_categories.length > 0 ? (
            <div className='categories-list'>
                {category.related_categories.map((relCatId) => {
                    const relcategory = DUMMY_Categories.find(p => p.id === relCatId);
                    if (!relcategory) return null;
                    return (
                        <RelatedcategoryItem 
                            key={relCatId} 
                            to={`/categories/${relcategory.id}`}
                        >
                            <img 
                                src={relcategory.photo} 
                                alt={relcategory.name} 
                            />
                            <div>
                                <h3>{relcategory.name}</h3>
                                <p>{relcategory.description.substring(0, 80)}...</p>
                            </div>
                        </RelatedcategoryItem>
                    );
                })}
            </div>
        ) : (
            <p>Nenhum produto relacionado encontrado.</p>
        )}
    </section>
);


function CategoryDetail() {
    const { categoryId } = useParams(); 
    const numericcategoryId = parseInt(categoryId);
    const category = DUMMY_Categories.find(p => p.id === numericcategoryId);
    
    useEffect(() => {
        if (category) {
            const activityData = {
                id: category.id,
                name: category.name,
                status: category.status,
                timestamp: new Date().toISOString()
            };
            updateRecentcategories(activityData);
        }
    }, [category]);

    if (!category) {
        return <DetailWrapper><Header /><h1>Categoria não encontrada!</h1></DetailWrapper>;
    }
    return (
        <DetailWrapper>
            <Header />
                <MainContainer>
                    <div>
                        <h1>{category.name}</h1>
                        <p>{category.description}</p>
                        <SearchBar width={"100%"} style={{ marginBottom: '30px' }} />
                    </div>
                    <hr />
                    <div>
                        <h2>Filtros</h2>
                        
                    </div>
                </MainContainer>
        </DetailWrapper>
    );
}

export default CategoryDetail;