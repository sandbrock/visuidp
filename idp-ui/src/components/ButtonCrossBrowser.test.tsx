import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import React from 'react';
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

  describe('Chrome Compatibility', () => {
    it('should render all button variants correctly', () => {
      render(
        <ThemeProvider>
          <MockButtonPage />
        </ThemeProvider>
      );

      // Verify buttons render by nt
      expect(screen.getByRole('button', { name: /primary action/i })t();
      expect(screen.getByRole('button', { name: /delete/i })).toBeI
      expect(screen.getByRole('button', { name: /secondary action/i })
      expect(screen.getByRole('button', { name: /outline action/i })ment();
    });

 () => {
      render(
        <Them
          <MockButtonPa>
        </ThemeProvider>
      );

});
      const dangerBtn = screen.getByRole('button', { name: 
      const outlineBtn = screen.getByRole('button', { nami });


      expect(dangerBtn).toHaveClass('angry-button', 'btn-danger');
      expect(outlineBtn).toHaveClass('angry-button', 'btn-outline';
    });


      const user = userEvent.setup();
      const handleClick = vi.fn();

r(
        <Themider>
          <AngryButton ck}>
            Click Me
          </AngryButn>
        </ThemeProvider>
      );

me/i });
      await act(async () => {
        await user.click(button);
      });

Times(1);
    });

> {
      const user = userEvent.setup();
      const handleClick = vi.fn();


        <ThemProvider>
          <AngryButton 
            Disabled
          </AngryButton>
        </ThemeProvider>
      );


      await act(async () => {
        await user.click(butt
      });


    });

{
      localStorageMock['theme'] = 'light';

nder(
        <Themer>
          <MockButtonPa
        </ThemeProvider>
      );

t');
      
      
      expect(primaryBtn).toBeInTheDocument();
      expect(primaryBtn).toHaveClass('btn-primary');
    });

    it(


      render(
>
          <Mo
        </ThemeProvider
      );

      ex'dark');
      
      const primaryBtn = screen.getByRole('button', { name: /primary action/i }
      );
    });

    it( {


      render(
der>
          <Moe />
        </ThemeProvider
      );

      ex);

      const primaryBtn = screen.getByRole('button', { name: /primary action/i });
      
    });

    it( => {

        <ThemeProvider>
          <Mo
        </ThemeProvider
      );

      //es
);
      
      const primaryBtn = screen.getByRole('button', { name: /primary action/i});
      t();
    });
  });

  des () => {
) => {
      render(
        <ThemeProvider>
          <Mo />
        </ThemeProvider
      );

      co

      expect(primaryBtn.type).toBe('button');
    });

    it() => {
 render(
        <ThemeProvider>
          <Mo
        </ThemeProvider
      );

      co
      
      act(() => {
      .focus();
      });

      exp
});

    it(> {
();
      const handleClick = vi.fn();

      render(
der>
          <Anck}>
            Keyboard Te
          </AngryButton>
        </ThemeProvider>
      );

      co


      await act(async

      });

      exped();


    it(
p();
      const handleClick = vi.fn();

      render(
>
          <An}>
            Space Test
          </AngryButton>
        </ThemeProvider>
      );

      co);
;

      await act(async> {
d(' ');
      });

      exp);
 });

    it(=> {


      render(
r>
          <Mo />
        </ThemeProvider>
      );

      aw
dark');
      });

      con
imary');
    });

    it( {

        <ThemeProvider>
          <div>

          </div>
        </ThemeProvider>
      );

      // Simulathanges
      for (let i = 0; i 
        ;
erender(
          <ThemeProvider>
            <div>
              <MockButtonPage />
            </div
          </ThemeProvider>
        );
      }

      // Buttons should stl
      cons
      e;

  });

  describe('Safari Compatibility', () => {
    it(=> {
     
der>
          <MockButtonPage />
        </ThemeProvider>
      );

      const buttons = screen');
      expect(buttons.len
      
ton => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should handle touch events on butto => {
      contup();
      cfn();

      render(
        <ThemeProvider>
          <AngryButton isPrimary o
t
          </A
        </ThemeProvider
      );

      const button = scr });
      
      //k
{
        await user.click(button);
      });

      expect(handleClick).toHd();
    });

() => {
      const user = userEvent.setup();


        <ThemeProvider>
          <MockButtonPage />
r>
      );

      const primaryBtn = scr);
      
      //rs

        await user.hover(primaryBtn);
      

      expect(primaryBtn).toBeent();
    });

 {
      localStorageMock['theme'] = 'frankenste


        <ThemeProvider>
          <MockButtonPage />
er>
      );

      expect(document.documen');
      
      co });
