// front-end/src/components/SearchBar.jsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SearchIcon from "@mui/icons-material/Search";
import { TextField, IconButton } from "@mui/material";
import styled from 'styled-components';

const DUMMY_PRODUCTS = [
  "Paris", "London", "New York", "Tokyo", "Berlin",
  "Buenos Aires", "Cairo", "Canberra", "Rio de Janeiro", "Dublin"
];

const SearchDropdown = styled.div`
  position: absolute;
  z-index: 10;
  background-color: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.textSecondary};
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  margin-top: 4px;
  text-align: center;

  .item {
    padding: 8px 12px;
    font-size: 16px;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    border-bottom: 1px solid ${({ theme }) => theme.textSecondary};
    &:hover {
      background-color: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.surface};
    }
  }
`;


const SearchForm = ({ value, onChange, onSubmit, width }) => {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", alignItems: "center" }}>
      <TextField
        id="search-bar"
        value={value}
        onChange={onChange}
        label="Search by Product ID or Model"
        variant="outlined"
        placeholder="Search"
        size="small"
        sx={{ width: width || 250 }}
      />
    </form>
  );
};

export default function SearchBar({ width }) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [apiProducts, setApiProducts] = useState(DUMMY_PRODUCTS);
  const [loadingError, setLoadingError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetching data from API
    fetch("http://127.0.0.1:8000/items")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.length > 0 && typeof data[0] === 'object' && data[0].final_search) {
          setApiProducts(data.map(item => item.final_search));
        } else {
          setApiProducts(data);
        }
        setLoadingError(null);
      })
      .catch((err) => {
        console.error("Erro ao buscar dados da API.", err);
        setLoadingError(err.message);
      });
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    console.log("Busca submetida:", searchQuery);
  };

  const filterData = (query, data) => {
    if (!query) return data;
    const lowerCaseQuery = query.toLowerCase();
    return data.filter((d) => d.toLowerCase().includes(lowerCaseQuery));
  };

  const dataFiltered = filterData(searchQuery, apiProducts);

  useEffect(() => {
    if (searchQuery && dataFiltered.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchQuery, dataFiltered]);

  return (
    <div style={{ width: width || "fit-content", padding: 0, position: "relative" }}>
      <SearchForm
        value={searchQuery}
        onChange={handleSearchChange}
        onSubmit={handleSearchSubmit}
        width={width}
      />

      {loadingError && (
        <p style={{ color: "orange", fontSize: "small" }}>
          Aviso: Erro API. Usando dados temporários.
        </p>
      )}

      {searchQuery && dataFiltered.length > 0 && isOpen && (
          <SearchDropdown width={width}>
            {dataFiltered.map((d) => (
              <div
                key={d}
                className="item"
                onClick={() => {
                  navigate("products/" + d.replace(/ /g, "_"));
                  setIsOpen(false);
                }}
              >
                {d}
              </div>
            ))}
          </SearchDropdown>
        )}
    </div>
  );
}
