// src/context/themeProvider.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../styles/theme';
import GlobalStyles from '../styles/GlobalStyles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('themeMode');
    return savedTheme ? savedTheme : 'light';
  });

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  // Criar tema MUI baseado no seu styled-components theme
  const muiTheme = createTheme({
    palette: {
      mode: themeMode,
      background: {
        default: theme.background,
        paper: theme.surface,
      },
      text: {
        primary: theme.text,
        secondary: theme.textSecondary,
      },
      primary: {
        main: theme.primary,
      },
      secondary: {
        main: theme.secondary,
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
          },
        },
      },
    },
  });

  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <StyledThemeProvider theme={theme}>
          <GlobalStyles />
          {children}
        </StyledThemeProvider>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
