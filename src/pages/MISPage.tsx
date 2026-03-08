import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const misCards = [
  { label: 'Cost Per Piece', value: '$1.84', trend: '↓ 3.2% vs last month', up: true },
  { label: 'SAM Earned vs Available', value: '91.4%', trend: '↑ 1.2% vs last week', up: true },
  { label: 'Revenue / Worker / Day', value: '$15.34', trend: '↑ 2.1% vs target', up: true },
  { label: 'Overtime Hours', value: '342 hrs', trend: '↑ 12% vs last week', up: false },
  { label: 'Turnover Rate', value: '2.4%', trend: '↓ 0.3% vs Feb', up: true },
  { label: 'Capacity Utilization', value: '88.6%', trend: '↑ 1.8% vs plan', up: true },
  { label: 'WIP Value', value: '$124,800', trend: '↓ 5% vs target', up: true },
  { label: 'Order Fulfillment', value: '93.8%', trend: '↑ 1.1% vs Feb', up: true },
];

export default function MISPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple" /> MIS Reports
        </h1>
        <p className="text-sm text-muted-foreground">Management Information System — Key Indicators</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {misCards.map((c, i) => (
          <Card key={c.label} className="border-[1.5px] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-pop-in" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-3.5">
              <p className="text-lg font-extrabold text-foreground">{c.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-0.5">{c.label}</p>
              <p className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${c.up ? 'text-success' : 'text-pink'}`}>
                {c.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {c.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
