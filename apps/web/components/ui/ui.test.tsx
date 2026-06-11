import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';
import PageSection from './PageSection';
import Card from './Card';
import FormField from './FormField';
import TextInput from './TextInput';
import Textarea from './Textarea';
import DataTable from './DataTable';
import StatusChip from './StatusChip';

describe('PageHeader', () => {
  it('renders title and optional subtitle + action', () => {
    render(
      <PageHeader
        title="Your cart"
        subtitle="3 items"
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Your cart' })).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('omits subtitle and action when not passed', () => {
    render(<PageHeader title="Plain" />);
    expect(screen.queryByText(/^3 items$/)).not.toBeInTheDocument();
  });
});

describe('PageSection', () => {
  it('renders children and applies the gap class', () => {
    const { container } = render(
      <PageSection gap={6}>
        <p>child</p>
      </PageSection>,
    );
    const section = container.querySelector('section')!;
    expect(section.className).toContain('space-y-6');
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('renders padding md by default', () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('p-5');
    expect(div.className).toContain('rounded-[10px]');
  });

  it('adds hover class when interactive', () => {
    const { container } = render(<Card interactive>x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain(
      'hover:bg-paper-deep',
    );
  });
});

describe('FormField', () => {
  it('renders label and error span when error provided', () => {
    render(
      <FormField label="Email" htmlFor="e" error="Required" errorTestId="email-error">
        <input id="e" />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByTestId('email-error')).toHaveTextContent('Required');
  });

  it('shows hint only when no error', () => {
    const { rerender } = render(
      <FormField label="N" hint="help">
        <input />
      </FormField>,
    );
    expect(screen.getByText('help')).toBeInTheDocument();
    rerender(
      <FormField label="N" hint="help" error="bad">
        <input />
      </FormField>,
    );
    expect(screen.queryByText('help')).not.toBeInTheDocument();
    expect(screen.getByText('bad')).toBeInTheDocument();
  });
});

describe('TextInput', () => {
  it('flips border class and aria-invalid when invalid', () => {
    const { rerender, container } = render(<TextInput defaultValue="" />);
    const input = container.querySelector('input')!;
    expect(input.className).toContain('border-line-strong');
    expect(input).not.toHaveAttribute('aria-invalid');
    rerender(<TextInput defaultValue="" invalid />);
    const invalid = container.querySelector('input')!;
    expect(invalid.className).toContain('border-danger-500');
    expect(invalid).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Textarea', () => {
  it('forwards rows and renders base classes', () => {
    const { container } = render(<Textarea rows={4} placeholder="hi" />);
    const ta = container.querySelector('textarea')!;
    expect(ta.rows).toBe(4);
    expect(ta.className).toContain('rounded-lg');
  });
});

describe('DataTable', () => {
  interface Row { id: string; name: string; price: number }
  const columns = [
    { key: 'id', header: 'ID', cell: (r: Row) => r.id },
    { key: 'name', header: 'Name', cell: (r: Row) => r.name },
    { key: 'price', header: 'Price', cell: (r: Row) => r.price, align: 'right' as const },
  ];

  it('renders header, rows, and testids', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: 'a', name: 'Alpha', price: 1 }, { id: 'b', name: 'Beta', price: 2 }]}
        rowKey={(r) => r.id}
        rowTestId={(r) => `row-${r.id}`}
        testId="t"
      />,
    );
    expect(screen.getByTestId('t')).toBeInTheDocument();
    expect(screen.getByTestId('row-a')).toBeInTheDocument();
    expect(screen.getByTestId('row-b')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('renders empty state when no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty="No data"
      />,
    );
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('StatusChip', () => {
  it.each([
    ['neutral', 'bg-paper-deep'],
    ['success', 'bg-sage-100'],
    ['warning', 'bg-clay-100'],
    ['danger', 'text-danger-500'],
    ['accent', 'bg-clay-50'],
  ] as const)('maps tone %s to expected class fragment', (tone, fragment) => {
    const { container } = render(<StatusChip tone={tone}>X</StatusChip>);
    expect((container.firstChild as HTMLElement).className).toContain(fragment);
  });
});
