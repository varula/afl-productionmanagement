import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Factory, Plus, Pencil, Trash2, Layers, GitBranch, Shirt, MapPin } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProductCategory = Database['public']['Enums']['product_category'];

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'basic_5pkt_pants_shorts', label: 'Basic 5-Pocket Pants/Shorts' },
  { value: 'fashion_denim_bottoms', label: 'Fashion Denim Bottoms' },
  { value: 'skirts_skorts', label: 'Skirts/Skorts' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'cargo', label: 'Cargo' },
  { value: 'long_short_sleeve_shirts', label: 'Long/Short Sleeve Shirts' },
  { value: 'sleeveless', label: 'Sleeveless' },
  { value: 'vest', label: 'Vest' },
  { value: 'jackets_coats', label: 'Jackets/Coats' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'others', label: 'Others' },
];

// ─── Factories Tab ──────────────────────────────────────────────
function FactoriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const { data: factories = [] } = useQuery({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('factories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from('factories').update({ name, location }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('factories').insert({ name, location });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factories'] }); setOpen(false); toast.success(editId ? 'Factory updated' : 'Factory created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('factories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factories'] }); toast.success('Factory deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setName(''); setLocation(''); setOpen(true); };
  const openEdit = (f: any) => { setEditId(f.id); setName(f.name); setLocation(f.location || ''); setOpen(true); };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{factories.length} factories</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Factory</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factories.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs"><MapPin className="h-3 w-3 inline mr-1" />{f.location || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {factories.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No factories yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Factory</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Floors Tab ──────────────────────────────────────────────
function FloorsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [floorIndex, setFloorIndex] = useState(0);

  const { data: factories = [] } = useQuery({ queryKey: ['factories'], queryFn: async () => { const { data } = await supabase.from('factories').select('id, name').order('name'); return data ?? []; } });
  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('floors').select('*, factories(name)').order('floor_index');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from('floors').update({ name, factory_id: factoryId, floor_index: floorIndex }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('floors').insert({ name, factory_id: factoryId, floor_index: floorIndex });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['floors'] }); setOpen(false); toast.success(editId ? 'Floor updated' : 'Floor created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('floors').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['floors'] }); toast.success('Floor deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setName(''); setFactoryId(factories[0]?.id || ''); setFloorIndex(0); setOpen(true); };
  const openEdit = (f: any) => { setEditId(f.id); setName(f.name); setFactoryId(f.factory_id); setFloorIndex(f.floor_index); setOpen(true); };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{floors.length} floors</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Floor</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Index</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floors.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{f.factories?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.floor_index}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {floors.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No floors yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Floor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Factory *</Label>
              <Select value={factoryId} onValueChange={setFactoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select factory" /></SelectTrigger>
                <SelectContent>{factories.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="e.g. 1st Floor" /></div>
            <div><Label className="text-xs">Floor Index</Label><Input type="number" value={floorIndex} onChange={e => setFloorIndex(parseInt(e.target.value) || 0)} className="mt-1" /></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!name.trim() || !factoryId || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Lines Tab ──────────────────────────────────────────────
function LinesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [floorId, setFloorId] = useState('');
  const [lineNumber, setLineNumber] = useState(1);
  const [type, setType] = useState('sewing');
  const [operatorCount, setOperatorCount] = useState(0);
  const [helperCount, setHelperCount] = useState(0);
  const [machineCount, setMachineCount] = useState(0);
  const [supervisor, setSupervisor] = useState('');
  const [ieName, setIeName] = useState('');

  const { data: floors = [] } = useQuery({ queryKey: ['floors'], queryFn: async () => { const { data } = await supabase.from('floors').select('id, name, factories(name)').order('floor_index'); return data ?? []; } });
  const { data: lines = [] } = useQuery({
    queryKey: ['lines'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lines').select('*, floors(name, factories(name))').order('line_number');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { floor_id: floorId, line_number: lineNumber, type, operator_count: operatorCount, helper_count: helperCount, machine_count: machineCount, supervisor: supervisor || null, ie_name: ieName || null };
      if (editId) {
        const { error } = await supabase.from('lines').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lines').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lines'] }); setOpen(false); toast.success(editId ? 'Line updated' : 'Line created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('lines').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lines'] }); toast.success('Line deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setFloorId(floors[0]?.id || ''); setLineNumber(1); setType('sewing'); setOperatorCount(0); setHelperCount(0); setMachineCount(0); setSupervisor(''); setIeName(''); setOpen(true); };
  const openEdit = (l: any) => { setEditId(l.id); setFloorId(l.floor_id); setLineNumber(l.line_number); setType(l.type || 'sewing'); setOperatorCount(l.operator_count); setHelperCount(l.helper_count); setMachineCount(l.machine_count); setSupervisor(l.supervisor || ''); setIeName(l.ie_name || ''); setOpen(true); };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{lines.length} lines</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead className="text-right">Operators</TableHead>
                  <TableHead className="text-right">Helpers</TableHead>
                  <TableHead className="text-right">Machines</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.line_number}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{l.type || 'sewing'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.floors?.name}</TableCell>
                    <TableCell className="text-right">{l.operator_count}</TableCell>
                    <TableCell className="text-right">{l.helper_count}</TableCell>
                    <TableCell className="text-right">{l.machine_count}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.supervisor || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No lines yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Line</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Floor *</Label>
              <Select value={floorId} onValueChange={setFloorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select floor" /></SelectTrigger>
                <SelectContent>{(floors as any[]).map(f => <SelectItem key={f.id} value={f.id}>{f.factories?.name} — {f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Line Number *</Label><Input type="number" min={1} value={lineNumber} onChange={e => setLineNumber(parseInt(e.target.value) || 1)} className="mt-1" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sewing">Sewing</SelectItem>
                  <SelectItem value="cutting">Cutting</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Operators</Label><Input type="number" min={0} value={operatorCount || ''} onChange={e => setOperatorCount(parseInt(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">Helpers</Label><Input type="number" min={0} value={helperCount || ''} onChange={e => setHelperCount(parseInt(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">Machines</Label><Input type="number" min={0} value={machineCount || ''} onChange={e => setMachineCount(parseInt(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">Supervisor</Label><Input value={supervisor} onChange={e => setSupervisor(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">IE Name</Label><Input value={ieName} onChange={e => setIeName(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!floorId || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Styles Tab ──────────────────────────────────────────────
function StylesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [styleNo, setStyleNo] = useState('');
  const [buyer, setBuyer] = useState('');
  const [smv, setSmv] = useState(0);
  const [sam, setSam] = useState(0);
  const [opCount, setOpCount] = useState(0);
  const [targetEff, setTargetEff] = useState(60);
  const [category, setCategory] = useState<ProductCategory>('others');

  const { data: styles = [] } = useQuery({
    queryKey: ['styles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('styles').select('*').order('style_no');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { style_no: styleNo, buyer, smv, sam, operation_count: opCount, target_efficiency: targetEff, product_category: category };
      if (editId) {
        const { error } = await supabase.from('styles').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('styles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['styles'] }); setOpen(false); toast.success(editId ? 'Style updated' : 'Style created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('styles').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['styles'] }); toast.success('Style deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setStyleNo(''); setBuyer(''); setSmv(0); setSam(0); setOpCount(0); setTargetEff(60); setCategory('others'); setOpen(true); };
  const openEdit = (s: any) => { setEditId(s.id); setStyleNo(s.style_no); setBuyer(s.buyer); setSmv(Number(s.smv)); setSam(Number(s.sam)); setOpCount(s.operation_count); setTargetEff(Number(s.target_efficiency)); setCategory(s.product_category); setOpen(true); };

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{styles.length} styles</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Style</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style No</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">SMV</TableHead>
                  <TableHead className="text-right">SAM</TableHead>
                  <TableHead className="text-right">Ops</TableHead>
                  <TableHead className="text-right">Target Eff%</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {styles.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.style_no}</TableCell>
                    <TableCell>{s.buyer}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{s.product_category.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{Number(s.smv).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(s.sam).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{s.operation_count}</TableCell>
                    <TableCell className="text-right">{Number(s.target_efficiency)}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {styles.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No styles yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Style</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Style No *</Label><Input value={styleNo} onChange={e => setStyleNo(e.target.value)} className="mt-1" placeholder="e.g. ST-2026-001" /></div>
            <div><Label className="text-xs">Buyer *</Label><Input value={buyer} onChange={e => setBuyer(e.target.value)} className="mt-1" placeholder="e.g. H&M" /></div>
            <div className="col-span-2"><Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as ProductCategory)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">SMV *</Label><Input type="number" step={0.01} min={0} value={smv || ''} onChange={e => setSmv(parseFloat(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">SAM *</Label><Input type="number" step={0.01} min={0} value={sam || ''} onChange={e => setSam(parseFloat(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">Operation Count</Label><Input type="number" min={0} value={opCount || ''} onChange={e => setOpCount(parseInt(e.target.value) || 0)} className="mt-1" /></div>
            <div><Label className="text-xs">Target Efficiency %</Label><Input type="number" min={0} max={100} value={targetEff} onChange={e => setTargetEff(parseFloat(e.target.value) || 0)} className="mt-1" /></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!styleNo.trim() || !buyer.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function FactorySetupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Factory className="h-5 w-5 text-primary" /> Factory Setup
        </h1>
        <p className="text-sm text-muted-foreground">Manage factories, floors, lines, and styles</p>
      </div>

      <Tabs defaultValue="factories" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="factories" className="text-xs gap-1"><Factory className="h-3.5 w-3.5" /> Factories</TabsTrigger>
          <TabsTrigger value="floors" className="text-xs gap-1"><Layers className="h-3.5 w-3.5" /> Floors</TabsTrigger>
          <TabsTrigger value="lines" className="text-xs gap-1"><GitBranch className="h-3.5 w-3.5" /> Lines</TabsTrigger>
          <TabsTrigger value="styles" className="text-xs gap-1"><Shirt className="h-3.5 w-3.5" /> Styles</TabsTrigger>
        </TabsList>
        <TabsContent value="factories"><FactoriesTab /></TabsContent>
        <TabsContent value="floors"><FloorsTab /></TabsContent>
        <TabsContent value="lines"><LinesTab /></TabsContent>
        <TabsContent value="styles"><StylesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
