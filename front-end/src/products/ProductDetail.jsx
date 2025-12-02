// front-end/src/products/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; 
import styled from 'styled-components';
import Header from "../components/Header";
import { Button, CircularProgress, Tabs, Tab, Box } from '@mui/material';
import { CheckCircleOutline, CancelOutlined, AccessTimeOutlined, WarningAmber, DisplaySettings, ArrowBack } from '@mui/icons-material';
import { api } from '../services/api';

const HISTORY_KEY = 'recentProducts';

const updateRecentProducts = (product) => {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const filteredHistory = history.filter(item => item.id !== product.id);
        const newHistory = [product, ...filteredHistory];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(0, 5)));
    } catch (e) {
        console.error("Erro ao salvar histórico", e);
    }
};

const DetailWrapper = styled.div`
    background-color: ${props => props.theme.surface}; 
    color: ${props => props.theme.text}; 
    min-height: 100vh;
    display: flex; 
    flex-direction: column;
    padding-bottom: 30px;
    width: 100%;
`;

const Sides = styled.div`
    display: flex;
    gap: 30px;
    margin-top: 20px;
    padding: 0 5vw; 
    flex-wrap: wrap;
    
    @media (max-width: 1024px) {
        flex-direction: column;
        padding: 0 20px;
        gap: 20px;
    }
    
    @media (max-width: 768px) {
        padding: 0 15px;
        gap: 15px;
        margin-top: 15px;
    }
    
    @media (max-width: 480px) {
        padding: 0 12px;
        gap: 12px;
    }
`;

const PhotoArea = styled.div`
    flex: 1;
    min-width: 300px;
    padding: 20px;
    background-color: ${props => props.theme.background}; 
    border-radius: 12px;
    text-align: center;
    box-sizing: border-box;

    img {
        width: 100%;
        max-width: 400px; 
        height: auto;
        min-height: 200px;
        max-height: 400px;
        object-fit: contain;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        margin: 15px 0;
    }
    
    h1 { 
        font-size: 1.8em; 
        margin-bottom: 10px; 
        word-wrap: break-word;
    }

    @media (max-width: 768px) {
        padding: 15px;
        min-width: auto;
        
        h1 { 
            font-size: 1.6em; 
            line-height: 1.3;
        }
        
        img {
            max-height: 300px;
        }
    }
    
    @media (max-width: 480px) {
        padding: 12px;
        
        h1 { font-size: 1.4em; }
        
        img {
            max-height: 250px;
            min-height: 150px;
        }
    }
`;

const MobileHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
    padding: 0 15px;
    
    @media (min-width: 769px) {
        display: none;
    }
`;

const BackButton = styled(Button)`
    && {
        min-width: 40px;
        padding: 8px;
        border-radius: 50%;
        background-color: ${props => props.theme.primary};
        color: white;
        
        &:hover {
            background-color: ${props => props.theme.primaryDark || props.theme.primary};
        }
    }
