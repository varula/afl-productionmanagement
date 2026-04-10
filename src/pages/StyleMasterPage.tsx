import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Eye, PenLine, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_CATEGORIES = [
  'basic_5pkt_pants_shorts', 'fashion_denim_bottoms', 'skirts_skorts', 'carpenter', 'cargo',
  'long_short_sleeve_shirts', 'sleeveless', 'vest', 'jackets_coats', 'dresses', 'others'
];

const emptyForm = { style_no: '', buyer: '', smv: 0, sam: 0, operation_count: 0, target_efficiency: 60, product_category: 'others' as string };

export default function StyleMasterPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['styles-master'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.style_no || !form.buyer) throw new Error('Style # and buyer required');
      const payload = {
        style_no: form.style_no, buyer: form.buyer, smv: form.smv, sam: form.sam,
        operation_count: form.operation_count, target_efficiency: form.target_efficiency,
        product_category: form.product_category as any,
      };
      if (editId) {
        const { error } = await supabase.from('styles').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('styles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles-master'] });
      setDialogOpen(false);
      toast.success(editId ? 'Style updated' : 'Style created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('styles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['styles-master'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ style_no: s.style_no, buyer: s.buyer, smv: s.smv, sam: s.sam, operation_count: s.operation_count, target_efficiency: s.target_efficiency, product_category: s.product_category });
    setDialogOpen(true);
  };

  const filtered = styles.filter((s: any) => {
    if (!searchTerm) return true;
    return s.style_no.toLowerCase().includes(searchTerm.toLowerCase()) || s.buyer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const buyers = [...new Set(styles.map((s: any) => s.buyer))];
  const avgSmv = styles.length > 0 ? (styles.reduce((a: number, s: any) => a + s.smv, 0) / styles.length).toFixed(1) : '0';

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Style Master</h1>
            <p className="text-xs text-muted-foreground">Manage garment styles, SMV, and targets</p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="view" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</TabsTrigger>
          <TabsTrigger value="entry" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Entry</TabsTrigger>
        </TabsList>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Styles', value: styles.length, color: 'text-foreground' },
          { label: 'Buyers', value: buyers.length, color: 'text-primary' },
          { label: 'Avg SMV', value: avgSmv, color: 'text-warning' },
          { label: 'Categories', value: [...new Set(styles.map((s: any) => s.product_category))].length, color: 'text-success' },
        ].map(s => (
          <Card key={s.label} className="border-[1.5px]"><CardContent className="p-3"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <TabsContent value="view" className="space-y-4 mt-0">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search style or buyer…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Card className="border-[1.5px]"><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Style #</TableHead>
                <TableHead className="text-xs">Buyer</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">SMV</TableHead>
                <TableHead className="text-xs text-right">SAM</TableHead>
                <TableHead className="text-xs text-right">Operations</TableHead>
                <TableHead className="text-xs text-right">Target Eff%</TableHead>
                <TableHead className="text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm py-8 text-muted-foreground">No styles found</TableCell></TableRow>
              ) : filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-medium">{s.style_no}</TableCell>
                  <TableCell className="text-xs">{s.buyer}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.product_category.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-right">{s.smv}</TableCell>
                  <TableCell className="text-xs text-right">{s.sam}</TableCell>
                  <TableCell className="text-xs text-right">{s.operation_count}</TableCell>
                  <TableCell className="text-xs text-right">{s.target_efficiency}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="entry" className="mt-0">
        <Card className="border-[1.5px]"><CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Add Style</h2>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Style</Button>
          </div>
        </CardContent></Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Style</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Style #</Label>
                <Input value={form.style_no} onChange={e => setForm(f => ({ ...f, style_no: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer</Label>
                <Input value={form.buyer} onChange={e => setForm(f => ({ ...f, buyer: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SMV</Label>
                <Input type="number" step="0.01" value={form.smv} onChange={e => setForm(f => ({ ...f, smv: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SAM</Label>
                <Input type="number" step="0.01" value={form.sam} onChange={e => setForm(f => ({ ...f, sam: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Operations</Label>
                <Input type="number" value={form.operation_count} onChange={e => setForm(f => ({ ...f, operation_count: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Efficiency %</Label>
                <Input type="number" value={form.target_efficiency} onChange={e => setForm(f => ({ ...f, target_efficiency: +e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Product Category</Label>
                <Select value={form.product_category} onValueChange={v => setForm(f => ({ ...f, product_category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
