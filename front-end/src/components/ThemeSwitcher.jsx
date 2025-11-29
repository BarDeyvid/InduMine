// src/components/ThemeSwitcher.jsx
import React from 'react';
import { useTheme } from '../context/themeProvider';

const ThemeSwitcher = () => {
  const { themeMode, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      {themeMode === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeSwitcher;