import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Layers, Users, Cpu, Eye, PenLine } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { toast } from 'sonner';

const statusBadge = (eff: number) =>
  eff >= 90
    ? <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">Running</Badge>
    : eff >= 80
    ? <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">At Risk</Badge>
    : <Badge variant="outline" className="text-[10px] bg-pink/15 text-pink border-pink/30">Delayed</Badge>;

export default function FloorsPage() {
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Entry form
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [lineNumber, setLineNumber] = useState(1);
  const [lineType, setLineType] = useState('sewing');
  const [operatorCount, setOperatorCount] = useState(0);
  const [machineCount, setMachineCount] = useState(0);
  const [helperCount, setHelperCount] = useState(0);

  const { data: floors = [] } = useQuery({
    queryKey: ['floors-page', factoryId],
    queryFn: async () => {
      let query = supabase.from('floors').select('id, name, floor_index, lines(id, line_number, type, operator_count, helper_count, machine_count, is_active, supervisor)').order('floor_index');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['floors-plans', today, factoryId],
    queryFn: async () => {
      let query = supabase.from('production_plans').select('id, line_id, target_qty, styles(style_no, buyer)').eq('date', today);
      // Filter by factory if we have floor IDs
      if (factoryId) {
        const { data: floorData } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
        if (floorData && floorData.length > 0) {
          const { data: lineData } = await supabase.from('lines').select('id').in('floor_id', floorData.map(f => f.id));
          if (lineData && lineData.length > 0) {
            query = query.in('line_id', lineData.map(l => l.id));
          }
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const planIds = plans.map((p: any) => p.id);
  const { data: hourly = [] } = useQuery({
    queryKey: ['floors-hourly', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase.from('hourly_production').select('plan_id, produced_qty').in('plan_id', planIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: planIds.length > 0,
  });

  const lineOutputMap = useMemo(() => {
    const planByLine = new Map<string, { planId: string; target: number; style: string }>();
    for (const p of plans as any[]) planByLine.set(p.line_id, { planId: p.id, target: p.target_qty, style: `${p.styles?.style_no} (${p.styles?.buyer})` });
    const outputByPlan = new Map<string, number>();
    for (const h of hourly) outputByPlan.set(h.plan_id, (outputByPlan.get(h.plan_id) ?? 0) + h.produced_qty);
    const result = new Map<string, { output: number; target: number; style: string; efficiency: number }>();
    for (const [lineId, plan] of planByLine) {
      const output = outputByPlan.get(plan.planId) ?? 0;
      result.set(lineId, { output, target: plan.target, style: plan.style, efficiency: plan.target > 0 ? Math.round((output / plan.target) * 100) : 0 });
    }
    return result;
  }, [plans, hourly]);

  const floorData = useMemo(() => {
    return (floors as any[]).map(floor => ({
      name: floor.name, key: `fl-${floor.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`, floorId: floor.id,
      lines: ((floor.lines || []) as any[]).filter((l: any) => l.is_active).sort((a: any, b: any) => a.line_number - b.line_number).map((line: any) => {
        const live = lineOutputMap.get(line.id);
        return { id: line.id, num: line.line_number, type: line.type, style: live?.style || 'No plan', operators: line.operator_count, helpers: line.helper_count, machines: line.machine_count, efficiency: live?.efficiency ?? 0, status: live ? (live.efficiency >= 90 ? 'running' : live.efficiency >= 80 ? 'at_risk' : 'delayed') : 'idle' };
      }),
    }));
  }, [floors, lineOutputMap]);

  const filteredFloors = useMemo(() => {
    if (!activeFilter || activeFilter === 'fl-all') return floorData;
    if (activeFilter === 'lstat-running') return floorData.map(f => ({ ...f, lines: f.lines.filter(l => l.status === 'running') })).filter(f => f.lines.length > 0);
    if (activeFilter === 'lstat-delayed') return floorData.map(f => ({ ...f, lines: f.lines.filter(l => l.status === 'delayed' || l.status === 'at_risk') })).filter(f => f.lines.length > 0);
    const match = floorData.find(f => f.key === activeFilter || `fl-${f.name.toLowerCase().replace(/[-\s]/g, '')}` === activeFilter);
    if (match) return [match];
    const byId = floorData.find(f => activeFilter === `fl-floor-${f.floorId}`);
    if (byId) return [byId];
    return floorData;
  }, [activeFilter, floorData]);

  const addLineMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lines').insert({
        floor_id: selectedFloorId, line_number: lineNumber, type: lineType,
        operator_count: operatorCount, machine_count: machineCount, helper_count: helperCount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors-page'] });
      toast.success('Line added');
      setLineNumber(prev => prev + 1); setOperatorCount(0); setMachineCount(0); setHelperCount(0);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Floors & Lines</h1>
          <p className="text-sm text-muted-foreground">{filteredFloors.length} floor{filteredFloors.length !== 1 ? 's' : ''} · {filteredFloors.reduce((s, f) => s + f.lines.length, 0)} lines shown</p>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        {filteredFloors.map((floor, fi) => (
          <Card key={floor.name} className="border-[1.5px] animate-pop-in" style={{ animationDelay: `${fi * 80}ms` }}>
            <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">{floor.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {floor.lines.map(line => (
                  <div key={line.id} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{line.type === 'cutting' ? 'Table' : 'Line'} {line.num}</span>
                      {statusBadge(line.efficiency)}
                    </div>
                    <p className="text-xs text-muted-foreground">{line.style}</p>
                    <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {line.operators}+{line.helpers}</span>
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {line.machines}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(100, line.efficiency)} className="h-1.5 flex-1" />
                      <span className={`text-xs font-bold ${line.efficiency >= 90 ? 'text-success' : line.efficiency >= 80 ? 'text-warning' : 'text-pink'}`}>{line.efficiency}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredFloors.length === 0 && (
          <Card className="border-[1.5px]"><CardContent className="py-8 text-center text-muted-foreground text-sm">No floors match this filter</CardContent></Card>
        )}
      </TabsContent>

      <TabsContent value="entry" className="space-y-4 mt-0">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Add New Line</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Floor</Label>
                <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                  <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                  <SelectContent>
                    {(floors as any[]).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Line Number</Label>
                <Input type="number" value={lineNumber} onChange={e => setLineNumber(Number(e.target.value))} min={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select value={lineType} onValueChange={setLineType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sewing">Sewing</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                    <SelectItem value="cutting">Cutting</SelectItem>
                    <SelectItem value="auxiliary">Auxiliary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Operators</Label>
                <Input type="number" value={operatorCount} onChange={e => setOperatorCount(Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Helpers</Label>
                <Input type="number" value={helperCount} onChange={e => setHelperCount(Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Machines</Label>
                <Input type="number" value={machineCount} onChange={e => setMachineCount(Number(e.target.value))} min={0} />
              </div>
            </div>
            <Button className="mt-4" onClick={() => addLineMutation.mutate()} disabled={!selectedFloorId || addLineMutation.isPending}>
              {addLineMutation.isPending ? 'Saving...' : 'Add Line'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
