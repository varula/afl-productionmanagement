import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factoryId: string;
}

interface ParsedRow {
  name: string;
  employee_no: string;
  designation: string;
  worker_type: string;
  grade: string;
  expertise_level: string;
  operations_count: number;
  salary: number;
  joined_at: string;
  valid: boolean;
  error?: string;
}

const VALID_GRADES = ['A', 'B', 'C', 'D'];
const VALID_TYPES = ['operator', 'helper'];

export default function BulkImportDialog({ open, onOpenChange, factoryId }: BulkImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      complete: (results) => {
        const parsed: ParsedRow[] = results.data.map((row: any) => {
          const name = (row.name || row.full_name || '').trim();
          const employee_no = (row.emp_id || row.employee_no || row.employee_id || row.emp__ || '').toString().trim();
          const designation = (row.designation || 'Operator').trim();
          const worker_type = (row.worker_type || row.type || 'operator').toLowerCase().trim();
          const grade = (row.grade || 'C').toUpperCase().replace('GRADE-', '').replace('GRADE ', '').trim().charAt(0);
          const expertise_level = (row.expertise_level || row.expertise || 'beginner').toLowerCase().trim();
          const operations_count = parseInt(row.operations_count || row.ops || '0') || 0;
          const salary = parseFloat(row.salary || '0') || 0;
          const joined_at = row.join_date || row.joined_at || row.joining_date || '';

          let valid = true;
          let error = '';
          if (!name) { valid = false; error = 'Name required'; }
          else if (!employee_no) { valid = false; error = 'Employee ID required'; }
          else if (!VALID_GRADES.includes(grade)) { valid = false; error = `Invalid grade: ${grade}`; }

          return {
            name, employee_no, designation,
            worker_type: VALID_TYPES.includes(worker_type) ? worker_type : 'operator',
            grade, expertise_level, operations_count, salary,
            joined_at: joined_at || null,
            valid, error,
          } as ParsedRow;
        });
        setRows(parsed);
      },
    });
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const importMutation = useMutation({
    mutationFn: async () => {
      const inserts = validRows.map(r => ({
        name: r.name,
        employee_no: r.employee_no,
        designation: r.designation,
        worker_type: r.worker_type,
        grade: r.grade as any,
        expertise_level: r.expertise_level,
        operations_count: r.operations_count,
        salary: r.salary,
        joined_at: r.joined_at || null,
        factory_id: factoryId,
      }));

      // Insert in batches of 50
      for (let i = 0; i < inserts.length; i += 50) {
        const batch = inserts.slice(i, i + 50);
        const { error } = await supabase.from('operators').insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-operators'] });
      toast.success(`${validRows.length} workers imported successfully`);
      setRows([]);
      setFileName('');
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      {
        name: 'Ahmed Khan', emp_id: '1001', designation: 'Operator',
        worker_type: 'operator', grade: 'B', expertise_level: 'skilled',
        operations_count: 5, salary: 8198, join_date: '2024-01-15'
      },
      {
        name: 'Fatima Begum', emp_id: '1002', designation: 'Helper',
        worker_type: 'helper', grade: 'C', expertise_level: 'beginner',
        operations_count: 2, salary: 6900, join_date: '2024-03-01'
      },
    ]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'workers_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Bulk Import Workers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Download CSV Template</p>
              <p className="text-[10px] text-muted-foreground">Use this template to prepare your worker data</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
          </div>

          {/* File upload */}
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          <Button
            variant="outline"
            className="w-full h-20 border-dashed gap-2 text-sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            {fileName ? fileName : 'Click to upload CSV file'}
          </Button>

          {/* Preview */}
          {rows.length > 0 && (
            <>
              <div className="flex gap-3">
                <Badge variant="outline" className="text-[11px] bg-success/15 text-success border-success/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {validRows.length} valid
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="text-[11px] bg-pink/15 text-pink border-pink/30 gap-1">
                    <AlertCircle className="h-3 w-3" /> {invalidRows.length} errors
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto max-h-60 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="text-left py-1.5 px-2 font-semibold">#</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Name</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Emp ID</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Type</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Designation</th>
                      <th className="text-center py-1.5 px-2 font-semibold">Grade</th>
                      <th className="text-right py-1.5 px-2 font-semibold">Salary</th>
                      <th className="text-left py-1.5 px-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className={`border-t border-border/50 ${!r.valid ? 'bg-destructive/5' : ''}`}>
                        <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-1 px-2 font-medium">{r.name || '—'}</td>
                        <td className="py-1 px-2 font-mono">{r.employee_no || '—'}</td>
                        <td className="py-1 px-2">
                          <Badge variant="outline" className={`text-[9px] ${r.worker_type === 'helper' ? 'bg-accent/15 text-accent border-accent/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                            {r.worker_type}
                          </Badge>
                        </td>
                        <td className="py-1 px-2">{r.designation}</td>
                        <td className="py-1 px-2 text-center">{r.grade}</td>
                        <td className="py-1 px-2 text-right">{r.salary.toLocaleString()}</td>
                        <td className="py-1 px-2">
                          {r.valid
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            : <span className="text-destructive text-[10px]">{r.error}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                className="w-full"
                onClick={() => importMutation.mutate()}
                disabled={validRows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending
                  ? `Importing ${validRows.length} workers...`
                  : `Import ${validRows.length} Workers`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
