import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataDisplay, type MetadataItem } from './MetadataDisplay';

describe('MetadataDisplay', () => {
  it('renders with empty items array', () => {
    const { container } = render(<MetadataDisplay items={[]} />);

    const dl = container.querySelector('.metadata-display__list');
    expect(dl).toBeInTheDocument();
    expect(dl?.children).toHaveLength(0);
  });

  it('renders single metadata item', () => {
    const items: MetadataItem[] = [
      { label: 'Name', value: 'Test Name' },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });

  it('renders multiple metadata items', () => {
    const items: MetadataItem[] = [
      { label: 'Name', value: 'Test Name' },
      { label: 'Type', value: 'API Key' },
      { label: 'Status', value: 'Active' },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders items in correct order', () => {
    const items: MetadataItem[] = [
      { label: 'First', value: '1' },
      { label: 'Second', value: '2' },
      { label: 'Third', value: '3' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const labels = container.querySelectorAll('.metadata-display__label');
    expect(labels[0]).toHaveTextContent('First');
    expect(labels[1]).toHaveTextContent('Second');
    expect(labels[2]).toHaveTextContent('Third');
  });

  it('renders React nodes as values', () => {
    const items: MetadataItem[] = [
      { label: 'Created', value: <span data-testid="date">2024-01-15</span> },
      { label: 'Status', value: <strong>Active</strong> },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByTestId('date')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const items: MetadataItem[] = [
      { label: 'Name', value: 'Test' },
    ];

    const { container } = render(
      <MetadataDisplay items={items} className="custom-class" />
    );

    expect(container.querySelector('.metadata-display')).toHaveClass('custom-class');
  });

  it('renders with semantic HTML structure', () => {
    const items: MetadataItem[] = [
      { label: 'Name', value: 'Test Name' },
      { label: 'Type', value: 'API Key' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const dl = container.querySelector('dl');
    expect(dl).toHaveClass('metadata-display__list');

    const dts = container.querySelectorAll('dt');
    expect(dts).toHaveLength(2);
    expect(dts[0]).toHaveClass('metadata-display__label');

    const dds = container.querySelectorAll('dd');
    expect(dds).toHaveLength(2);
    expect(dds[0]).toHaveClass('metadata-display__value');
  });

  it('handles long text values with word wrapping', () => {
    const longText = 'This is a very long text that should wrap properly without breaking the layout';
    const items: MetadataItem[] = [
      { label: 'Description', value: longText },
    ];

    render(<MetadataDisplay items={items} />);

    const value = screen.getByText(longText);
    expect(value).toBeInTheDocument();
    expect(value).toHaveClass('metadata-display__value');
  });

  it('renders items with special characters', () => {
    const items: MetadataItem[] = [
      { label: 'Email', value: 'user@example.com' },
      { label: 'URL', value: 'https://example.com/path?query=1' },
      { label: 'Symbol', value: '©2024' },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/path?query=1')).toBeInTheDocument();
    expect(screen.getByText('©2024')).toBeInTheDocument();
  });

  it('renders items with numeric values', () => {
    const items: MetadataItem[] = [
      { label: 'Count', value: 42 },
      { label: 'Percentage', value: 99.5 },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('99.5')).toBeInTheDocument();
  });

  it('renders items with null and undefined values', () => {
    const items: MetadataItem[] = [
      { label: 'Empty', value: null },
      { label: 'Undefined', value: undefined },
      { label: 'Normal', value: 'Value' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const values = container.querySelectorAll('.metadata-display__value');
    expect(values).toHaveLength(3);
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('applies correct CSS classes to items', () => {
    const items: MetadataItem[] = [
      { label: 'Test Label', value: 'Test Value' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const item = container.querySelector('.metadata-display__item');
    expect(item).toHaveClass('metadata-display__item');

    const label = container.querySelector('.metadata-display__label');
    expect(label).toHaveClass('metadata-display__label');

    const value = container.querySelector('.metadata-display__value');
    expect(value).toHaveClass('metadata-display__value');
  });

  it('renders complex nested components as values', () => {
    const ComplexValue = () => (
      <div data-testid="complex">
        <span>Part 1</span>
        <span>Part 2</span>
      </div>
    );

    const items: MetadataItem[] = [
      { label: 'Complex', value: <ComplexValue /> },
    ];

    render(<MetadataDisplay items={items} />);

    expect(screen.getByTestId('complex')).toBeInTheDocument();
    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Part 2')).toBeInTheDocument();
  });

  it('handles items with empty string values', () => {
    const items: MetadataItem[] = [
      { label: 'Empty', value: '' },
      { label: 'Normal', value: 'Value' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const values = container.querySelectorAll('.metadata-display__value');
    expect(values).toHaveLength(2);
  });

  it('renders without className prop', () => {
    const items: MetadataItem[] = [
      { label: 'Name', value: 'Test' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const display = container.querySelector('.metadata-display');
    expect(display).toBeInTheDocument();
    expect(display?.className).toBe('metadata-display ');
  });

  it('preserves item order with duplicate labels', () => {
    const items: MetadataItem[] = [
      { label: 'Key', value: 'Value 1' },
      { label: 'Key', value: 'Value 2' },
      { label: 'Key', value: 'Value 3' },
    ];

    const { container } = render(<MetadataDisplay items={items} />);

    const values = container.querySelectorAll('.metadata-display__value');
    expect(values).toHaveLength(3);
    expect(values[0]).toHaveTextContent('Value 1');
    expect(values[1]).toHaveTextContent('Value 2');
    expect(values[2]).toHaveTextContent('Value 3');
  });
});
