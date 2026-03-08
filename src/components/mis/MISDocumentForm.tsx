import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentTypeConfig, FormField } from '@/lib/mis-form-configs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MISDocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DocumentTypeConfig;
  styles: { id: string; style_no: string; buyer: string }[];
  lines: { id: string; line_number: number; floors?: { name: string } }[];
  initialData?: any;
  onSubmit: (data: {
    style_id: string | null;
    line_id: string | null;
    date: string;
    formData: Record<string, any>;
    remarks: string;
    status: string;
  }) => void;
  isSubmitting?: boolean;
}

export function MISDocumentForm({
  open, onOpenChange, config, styles, lines, initialData, onSubmit, isSubmitting,
}: MISDocumentFormProps) {
  const [styleId, setStyleId] = useState('');
  const [lineId, setLineId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('draft');
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (initialData) {
      setStyleId(initialData.style_id || '');
      setLineId(initialData.line_id || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setRemarks(initialData.remarks || '');
      setStatus(initialData.status || 'draft');
      setFormData(initialData.data || {});
    } else {
      setStyleId('');
      setLineId('');
      setDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      setStatus('draft');
      const defaults: Record<string, any> = {};
      config.fields.forEach(f => {
        if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
        else if (f.type === 'checkbox') defaults[f.key] = false;
        else if (f.type === 'number' || f.type === 'percentage') defaults[f.key] = '';
        else defaults[f.key] = '';
      });
      setFormData(defaults);
    }
  }, [initialData, config, open]);

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      style_id: styleId || null,
      line_id: lineId || null,
      date,
      formData,
      remarks,
      status,
    });
  };

  const needsStyle = config.linkTo === 'style' || config.linkTo === 'style_line';
  const needsLine = config.linkTo === 'line' || config.linkTo === 'style_line';

  const renderField = (field: FormField) => {
    const value = formData[field.key];
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="text-sm resize-none"
          />
        );
      case 'number':
      case 'percentage':
        return (
          <div className="relative">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => updateField(field.key, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder}
              className="h-8 text-sm"
              step={field.type === 'percentage' ? '0.1' : '1'}
              min={0}
              max={field.type === 'percentage' ? 100 : undefined}
            />
            {field.type === 'percentage' && (
              <span className="absolute right-8 top-1.5 text-xs text-muted-foreground">%</span>
            )}
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            className="h-8 text-sm"
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2 h-8">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => updateField(field.key, !!checked)}
            />
            <span className="text-xs text-muted-foreground">Yes</span>
          </div>
        );
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(v) => updateField(field.key, v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initialData ? 'Edit' : 'New'}: {config.number}. {config.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Fill in the details for this document record.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form id="mis-doc-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Linkage fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {needsStyle && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Style *</Label>
                  <Select value={styleId} onValueChange={setStyleId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      {styles.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.style_no} — {s.buyer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {needsLine && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Line</Label>
                  <Select value={lineId} onValueChange={setLineId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select line" /></SelectTrigger>
                    <SelectContent>
                      {lines.map(l => (
                        <SelectItem key={l.id} value={l.id}>Line {l.line_number} — {l.floors?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Dynamic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {config.fields.map(field => (
                <div
                  key={field.key}
                  className={`space-y-1 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                >
                  <Label className="text-xs font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            {/* Remarks */}
            <div className="space-y-1 pt-2 border-t border-border">
              <Label className="text-xs font-medium">General Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional remarks..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="mis-doc-form" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