`;

const RelatedProductItem = styled(Link)`
    display: flex; 
    align-items: center;
    padding: 12px;
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
        width: 70px; 
        height: 70px;
        object-fit: cover;
        border-radius: 6px;
        margin-right: 15px; 
        flex-shrink: 0;
    }
    
    div {
        flex: 1; 
        min-width: 0; /* Permite truncar texto */
    }
    
    h3 {
        margin: 0;
        color: ${props => props.theme.primary};
        font-size: 1em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    p {
        margin: 5px 0 0 0;
        font-size: 0.85em;
        color: ${props => props.theme.textSecondary};
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    @media (max-width: 480px) {
        padding: 10px;
        
        img {
            width: 60px;
            height: 60px;
            margin-right: 10px;
        }
        
        h3 { font-size: 0.95em; }
        p { font-size: 0.8em; -webkit-line-clamp: 1; }
    }
`;


const StatusChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 15px;

    ${(props) => {
        const status = props.$status ? props.$status.toLowerCase() : 'desconhecido';
        switch (status) {
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
    
    @media (max-width: 480px) {
        padding: 5px 10px;
        font-size: 0.8em;
    }
`;


const RightContent = styled.div`
    flex: 2;
    min-width: 300px;
    background-color: ${props => props.theme.background};
    border-radius: 12px;
    padding: 25px;
    box-sizing: border-box;
    
    @media (max-width: 1024px) {
        width: 100%;
    }
    
    @media (max-width: 768px) {
        padding: 20px;
    }
    
    @media (max-width: 480px) {
        padding: 15px;
    }
`;

const MobileTabs = styled(Tabs)`
    && {
        margin-bottom: 20px;
        
        .MuiTabs-scroller {
            overflow: auto !important;
        }
        
        .MuiTab-root {
            min-width: auto;
            padding: 8px 12px;
            font-size: 0.85em;
            min-height: 48px;
        }
    }
`;

const SpecsTableStyle = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 0.95em;

    th, td {
        border: 1px solid ${props => props.theme.textSecondary}33;
        padding: 12px;
        text-align: left;
        word-break: break-word;
    }
    
    th {
        background-color: ${props => props.theme.surface};
        font-weight: 600;
        white-space: nowrap;
    }
    
    /* Ajuste para telas pequenas */
    @media (max-width: 768px) {
        font-size: 0.9em;
        
        th, td { 
            padding: 10px 8px; 
        }
    }
    
    @media (max-width: 480px) {
        font-size: 0.85em;
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        
        th, td { 
            padding: 8px 6px;
            min-width: 120px;
        }
    }
`;

const SpecsListStyle = styled.ul`
    list-style: none;
    padding: 0;
    margin: 15px 0;
    
    li {
        display: flex;
        flex-wrap: wrap;
        padding: 8px 0;
        border-bottom: 1px solid ${props => props.theme.textSecondary}20;
        
        strong {
            flex: 1;
            min-width: 150px;
            color: ${props => props.theme.primary};
        }
        
        span {
            flex: 2;
            min-width: 200px;
            word-break: break-word;
        }
    }
    
    @media (max-width: 768px) {
        li {
            flex-direction: column;
            
            strong, span {
                min-width: auto;
                width: 100%;
            }
            
            strong {
                margin-bottom: 5px;
            }
        }
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 20px;
    text-align: center;
    
    h1 {
        margin-top: 20px;
        color: ${props => props.theme.textSecondary};
    }
`;

const SectionTitle = styled.h2`
    font-size: 1.5em;
    margin: 25px 0 15px 0;
    color: ${props => props.theme.primary};
    padding-bottom: 5px;
    border-bottom: 2px solid ${props => props.theme.primary}30;
    
    @media (max-width: 768px) {
        font-size: 1.3em;
        margin: 20px 0 12px 0;
    }
    
    @media (max-width: 480px) {
        font-size: 1.2em;
        margin: 18px 0 10px 0;
    }
`;

const ContentSection = styled.section`
    margin-bottom: 30px;
    
    p {
        line-height: 1.6;
        color: ${props => props.theme.text};
        margin-bottom: 15px;
    }
    
    @media (max-width: 480px) {
        margin-bottom: 25px;
    }
`;

const ProductStatus = ({ status }) => {
    let icon, label;
    const safeStatus = status || 'Desconhecido';
    
    switch (safeStatus.toLowerCase()) {
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
            icon = <WarningAmber style={{ fontSize: 16 }} />;
            label = safeStatus;
    }
    
    return (
        <StatusChip $status={safeStatus}>
            {icon}
            {label}
        </StatusChip>
    );
};

const SpecsTable = ({ specs, title }) => {
    if (!specs) return null;
    const specsArray = Object.entries(specs);
    const filteredSpecs = specsArray.filter(([, value]) => value !== null && value !== undefined && value !== "");
    
    if (filteredSpecs.length === 0) {
        return null;
    }

    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            <SpecsTableStyle>
                <thead>
                    <tr>
                        <th>Característica</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSpecs.map(([key, value]) => (
                        <tr key={key}>
                            <td>{key}</td>
                            <td>{value && typeof value === 'object' ? JSON.stringify(value) : value}</td>
                        </tr>
                    ))}
                </tbody>
            </SpecsTableStyle>
        </div>
    );
};

const SpecsList = ({ specs, title }) => {
    if (!specs) return null;
    const specsArray = Object.entries(specs);
    const filteredSpecs = specsArray.filter(([, value]) => value !== null && value !== undefined && value !== "");
    
    if (filteredSpecs.length === 0) {
        return null;
    }

    return (
        <div>
            <SectionTitle>{title}</SectionTitle>
            <SpecsListStyle>
                {filteredSpecs.map(([key, value]) => (
                    <li key={key}>
                        <strong>{key}:</strong> 
                        <span>{value && typeof value === 'object' ? JSON.stringify(value) : value}</span>
                    </li>
                ))}
            </SpecsListStyle>
        </div>
    );
};

const GeneralDataSection = ({ product }) => {
    const mainSpecs = product.main_specs || {};
    const dimensionSpecs = product.dimension_specs || {};
    
    const isMainSpecsEmpty = Object.keys(mainSpecs).length === 0;
    const isDimensionSpecsEmpty = Object.keys(dimensionSpecs).length === 0;
    const noSpecsAvailable = isMainSpecsEmpty && isDimensionSpecsEmpty;

    return (
        <ContentSection>
            <SectionTitle>Descrição Geral</SectionTitle>
            <p>{product.description || product.key_features || "Sem descrição disponível."}</p>
            
            <SpecsList 
                specs={mainSpecs} 
                title="Especificações Principais" 
            />
            
            <SpecsList 
                specs={dimensionSpecs} 
                title="Dimensões e Peso" 
            />

            {noSpecsAvailable && (
                <p>Nenhuma especificação técnica disponível para esta seção.</p>
            )}
        </ContentSection>
    );
};

const FullSpecsSection = ({ product }) => (
    <ContentSection>
        <SpecsTable 
            specs={{...(product.main_specs || {}), ...(product.dimension_specs || {})}} 
            title="Todas as Especificações Técnicas" 
        />
        {((!product.main_specs || Object.keys(product.main_specs).length === 0) && 
         (!product.dimension_specs || Object.keys(product.dimension_specs).length === 0)) && (
            <p>Nenhuma especificação técnica detalhada disponível.</p>
        )}
    </ContentSection>
);


const RelatedProductsSection = ({ relatedProducts }) => (
    <ContentSection>
        <SectionTitle>Produtos Relacionados</SectionTitle>
        {relatedProducts && relatedProducts.length > 0 ? (
            <div className='products-list'>
                {relatedProducts.map((relProduct) => {
                    return (
                        <RelatedProductItem 
                            key={relProduct.id} 
                            to={`/products/${relProduct.id}`}
                        >
                            <img 
                                src={relProduct.photo} 
                                alt={relProduct.name}
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = '../src/assets/dummyPhoto1.png'; // Fallback
                                }} 
                            />
                            <div>
                                <h3>{relProduct.name}</h3>
                                <p>{relProduct.description ? relProduct.description.substring(0, 80) : ''}...</p>
                            </div>
                        </RelatedProductItem>
                    );
                })}
            </div>
        ) : (
            <p>Nenhum produto relacionado encontrado.</p>
        )}
    </ContentSection>
);


function ProductDetail() {
    const { productId } = useParams(); 
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getProductDetail(productId);
                setProduct(data);
                
                // Atualizar histórico
                const activityData = {
                    id: data.id,
                    name: data.name,
                    status: data.status || "Ativo",
                    timestamp: new Date().toISOString(),
                    type: 'product'
                };
                updateRecentProducts(activityData);

            } catch (err) {
                console.error("Erro ao carregar produto:", err);
                setError("Não foi possível carregar os detalhes do produto.");
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    if (loading) {
        return (
            <DetailWrapper>
                <Header />
                <LoadingContainer>
                    <CircularProgress size={60} style={{marginBottom: 20}}/>
                    <h1>Carregando produto...</h1>
                </LoadingContainer>
            </DetailWrapper>
        );
    }

    if (error || !product) {
        return (
            <DetailWrapper>
                <Header />
                <LoadingContainer>
                    <WarningAmber style={{ fontSize: 60, color: '#dc3545', marginBottom: 20 }} />
                    <h1>{error || 'Produto não encontrado!'}</h1>
                    <Button 
                        variant="contained" 
                        component={Link} 
                        to="/products"
                        style={{ marginTop: 20 }}
                        startIcon={<ArrowBack />}
                    >
                        Voltar para Lista
                    </Button>
                </LoadingContainer>
            </DetailWrapper>
        );
    }
    
    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralDataSection product={product} />;
            case 'specs':
                return (
                    <>
                        <FullSpecsSection product={product} />
                        <RelatedProductsSection relatedProducts={product.related_products} />
                    </>
                );
            case 'variants':
                return (
                    <ContentSection>
                        <SectionTitle>Variantes do Produto</SectionTitle>
                        <p>Conteúdo sobre as diferentes versões do <strong>{product.name}</strong>...</p>
                    </ContentSection>
                );
            case 'history':
                return (
                    <ContentSection>
                        <SectionTitle>Histórico de Mudanças</SectionTitle>
                        <p>Registro de alterações, versões e atualizações para o <strong>{product.name}</strong>...</p>
                    </ContentSection>
                );
            default:
                return <GeneralDataSection product={product} />;
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const tabItems = [
        { value: 'general', label: 'Geral' },
        { value: 'specs', label: 'Especificações' },
        { value: 'variants', label: 'Variantes' },
        { value: 'history', label: 'Histórico' }
    ];

    return (
        <DetailWrapper>
            <Header />
            
            <MobileHeader>
                <BackButton 
                    component={Link} 
                    to="/products"
                    aria-label="Voltar"
                >
                    <ArrowBack />
                </BackButton>
                <h1 style={{ fontSize: '1.2em', margin: 0, flex: 1 }}>{product.name}</h1>
            </MobileHeader>
            
            <Sides>
                <PhotoArea>
                    <h1>{product.name}</h1>
                    <ProductStatus status={product.status || 'Ativo'} />
                    <img 
                        src={product.photo} 
                        alt={product.name}
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = '../src/assets/dummyPhoto1.png'; 
                        }} 
                    />
                </PhotoArea>
                
                <RightContent>
                    <MobileTabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {tabItems.map((tab) => (
                            <Tab key={tab.value} label={tab.label} value={tab.value} />
                        ))}
                    </MobileTabs>
                    
                    {renderContent()}

                </RightContent>
            </Sides>
        </DetailWrapper>
    );
}

export default ProductDetail;