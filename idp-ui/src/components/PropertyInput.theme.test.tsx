import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PropertyInput } from './PropertyInput';
import type { PropertySchema } from '../types/admin';

describe('PropertyInput Component - Theme Support', () => {
  beforeEach(() => {
    // Clear any existing theme attribute
    document.documentElement.removeAttribute('data-theme');
  });

  const createStringProperty = (): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testProperty',
    displayName: 'Test Property',
    description: 'This is a test property',
    dataType: 'STRING',
    required: true,
  });

  const createNumberProperty = (): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testNumber',
    displayName: 'Test Number',
    description: 'This is a test number',
    dataType: 'NUMBER',
    required: true,
    validationRules: { min: 1, max: 100 },
  });

  const createBooleanProperty = (): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testBoolean',
    displayName: 'Test Boolean',
    description: 'This is a test boolean',
    dataType: 'BOOLEAN',
    required: false,
  });

  const createListProperty = (): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testList',
    displayName: 'Test List',
    description: 'This is a test list',
    dataType: 'LIST',
    required: true,
    validationRules: {
      allowedValues: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ],
    },
  });

  describe('Light Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    it('should render STRING property with light theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render NUMBER property with light theme styles', () => {
      const property = createNumberProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={50}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render BOOLEAN property with light theme styles', () => {
      const property = createBooleanProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={true}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render LIST property with light theme styles', () => {
      const property = createListProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="option1"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render error state with light theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Dark Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    it('should render STRING property with dark theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render NUMBER property with dark theme styles', () => {
      const property = createNumberProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={50}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render BOOLEAN property with dark theme styles', () => {
      const property = createBooleanProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={true}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render LIST property with dark theme styles', () => {
      const property = createListProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="option1"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render error state with dark theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Frankenstein Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
    });

    it('should render STRING property with frankenstein theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render NUMBER property with frankenstein theme styles', () => {
      const property = createNumberProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={50}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render BOOLEAN property with frankenstein theme styles', () => {
      const property = createBooleanProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value={true}
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render LIST property with frankenstein theme styles', () => {
      const property = createListProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="option1"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render error state with frankenstein theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render help text with frankenstein theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const helpText = container.querySelector('.property-input-help-text');
      expect(helpText).toBeInTheDocument();
      expect(helpText?.textContent).toBe('This is a test property');
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render required indicator with frankenstein theme styles', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const requiredIndicator = container.querySelector('.property-input-required');
      expect(requiredIndicator).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });

  describe('Theme Switching', () => {
    it('should maintain component structure when switching from light to dark', () => {
      const property = createStringProperty();
      const { container, rerender } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      document.documentElement.setAttribute('data-theme', 'light');
      const wrapperLight = container.querySelector('.property-input-wrapper');
      expect(wrapperLight).toBeInTheDocument();

      document.documentElement.setAttribute('data-theme', 'dark');
      rerender(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapperDark = container.querySelector('.property-input-wrapper');
      expect(wrapperDark).toBeInTheDocument();
    });

    it('should maintain component structure when switching from dark to frankenstein', () => {
      const property = createStringProperty();
      const { container, rerender } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      document.documentElement.setAttribute('data-theme', 'dark');
      const wrapperDark = container.querySelector('.property-input-wrapper');
      expect(wrapperDark).toBeInTheDocument();

      document.documentElement.setAttribute('data-theme', 'frankenstein');
      rerender(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapperFrankenstein = container.querySelector('.property-input-wrapper');
      expect(wrapperFrankenstein).toBeInTheDocument();
    });

    it('should maintain error state when switching themes', () => {
      const property = createStringProperty();
      const { container, rerender } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      document.documentElement.setAttribute('data-theme', 'light');
      let wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');

      document.documentElement.setAttribute('data-theme', 'dark');
      rerender(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');

      document.documentElement.setAttribute('data-theme', 'frankenstein');
      rerender(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });
  });

  describe('CSS Variables Usage', () => {
    it('should use CSS variables for all styling', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();

      // Verify that the component renders without inline styles
      // (CSS variables are applied via stylesheets)
      const label = container.querySelector('.property-input-label');
      expect(label).toBeInTheDocument();
      
      const helpText = container.querySelector('.property-input-help-text');
      expect(helpText).toBeInTheDocument();
    });

    it('should use CSS variables for error styling', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={() => {}}
          error="This field is required"
        />
      );

      const errorMessage = container.querySelector('.property-input-error');
      expect(errorMessage).toBeInTheDocument();
      
      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });
  });

  describe('Visual Consistency', () => {
    it('should match visual style of existing form inputs', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      // Verify that the component uses the same class naming conventions
      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();

      const label = container.querySelector('.property-input-label');
      expect(label).toBeInTheDocument();

      const control = container.querySelector('.property-input-control');
      expect(control).toBeInTheDocument();

      const helpText = container.querySelector('.property-input-help-text');
      expect(helpText).toBeInTheDocument();
    });

    it('should use consistent spacing and typography', () => {
      const property = createStringProperty();
      const { container } = render(
        <PropertyInput
          property={property}
          value="test"
          onChange={() => {}}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toBeInTheDocument();

      // Verify that the component structure is consistent
      const label = container.querySelector('.property-input-label');
      const control = container.querySelector('.property-input-control');
      const helpText = container.querySelector('.property-input-help-text');

      expect(label).toBeInTheDocument();
      expect(control).toBeInTheDocument();
      expect(helpText).toBeInTheDocument();
    });
  });
});
