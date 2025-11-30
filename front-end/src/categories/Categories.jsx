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

const DUMMY_Categories = [
    { id: 1, name: "Motores", photo: "../src/assets/dummyPhoto1.png", description: "Motores elétricos e de combustão" },
    { id: 2, name: "Inversores", photo: "../src/assets/dummyPhoto2.png", description: "Inversores de frequência e conversores" },
    { id: 3, name: "Geradores", photo: "../src/assets/dummyPhoto3.png", description: "Geradores a diesel e gasolina" },
    { id: 4, name: "Transformadores", photo: "../src/assets/dummyPhoto4.png", description: "Transformadores de força e isolamento" },
    { id: 5, name: "Motores Trifásicos", photo: "../src/assets/dummyPhoto5.png", description: "Motores com proteção IP65" },
    { id: 6, name: "Inversores Solares", photo: "../src/assets/dummyPhoto6.png", description: "Inversores para sistemas fotovoltaicos" },
];

const dummyDataset = [
    { categoria: "Motores", valor: 50 },
    { categoria: "Inversores", valor: 30 },
    { categoria: "Geradores", valor: 20 },
    { categoria: "Transf.", valor: 15 },
    { categoria: "Outros", valor: 10 },
];

const secondDummyDataset = [
    { id: 0, value: 82, label: "Ativos" },
    { id: 1, value: 10, label: "Em Revisao" },
    { id: 2, value: 8, label: "Descontinuados" },
];

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
    const [apiRows, setApiRows] = useState({});
    const [loadingError, setLoadingError] = useState(null);
    const [CategoryView, setCategoryView] = useState('grid');
    const TotalRows = DUMMY_Categories.length; 

    const toggleCategoryView = useCallback(() => {
        setCategoryView((prevView) => (prevView === 'grid' ? 'list' : 'grid'));
    }, []);

    useEffect(() => {
        const mockApiData = { "Motores": 50, "Inversores": 30, "Geradores": 20, "Transformadores": 15, "Outros": 10 };
        setApiRows(mockApiData);
        
        // setLoadingError("Falha ao carregar dados de status da API.");
    }, []);


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
                            <div className="value">{TotalRows}</div>
                            <div className="title">Total de Categorias</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <CheckCircle className="icon" />
                        <div className="data">
                            <div className="value">{secondDummyDataset.find(d => d.label === "Ativos")?.value}%</div>
                            <div className="title">Status Ativo</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <Category className="icon" />
                        <div className="data">
                            <div className="value">{Object.keys(apiRows).length}</div>
                            <div className="title">Categorias</div>
                        </div>
                    </InfoCard>
                    <InfoCard>
                        <Update className="icon" />
                        <div className="data">
                            <div className="value">4</div>
                            <div className="title">Atualizações Hoje</div>
                        </div>
                    </InfoCard>
                </InfoCardContainer>
                
                <hr/>
                <h2>Gráficos de Distribuição</h2>
                <ChartGrid>
                    <div>
                        <Typography variant="h6">Produtos por Categorias</Typography>
                        <BarChart
                            dataset={dummyDataset}
                            xAxis={[{ dataKey: "categoria", scaleType: 'band' }]}
                            series={[{ dataKey: "valor", label: "Contagem", color: '#4CAF50' }]}
                            height={240}
                            width={300}
                        />
                    </div>
                        <div>
                        <Typography variant="h6">Status das Categorias</Typography>
                        <PieChart
                            series={[{ data: secondDummyDataset, innerRadius: 30, outerRadius: 80, paddingAngle: 5 }]}
                            width={300}
                            height={240}
                            margin={{ top: 10, bottom: 10, left: 100, right: 0 }}
                                sx={{
                                "*": {
                                    padding: 0,
                                    margin: 0,
                                    gap: 0,
                                    left: 0,
                                    right: "auto",
                                },
                                "& ul": {
                                    paddingRight: 15,
                                    display: 'flexbox',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 1,
                                },
                                "& li": {
                                    padding: 1,
                                    borderRadius: 2,
                                },
                                }}/>
                    </div>
                        <div>
                        <Typography variant="h6">Atualizações Semanais (Qtd.)</Typography>
                        <LineChart
                            xAxis={[{ scaleType: "band", data: ["Seg", "Ter", "Qua", "Qui", "Sex"] }]}
                            series={[
                                { data: [1, 3, 5, 2, 8], label: "Novos Registros", color: '#2196F3' },
                            ]}
                            height={240}
                            width={300}
                        />
                    </div>
                </ChartGrid>
                
                <hr/>
                <CategoryHeader> 
                    <h2>Lista Detalhada de Categorias</h2>
                    <ToggleButton onClick={toggleCategoryView}>
                        {CategoryView === 'grid' ? <ViewList /> : <ViewModule />}
                        {CategoryView === 'grid' ? 'Mudar para Vista em Coluna' : 'Mudar para Vista em Grade'}
                    </ToggleButton>
                </CategoryHeader>
                
                <CategoryList $view={CategoryView}>
                    {DUMMY_Categories.map((Category) => {
                        const ItemComponent = CategoryView === 'grid' ? CategoryCardGrid : CategoryItem;
                        return (
                            <ItemComponent key={Category.id} to={`/categories/${Category.id}`}>
                                <img src={Category.photo} alt={Category.name} />
                                <div className="list-info">
                                    <h3>{Category.name}</h3>
                                    <p>{Category.description}</p>
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