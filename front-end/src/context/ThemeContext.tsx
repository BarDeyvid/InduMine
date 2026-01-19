import React, { createContext, useContext, useEffect, useState } from 'react';

// Definição dos temas com cores de alto contraste para fundo escuro
export const themes = {
  industrial: {
    name: "Industrial",
    preview: "#f97316", // Laranja
    vars: {
      "--primary": "24 95% 53%",
      "--background": "240 10% 3.9%",
      "--card": "240 10% 6%",
      "--muted": "240 5% 15%",
      "--foreground": "0 0% 98%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  emerald: {
    name: "Esmeralda",
    preview: "#10b981", // Verde
    vars: {
      "--primary": "142 71% 45%",
      "--background": "144 30% 5%",
      "--card": "144 30% 8%",
      "--muted": "144 10% 15%",
      "--foreground": "0 0% 98%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  ocean: {
    name: "Oceano",
    preview: "#0ea5e9", // Azul Sky
    vars: {
      "--primary": "199 89% 48%",
      "--background": "222 47% 11%",
      "--card": "222 47% 15%",
      "--muted": "222 47% 20%",
      "--foreground": "210 40% 98%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  sunset: {
    name: "Sunset",
    preview: "#f43f5e", // Rose
    vars: {
      "--primary": "346 84% 61%",
      "--background": "346 30% 5%",
      "--card": "346 30% 8%",
      "--muted": "346 10% 15%",
      "--foreground": "0 0% 98%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  midnight: {
    name: "Midnight",
    preview: "#8b5cf6", // Violeta
    vars: {
      "--primary": "262 83% 58%",
      "--background": "262 30% 5%",
      "--card": "262 30% 8%",
      "--muted": "262 10% 15%",
      "--foreground": "0 0% 98%",
      "--primary-foreground": "0 0% 100%",
    }
  }
};

export const availableThemes = themes;

export type ThemeName = keyof typeof themes;

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'industrial',
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('industrial');

  useEffect(() => {
    const root = window.document.documentElement;
    const config = themes[themeName].vars;
    Object.entries(config).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ theme: themeName, setTheme: setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);