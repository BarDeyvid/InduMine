// front-end/src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Search as SearchIcon, Close } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';

const SearchContainer = styled.div`
  position: relative;
  width: ${props => props.width || '100%'};
  max-width: 600px;
  margin: 0 auto;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 50px 12px 20px;
  border: 2px solid ${props => props.theme.primary};
  border-radius: 25px;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};

  &:focus {
    box-shadow: 0 0 0 3px ${props => props.theme.primary}30;
  }

  &::placeholder {
    color: ${props => props.theme.textSecondary};
  }
`;

const SearchIconContainer = styled.div`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.primary};
  cursor: pointer;
  
  .MuiSvgIcon-root {
    font-size: 24px;
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

  &:last-child {
    border-bottom: none;
  }

  img {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    margin-right: 12px;
    object-fit: cover;
    background-color: ${props => props.theme.background};
  }

  .result-info {
    flex: 1;
    min-width: 0; /* Permite que o texto seja truncado */
  }

  .result-title {
    font-weight: 600;
    color: ${props => props.theme.primary};
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-description {
    font-size: 0.85em;
    color: ${props => props.theme.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    .result-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      margin-left: 10px;

      &.product {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      &.category {
        background-color: #e8f5e9;
        color: #388e3c;
      }
    }
  }
`;

const EmptyResults = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.textSecondary};
  font-style: italic;
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    }, 500); // Aumentado para 500ms para reduzir requisições

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

  const handleSearch = () => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults({ products: [], categories: [] });
    setShowResults(false);
    setError(null);
  };

  const handleInputFocus = () => {
    if (searchTerm.trim() && (results.products.length > 0 || results.categories.length > 0)) {
      setShowResults(true);
    }
  };

  const handleItemClick = () => {
    setShowResults(false);
    setSearchTerm('');
    setError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const totalResults = results.products.length + results.categories.length;

  return (
    <SearchContainer width={width} style={style} ref={searchRef}>
      <SearchInput
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        onKeyDown={handleKeyPress}
        aria-label="Barra de busca"
      />
      
      <SearchIconContainer>
        {searchTerm ? (
          <Close 
            onClick={handleClear} 
            style={{ cursor: 'pointer' }} 
            aria-label="Limpar busca"
          />
        ) : (
          <SearchIcon 
            onClick={handleSearch} 
            aria-label="Buscar"
          />
        )}
      </SearchIconContainer>

      {showResults && (
        <ResultsContainer role="listbox" aria-label="Resultados da busca">
          {isLoading ? (
            <LoadingIndicator>Carregando resultados...</LoadingIndicator>
          ) : error ? (
            <ErrorMessage>
              {error}
              <div style={{ marginTop: '10px', fontSize: '0.8em' }}>
                API URL: {API_BASE_URL}/api/items
              </div>
            </ErrorMessage>
          ) : totalResults > 0 ? (
            <>
              {results.products.map((product) => (
                <ResultItem
                  key={`product-${product.id}`}
                  to={`/products/${product.id}`}
                  onClick={handleItemClick}
                  role="option"
                >
                  <img 
                    src={product.photo} 
                    alt={product.name || 'Produto'} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23f0f0f0"/><text x="20" y="20" text-anchor="middle" dy=".3em" font-size="12" fill="%23999">P</text></svg>';
                    }}
                  />
                  <div className="result-info">
                    <div className="result-title">{product.name || `Produto ${product.id}`}</div>
                    <div className="result-description">
                      {product.description || product.category || 'Sem descrição'}
                      <span className="result-type product">Produto</span>
                    </div>
                  </div>
                </ResultItem>
              ))}
              
              {results.categories.map((category) => (
                <ResultItem
                  key={`category-${category.id}`}
                  to={`/categories/${category.id}`}
                  onClick={handleItemClick}
                  role="option"
                >
                  <img 
                    src={category.photo} 
                    alt={category.name || 'Categoria'} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23f0f0f0"/><text x="20" y="20" text-anchor="middle" dy=".3em" font-size="12" fill="%23999">C</text></svg>';
                    }}
                  />
                  <div className="result-info">
                    <div className="result-title">{category.name || `Categoria ${category.id}`}</div>
                    <div className="result-description">
                      {category.description || 'Sem descrição'}
                      <span className="result-type category">Categoria</span>
                      {category.product_count > 0 && (
                        <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>
                          ({category.product_count} produtos)
                        </span>
                      )}
                    </div>
                  </div>
                </ResultItem>
              ))}
            </>
          ) : searchTerm.trim() && !isLoading ? (
            <EmptyResults>
              Nenhum resultado encontrado para "{searchTerm}"
              <div style={{ marginTop: '10px', fontSize: '0.8em' }}>
                Tente termos diferentes
              </div>
            </EmptyResults>
          ) : null}
        </ResultsContainer>
      )}
    </SearchContainer>
  );
}

export default SearchBar;