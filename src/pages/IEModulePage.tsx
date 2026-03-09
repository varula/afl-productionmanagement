import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Ruler, Upload, Plus, Pencil, Trash2, Download, FileText, Eye,
  Users, ClipboardList, BarChart3, Clock, Cpu, Search
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type IECategory = 'skill_matrix' | 'operation_breakdown' | 'capacity_study' | 'time_study' | 'machine_inventory';

interface IEDocument {
  id: string;
  category: string;
  title: string;
  description: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number;
  data: Record<string, unknown>;
  status: string;
  factory_id: string | null;
  line_id: string | null;
  style_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: { key: IECategory; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'skill_matrix', label: 'Skill Matrix', icon: Users, description: 'Operator skill assessments by operation type' },
  { key: 'operation_breakdown', label: 'Operation Breakdown', icon: ClipboardList, description: 'Style-wise operation sequence and SAM values' },
  { key: 'capacity_study', label: 'Capacity Study', icon: BarChart3, description: 'Line/factory capacity analysis reports' },
  { key: 'time_study', label: 'Time Study', icon: Clock, description: 'Time study follow-up and method improvements' },
  { key: 'machine_inventory', label: 'Machine Inventory', icon: Cpu, description: 'Machine type, brand, condition and allocation' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/15 text-success border-success/30',
  archived: 'bg-pink/15 text-pink border-pink/30',
};

export default function IEModulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<IECategory>('skill_matrix');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<IEDocument | null>(null);
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['ie-documents', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ie_documents')
        .select('*')
        .eq('category', activeTab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IEDocument[];
    },
  });

  const { data: styles = [] } = useQuery({
    queryKey: ['styles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('styles').select('id, style_no, buyer');
      return data || [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['lines-list'],
    queryFn: async () => {
      const { data } = await supabase.from('lines').select('id, line_number, floor_id');
      return data || [];
    },
  });

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${activeTab}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('ie-documents').upload(path, file);
    if (error) throw error;
    return path;
  };

  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      let filePath = editingDoc?.file_path || null;
      let fileName = editingDoc?.file_name || null;
      let fileSize = editingDoc?.file_size || 0;

      if (selectedFile) {
        filePath = await uploadFile(selectedFile);
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
      }

      // Get actual Supabase auth user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error('You must be logged in');

      const payload = {
        category: activeTab,
        title,
        description,
        status,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        created_by: userId,
        data: {},
      };

      if (isEdit && editingDoc) {
        const { error } = await supabase.from('ie_documents').update(payload).eq('id', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ie_documents').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ie-documents', activeTab] });
      toast.success(editingDoc ? 'Document updated' : 'Document created');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const doc = documents.find(d => d.id === id);
      if (doc?.file_path) {
        await supabase.storage.from('ie-documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('ie_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ie-documents', activeTab] });
      toast.success('Document deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingDoc(null);
    setTitle('');
    setDescription('');
    setStatus('draft');
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: IEDocument) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setDescription(doc.description || '');
    setStatus(doc.status);
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDoc(null);
    setSelectedFile(null);
  };

  const downloadFile = async (doc: IEDocument) => {
    if (!doc.file_path) return;
    const { data } = supabase.storage.from('ie-documents').getPublicUrl(doc.file_path);
    window.open(data.publicUrl, '_blank');
  };

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCat = CATEGORIES.find(c => c.key === activeTab)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ruler className="h-5 w-5 text-accent" /> IE Module
          </h1>
          <p className="text-sm text-muted-foreground">
            Industrial Engineering — Skill Matrix, Operation Breakdown, Capacity Study, Time Study & Machine Inventory
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New {activeCat.label}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as IECategory); setSearch(''); }}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="gap-1.5 text-xs">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-4 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Documents', value: documents.length, color: 'border-primary/20' },
                { label: 'Active', value: documents.filter(d => d.status === 'active').length, color: 'border-success/20' },
                { label: 'Draft', value: documents.filter(d => d.status === 'draft').length, color: 'border-warning/20' },
                { label: 'With Files', value: documents.filter(d => d.file_path).length, color: 'border-accent/20' },
              ].map(s => (
                <Card key={s.label} className={`border-[1.5px] ${s.color}`}>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-extrabold text-foreground">{s.value}</p>
                    <p className="text-[10.5px] text-muted-foreground font-medium">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${cat.label}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Table */}
            <Card className="border-[1.5px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                  <cat.icon className="h-4 w-4 text-accent" /> {cat.label}
                  <span className="font-normal text-muted-foreground text-xs ml-2">— {cat.description}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <cat.icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No {cat.label} documents yet</p>
                    <p className="text-xs mt-1">Click "New {cat.label}" to add one with file upload</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs">File</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium text-foreground">{doc.title}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                            {doc.description || '—'}
                          </TableCell>
                          <TableCell>
                            {doc.file_name ? (
                              <button
                                onClick={() => downloadFile(doc)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3" /> {doc.file_name}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {doc.file_path && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFile(doc)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(doc)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(doc.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <activeCat.icon className="h-5 w-5 text-accent" />
              {editingDoc ? 'Edit' : 'New'} {activeCat.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g. ${activeCat.label} — Line 5`} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details, notes..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Upload File (Excel, PDF, Image)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Choose File
                </Button>
                <span className="text-xs text-muted-foreground truncate">
                  {selectedFile ? selectedFile.name : editingDoc?.file_name || 'No file selected'}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(!!editingDoc)}
              disabled={!title || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : editingDoc ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
