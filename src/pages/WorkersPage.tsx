import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const gradeData = [
  { name: 'Grade A', value: 480, color: 'hsl(155, 60%, 54%)' },
  { name: 'Grade B', value: 720, color: 'hsl(220, 90%, 64%)' },
  { name: 'Grade C', value: 420, color: 'hsl(38, 100%, 63%)' },
  { name: 'Grade D', value: 204, color: 'hsl(348, 94%, 70%)' },
];

const floorBreakdown = [
  { floor: 'SF-01', total: 159, present: 153, absent: 6 },
  { floor: 'SF-02', total: 153, present: 147, absent: 6 },
  { floor: 'SF-03', total: 152, present: 144, absent: 8 },
  { floor: 'FF-01', total: 133, present: 128, absent: 5 },
];

export default function WorkersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-purple" /> Worker Management
        </h1>
        <p className="text-sm text-muted-foreground">1,900 registered · 1,824 present today</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Workers', value: '1,900', icon: Users, color: 'border-purple/20' },
          { label: 'Present', value: '1,824', icon: UserCheck, color: 'border-success/20' },
          { label: 'Absent', value: '76', icon: UserX, color: 'border-pink/20' },
          { label: 'Attendance', value: '96.0%', icon: TrendingUp, color: 'border-accent/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Operator Grade Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {gradeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Attendance by Floor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {floorBreakdown.map(f => (
              <div key={f.floor} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                <span className="text-sm font-bold text-foreground w-12">{f.floor}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span className="text-muted-foreground">{f.present}/{f.total} present</span>
                    <span className="font-bold text-foreground">{Math.round((f.present / f.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-success" style={{ width: `${(f.present / f.total) * 100}%` }} />
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-pink/10 text-pink border-pink/30">{f.absent} absent</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
