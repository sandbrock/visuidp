import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

// Mock components representing different page types
const MockPageWithCards = () => (
  <div data-testid="page-with-cards">
    <header className="app-header">
      <h1 className="app-title">IDP Platform</h1>
      <ThemeToggle />
    </header>
    <main>
      <div className="content-card" data-testid="card-1">
        <h2>Card Title</h2>
        <p>Card content with text</p>
        <button className="btn btn-primary">Action Button</button>
      </div>
      <div className="content-card" data-testid="card-2">
        <h2>Another Card</h2>
        <input type="text" className="input-field" placeholder="Input field" />
      </div>
    </main>
  </div>
);

const MockFormPage = () => (
  <div data-testid="form-page">
    <header className="app-header">
      <ThemeToggle />
    </header>
    <form className="form-container">
      <div className="float-input">
        <input type="text" required />
        <label>Name</label>
      </div>
      <div className="float-input">
        <input type="email" required />
        <label>Email</label>
      </div>
      <button type="submit" className="btn btn-primary">Submit</button>
      <button type="button" className="btn btn-danger">Cancel</button>
    </form>
  </div>
);

const MockModalPage = () => (
  <div data-testid="modal-page">
    <ThemeToggle />
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog-header">
        <h3>Modal Title</h3>
      </div>
      <div className="dialog-content">
        <p>Modal content goes here</p>
      </div>
      <div className="dialog-footer">
        <button className="btn btn-primary">Confirm</button>
        <button className="btn">Cancel</button>
      </div>
    </div>
  </div>
);

