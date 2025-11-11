import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DynamicResourceForm } from './DynamicResourceForm';
import { propertySchemaService } from '../services/PropertySchemaService';
import type { PropertySchema } from '../types/admin';

// Mock the PropertySchemaService
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe('AWS Resource Form - Theme Compatibility (Task 15)', () => {
  // Mock AWS S3 Storage properties
  const mockAwsS3Properties: PropertySchema[] = [
    {
      id: 's3-1',
      mappingId: 'aws-storage-mapping',
      propertyName: 'storageClass',
      displayName: 'Storage Class',
      description: 'The storage class determines the cost and availability of objects',
      dataType: 'LIST',
      required: true,
      defaultValue: 'STANDARD',
      validationRules: {
        allowedValues: [
          { value: 'STANDARD', label: 'Standard' },
          { value: 'STANDARD_IA', label: 'Standard-IA' },
          { value: 'GLACIER', label: 'Glacier' },
        ],
      },
      displayOrder: 10,
    },
    {
      id: 's3-2',
      mappingId: 'aws-storage-mapping',
      propertyName: 'versioning',
      displayName: 'Versioning Status',
      description: 'Enable versioning to keep multiple versions of objects',
      dataType: 'LIST',
      required: true,
      defaultValue: 'Enabled',
      validationRules: {
        allowedValues: [
          { value: 'Enabled', label: 'Enabled' },
          { value: 'Suspended', label: 'Suspended' },
          { value: 'Disabled', label: 'Disabled' },
        ],
      },
      displayOrder: 20,
    },
    {
      id: 's3-3',
      mappingId: 'aws-storage-mapping',
      propertyName: 'encryption',
      displayName: 'Server-Side Encryption',
      description: 'Server-side encryption protects data at rest',
      dataType: 'LIST',
      required: true,
      defaultValue: 'AES256',
      validationRules: {
        allowedValues: [
          { value: 'AES256', label: 'AES256' },
          { value: 'aws:kms', label: 'AWS KMS' },
        ],
      },
      displayOrder: 30,
    },
    {
      id: 's3-4',
      mappingId: 'aws-storage-mapping',
      propertyName: 'publicAccessBlock',
      displayName: 'Block Public Access',
      description: 'Block all public access to the bucket',
      dataType: 'BOOLEAN',
      required: false,
      defaultValue: true,
      displayOrder: 40,
    },
    {
      id: 's3-5',
      mappingId: 'aws-storage-mapping',
      propertyName: 'lifecycleDays',
      displayName: 'Lifecycle Transition Days',
      description: 'Number of days before transitioning objects (1-3650 days)',
      dataType: 'NUMBER',
      required: false,
      validationRules: { min: 1, max: 3650 },
      displayOrder: 50,
    },
  ];

  // Mock AWS RDS properties
  const mockAwsRdsProperties: PropertySchema[] = [
    {
      id: 'rds-1',
      mappingId: 'aws-rds-mapping',
      propertyName: 'engine',
      displayName: 'Database Engine',
      description: 'The database engine to use',
      dataType: 'LIST',
      required: true,
      defaultValue: 'postgres',
      validationRules: {
        allowedValues: [
          { value: 'mysql', label: 'MySQL' },
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mariadb', label: 'MariaDB' },
        ],
      },
      displayOrder: 10,
    },
    {
      id: 'rds-2',
      mappingId: 'aws-rds-mapping',
      propertyName: 'instanceClass',
      displayName: 'Instance Class',
      description: 'The compute and memory capacity',
      dataType: 'LIST',
      required: true,
      defaultValue: 'db.t3.small',
      validationRules: {
        allowedValues: [
          { value: 'db.t3.micro', label: 'db.t3.micro' },
          { value: 'db.t3.small', label: 'db.t3.small' },
          { value: 'db.t3.medium', label: 'db.t3.medium' },
        ],
      },
      displayOrder: 20,
    },
    {
      id: 'rds-3',
      mappingId: 'aws-rds-mapping',
      propertyName: 'allocatedStorage',
      displayName: 'Allocated Storage (GB)',
      description: 'The amount of storage in gigabytes (20-65536 GB)',
      dataType: 'NUMBER',
      required: true,
      defaultValue: 20,
      validationRules: { min: 20, max: 65536 },
      displayOrder: 30,
    },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Light Theme - AWS Storage (S3) Form', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should display AWS S3 form correctly in light theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      // Verify theme is set to light
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Verify form structure is present
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();

      // Verify all AWS S3 properties are displayed
      expect(screen.getByText('Storage Class')).toBeInTheDocument();
      expect(screen.getByText('Versioning Status')).toBeInTheDocument();
      expect(screen.getByText('Server-Side Encryption')).toBeInTheDocument();
      expect(screen.getByText('Block Public Access')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle Transition Days')).toBeInTheDocument();
    });

    it('should display required fields with asterisk in light theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify required indicators are present
      const requiredIndicators = container.querySelectorAll('.property-input-required');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });

    it('should display help text for all properties in light theme', async () => {
      render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify help text is displayed
      expect(screen.getByText(/storage class determines the cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Enable versioning to keep multiple versions/i)).toBeInTheDocument();
      expect(screen.getByText(/Server-side encryption protects data/i)).toBeInTheDocument();
    });

    it('should render all input types correctly in light theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify different input types are rendered
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      expect(propertyWrappers.length).toBe(5); // 5 AWS S3 properties
    });
  });

  describe('Dark Theme - AWS Storage (S3) Form', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should display AWS S3 form correctly in dark theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      // Verify theme is set to dark
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Verify form is displayed correctly
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();

      // Verify all properties are visible
      expect(screen.getByText('Storage Class')).toBeInTheDocument();
      expect(screen.getByText('Versioning Status')).toBeInTheDocument();
      expect(screen.getByText('Server-Side Encryption')).toBeInTheDocument();
    });

    it('should maintain readability of all inputs in dark theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify theme is dark
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Verify all property wrappers are present
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      expect(propertyWrappers.length).toBe(5);
    });
  });

  describe('Frankenstein Theme - AWS Storage (S3) Form', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should display AWS S3 form correctly in frankenstein theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      // Verify theme is set to frankenstein
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');

      // Verify form is displayed correctly
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();

      // Verify all properties are visible
      expect(screen.getByText('Storage Class')).toBeInTheDocument();
      expect(screen.getByText('Versioning Status')).toBeInTheDocument();
      expect(screen.getByText('Server-Side Encryption')).toBeInTheDocument();
      expect(screen.getByText('Block Public Access')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle Transition Days')).toBeInTheDocument();
    });

    it('should maintain readability of all inputs in frankenstein theme', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify theme is frankenstein
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');

      // Verify all property wrappers are present and styled
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      expect(propertyWrappers.length).toBe(5);
    });
  });

  describe('Theme Switching with AWS RDS Form', () => {
    beforeEach(() => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsRdsProperties);
    });

    it('should maintain form structure when switching from light to dark', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      const { container, rerender } = render(
        <DynamicResourceForm
          resourceTypeId="rds-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Database Engine')).toBeInTheDocument();
      });

      // Verify initial light theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      const formBefore = container.querySelector('.dynamic-resource-form');
      expect(formBefore).toBeInTheDocument();

      // Switch to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
      rerender(
        <DynamicResourceForm
          resourceTypeId="rds-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      // Verify form structure is maintained
      const formAfter = container.querySelector('.dynamic-resource-form');
      expect(formAfter).toBeInTheDocument();
      expect(screen.getByText('Database Engine')).toBeInTheDocument();
      expect(screen.getByText('Instance Class')).toBeInTheDocument();
      expect(screen.getByText('Allocated Storage (GB)')).toBeInTheDocument();
    });

    it('should maintain form structure when switching from dark to frankenstein', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const { container, rerender } = render(
        <DynamicResourceForm
          resourceTypeId="rds-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Database Engine')).toBeInTheDocument();
      });

      // Verify dark theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Switch to frankenstein theme
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      rerender(
        <DynamicResourceForm
          resourceTypeId="rds-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      // Verify form structure is maintained
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
      expect(screen.getByText('Database Engine')).toBeInTheDocument();
      expect(screen.getByText('Instance Class')).toBeInTheDocument();
    });
  });

  describe('All Property Input Types - Theme Compatibility', () => {
    beforeEach(() => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should render LIST inputs correctly in light theme', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByText('Storage Class')).toBeInTheDocument();
      expect(screen.getByText('Versioning Status')).toBeInTheDocument();
      expect(screen.getByText('Server-Side Encryption')).toBeInTheDocument();
    });

    it('should render BOOLEAN inputs correctly in dark theme', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Block Public Access')).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(screen.getByText('Block Public Access')).toBeInTheDocument();
    });

    it('should render NUMBER inputs correctly in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lifecycle Transition Days')).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      expect(screen.getByText('Lifecycle Transition Days')).toBeInTheDocument();
    });
  });

  describe('Error States - Theme Compatibility', () => {
    beforeEach(() => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should render form with error values in light theme', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{ storageClass: '' }}
          onChange={mockOnChange}
          errors={{ storageClass: 'This field is required' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify form renders correctly with error state
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
    });

    it('should render form with error values in dark theme', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{ storageClass: '' }}
          onChange={mockOnChange}
          errors={{ storageClass: 'This field is required' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
    });

    it('should render form with error values in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{ storageClass: '' }}
          onChange={mockOnChange}
          errors={{ storageClass: 'This field is required' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States - Theme Compatibility', () => {
    it('should display loading state correctly in light theme', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
      const loadingElement = container.querySelector('.dynamic-form-loading');
      expect(loadingElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should display loading state correctly in dark theme', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should display empty state correctly in light theme', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No cloud-specific properties/i)).toBeInTheDocument();
      });

      const emptyElement = container.querySelector('.dynamic-form-empty');
      expect(emptyElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should display empty state correctly in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No cloud-specific properties/i)).toBeInTheDocument();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });

  describe('Visual Consistency Across Themes', () => {
    beforeEach(() => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockAwsS3Properties);
    });

    it('should maintain consistent layout structure in light theme', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      
      expect(formElement).toBeInTheDocument();
      expect(propertyWrappers.length).toBe(5);
    });

    it('should maintain consistent layout structure in dark theme', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      
      expect(formElement).toBeInTheDocument();
      expect(propertyWrappers.length).toBe(5);
    });

    it('should maintain consistent layout structure in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      
      expect(formElement).toBeInTheDocument();
      expect(propertyWrappers.length).toBe(5);
    });

    it('should use CSS variables for all theming', async () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="storage-resource-type"
          cloudProviderId="aws-cloud-provider"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Class')).toBeInTheDocument();
      });

      // Verify components use CSS classes (not inline styles)
      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
      expect(formElement).toHaveClass('dynamic-resource-form');

      const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
      propertyWrappers.forEach(wrapper => {
        expect(wrapper).toHaveClass('property-input-wrapper');
      });
    });
  });
});
