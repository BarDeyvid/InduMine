// src/context/themeProvider.jsx
import React, { createContext, useState, useContext } from 'react';
import { lightTheme, darkTheme } from '../styles/theme';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import GlobalStyles from '../styles/GlobalStyles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light');

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
      <StyledThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// 3. Hook customizado
export const useTheme = () => {
  return useContext(ThemeContext);
};