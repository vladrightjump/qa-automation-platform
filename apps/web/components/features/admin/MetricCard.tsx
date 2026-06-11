import Card from '@/components/ui/Card';

interface MetricCardProps {
  label: string;
  value: string;
  testId: string;
}

export default function MetricCard({ label, value, testId }: MetricCardProps) {
  return (
    <Card data-testid={testId}>
      <p className="text-[12.5px] text-ink-soft">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{value}</p>
    </Card>
  );
}
