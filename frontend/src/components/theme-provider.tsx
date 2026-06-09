"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "careerpilot_theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const persistedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (persistedTheme === "light" || persistedTheme === "dark") {
    return persistedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = resolveInitialTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export function ThemeBootScript() {
  const script = `
    (() => {
      try {
        const storageKey = "${THEME_STORAGE_KEY}";
        const persisted = window.localStorage.getItem(storageKey);
        const theme = persisted === "dark" || persisted === "light"
          ? persisted
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.dataset.theme = theme;
      } catch {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
