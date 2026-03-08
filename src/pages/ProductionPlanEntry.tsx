import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, CalendarDays, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { useUserRole } from '@/hooks/useUserRole';
import { ReadOnlyBanner } from '@/components/ui/read-only-banner';

interface PlanFormData {
  line_id: string;
  style_id: string;
  target_qty: number;
  planned_operators: number;
  planned_helpers: number;
  working_hours: number;
  planned_efficiency: number;
  target_efficiency: number;
}

const emptyPlan: PlanFormData = {
  line_id: '',
  style_id: '',
  target_qty: 0,
  planned_operators: 0,
  planned_helpers: 0,
  working_hours: 8,
  planned_efficiency: 60,
  target_efficiency: 65,
};

export default function ProductionPlanEntry() {
  const queryClient = useQueryClient();
  const factoryId = useFactoryId();
  const { canManage } = useUserRole();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState<PlanFormData>({ ...emptyPlan });

  // Fetch lines with floor info, filtered by factory
  const { data: lines = [] } = useQuery({
    queryKey: ['lines-for-plans', factoryId],
    queryFn: async () => {
      // Get factory floors first
      const { data: floors } = await supabase.from('floors').select('id').eq('factory_id', factoryId);
      if (!floors || floors.length === 0) return [];
      const { data, error } = await supabase
        .from('lines')
        .select('id, line_number, floor_id, floors(name)')
        .eq('is_active', true)
        .in('floor_id', floors.map(f => f.id))
        .order('line_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!factoryId,
  });

  // Fetch styles
  const { data: styles = [] } = useQuery({
    queryKey: ['styles-for-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('styles')
        .select('id, style_no, buyer, smv, sam, target_efficiency')
        .order('style_no');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch existing plans for selected date
  const { data: existingPlans = [] } = useQuery({
    queryKey: ['production-plans', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_plans')
        .select('*, lines(line_number, floors(name)), styles(style_no, buyer, smv)')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Create plan mutation
  const createPlan = useMutation({
    mutationFn: async (planData: PlanFormData) => {
      const { error } = await supabase.from('production_plans').insert({
        date: selectedDate,
        line_id: planData.line_id,
        style_id: planData.style_id,
        target_qty: planData.target_qty,
        planned_operators: planData.planned_operators,
        planned_helpers: planData.planned_helpers,
        working_hours: planData.working_hours,
        planned_efficiency: planData.planned_efficiency,
        target_efficiency: planData.target_efficiency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] });
      setForm({ ...emptyPlan });
      toast.success('Production plan created successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create plan');
    },
  });

  // Delete plan mutation
  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('production_plans').delete().eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] });
      toast.success('Plan deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete plan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.line_id) return toast.error('Select a line');
    if (!form.style_id) return toast.error('Select a style');
    if (form.target_qty <= 0) return toast.error('Target qty must be > 0');
    createPlan.mutate(form);
  };

  const updateField = (field: keyof PlanFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill efficiency when style is selected
  const handleStyleChange = (styleId: string) => {
    updateField('style_id', styleId);
    const style = styles.find(s => s.id === styleId);
    if (style) {
      setForm(prev => ({
        ...prev,
        style_id: styleId,
        target_efficiency: Number(style.target_efficiency),
      }));
    }
  };

  const selectedStyle = styles.find(s => s.id === form.style_id);

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-4xl">
      {!canManage && <ReadOnlyBanner message="You have view-only access to production plans. Contact an Admin or Manager to create or modify plans." />}

      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-44"
        />
        <Badge variant="outline" className="text-xs">
          {existingPlans.length} plan{existingPlans.length !== 1 ? 's' : ''} for this date
        </Badge>
      </div>

      {/* Entry Form - only for managers and above */}
      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Production Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Line */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Line *</Label>
                  <Select value={form.line_id} onValueChange={v => updateField('line_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                    <SelectContent>
                      {lines.map((line: any) => (
                        <SelectItem key={line.id} value={line.id}>
                          Line {line.line_number} — {line.floors?.name || 'Unknown Floor'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Style *</Label>
                  <Select value={form.style_id} onValueChange={handleStyleChange}>
                    <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      {styles.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.style_no} — {style.buyer} (SMV: {style.smv})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Qty */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Qty *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.target_qty || ''}
                    onChange={e => updateField('target_qty', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 500"
                  />
                </div>

                {/* Planned Operators */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Planned Operators</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.planned_operators || ''}
                    onChange={e => updateField('planned_operators', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 35"
                  />
                </div>

                {/* Planned Helpers */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Planned Helpers</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.planned_helpers || ''}
                    onChange={e => updateField('planned_helpers', parseInt(e.target.value) || 0)}
                    placeholder="e.g. 10"
                  />
                </div>

                {/* Working Hours */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Working Hours</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={form.working_hours}
                    onChange={e => updateField('working_hours', parseFloat(e.target.value) || 8)}
                  />
                </div>

                {/* Planned Efficiency */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Planned Efficiency %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.planned_efficiency}
                    onChange={e => updateField('planned_efficiency', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Target Efficiency */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Efficiency %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.target_efficiency}
                    onChange={e => updateField('target_efficiency', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {selectedStyle && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  Style: <strong>{selectedStyle.style_no}</strong> | Buyer: {selectedStyle.buyer} | SMV: {selectedStyle.smv} | SAM: {selectedStyle.sam}
                </div>
              )}

              <Button type="submit" disabled={createPlan.isPending} className="w-full sm:w-auto">
                {createPlan.isPending ? 'Saving...' : 'Add Plan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Plans Table */}
      {existingPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Plans for {selectedDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium">Line</th>
                    <th className="text-left p-3 font-medium">Style</th>
                    <th className="text-left p-3 font-medium">Buyer</th>
                    <th className="text-right p-3 font-medium">Target</th>
                    <th className="text-right p-3 font-medium">Operators</th>
                    <th className="text-right p-3 font-medium">Helpers</th>
                    <th className="text-right p-3 font-medium">Hours</th>
                    <th className="text-right p-3 font-medium">SMV</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {existingPlans.map((plan: any) => (
                    <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          L{plan.lines?.line_number} — {plan.lines?.floors?.name}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{plan.styles?.style_no}</td>
                      <td className="p-3 text-muted-foreground">{plan.styles?.buyer}</td>
                      <td className="p-3 text-right font-mono">{plan.target_qty.toLocaleString()}</td>
                      <td className="p-3 text-right">{plan.planned_operators}</td>
                      <td className="p-3 text-right">{plan.planned_helpers}</td>
                      <td className="p-3 text-right">{plan.working_hours}</td>
                      <td className="p-3 text-right">{plan.styles?.smv}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deletePlan.mutate(plan.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
