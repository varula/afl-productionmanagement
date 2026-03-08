import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const efficiencyData = [
  { week: 'W1', efficiency: 86, target: 92 },
  { week: 'W2', efficiency: 88, target: 92 },
  { week: 'W3', efficiency: 87, target: 92 },
  { week: 'W4', efficiency: 90, target: 92 },
  { week: 'W5', efficiency: 89, target: 92 },
  { week: 'W6', efficiency: 91, target: 92 },
  { week: 'W7', efficiency: 90, target: 92 },
  { week: 'W8', efficiency: 93, target: 92 },
];

const outputData = [
  { week: 'W1', output: 42000 },
  { week: 'W2', output: 44200 },
  { week: 'W3', output: 43800 },
  { week: 'W4', output: 46100 },
  { week: 'W5', output: 45500 },
  { week: 'W6', output: 47200 },
  { week: 'W7', output: 46800 },
  { week: 'W8', output: 48620 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground">8-week performance overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Efficiency Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[80, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="target" stroke="hsl(348, 94%, 70%)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="efficiency" stroke="hsl(220, 90%, 64%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(220, 90%, 64%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Weekly Output</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={outputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="output" stroke="hsl(177, 58%, 50%)" fill="hsl(177, 58%, 50%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