t();
    });

    it('should handle disabled state correctly', () => {
      render(
       

        </ThemeProvider>
      );

      const disabledBtn = sc});
      expect(disabledBtn
      exbled');
  });

    it('should maintain button text reada
      render(
       
e />
        </ThemeProvider>
      );

      const primaryBtn = scr
      expect(primaryBtn.
      
i });
      expect(dangerBtn.textContent).toBe('Delete');
    });
  });

  describe('Edge Compatibility', () => {
    it(
     
r>
          <MockButtonPage />
        </ThemeProvider>
      );

      // Verify all button g
      expect(screen.getBument();
      ext();
();
      expect(screen.getByTestId('outline();
      expect(screen.getByTestId('disabled-group')).toBeInTheDocument();
    });

    it('should support Chromium-based features', async () => {
      const user = userEvent.setup();
      c.fn();

      render(
        <ThemeProvider>
          <AngryButton isPrimary ok}>
est
          </A
        </ThemeProvider>
      );

      const button = screst/i });
      await act(async () => {
        


      expect(handleClick).toH;
    });


      render(
       >
em' }}>
            <AngryButton isPrimary>Button 1</AngryButton>
            <
            <AngryButto
          </div>
        </ThemeProvider>
      );

      expect(scrt();
      expect(screen.getBnt();
      ex


    it('should handle Flexbox layouts with buttons', () => {
      render(
       
}>
            <AngryButton isPrimary>Button 1</AngryButton>
            <tton>
            <AngryButton>
          </div>
        </ThemeProvider>
      );

      expect(scr
      expect(screen.getBnt();
      ex;


    it('should support modern CSS features', () => {
      localStorageMock['theme'] = 'frankenstein';


        <ThemeProvider>
          <MockButtonPage />

      );

      // Verify CSS custom pork
      expect(document.doin');
      
});
      expect(primaryBtn).toBeInTheDocument
    });
  });

  describe('Cross-Browser Button Functionalit{
    it( => {
     );
;

      render(
        <ThemeProvider>
          <AngryButton isPrimary o}>
Click
          </A
        </ThemeProvider>
      );

      const button = scr});
      
      //mes

        await act(async () => {
      n);
        });
      }

      expect(handleClick).toHaveBee5);
    });


      const user = userEvent.setup();
      c

      const ThemeToggleButton = () => {
        const [theme, setTheme] = Rea
        
 {
          document.documentElement.setAtheme);
        }, [theme]);

        return (
          <div>
            <button )}>
heme
            </bu
            <An
              Test Button
            </AngryButton>
          </div>
        );
      };

      render(
        <Tovider>
        
ovider>
      );

      const button = screen.get});
      
      //

        await user.click(button);
      });
      expect(handleClick).toHaveBe

      // Change theme
      con });
      await act(async () => {

      });

      // Click after theme ch
      await act(async () => {
        a;
 });
      expect(handleClick).toHaveB;
    });

    it('s) => {
      render(
       r>
p">
            <AngryButton isPrimary>Action 1</AngryButto
            <yButton>
            <AngryButton>
          </div>
        </ThemeProvider>
      );

      expect(scr();
      expect(screen.getB
      ex();
);

    it('should support buttons with icons', () => {
      render(
       ovider>

            <span>🔍</span>
            <pan>
          </AngryButton>
        </ThemeProvider>
      );

      const button = scr
      expect(button).toBnt();
      ex('🔍');

    });

    it('should handle long button text correctly'{
      const longText = 'This is a very long button te


        <ThemeProvider>
          <AngryButton isPrimary>
gText}
          </A
        </ThemeProvider>
      );

      const button = scr
      expect(button.text);
    });


  describe('Syncfusion Button Compatibility', ()
    it( {
     (
er>
          <MockButtonPage />
        </ThemeProvider>
      );

      const syncfusionPrimar
      const syncfusionDa
      coy');

      expect(syncfusionPrimary).toBeInTheDocument();
      expect(syncfusionDanger).toBeInTheDocument();
      expect(syncfusionSecondary).toBeInTheDocument();
);

    it('should apply correct classes to Syncfusion 
      render(
       >
 />
        </ThemeProvider>
      );

      const syncfusionPrimar);
      expect(syncfusionP;

);
      expect(syncfusionDanger).toHaveClass('e-btn', 'e-danger');
    });

    it('should handle disabled Syncfusion buttons', () => {
      render(
       der>
ge />
        </ThemeProvider>
      );

      const disabledBtn = sc');
      expect(disabledBtn
    });

    it('should maintain Syncfusion button styling across themes', as> {
      localStorageMock['theme'] = 'franke';

r(
        <ThemeProvider>
          <MockButtonPage />
er>
      );

      await waitFor(() => {
        expect(document.
      });

      const syncfusionPrima');
      expect(syncfusionPrimary).toHaveClass('e-btn', 'e-primary');
    });


  describe('Accessibility Across Browsers', () => {
    it(() => {
     

          <AngryButton isPrimary>
            Screen Reader Test
          </Atton>
        </ThemeProvider
      );

      const button = screen.getByRole('button'
      expect(button).toBeInTheDocu;
    });

    it('should maintain {
      render(
        r>

            Focus Test
          </AngryButton>
       >
);

      const b);
      
      act(() => {
        button.focs();
      });

      ex

  });

  descr {
 () => {
      const startTime = performance.now();

      render(
        <ThemeProvider>
          <div>
            {Array.from(
              <AngryButtmary>
        
on>
            ))}
          </div>
       r>
  );

      const ew();
      const duration = me;

      // Should render time
      expect(duration).t
      expect(screen.getB
      exent();
});

    it
      const user );
      const handleClick();

er(
        <ThemeProvider>
       
     Click
>
        </ThemeProvider>
      );


      const s

      // Rapid 
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await user.click
        });
      }

      const endTime = pew();
      co

      expect(handleClick).toHaveBeenCall
      expect(duration).toBeLessThan(500);
    });
  });
});
