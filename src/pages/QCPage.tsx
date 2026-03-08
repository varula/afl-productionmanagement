import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const defectTypes = [
  { type: 'Broken Stitch', count: 312 },
  { type: 'Skip Stitch', count: 198 },
  { type: 'Oil Stain', count: 156 },
  { type: 'Uneven Hem', count: 134 },
  { type: 'Puckering', count: 112 },
  { type: 'Wrong Measurement', count: 88 },
];

const dhuTrend = [
  { day: 'Mon', dhu: 2.4 },
  { day: 'Tue', dhu: 2.1 },
  { day: 'Wed', dhu: 2.3 },
  { day: 'Thu', dhu: 1.9 },
  { day: 'Fri', dhu: 2.0 },
  { day: 'Sat', dhu: 2.2 },
];

export default function QCPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-success" /> Quality Control
        </h1>
        <p className="text-sm text-muted-foreground">Today's QC summary</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pass Rate', value: '97.8%', color: 'border-success/20' },
          { label: 'DHU%', value: '2.2%', color: 'border-warning/20' },
          { label: 'Total Checked', value: '48,620', color: 'border-primary/20' },
          { label: 'Defects Found', value: '1,068', color: 'border-pink/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Top Defect Types</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={defectTypes}>
                <XAxis dataKey="type" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(348, 94%, 70%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">DHU% Trend (This Week)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dhuTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 92%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 4]} />
                <Tooltip />
                <Line type="monotone" dataKey="dhu" stroke="hsl(348, 94%, 70%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
