import { Line } from 'react-chartjs-2';
import type { MetricPoint } from '../../api/simulations';

interface Props {
  metrics: MetricPoint[];
  field: keyof Omit<MetricPoint, 'timestamp'>;
  label: string;
  color: string;
  unit: string;
}

export default function MetricsChart({ metrics, field, label, color, unit }: Props) {
  const labels = metrics.map((m) => `${m.timestamp}s`);
  const values = metrics.map((m) => m[field] as number);

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <p className="text-xs text-gray-400 font-medium mb-2">
        {label}
        <span className="text-gray-600 ml-1">({unit})</span>
      </p>
      <div style={{ height: '140px' }}>
        <Line
          data={{
            labels,
            datasets: [
              {
                data: values,
                borderColor: color,
                backgroundColor: `${color}20`,
                borderWidth: 1.5,
                pointRadius: 0,
                fill: true,
                tension: 0.3,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${(ctx.parsed.y as number).toFixed(2)} ${unit}`,
                },
              },
            },
            scales: {
              x: {
                ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 8 },
                grid: { color: '#1f2937' },
              },
              y: {
                ticks: { color: '#6b7280', font: { size: 9 } },
                grid: { color: '#1f2937' },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
