let themes = [];

export const getThemes = () => themes;

export const setThemes = (newThemes) => {
  themes = newThemes;
};

export const applyTheme = (themeId) => {
  const chosen = themes.find((theme) => theme.id === themeId) || themes[0];
  if (chosen.id === "default") {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', chosen.id);
  }
};

export const loadThemes = async () => {
  try {
    const response = await fetch('styles/themes.css');
    const cssText = await response.text();
    const themeRegex = /\/\*\s*Theme Name:\s*([^\*]+)\s*\*\//g;
    const matches = [...cssText.matchAll(themeRegex)];
    
    themes = matches.map((match, index) => {
      const name = match[1].trim();
      const isDefault = index === 0;
      return {
        id: isDefault ? 'default' : name.toLowerCase().replace(/\s+/g, '-'),
        name: name
      };
    });
    
    return themes;
  } catch (error) {
    console.error('Failed to load themes:', error);
    themes = [
      { id: "default", name: "Default Dark" },
      { id: "light", name: "Light" },
      { id: "monokai", name: "Monokai" },
      { id: "dracula", name: "Dracula" },
      { id: "solarized", name: "Solarized" },
      { id: "high-contrast-dark", name: "High Contrast Dark" },
      { id: "high-contrast-light", name: "High Contrast Light" },
    ];
    return themes;
  }
};
