import { React, useState } from "react";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import TextField from "@mui/material/TextField";
import Button from '@mui/material/Button';

function Dashboard() {
    const SearchBar = ({setSearchQuery}) => (
    <form>
        <TextField
        id="search-bar"
        className="text"
        onInput={(e) => {
            setSearchQuery(e.target.value);
        }}
        label="Search by Product ID or Model..."
        variant="outlined"
        placeholder="Search..."
        size="small"
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
    const dataFiltered = filterData(searchQuery, data);


  return (
    <div>
        <header>
            <h1>ProdDash</h1>
            <ul className="navs justify-center">
            <ul>
                <button type='button'>Overview</button>
                <button type='button'>Technical Specs</button>
                <button type='button'>Connectivity</button>
                <button type='button'>Aesthetics</button>
                <button type='button'>Accessories</button>
                <button type='button'>Analytics</button>
                <button type='button'>AI Intelligence</button>
            </ul>
                <div>
                    <button type='button'>Market Trends</button>
                    <button type='button'>Quality Control</button>
                    <button type='button'>Supply Chain</button>
                    <button type='button'>Benchmarking</button>
                    <button type='button'>Predictive Maintenance</button>
                    <button type='button'>Compliance</button>
                    <button type='button'>Live Monitoring</button>
                </div>
                <div className="rightside">
                    <div
      style={{
        display: "flex",
        alignSelf: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 20
      }}
      >
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </div>
                </div>
            </ul>
            <div>
                <Button color="secondary"><h1>Username</h1><h1>/UserCargo</h1></Button>
            </div>
            <hr />
        </header>
      <h1>Welcome to the Dashboard!</h1>
      <p>This is your analytics dashboard.</p>
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