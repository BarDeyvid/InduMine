import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // 💡 CORREÇÃO: Removido o { data } incorreto.
import SearchIcon from "@mui/icons-material/Search";
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '@mui/material/Button';
import "./Dashboard.css"
import { LineChart } from "@mui/x-charts";
import { TextField, IconButton } from "@mui/material";

// Dados temporários (DUMMY) para usar enquanto a API carrega ou falha.
const DUMMY_PRODUCTS = [
    "Paris",
    "London",
    "New York",
    "Tokyo",
    "Berlin",
    "Buenos Aires",
    "Cairo",
    "Canberra",
    "Rio de Janeiro",
    "Dublin"
];

// O SearchBar é um componente controlado e permanece simples.
const SearchBar = ({ value, onChange, onSubmit }) => {
    return (
        <form onSubmit={onSubmit} style={{ display: "flex", gap: "8px" }}>
        <TextField
            id="search-bar"
            value={value}
            onChange={onChange}
            label="Search by Product ID or Model"
            variant="outlined"
            placeholder="Search"
            size="small"
            sx={{ width: 250 }}
        />
        <IconButton type="submit" aria-label="search">
            <SearchIcon style={{ fill: "blue" }} />
        </IconButton>
        </form>
    );
};

function Dashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [userInfo, setUserInfo] = useState({ name: 'Carregando...', cargo: '' });
    const navigate = useNavigate();

    // 💡 NOVO: Estados para a busca da API
    const [apiProducts, setApiProducts] = useState(DUMMY_PRODUCTS); // Inicializa com dummy
    const [loadingError, setLoadingError] = useState(null);

    // 💡 INTEGRAÇÃO DA LÓGICA DE FETCH
    useEffect(() => {
        fetch("http://127.0.0.1:8000/items")
        .then((response) => {
            if (!response.ok) {
                // Se o fetch falhar (ex: status 404, 500), tratamos o erro
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // Se o retorno da API for uma lista de objetos (ex: {id: 1, name: "Produto"}),
            // mapeamos para uma lista de strings para o filtro atual funcionar.
            if (data && data.length > 0 && typeof data[0] === 'object' && data[0].name) {
                 setApiProducts(data.map(item => item.name));
            } else {
                 setApiProducts(data); // Assume que a lista já é de strings
            }
           
            setLoadingError(null);
        })
        .catch((err) => {
            // Se o fetch falhar (ex: CORS, network), usamos os dados dummy
            console.error("Erro ao buscar dados da API. Usando dados temporários.", err);
            setLoadingError(err.message);
            // setApiProducts já está inicializado com DUMMY_PRODUCTS
        });
    }, []);

    // Função de tratamento de mudança (Live Filtering)
    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value); 
    }, []);
    
    // Função para tratamento de submissão
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        console.log("Busca submetida:", searchQuery);
    };

    // 💡 FUNÇÃO DE FILTRO: Adaptada para trabalhar com strings (d)
    const filterData = (query, data) => {
        if (!query) {
            return data;
        } else {
            const lowerCaseQuery = query.toLowerCase();
            return data.filter((d) => d.toLowerCase().includes(lowerCaseQuery));
        }
    };

    // Usa a lista carregada (da API ou dummy)
    const dataFiltered = filterData(searchQuery, apiProducts);

    useEffect(() => {
        const userName = localStorage.getItem('userName');
        const userRole = localStorage.getItem('userRole'); 
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/');
            return;
        }

        if (userName && userRole) {
            setUserInfo({ name: userName, cargo: userRole });
        }

        }, [navigate]);

    return (
        <div>
            <header style={{paddingLeft: '72em'}}>
                <div className="right-side">
                    <div style={{width: "fit-content", padding: 20}}>
                        <SearchBar 
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onSubmit={handleSearchSubmit} 
                        />
                        
                        {/* Exibe erro se houver */}
                        {loadingError && <p style={{ color: "orange", fontSize: "small" }}>Aviso: Erro ao carregar dados da API. Exibindo dados temporários.</p>}

                        {/* Bloco de exibição de resultados filtrados */}
                        {searchQuery && dataFiltered.length > 0 && ( 
                            <div style={{ 
                                position: 'absolute', 
                                zIndex: 10,          
                                backgroundColor: 'white',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                width: '250px',
                                marginTop: '4px'
                            }}>
                                {dataFiltered.map((d) => (
                                    <div className="text"
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: 16,
                                        color: "blue",
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #eee'
                                    }} 
                                    key={d} 
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                                    onClick={() => navigate("products/" + d.replace(/ /g, "_"))}
                                    > 
                                    {d}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <hr style={{margin: 0}}/>
                <div>
                    <Button color="secondary">
                    <div style={{alignItems: "baseline", paddingLeft: "4em", right: 0}}>
                        <h1 style={{margin: 0}}>{userInfo.name}</h1>
                        <h1 style={{margin: 0}}>{userInfo.cargo}</h1> 
                    </div>
                    </Button>
                </div>
            </header>
            
            <div className="Shower">
                <h3>
                    Showing'pretty number here' of 'actual numbers' products
                </h3>
                <Button onClick={console.log("Pretty PDF")}>
                    PDF 
                </Button>
            </div>

            <h1>Welcome to the Dashboard!</h1>
            <p>This is your analytics dashboard.</p>
            <h2>Bar-Chart Testing Below!!!</h2>
            <BarChart 
            yAxis={[
                {
                    id: 'barCategories',
                    data: ['bar A', 'bar B', 'bar C']
                }
                ]}
                series={[
                    {
                        data: [19, 5, 3]
                    },
                ]}
                height={300}
                    />
        </div>
    );
}

export default Dashboard;