import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { DocumentTypeConfig } from '@/lib/mis-form-configs';
import { MISDocumentForm } from '@/components/mis/MISDocumentForm';
import { useFactoryId } from '@/hooks/useActiveFilter';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LucideIcon } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  approved: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
};

interface MISSectionPageProps {
  sectionKey: string;
  sectionLabel: string;
  sectionIcon: LucideIcon;
  configs: DocumentTypeConfig[];
}

export default function MISSectionPage({ sectionKey, sectionLabel, sectionIcon: Icon, configs }: MISSectionPageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const factoryId = useFactoryId();

  const [activeDoc, setActiveDoc] = useState<DocumentTypeConfig>(configs[0]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: styles = [] } = useQuery({
    queryKey: ['mis-styles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('styles').select('id, style_no, buyer').order('style_no');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['mis-lines', factoryId],
    queryFn: async () => {
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors || floors.length === 0) return [];
      const { data, error } = await supabase
        .from('lines')
        .select('id, line_number, floor_id, floors(name)')
        .in('floor_id', floors.map(f => f.id))
        .eq('is_active', true)
        .order('line_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['mis-documents', sectionKey, activeDoc.documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mis_documents')
        .select('*, styles(style_no, buyer), lines(line_number, floors(name))')
        .eq('section', sectionKey as any)
        .eq('document_type', activeDoc.documentType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createDoc = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('mis_documents').insert({
        section: sectionKey as any,
        document_type: activeDoc.documentType,
        document_number: activeDoc.number,
        title: activeDoc.title,
        style_id: payload.style_id,
        line_id: payload.line_id,
        date: payload.date,
        data: payload.formData,
        remarks: payload.remarks,
        status: payload.status,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-documents'] });
      setFormOpen(false);
      toast.success('Document created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDoc = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { error } = await supabase.from('mis_documents').update({
        style_id: payload.style_id,
        line_id: payload.line_id,
        date: payload.date,
        data: payload.formData,
        remarks: payload.remarks,
        status: payload.status,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-documents'] });
      setFormOpen(false);
      setEditingRecord(null);
      toast.success('Document updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mis_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-documents'] });
      setDeleteId(null);
      toast.success('Document deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (data: any) => {
    if (editingRecord) {
      updateDoc.mutate({ id: editingRecord.id, payload: data });
    } else {
      createDoc.mutate(data);
    }
  };

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter((d: any) =>
      (d.styles?.style_no || '').toLowerCase().includes(q) ||
      (d.styles?.buyer || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q) ||
      (d.remarks || '').toLowerCase().includes(q)
    );
  }, [documents, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {sectionLabel}
        </h1>
        <p className="text-sm text-muted-foreground">{configs.length} document types — CRUD data entry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Document Types</CardTitle>
          </CardHeader>
          <CardContent className="p-1.5 max-h-[65vh] overflow-y-auto">
            {configs.map((cfg) => (
              <button
                key={cfg.documentType}
                onClick={() => { setActiveDoc(cfg); setSearch(''); }}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${
                  activeDoc.documentType === cfg.documentType
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0">{cfg.number}.</span>
                <span className="flex-1 truncate">{cfg.title}</span>
                <ChevronRight className={`h-3 w-3 shrink-0 ${activeDoc.documentType === cfg.documentType ? 'text-primary' : 'text-muted-foreground/40'}`} />
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." className="h-8 text-sm pl-8" />
            </div>
            <Badge variant="outline" className="text-xs h-8 px-3">
              {filteredDocs.length} record{filteredDocs.length !== 1 ? 's' : ''}
            </Badge>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditingRecord(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> New Entry
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">#{activeDoc.number}</Badge>
            <span className="font-semibold text-foreground">{activeDoc.title}</span>
          </div>

          <Card className="border-[1.5px]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Date</th>
                      {(activeDoc.linkTo === 'style' || activeDoc.linkTo === 'style_line') && (
                        <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Style</th>
                      )}
                      {(activeDoc.linkTo === 'line' || activeDoc.linkTo === 'style_line') && (
                        <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Line</th>
                      )}
                      <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Key Info</th>
                      <th className="text-center py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                      <th className="text-left py-2 px-3 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Remarks</th>
                      <th className="py-2 px-3 text-[10.5px] w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc: any) => {
                      const data = doc.data || {};
                      const firstTextField = activeDoc.fields.find(f => f.type === 'text' && data[f.key]);
                      const keyInfo = firstTextField ? `${firstTextField.label}: ${data[firstTextField.key]}` : '—';
                      return (
                        <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 font-mono text-xs text-foreground">{doc.date}</td>
                          {(activeDoc.linkTo === 'style' || activeDoc.linkTo === 'style_line') && (
                            <td className="py-2 px-3">
                              {doc.styles ? <span className="text-foreground font-medium">{doc.styles.style_no}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                          )}
                          {(activeDoc.linkTo === 'line' || activeDoc.linkTo === 'style_line') && (
                            <td className="py-2 px-3 text-muted-foreground text-xs">{doc.lines ? `L${doc.lines.line_number}` : '—'}</td>
                          )}
                          <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{keyInfo}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</Badge>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground max-w-[150px] truncate">{doc.remarks || '—'}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRecord(doc); setFormOpen(true); }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(doc.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDocs.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                          No records yet. Click "New Entry" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MISDocumentForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingRecord(null); }}
        config={activeDoc}
        styles={styles}
        lines={lines as any[]}
        initialData={editingRecord}
        onSubmit={handleSubmit}
        isSubmitting={createDoc.isPending || updateDoc.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteDoc.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
