import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SearchIcon from "@mui/icons-material/Search";
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '@mui/material/Button';
import "./Dashboard.css"
import { LineChart } from "@mui/x-charts";
import { TextField, IconButton } from "@mui/material";

const SearchBar = ({ value, onChange, onSubmit }) => {
    return (
        <form onSubmit={onSubmit} style={{ display: "flex", gap: "8px" }}>
        <TextField
            id="search-bar"
            value={value} // Controlado pelo estado do pai
            onChange={onChange} // Passa o evento de volta para o pai
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

    // Função de tratamento de mudança (Live Filtering)
    const handleSearchChange = useCallback((e) => {
        // Atualiza searchQuery instantaneamente (live filtering)
        setSearchQuery(e.target.value); 
    }, []);
    
    // Função para tratamento de submissão
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        console.log("Busca submetida:", searchQuery);
    };


    const filterData = (query, data) => {
        if (!query) {
            return data;
        } else {
            const lowerCaseQuery = query.toLowerCase();
            return data.filter((d) => d.toLowerCase().includes(lowerCaseQuery));
        }
    };

    const data = [
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

    const dataFiltered = filterData(searchQuery, data);

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
                    {/* 💡 PASSANDO O VALOR E FUNÇÕES DO PAI */}
                    <SearchBar 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onSubmit={handleSearchSubmit} 
                    />
                    
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