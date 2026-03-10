import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, UserCheck, UserX, PenLine, Eye, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActiveFilter, useFactoryId } from '@/hooks/useActiveFilter';
import { toast } from 'sonner';

const DESIGNATIONS = [
  'Operator', 'Helper', 'Cleaner', 'Sweeper', 'Office Boy', 'Driver',
  'Supervisor', 'Line Chief', 'Manager', 'Sr. Executive', 'Executive',
  'Fire Safety Officer', 'Welfare Officer', 'Baby Sitter', 'Canteen Boy',
  'Site Asst.', 'Personal', 'Mechanic', 'Quality Inspector', 'Iron Man', 'Other'
];

const EXPERTISE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function WorkersPage() {
  const activeFilter = useActiveFilter();
  const factoryId = useFactoryId();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [grade, setGrade] = useState<string>('C');
  const [lineId, setLineId] = useState<string>('');
  const [designation, setDesignation] = useState('Operator');
  const [salary, setSalary] = useState('');
  const [operationsCount, setOperationsCount] = useState('');
  const [expertiseLevel, setExpertiseLevel] = useState('Beginner');
  const [joinDate, setJoinDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: operators = [] } = useQuery({
    queryKey: ['workers-operators', factoryId],
    queryFn: async () => {
      let query = supabase
        .from('operators')
        .select('id, name, employee_no, grade, is_active, line_id, joined_at, designation, salary, operations_count, expertise_level, lines(line_number, type, floor_id, floors(name))')
        .order('employee_no');

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
    enabled: !!factoryId,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['workers-floors', factoryId],
    queryFn: async () => {
      let query = supabase.from('floors').select('id, name').order('floor_index');
      if (factoryId) query = query.eq('factory_id', factoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['workers-lines', factoryId],
    queryFn: async () => {
      const { data: floorData } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floorData?.length) return [];
      const { data, error } = await supabase.from('lines').select('id, line_number, type, floors(name)').in('floor_id', floorData.map(f => f.id)).eq('is_active', true).order('line_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('operators').insert({
        name,
        employee_no: employeeNo,
        grade: grade as any,
        factory_id: factoryId,
        line_id: lineId || null,
        designation,
        salary: salary ? Number(salary) : 0,
        operations_count: operationsCount ? Number(operationsCount) : 0,
        expertise_level: expertiseLevel,
        joined_at: joinDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-operators'] });
      toast.success('Operator added');
      setName(''); setEmployeeNo(''); setGrade('C'); setLineId('');
      setDesignation('Operator'); setSalary(''); setOperationsCount('');
      setExpertiseLevel('Beginner'); setJoinDate('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const gradeData = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const op of operators as any[]) counts[op.grade] = (counts[op.grade] ?? 0) + 1;
    return [
      { name: 'Grade A', value: counts.A, color: 'hsl(155, 60%, 54%)' },
      { name: 'Grade B', value: counts.B, color: 'hsl(220, 90%, 64%)' },
      { name: 'Grade C', value: counts.C, color: 'hsl(38, 100%, 63%)' },
      { name: 'Grade D', value: counts.D, color: 'hsl(348, 94%, 70%)' },
    ].filter(d => d.value > 0);
  }, [operators]);

  const floorBreakdown = useMemo(() => {
    return floors.map((floor: any) => {
      const floorOps = (operators as any[]).filter(op => (op.lines as any)?.floors?.name === floor.name);
      const total = floorOps.length;
      const active = floorOps.filter(op => op.is_active).length;
      const absent = Math.max(0, total - active);
      return { floor: floor.name, key: `wk-${floor.name.toLowerCase().replace(/[-\s]/g, '')}`, total, present: active, absent };
    });
  }, [floors, operators]);

  const filtered = useMemo(() => {
    if (!activeFilter || activeFilter === 'wk-all') return floorBreakdown;
    const match = floorBreakdown.filter(f => f.key === activeFilter);
    return match.length > 0 ? match : floorBreakdown;
  }, [activeFilter, floorBreakdown]);

  const filteredOperators = useMemo(() => {
    if (!searchTerm) return operators as any[];
    const term = searchTerm.toLowerCase();
    return (operators as any[]).filter(op =>
      op.name?.toLowerCase().includes(term) ||
      op.employee_no?.toLowerCase().includes(term) ||
      op.designation?.toLowerCase().includes(term)
    );
  }, [operators, searchTerm]);

  const totalWorkers = filtered.reduce((s, f) => s + f.total, 0);
  const totalPresent = filtered.reduce((s, f) => s + f.present, 0);
  const totalAbsent = filtered.reduce((s, f) => s + f.absent, 0);
  const attendance = totalWorkers > 0 ? ((totalPresent / totalWorkers) * 100).toFixed(1) : '0.0';

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-purple" /> Worker Management
          </h1>
          <p className="text-sm text-muted-foreground">{totalWorkers.toLocaleString()} registered · {totalPresent.toLocaleString()} present today</p>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Workers', value: totalWorkers.toLocaleString(), icon: Users, color: 'border-purple/20' },
            { label: 'Present', value: totalPresent.toLocaleString(), icon: UserCheck, color: 'border-success/20' },
            { label: 'Absent', value: totalAbsent.toLocaleString(), icon: UserX, color: 'border-pink/20' },
            { label: 'Attendance', value: `${attendance}%`, icon: TrendingUp, color: 'border-accent/20' },
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
              {filtered.map(f => (
                <div key={f.floor} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                  <span className="text-sm font-bold text-foreground w-12">{f.floor}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-muted-foreground">{f.present}/{f.total} present</span>
                      <span className="font-bold text-foreground">{f.total > 0 ? Math.round((f.present / f.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success" style={{ width: `${f.total > 0 ? (f.present / f.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-pink/10 text-pink border-pink/30">{f.absent} absent</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Full Directory Table */}
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-bold">Worker Directory ({filteredOperators.length})</CardTitle>
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name, ID, designation..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-10">SL.#</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Emp. ID</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Name</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Designation</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Line</th>
                    <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Grade</th>
                    <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Expertise</th>
                    <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ops</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Join Date</th>
                    <th className="text-right py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Salary</th>
                    <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperators.map((op: any, i: number) => (
                    <tr key={op.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                      <td className="py-1.5 px-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-xs text-foreground font-medium">{op.employee_no}</td>
                      <td className="py-1.5 px-2 font-medium text-foreground text-xs">{op.name}</td>
                      <td className="py-1.5 px-2 text-xs text-muted-foreground uppercase">{op.designation || 'Operator'}</td>
                      <td className="py-1.5 px-2 text-xs text-muted-foreground">
                        {op.lines ? `${(op.lines as any).type === 'cutting' ? 'Table' : 'Line'} ${(op.lines as any).line_number}` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <Badge variant="outline" className="text-[10px]">{op.grade}</Badge>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <Badge variant="outline" className={`text-[10px] ${
                          op.expertise_level === 'Expert' ? 'bg-success/15 text-success border-success/30' :
                          op.expertise_level === 'Advanced' ? 'bg-accent/15 text-accent border-accent/30' :
                          op.expertise_level === 'Intermediate' ? 'bg-warning/15 text-warning border-warning/30' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {op.expertise_level || 'Beginner'}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-2 text-center text-xs font-medium text-foreground">{op.operations_count || 0}</td>
                      <td className="py-1.5 px-2 text-xs text-muted-foreground">{op.joined_at || '—'}</td>
                      <td className="py-1.5 px-2 text-right text-xs font-medium text-foreground">{op.salary ? Number(op.salary).toLocaleString() : '—'}</td>
                      <td className="py-1.5 px-2 text-center">
                        <Badge variant="outline" className={`text-[10px] ${op.is_active ? 'bg-success/15 text-success border-success/30' : 'bg-pink/15 text-pink border-pink/30'}`}>
                          {op.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filteredOperators.length === 0 && (
                    <tr><td colSpan={11} className="py-8 text-center text-sm text-muted-foreground">No workers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="entry" className="space-y-4 mt-0">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Add New Worker</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ahmed Khan" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Employee ID</Label>
                <Input value={employeeNo} onChange={e => setEmployeeNo(e.target.value)} placeholder="e.g. 1001" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Designation</Label>
                <Select value={designation} onValueChange={setDesignation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Assign to Line</Label>
                <Select value={lineId} onValueChange={setLineId}>
                  <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                  <SelectContent>
                    {(lines as any[]).map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.type === 'cutting' ? 'Table' : 'Line'} {l.line_number} — {(l.floors as any)?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Expertise Level</Label>
                <Select value={expertiseLevel} onValueChange={setExpertiseLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPERTISE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Operations Can Handle</Label>
                <Input type="number" value={operationsCount} onChange={e => setOperationsCount(e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Join Date</Label>
                <Input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Salary</Label>
                <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. 8198" />
              </div>
            </div>
            <Button className="mt-4" onClick={() => addMutation.mutate()} disabled={!name || !employeeNo || addMutation.isPending}>
              {addMutation.isPending ? 'Saving...' : 'Add Worker'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
