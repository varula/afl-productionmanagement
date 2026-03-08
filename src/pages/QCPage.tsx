import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const defectTypes = [
  { type: 'Broken Stitch', key: 'qcd-stitchskip', count: 312, floor: 'SF-01' },
  { type: 'Skip Stitch', key: 'qcd-stitchskip', count: 198, floor: 'SF-02' },
  { type: 'Oil Stain', key: 'qcd-shade', count: 156, floor: 'SF-01' },
  { type: 'Uneven Hem', key: 'qcd-measurement', count: 134, floor: 'SF-03' },
  { type: 'Puckering', key: 'qcd-thread', count: 112, floor: 'SF-02' },
  { type: 'Wrong Measurement', key: 'qcd-measurement', count: 88, floor: 'FF-01' },
];

const inspections = [
  { id: 1, line: 'Line 1', floor: 'SF-01', floorKey: 'qcf-sf01', checked: 4280, defects: 68, status: 'passed' },
  { id: 2, line: 'Line 2', floor: 'SF-01', floorKey: 'qcf-sf01', checked: 3640, defects: 76, status: 'passed' },
  { id: 3, line: 'Line 3', floor: 'SF-01', floorKey: 'qcf-sf01', checked: 3560, defects: 114, status: 'failed' },
  { id: 4, line: 'Line 5', floor: 'SF-02', floorKey: 'qcf-sf02', checked: 3720, defects: 74, status: 'passed' },
  { id: 5, line: 'Line 6', floor: 'SF-02', floorKey: 'qcf-sf02', checked: 3520, defects: 99, status: 'failed' },
  { id: 6, line: 'Line 8', floor: 'SF-03', floorKey: 'qcf-sf03', checked: 2960, defects: 192, status: 'failed' },
  { id: 7, line: 'Line 9', floor: 'SF-03', floorKey: 'qcf-sf03', checked: 3680, defects: 70, status: 'passed' },
  { id: 8, line: 'Line 10', floor: 'FF-01', floorKey: 'qcf-ff01', checked: 3400, defects: 129, status: 'pending' },
  { id: 9, line: 'Line 11', floor: 'FF-01', floorKey: 'qcf-ff01', checked: 3600, defects: 72, status: 'passed' },
  { id: 10, line: 'Line 12', floor: 'FF-01', floorKey: 'qcf-ff01', checked: 3520, defects: 88, status: 'on_hold' },
];

const dhuTrend = [
  { day: 'Mon', dhu: 2.4 }, { day: 'Tue', dhu: 2.1 }, { day: 'Wed', dhu: 2.3 },
  { day: 'Thu', dhu: 1.9 }, { day: 'Fri', dhu: 2.0 }, { day: 'Sat', dhu: 2.2 },
];

const statusColors: Record<string, string> = {
  passed: 'bg-success/15 text-success border-success/30',
  failed: 'bg-pink/15 text-pink border-pink/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  on_hold: 'bg-purple/15 text-purple border-purple/30',
};

export default function QCPage() {
  const activeFilter = useActiveFilter();

  const filteredInspections = useMemo(() => {
    if (!activeFilter || activeFilter === 'qc-all' || activeFilter === 'qc-today') return inspections;
    if (activeFilter === 'qc-pending') return inspections.filter(i => i.status === 'pending');
    if (activeFilter === 'qc-failed') return inspections.filter(i => i.status === 'failed');
    if (activeFilter === 'qc-passed') return inspections.filter(i => i.status === 'passed');
    if (activeFilter === 'qc-hold') return inspections.filter(i => i.status === 'on_hold');
    // Floor filter
    const floorKey = activeFilter;
    return inspections.filter(i => i.floorKey === floorKey);
  }, [activeFilter]);

  const totalChecked = filteredInspections.reduce((s, i) => s + i.checked, 0);
  const totalDefects = filteredInspections.reduce((s, i) => s + i.defects, 0);
  const dhu = totalChecked > 0 ? ((totalDefects / totalChecked) * 100).toFixed(1) : '0.0';
  const passRate = totalChecked > 0 ? (((totalChecked - totalDefects) / totalChecked) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-success" /> Quality Control
        </h1>
        <p className="text-sm text-muted-foreground">{filteredInspections.length} inspections shown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pass Rate', value: `${passRate}%`, color: 'border-success/20' },
          { label: 'DHU%', value: `${dhu}%`, color: 'border-warning/20' },
          { label: 'Total Checked', value: totalChecked.toLocaleString(), color: 'border-primary/20' },
          { label: 'Defects Found', value: totalDefects.toLocaleString(), color: 'border-pink/20' },
        ].map(s => (
          <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
              <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inspections list */}
      <Card className="border-[1.5px]">
        <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Inspections</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Line</th>
                  <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Floor</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Checked</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Defects</th>
                  <th className="text-right py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">DHU%</th>
                  <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp, i) => (
                  <tr key={insp.id} className="border-b border-border/50 hover:bg-muted/30 animate-pop-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="py-2.5 px-3 font-bold text-foreground">{insp.line}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{insp.floor}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{insp.checked.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">{insp.defects}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{((insp.defects / insp.checked) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[insp.status] || ''}`}>{insp.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredInspections.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No inspections match this filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
