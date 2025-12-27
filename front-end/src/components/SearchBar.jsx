// front-end/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Search as SearchIcon, Close } from '@mui/icons-material';
import { Link } from 'react-router-dom';

let API_BASE_URL;

if (import.meta.env.MODE === 'deploy') {
    API_BASE_URL = 'https://weg-product-api.onrender.com/api'; 
} else {
    API_BASE_URL = 'http://localhost:5001'; 
}
const SearchContainer = styled.div`
  position: relative;
  width: ${props => props.width || '100%'};
  max-width: 600px;
  
  @media (max-width: 768px) {
    width: 100% !important;
    max-width: 100%;
  }
`;

const ResultsContainer = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.textSecondary}20;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 5px;
  
  /* Estilos Mobile */
  @media (max-width: 768px) {
    position: fixed; /* Fixa na tela */
    top: 130px; /* Abaixo do Header expandido */
    left: 10px;
    right: 10px;
    max-height: 60vh;
    z-index: 2000;
    box-shadow: 0 0 0 1000px rgba(0,0,0,0.5); /* Dim no fundo */
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 40px 12px 15px;
  border: 2px solid ${props => props.theme.primary};
  border-radius: 20px;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 10px 35px 10px 15px;
    font-size: 14px;
  }
  
  &:focus {
    box-shadow: 0 0 0 3px ${props => props.theme.primary}30;
  }
`;

const SearchIconContainer = styled.div`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
`;
  
const ResultItem = styled(Link)`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid ${props => props.theme.textSecondary}10;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.surfaceHover};
  }

  img {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    margin-right: 12px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .result-info {
    flex: 1;
    min-width: 0; 
  }

  .result-title {
    font-weight: 600;
    color: ${props => props.theme.primary};
    margin-bottom: 3px;
    font-size: 0.95em;
  }

  .result-description {
    font-size: 0.85em;
    color: ${props => props.theme.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const EmptyResults = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.textSecondary};
`;

const LoadingIndicator = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.primary};
`;

const ErrorMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: #f44336;
  font-size: 0.9em;
`;

function SearchBar({ width, style, placeholder = "Buscar produtos ou categorias..." }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        performSearch(searchTerm);
      } else {
        setResults({ products: [], categories: [] });
        setShowResults(false);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/items?search=${encodeURIComponent(query)}&limit=10`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } else {
        const errorText = await response.text();
        console.error('Erro na resposta da API:', response.status, errorText);
        setError(`Erro ${response.status}: Não foi possível realizar a busca`);
        setResults({ products: [], categories: [] });
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setError('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
      setResults({ products: [], categories: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
        if (searchTerm.trim().length > 0) performSearch(searchTerm);
        else setShowResults(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm('');
    setResults({ products: [], categories: [] });
    setShowResults(false);
    setError(null);
  };

  return (
    <SearchContainer width={width} style={style} ref={searchRef}>
      <SearchInput
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => { if(searchTerm) setShowResults(true) }}
        placeholder={placeholder}
      />
      
      <SearchIconContainer>
        {searchTerm ? <Close onClick={handleClear} /> : <SearchIcon onClick={() => performSearch(searchTerm)} />}
      </SearchIconContainer>

      {showResults && (
        <ResultsContainer>
            {isLoading && <div style={{padding: 20, textAlign: 'center'}}>Carregando...</div>}
            
            {!isLoading && results.products.length === 0 && results.categories.length === 0 && (
                <EmptyResults>Nenhum resultado.</EmptyResults>
            )}

            {results.products.map(p => (
                <ResultItem key={`p-${p.id}`} to={`/products/${p.id}`} onClick={() => setShowResults(false)}>
                    <img src={p.photo} alt="" onError={(e) => e.target.src='https://via.placeholder.com/40'}/>
                    <div className="result-info">
                        <div className="result-title">{p.name}</div>
                        <div className="result-description">Produto</div>
                    </div>
                </ResultItem>
            ))}
             {results.categories.map(c => (
                <ResultItem key={`c-${c.id}`} to={`/categories/${c.id}`} onClick={() => setShowResults(false)}>
                    <img src={c.photo} alt="" onError={(e) => e.target.src='https://via.placeholder.com/40'}/>
                    <div className="result-info">
                        <div className="result-title">{c.name}</div>
                        <div className="result-description">Categoria</div>
                    </div>
                </ResultItem>
            ))}
        </ResultsContainer>
      )}
    </SearchContainer>
  );
}

export default SearchBar;