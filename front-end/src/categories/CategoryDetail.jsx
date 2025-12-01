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

const Sides = styled.div`
    display: flex;
    gap: 30px;
    margin-top: 30px;
    padding: 0 40px; 
    
    @media (max-width: 1024px) {
        flex-direction: column;
        padding: 0 20px;
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

const PhotoArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px;
    background-color: ${props => props.theme.background}; 
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); 

    img {
        width: 100%;
        max-width: 300px; 
        height: auto;
        border-radius: 10px;
        margin-top: 20px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    h1 {
        font-size: 1.8em;
        color: ${props => props.theme.text};
        margin-bottom: 10px;
    }

    @media (max-width: 1024px) {
        max-width: none;
        width: auto;
    }
`;

const RightContent = styled.div`
    flex: 3;
    display: flex;
    flex-direction: column;
    background-color: ${props => props.theme.background};
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    
    h2 {
        color: ${props => props.theme.primary};
        border-bottom: 2px solid ${props => props.theme.primary}50; 
        padding-bottom: 5px;
        margin-top: 20px;
        margin-bottom: 15px;
        font-size: 1.5em;
    }
    
    p {
        line-height: 1.6;
        color: ${props => props.theme.textSecondary};
        margin-bottom: 20px;
    }

    .right-div-buttons {
        display: flex;
        gap: 15px;
        margin-bottom: 25px;
        border-bottom: 1px solid ${props => props.theme.textSecondary}33; 
        padding-bottom: 5px;
        overflow-x: auto; 
    }

    .right-div-buttons .MuiButton-root {
        text-transform: none;
        border-radius: 0; 
        color: ${props => props.theme.text};
        background-color: transparent;
        border-bottom: 3px solid transparent;
        transition: all 0.2s ease-in-out;
        padding: 8px 15px;
        flex-shrink: 0; 
    }

    .right-div-buttons .MuiButton-root:hover {
        background-color: ${props => props.theme.textSecondary}10;
    }

    .right-div-buttons .MuiButton-root.active {
        color: ${props => props.theme.primary};
        border-bottom: 3px solid ${props => props.theme.primary};
        font-weight: 600;
        background-color: transparent; 
    }
    
    @media (max-width: 600px) {
        padding: 15px;
        .right-div-buttons {
            flex-wrap: nowrap;
        }
    }
`;

const SpecsTableStyle = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);

    th, td {
        border: 1px solid ${props => props.theme.textSecondary}33;
        padding: 12px 15px;
        text-align: left;
    }

    th {
        background-color: ${props => props.theme.surface};
        color: ${props => props.theme.primary};
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.9em;
    }

    tr:nth-child(even) {
        background-color: ${props => props.theme.surface};
    }
    
    td:first-child {
        font-weight: bold;
        color: ${props => props.theme.text};
    }
`;

const SpecsListStyle = styled.ul`
    list-style: none;
    padding: 0;
    margin: 15px 0 30px 0;
    width: 100%;
    background-color: ${props => props.theme.surface}; 
    border-radius: 8px;
    overflow: hidden;

    li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        border-bottom: 1px solid ${props => props.theme.textSecondary}20; 
        font-size: 1em;
    }

    li:last-child {
        border-bottom: none;
    }

    strong {
        color: ${props => props.theme.text};
        font-weight: 600;
        margin-right: 10px;
    }
    span {
        color: ${props => props.theme.textSecondary};
        text-align: right;
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

const StatusChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 15px;

    ${(props) => {
        switch (props.status.toLowerCase()) {
            case 'ativo':
                return `
                    background-color: #e6ffed; 
                    color: #28a745; 
                    border: 1px solid #28a745;
                `;
            case 'inativo':
                return `
                    background-color: #ffeaea;
                    color: #dc3545;
                    border: 1px solid #dc3545;
                `;
            case 'em revisao':
                return `
                    background-color: #fff8e6; 
                    color: #ffc107;
                    border: 1px solid #ffc107;
                `;
            default:
                return `
                    background-color: ${props.theme.background}; 
                    color: ${props.theme.textSecondary};
                    border: 1px solid ${props.theme.textSecondary}33;
                `;
        }
    }}
`;

const CategoryStatus = ({ status }) => {
    let icon, label;
    
    switch (status.toLowerCase()) {
        case 'ativo':
            icon = <CheckCircleOutline style={{ fontSize: 16 }} />;
            label = "Ativo";
            break;
        case 'inativo':
            icon = <CancelOutlined style={{ fontSize: 16 }} />;
            label = "Inativo";
            break;
        case 'em revisao':
            icon = <AccessTimeOutlined style={{ fontSize: 16 }} />;
            label = "Em Revisão";
            break;
        default:
            icon = null;
            label = status;
    }
    
    return (
        <StatusChip status={status}>
            {icon}
            {label}
        </StatusChip>
    );
};

const SpecsTable = ({ specs, title }) => {
    const specsArray = Object.entries(specs);
    if (specsArray.length === 0) {
        return null;
    }

    return (
        <div>
            <h2>{title}</h2>
            <SpecsTableStyle>
                <thead>
                    <tr>
                        <th>Característica</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {specsArray.map(([key, value]) => (
                        <tr key={key}>
                            <td>{key}</td>
                            <td>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </SpecsTableStyle>
        </div>
    );
};

const SpecsList = ({ specs, title }) => {
    const specsArray = Object.entries(specs);
    if (specsArray.length === 0) {
        return null;
    }

    return (
        <div>
            <h2>{title}</h2>
            <SpecsListStyle>
                {specsArray.map(([key, value]) => (
                    <li key={key}>
                        <strong>{key}:</strong> 
                        <span>{value}</span>
                    </li>
                ))}
            </SpecsListStyle>
        </div>
    );
};

const GeneralDataSection = ({ category }) => (
    <section>
        <h2>Descrição Geral</h2>
        <p>{category.description}</p>
        
        <SpecsList 
            specs={category.main_specs || {}} 
            title="Especificações Principais" 
        />

        <SpecsList 
            specs={category.dimension_specs || {}} 
            title="Dimensões e Peso" 
        />

        {Object.keys(category.main_specs || {}).length === 0 && 
            Object.keys(category.dimension_specs || {}).length === 0 && (
                <p>Nenhuma especificação técnica disponível para esta seção.</p>
            )}
    </section>
);

const FullSpecsSection = ({ category }) => (
    <section>
        <SpecsTable 
            specs={{...category.main_specs, ...category.dimension_specs}} 
            title="Todas as Especificações Técnicas" 
        />
        {(Object.keys(category.main_specs || {}).length === 0 && 
            Object.keys(category.dimension_specs || {}).length === 0) && (
                <p>Nenhuma especificação técnica detalhada disponível.</p>
            )}
    </section>
);


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
    
    const [activeTab, setActiveTab] = useState('general');

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
    
    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralDataSection category={category} />;
            case 'specs':
                return (
                    <>
                        <FullSpecsSection category={category} />
                        <RelatedcategoriesSection category={category} DUMMY_Categories={DUMMY_Categories} />
                    </>
                );
            case 'variants':
                return <section><h2>Variantes do Produto</h2><p>Conteúdo sobre as diferentes versões do **{category.name}**...</p></section>;
            case 'history':
                return <section><h2>Histórico de Mudanças</h2><p>Registro de alterações, versões e atualizações para o **{category.name}**...</p></section>;
            default:
                return <GeneralDataSection category={category} />;
        }
    };

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

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