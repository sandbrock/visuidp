import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Determine the next theme in the cycle
  const getNextTheme = () => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'frankenstein';
    return 'light';
  };

  // Get icon for current theme
  const getThemeIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '⬢'; // frankenstein - bolt icon
  };

  // Get descriptive label for next theme
  const getNextThemeLabel = () => {
    const nextTheme = getNextTheme();
    if (nextTheme === 'dark') return 'dark mode';
    if (nextTheme === 'frankenstein') return 'Frankenstein monster theme';
    return 'light mode';
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Current theme: ${theme}. Switch to ${getNextThemeLabel()}`}
      title={`Switch to ${getNextThemeLabel()}`}
    >
      <span className="theme-toggle-icon">
        {getThemeIcon()}
      </span>
    </button>
  );
};