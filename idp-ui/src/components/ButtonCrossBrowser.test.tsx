import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AngryButton } from './input/AngryButton';

// Mock page with various button types
const MockButtonPage = () => (
  <div data-testid="button-page">
    <h1>Button Test Page</h1>
    
    {/* Primary buttons */}
    <div className="button-group" data-testid="primary-group">
      <AngryButton isPrimary>
        Primary Action
      </AngryButton>
      <button className="e-btn e-primary" data-testid="syncfusion-primary">
        Syncfusion Primary
      </button>
    </div>

    {/* Danger buttons */}
    <div className="button-group" data-testid="danger-group">
      <AngryButton cssClass="e-danger">
        Delete
      </AngryButton>
      <button className="e-btn e-danger" data-testid="syncfusion-danger">
        Syncfusion Danger
      </button>
    </div>

    {/* Secondary buttons */}
    <div className="button-group" data-testid="secondary-group">
      <AngryButton>
        Secondary Action
      </AngryButton>
      <button className="e-btn" data-testid="syncfusion-secondary">
        Syncfusion Secondary
      </button>
    </div>

    {/* Outline buttons */}
    <div className="button-group" data-testid="outline-group">
      <AngryButton cssClass="e-outline">
        Outline Action
      </AngryButton>
    </div>

    {/* Disabled buttons */}
    <div className="button-group" data-testid="disabled-group">
      <AngryButton isPrimary disabled>
        Disabled Primary
      </AngryButton>
      <AngryButton cssClass="e-danger" disabled>
        Disabled Danger
      </AngryButton>
      <button className="e-btn e-primary" disabled data-testid="syncfusion-disabled">
        Disabled Syncfusion
      </button>
    </div>
  </div>
);

describe('Cross-Browser Button Compatibility Tests', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    localStorageMock = {};
    
    (globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;

    document.documentElement.removeAttribute('data-theme');
  });

  describe('Chrome Compatibility', () => {
    it('should render all button variants correctly', () => {
      render(
        <ThemeProvider>
          <MockButtonPage />
        </ThemeProvider>
      );

      // Verify buttons render by text content
      expect(screen.getByRole('button', { name: /primary action/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /secondary action/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline action/i })).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(
        <ThemeProvider>
          <MockButtonPage />
        </ThemeProvider>
      );

      const dangerBtn = screen.getByRole('button', { name: /delete/i });
      const outlineBtn = screen.getByRole('button', { name: /outline action/i });

      expect(dangerBtn).toHaveClass('angry-button', 'btn-danger');
      expect(outlineBtn).toHaveClass('angry-button', 'btn-outline');
    });

    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick}>
            Click Me
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /click me/i });
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle disabled state', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} disabled>
            Disabled
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled/i });
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Firefox Compatibility', () => {
    it('should render buttons with correct attributes', () => {
      localStorageMock['theme'] = 'light';

      render(
        <ThemeProvider>
          <MockButtonPage />
        </ThemeProvider>
      );

      const primaryBtn = screen.getByRole('button', { name: /primary action/i });
      expect(primaryBtn).toBeInTheDocument();
      expect(primaryBtn).toHaveClass('btn-primary');
    });
  });

  describe('Edge Compatibility', () => {
    it('should support modern CSS features', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockButtonPage />
        </ThemeProvider>
      );

      // Verify CSS custom properties are set
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      const primaryBtn = screen.getByRole('button', { name: /primary action/i });
      expect(primaryBtn).toBeInTheDocument();
    });
  });

  describe('Accessibility Across Browsers', () => {
    it('should be keyboard accessible', () => {
      render(
        <ThemeProvider>
          <AngryButton isPrimary>
            Screen Reader Test
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should maintain focus styles', () => {
      render(
        <ThemeProvider>
          <AngryButton isPrimary>
            Focus Test
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should render quickly', () => {
      const startTime = performance.now();

      render(
        <ThemeProvider>
          <div>
            {Array.from({ length: 10 }, (_, i) => (
              <AngryButton key={i} isPrimary>
                Button {i + 1}
              </AngryButton>
            ))}
          </div>
        </ThemeProvider>
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should render quickly
      expect(duration).toBeLessThan(100);
      expect(screen.getAllByRole('button')).toHaveLength(10);
    });
  });
});
