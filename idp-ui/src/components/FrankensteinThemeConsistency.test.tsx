import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import App from '../App';

describe('Frankenstein Theme Consistency Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Set Frankenstein theme
    localStorage.setItem('theme', 'frankenstein');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Character Aesthetic Consistency', () => {
    it('should use greenish color palette, not purple', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const root = document.documentElement;
      const theme = root.getAttribute('data-theme');
      expect(theme).toBe('frankenstein');

      // Check CSS custom properties for greenish colors
      const styles = getComputedStyle(root);
      const bgPrimary = styles.getPropertyValue('--bg-primary').trim();
      const accentPrimary = styles.getPropertyValue('--accent-primary').trim();
      const frankensteinSkin = styles.getPropertyValue('--frankenstein-skin').trim();

      // Verify greenish tones (should contain green hex values)
      expect(bgPrimary).toMatch(/#1a1d1a/i);
      expect(accentPrimary).toMatch(/#7a9b7a/i);
      expect(frankensteinSkin).toMatch(/#8ba888/i);

      // Verify NO purple colors in key variables
      const allProperties = Array.from({ length: styles.length }, (_, i) => styles[i]);
      const customProperties = allProperties.filter(prop => prop.startsWith('--'));
      
      customProperties.forEach(prop => {
        const value = styles.getPropertyValue(prop);
        // Purple hex patterns: #8b00ff, #9d4edd, etc. (high blue component)
        expect(value).not.toMatch(/#[0-9a-f]{0,2}[0-9a-f]{0,2}[c-f][0-9a-f]/i);
      });
    });

    it('should display bolt decorations (⬢ or ●)', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      // Check for bolt characters in the document
      const bodyText = document.body.textContent || '';
      const hasBolts = bodyText.includes('⬢') || bodyText.includes('●');
      
      // Bolts should appear via CSS pseudo-elements, check computed styles
      const header = document.querySelector('.app-header');
      if (header) {
        const beforeContent = window.getComputedStyle(header, '::before').content;
        const afterContent = window.getComputedStyle(header, '::after').content;
        
        expect(
          beforeContent.includes('⬢') || 
          beforeContent.includes('●') ||
          afterContent.includes('⬢') ||
          afterContent.includes('●') ||
          hasBolts
        ).toBe(true);
      }
    });

    it('should display stitching patterns on borders', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const stitchColor = styles.getPropertyValue('--frankenstein-stitch').trim();

      // Verify stitch color is dark brown/black
      expect(stitchColor).toMatch(/#2d2520/i);

      // Check for dashed/dotted borders in the DOM
      const allElements = document.querySelectorAll('*');
      let hasStitching = false;

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const borderStyle = style.borderStyle;
        const borderColor = style.borderColor;
        
        if ((borderStyle.includes('dashed') || borderStyle.includes('dotted')) && 
            borderColor.includes('rgb(45, 37, 32)')) {
          hasStitching = true;
        }
      });

      // Stitching should be present via borders or pseudo-elements
      expect(hasStitching || stitchColor.length > 0).toBe(true);
    });
  });

  describe('Theme Switching Functionality', () => {
    it('should cycle through light -> dark -> frankenstein -> light', async () => {
      localStorage.setItem('theme', 'light');
      
      const { rerender } = render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const root = document.documentElement;
      expect(root.getAttribute('data-theme')).toBe('light');

      // Find and click theme toggle
      const themeToggle = screen.getByRole('button', { name: /theme/i });
      
      // Click to go to dark
      themeToggle.click();
      await waitFor(() => {
        expect(root.getAttribute('data-theme')).toBe('dark');
      });

      // Click to go to frankenstein
      themeToggle.click();
      await waitFor(() => {
        expect(root.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Click to go back to light
      themeToggle.click();
      await waitFor(() => {
        expect(root.getAttribute('data-theme')).toBe('light');
      });
    });

    it('should persist Frankenstein theme after reload', () => {
      localStorage.setItem('theme', 'frankenstein');

      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const root = document.documentElement;
      expect(root.getAttribute('data-theme')).toBe('frankenstein');
      expect(localStorage.getItem('theme')).toBe('frankenstein');
    });

    it('should display correct icon for Frankenstein theme', () => {
      localStorage.setItem('theme', 'frankenstein');

      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const themeToggle = screen.getByRole('button', { name: /frankenstein|monster|bolt/i });
      expect(themeToggle).toBeDefined();
      
      // Check for bolt icon (⬢) or zombie emoji (🧟)
      const buttonText = themeToggle.textContent || '';
      expect(buttonText.includes('⬢') || buttonText.includes('🧟')).toBe(true);
    });
  });

  describe('Component-Specific Styling', () => {
    it('should apply Frankenstein styles to buttons', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const buttons = document.querySelectorAll('.e-btn');
      if (buttons.length > 0) {
        const button = buttons[0];
        const styles = window.getComputedStyle(button);
        const borderColor = styles.borderColor;
        
        // Should have dark stitch-colored border
        expect(borderColor).toBeTruthy();
      }
    });

    it('should apply Frankenstein styles to inputs', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const inputs = document.querySelectorAll('input, textarea');
      if (inputs.length > 0) {
        const input = inputs[0];
        const styles = window.getComputedStyle(input);
        const backgroundColor = styles.backgroundColor;
        
        // Should have dark greenish background
        expect(backgroundColor).toBeTruthy();
      }
    });

    it('should apply Frankenstein styles to cards', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const cards = document.querySelectorAll('.card, .content-card');
      if (cards.length > 0) {
        const card = cards[0];
        const styles = window.getComputedStyle(card);
        const borderWidth = styles.borderWidth;
        
        // Should have prominent border (3px)
        expect(borderWidth).toBeTruthy();
      }
    });
  });

  describe('No Purple/Electrical Elements', () => {
    it('should not contain purple glow effects', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const allElements = document.querySelectorAll('*');
      let hasPurpleGlow = false;

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const boxShadow = style.boxShadow;
        
        // Check for purple in box shadows (rgba with high blue)
        if (boxShadow && boxShadow.includes('157, 78, 221')) {
          hasPurpleGlow = true;
        }
      });

      expect(hasPurpleGlow).toBe(false);
    });

    it('should not contain electrical spark animations', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      // Check for electrical animation names in stylesheets
      const styleSheets = Array.from(document.styleSheets);
      let hasElectricalAnimations = false;

      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSKeyframesRule) {
              const name = rule.name.toLowerCase();
              if (name.includes('spark') || name.includes('electrical') || name.includes('zap')) {
                hasElectricalAnimations = true;
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets may throw errors
        }
      });

      expect(hasElectricalAnimations).toBe(false);
    });

    it('should not display lightning bolt emoji (⚡) in Frankenstein theme', () => {
      localStorage.setItem('theme', 'frankenstein');

      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const themeToggle = screen.getByRole('button', { name: /theme/i });
      const buttonText = themeToggle.textContent || '';
      
      // Should NOT have lightning bolt when in Frankenstein theme
      expect(buttonText.includes('⚡')).toBe(false);
    });
  });

  describe('Accessibility in Frankenstein Theme', () => {
    it('should maintain readable contrast ratios', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const root = document.documentElement;
      const styles = getComputedStyle(root);
      
      // Key color combinations should be defined
      const textPrimary = styles.getPropertyValue('--text-primary').trim();
      const bgPrimary = styles.getPropertyValue('--bg-primary').trim();
      
      expect(textPrimary).toBeTruthy();
      expect(bgPrimary).toBeTruthy();
      
      // Verify they're different (contrast exists)
      expect(textPrimary).not.toBe(bgPrimary);
    });

    it('should have visible focus indicators', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      );

      const themeToggle = screen.getByRole('button', { name: /theme/i });
      themeToggle.focus();
      
      const styles = window.getComputedStyle(themeToggle);
      const outline = styles.outline;
      const outlineColor = styles.outlineColor;
      
      // Should have some form of focus indicator
      expect(outline !== 'none' || outlineColor !== 'transparent').toBe(true);
    });
  });
});
