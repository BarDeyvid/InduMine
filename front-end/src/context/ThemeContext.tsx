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
  },
  light: {
    name: "Light",
    preview: "#3b82f6", // Azul
    vars: {
      "--primary": "217 91% 60%",
      "--background": "0 0% 98%",
      "--card": "0 0% 100%",
      "--muted": "210 40% 85%",
      "--foreground": "210 40% 10%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  cream: {
    name: "Cream",
    preview: "#d4a574", // Marrom claro
    vars: {
      "--primary": "30 81% 50%",
      "--background": "30 20% 96%",
      "--card": "30 15% 99%",
      "--muted": "30 25% 85%",
      "--foreground": "30 40% 15%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  sage: {
    name: "Sage",
    preview: "#059669", // Verde-sálvia
    vars: {
      "--primary": "162 73% 46%",
      "--background": "160 40% 96%",
      "--card": "160 30% 99%",
      "--muted": "160 30% 85%",
      "--foreground": "160 40% 12%",
      "--primary-foreground": "0 0% 100%",
    }
  },
  slate: {
    name: "Slate",
    preview: "#64748b", // Cinza-ardósia
    vars: {
      "--primary": "215 28% 45%",
      "--background": "210 40% 96%",
      "--card": "210 30% 99%",
      "--muted": "210 40% 85%",
      "--foreground": "215 25% 15%",
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
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("indumine-theme") as ThemeName;
    return saved && themes[saved] ? saved : 'industrial';
  });

  const setTheme = (name: ThemeName) => {
    setThemeState(name);
    localStorage.setItem("indumine-theme", name);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const themeConfig = themes[theme];
    
    Object.entries(themeConfig.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.classList.add('dark'); 
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);