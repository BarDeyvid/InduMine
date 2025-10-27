import React, { useState, useEffect } from "react"; 
import { useNavigate } from 'react-router-dom';
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import TextField from "@mui/material/TextField";
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '@mui/material/Button';
import "./Dashboard.css"
import { LineChart } from "@mui/x-charts";

function Dashboard() {
    const SearchBar = ({setSearchQuery}) => (
    <form>
        <TextField
        id="search-bar"
        className="text"
        onInput={(e) => {
            setSearchQuery(e.target.value);
        }}
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
    const filterData = (query, data) => {
        if (!query) {
            return data;
        } else {
            return data.filter((d) => d.toLowerCase().includes(query));
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
    const [searchQuery, setSearchQuery] = useState("");
    const [userInfo, setUserInfo] = useState({ name: 'Carregando...', cargo: '' });
    const navigate = useNavigate();
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
        <header>
            <h1>ProdDash</h1>
            <div className="right-side">
                <div style={{width: "fit-content",padding: 20}}>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
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

/*
Maybe add to the search bar indexing:
<div style={{ padding: 3 }}>
    {dataFiltered.map((d) => (
        <div className="text"
        style={{
            padding: 5,
            justifyContent: "normal",
            fontSize: 20,
            color: "blue",
            margin: 1,
            width: "250px",
            BorderColor: "green",
            borderWidth: "10px"
        }} key={d.id} > {d}
        </div>
    ))}
</div>
*/