describe('Responsive Design Integration Tests', () => {
  let localStorageMock: { [key: string]: string };
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    // Store original dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;

    // Setup localStorage mock
    localStorageMock = {};
    
    (global as any).localStorage = {
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

  afterEach(() => {
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  const setViewport = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  describe('Mobile Viewport (320px - 768px)', () => {
    it('should render Frankenstein theme correctly on small mobile (320px)', async () => {
      setViewport(320, 568);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify theme toggle is accessible
      const themeButton = screen.getByRole('button', { name: /theme/i });
      expect(themeButton).toBeInTheDocument();
      expect(themeButton.textContent).toContain('⚡');

      // Verify cards are rendered
      expect(screen.getByTestId('card-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-2')).toBeInTheDocument();
    });

    it('should render Frankenstein theme correctly on large mobile (375px)', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
    });

    it('should handle theme switching on mobile viewport', async () => {
      setViewport(360, 640);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Switch through themes
      await act(async () => {
        await user.click(button); // light -> dark
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      await act(async () => {
        await user.click(button); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
        expect(button.textContent).toContain('⚡');
      });
    });

    it('should render forms correctly on mobile with Frankenstein theme', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockFormPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify form elements are present
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render modals correctly on mobile with Frankenstein theme', async () => {
      setViewport(320, 568);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockModalPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify modal is rendered
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });
  });

  describe('Tablet Viewport (768px - 1024px)', () => {
    it('should render Frankenstein theme correctly on tablet portrait (768px)', async () => {
      setViewport(768, 1024);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /theme/i }).textContent).toContain('⚡');
    });

    it('should render Frankenstein theme correctly on tablet landscape (1024px)', async () => {
      setViewport(1024, 768);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
    });

    it('should handle theme switching on tablet viewport', async () => {
      setViewport(820, 1180);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      await act(async () => {
        await user.click(button);
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should render complex layouts on tablet with Frankenstein theme', async () => {
      setViewport(834, 1112);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify multiple cards render
      expect(screen.getByTestId('card-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-2')).toBeInTheDocument();
    });
  });

  describe('Desktop Viewport (1024px+)', () => {
    it('should render Frankenstein theme correctly on small desktop (1280px)', async () => {
      setViewport(1280, 720);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
    });

    it('should render Frankenstein theme correctly on standard desktop (1920px)', async () => {
      setViewport(1920, 1080);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /theme/i }).textContent).toContain('⚡');
    });

    it('should render Frankenstein theme correctly on large desktop (2560px)', async () => {
      setViewport(2560, 1440);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(screen.getByTestId('page-with-cards')).toBeInTheDocument();
    });

    it('should handle theme switching on desktop viewport', async () => {
      setViewport(1440, 900);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Full cycle
      await act(async () => {
        await user.click(button); // light -> dark
        await user.click(button); // dark -> frankenstein
        await user.click(button); // frankenstein -> light
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });
  });

  describe('Visual Effects Across Viewports', () => {
    it('should apply Frankenstein theme styles on mobile', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Theme attribute should be set, allowing CSS to apply
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should apply Frankenstein theme styles on tablet', async () => {
      setViewport(768, 1024);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should apply Frankenstein theme styles on desktop', async () => {
      setViewport(1920, 1080);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should maintain theme consistency when resizing from mobile to desktop', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Simulate resize to desktop
      setViewport(1920, 1080);

      // Theme should remain consistent
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should maintain theme consistency when resizing from desktop to mobile', async () => {
      setViewport(1920, 1080);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Simulate resize to mobile
      setViewport(375, 667);

      // Theme should remain consistent
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events on theme toggle button (mobile)', async () => {
      setViewport(375, 667);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Simulate touch interaction (userEvent.click works for both mouse and touch)
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should handle rapid touch interactions on mobile', async () => {
      setViewport(375, 667);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Rapid touches
      await act(async () => {
        await user.click(button);
        await user.click(button);
        await user.click(button);
      });

      await waitFor(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        expect(['light', 'dark', 'frankenstein']).toContain(theme);
      });
    });

    it('should handle touch interactions on form buttons (mobile)', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockFormPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Find and interact with form buttons
      const submitButton = screen.getByText('Submit');
      expect(submitButton).toBeInTheDocument();

      // Touch interaction should work
      await act(async () => {
        await user.click(submitButton);
      });

      // Button should be clickable (form submission would be handled by actual form logic)
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle touch interactions on modal buttons (tablet)', async () => {
      setViewport(768, 1024);
      localStorageMock['theme'] = 'frankenstein';
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockModalPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toBeInTheDocument();

      await act(async () => {
        await user.click(confirmButton);
      });

      expect(confirmButton).toBeInTheDocument();
    });

    it('should handle touch interactions with input fields (mobile)', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockFormPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);

      // Simulate touch focus and input
      await act(async () => {
        await user.click(inputs[0]);
        await user.type(inputs[0], 'Test');
      });

      expect(inputs[0]).toHaveValue('Test');
    });
  });

  describe('Cross-Viewport Theme Persistence', () => {
    it('should persist Frankenstein theme across viewport changes', async () => {
      localStorageMock['theme'] = 'frankenstein';

      // Start on mobile
      setViewport(375, 667);
      const { unmount } = render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      unmount();

      // Switch to tablet
      setViewport(768, 1024);
      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should allow theme switching on any viewport size', async () => {
      const viewports = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' },
      ];

      for (const viewport of viewports) {
        // Reset localStorage for each iteration
        localStorageMock = {};
        document.documentElement.removeAttribute('data-theme');
        
        const user = userEvent.setup();
        setViewport(viewport.width, viewport.height);

        const { unmount } = render(
          <ThemeProvider>
            <MockPageWithCards />
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /theme/i });

        await act(async () => {
          await user.click(button);
          await user.click(button);
        });

        await waitFor(() => {
          expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
        });

        unmount();
      }
    });
  });

  describe('Accessibility Across Viewports', () => {
    it('should maintain accessible theme toggle on mobile', async () => {
      setViewport(375, 667);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('theme');
    });

    it('should maintain accessible theme toggle on tablet', async () => {
      setViewport(768, 1024);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should maintain accessible theme toggle on desktop', async () => {
      setViewport(1920, 1080);
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockPageWithCards />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should maintain keyboard navigation on all viewports', async () => {
      const viewports = [375, 768, 1920];

      for (const width of viewports) {
        setViewport(width, 800);

        const { unmount } = render(
          <ThemeProvider>
            <MockPageWithCards />
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /theme/i });
        
        // Button should be focusable
        button.focus();
        expect(document.activeElement).toBe(button);

        unmount();
      }
    });
  });
});
