import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps { children: React.ReactNode; defaultTheme?: Theme; switchable?: boolean; }

export function ThemeProvider({ children, defaultTheme = "light", switchable = true }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get("theme");
      if (requested === "light" || requested === "dark") return requested;
      const stored = localStorage.getItem("lqta.theme");
      if (stored === "light" || stored === "dark") return stored;
      return defaultTheme;
    } catch { return defaultTheme; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    if (switchable) { try { localStorage.setItem("lqta.theme", theme); } catch { /* local storage unavailable */ } }
  }, [theme, switchable]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(current => current === "light" ? "dark" : "light"), switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
