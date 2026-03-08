import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Layers, Users, Cpu } from 'lucide-react';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const demoFloors = [
  {
    name: 'Sewing Floor 1 (SF-01)', key: 'fl-sf01', lines: [
      { num: 1, style: 'Gap Fleece Hoodie', operators: 45, helpers: 8, machines: 42, efficiency: 96, status: 'running' },
      { num: 2, style: 'Cubus Cardigan', operators: 42, helpers: 6, machines: 40, efficiency: 91, status: 'running' },
      { num: 3, style: 'Cubus Cardigan', operators: 40, helpers: 7, machines: 38, efficiency: 89, status: 'delayed' },
    ]
  },
  {
    name: 'Sewing Floor 2 (SF-02)', key: 'fl-sf02', lines: [
      { num: 4, style: 'Gap Fleece Hoodie', operators: 44, helpers: 8, machines: 41, efficiency: 94, status: 'running' },
      { num: 5, style: 'Lager 157 Blouse', operators: 43, helpers: 7, machines: 40, efficiency: 93, status: 'running' },
      { num: 6, style: 'Lager 157 Blouse', operators: 41, helpers: 6, machines: 39, efficiency: 88, status: 'delayed' },
    ]
  },
  {
    name: 'Sewing Floor 3 (SF-03)', key: 'fl-sf03', lines: [
      { num: 7, style: 'Lager 157 Blouse', operators: 43, helpers: 7, machines: 40, efficiency: 92, status: 'running' },
      { num: 8, style: 'ZXY Sport Legging', operators: 38, helpers: 5, machines: 36, efficiency: 74, status: 'delayed' },
      { num: 9, style: 'UCB Polo Shirt', operators: 44, helpers: 7, machines: 41, efficiency: 92, status: 'running' },
    ]
  },
  {
    name: 'Finishing Floor (FF-01)', key: 'fl-ff01', lines: [
      { num: 10, style: 'Gap Chino Trouser', operators: 35, helpers: 10, machines: 30, efficiency: 85, status: 'delayed' },
      { num: 11, style: 'Gap Chino Trouser', operators: 36, helpers: 10, machines: 31, efficiency: 90, status: 'running' },
      { num: 12, style: 'UCB Polo Shirt', operators: 34, helpers: 8, machines: 30, efficiency: 88, status: 'running' },
    ]
  },
];

const statusBadge = (s: string) =>
  s === 'running'
    ? <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">Running</Badge>
    : <Badge variant="outline" className="text-[10px] bg-pink/15 text-pink border-pink/30">Delayed</Badge>;

export default function FloorsPage() {
  const activeFilter = useActiveFilter();

  const filteredFloors = useMemo(() => {
    if (!activeFilter || activeFilter === 'fl-all') return demoFloors;

    // Floor filter
    const floorMatch = demoFloors.find(f => f.key === activeFilter);
    if (floorMatch) return [floorMatch];

    // Status filter
    if (activeFilter === 'lstat-running' || activeFilter === 'lstat-delayed' || activeFilter === 'lstat-qchold') {
      const statusKey = activeFilter === 'lstat-running' ? 'running' : 'delayed';
      return demoFloors.map(f => ({
        ...f,
        lines: f.lines.filter(l => l.status === statusKey),
      })).filter(f => f.lines.length > 0);
    }

    return demoFloors;
  }, [activeFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Floors & Lines
        </h1>
        <p className="text-sm text-muted-foreground">
          {filteredFloors.length} floor{filteredFloors.length !== 1 ? 's' : ''} · {filteredFloors.reduce((s, f) => s + f.lines.length, 0)} lines shown
        </p>
      </div>

      {filteredFloors.map((floor, fi) => (
        <Card key={floor.name} className="border-[1.5px] animate-pop-in" style={{ animationDelay: `${fi * 80}ms` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-bold">{floor.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {floor.lines.map(line => (
                <div key={line.num} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Line {line.num}</span>
                    {statusBadge(line.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{line.style}</p>
                  <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {line.operators}+{line.helpers}</span>
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {line.machines}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={line.efficiency} className="h-1.5 flex-1" />
                    <span className={`text-xs font-bold ${line.efficiency >= 90 ? 'text-success' : line.efficiency >= 80 ? 'text-warning' : 'text-pink'}`}>
                      {line.efficiency}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredFloors.length === 0 && (
        <Card className="border-[1.5px]">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">No floors match this filter</CardContent>
        </Card>
      )}
    </div>
  );
}
