import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'industrial' | 'dark' | 'ocean' | 'emerald';

const themes = {
  industrial: {
    "--primary": "24 95% 53%", // Orange
    "--background": "240 10% 3.9%",
    "--card": "240 10% 3.9%",
    "--primary-foreground": "0 0% 100%",
  },
  ocean: {
    "--primary": "199 89% 48%", // Blue
    "--background": "222 47% 11%",
    "--card": "222 47% 15%",
    "--primary-foreground": "0 0% 100%",
  },

};

const ThemeContext = createContext({
  theme: 'industrial' as Theme,
  setTheme: (t: Theme) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('industrial');

  useEffect(() => {
    const root = window.document.documentElement;
    const themeConfig = themes[theme];
    
    Object.entries(themeConfig).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);