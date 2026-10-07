// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider, useLocale } from "./LocaleContext";
import { ThemeProvider, useTheme } from "./ThemeContext";

function PreferenceProbe() {
  const { language, direction, toggleLanguage } = useLocale();
  const { theme, toggleTheme } = useTheme();
  return <div><output data-testid="language">{language}:{direction}</output><output data-testid="theme">{theme}</output><button onClick={toggleLanguage}>language</button><button onClick={toggleTheme}>theme</button></div>;
}

describe("persistent locale and theme preferences", () => {
  afterEach(cleanup);

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("switches Arabic RTL to English LTR and persists the chosen language", () => {
    render(<LocaleProvider><ThemeProvider><PreferenceProbe /></ThemeProvider></LocaleProvider>);
    expect(screen.getByTestId("language").textContent).toBe("ar:rtl");
    fireEvent.click(screen.getByText("language"));
    expect(screen.getByTestId("language").textContent).toBe("en:ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(localStorage.getItem("lqta.language")).toBe("en");
  });

  it("switches and persists the dark theme on the document root", () => {
    render(<LocaleProvider><ThemeProvider><PreferenceProbe /></ThemeProvider></LocaleProvider>);
    expect(screen.getByTestId("theme").textContent).toBe("light");
    fireEvent.click(screen.getByText("theme"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("lqta.theme")).toBe("dark");
  });
});
