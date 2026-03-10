import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_LEVELS = ['Learning', 'Basic', 'Skilled', 'Expert'];

const COMMON_OPERATIONS = [
  'Pocket Attach', 'Pocket Hem', 'Side Seam', 'Inseam', 'Waistband Attach',
  'Belt Loop', 'Zipper Attach', 'Button Hole', 'Button Attach', 'Bartack',
  'Label Attach', 'Topstitch', 'Hemming', 'Collar Attach', 'Sleeve Attach',
  'Cuff Attach', 'Placket', 'Facing', 'Binding', 'Overlock',
  'Flatlock', 'Iron/Press', 'Trimming', 'Inspection', 'Fusing',
  'Marking', 'Cutting', 'Spreading', 'Bundling', 'Other'
];

interface WorkerSkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: { id: string; name: string; employee_no: string } | null;
}

export default function WorkerSkillsDialog({ open, onOpenChange, operator }: WorkerSkillsDialogProps) {
  const queryClient = useQueryClient();
  const [newOp, setNewOp] = useState('');
  const [newLevel, setNewLevel] = useState('Basic');

  const { data: skills = [] } = useQuery({
    queryKey: ['operator-skills', operator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_skills')
        .select('*')
        .eq('operator_id', operator!.id)
        .order('operation_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!operator?.id && open,
  });

  const addSkill = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('operator_skills').insert({
        operator_id: operator!.id,
        operation_name: newOp,
        skill_level: newLevel.toLowerCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-skills', operator?.id] });
      queryClient.invalidateQueries({ queryKey: ['workers-operators'] });
      toast.success('Skill added');
      setNewOp(''); setNewLevel('Basic');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeSkill = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase.from('operator_skills').delete().eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-skills', operator?.id] });
      queryClient.invalidateQueries({ queryKey: ['workers-operators'] });
      toast.success('Skill removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const skillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-success/15 text-success border-success/30';
      case 'skilled': return 'bg-accent/15 text-accent border-accent/30';
      case 'basic': return 'bg-warning/15 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Skills — {operator.name} ({operator.employee_no})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current skills */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Operations ({skills.length})
            </p>
            {skills.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">No skills assigned yet</p>
            )}
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: any) => (
                <Badge
                  key={skill.id}
                  variant="outline"
                  className={`text-[11px] gap-1.5 py-1 ${skillLevelColor(skill.skill_level)}`}
                >
                  {skill.operation_name}
                  <span className="opacity-60 text-[9px]">({skill.skill_level})</span>
                  <button
                    onClick={() => removeSkill.mutate(skill.id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add new skill */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Operation</p>
            <div className="flex gap-2">
              <Select value={newOp} onValueChange={setNewOp}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_OPERATIONS.filter(op => !skills.some((s: any) => s.operation_name === op)).map(op => (
                    <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newLevel} onValueChange={setNewLevel}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map(l => (
                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={() => addSkill.mutate()}
                disabled={!newOp || addSkill.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* Custom operation input */}
            <div className="flex gap-2">
              <Input
                className="flex-1 h-8 text-xs"
                placeholder="Or type custom operation name..."
                value={COMMON_OPERATIONS.includes(newOp) ? '' : newOp}
                onChange={e => setNewOp(e.target.value)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
