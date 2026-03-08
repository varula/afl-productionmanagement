import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Bell, BellOff, MessageSquare, AlertTriangle, Gauge, ShieldAlert,
  Users, Truck, Cpu, ArrowLeftRight, TrendingDown, Plus, X, Save
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const CATEGORY_COLORS: Record<string, string> = {
  production: 'bg-primary/10 text-primary border-primary/20',
  quality: 'bg-destructive/10 text-destructive border-destructive/20',
  workforce: 'bg-accent/80 text-accent-foreground border-accent',
  logistics: 'bg-secondary text-secondary-foreground border-border',
};

const ALERT_ICONS: Record<string, React.ElementType> = {
  downtime_exceeded: AlertTriangle,
  efficiency_below_target: TrendingDown,
  quality_dhu_high: ShieldAlert,
  absenteeism_high: Users,
  shipment_delayed: Truck,
  machine_breakdown: Cpu,
  style_changeover: ArrowLeftRight,
  low_output_hour: Gauge,
};

interface AlertConfig {
  id: string;
  alert_type: string;
  label: string;
  description: string;
  category: string;
  is_enabled: boolean;
  threshold_value: number | null;
  threshold_unit: string | null;
  whatsapp_recipients: string[];
}

export default function NotificationSettingsPage() {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [editingRecipient, setEditingRecipient] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alert-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_configurations')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AlertConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (update: { id: string; changes: Partial<AlertConfig> }) => {
      const { error } = await supabase
        .from('alert_configurations')
        .update(update.changes as Record<string, unknown>)
        .eq('id', update.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configurations'] });
      toast.success('Alert configuration updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleToggle = (alert: AlertConfig) => {
    updateMutation.mutate({ id: alert.id, changes: { is_enabled: !alert.is_enabled } });
  };

  const handleThresholdChange = (alert: AlertConfig, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateMutation.mutate({ id: alert.id, changes: { threshold_value: num } });
    }
  };

  const addRecipient = (alert: AlertConfig) => {
    const phone = newPhone.trim();
    if (!phone) return;
    const updated = [...(alert.whatsapp_recipients || []), phone];
    updateMutation.mutate({ id: alert.id, changes: { whatsapp_recipients: updated } });
    setNewPhone('');
    setEditingRecipient(null);
  };

  const removeRecipient = (alert: AlertConfig, index: number) => {
    const updated = alert.whatsapp_recipients.filter((_, i) => i !== index);
    updateMutation.mutate({ id: alert.id, changes: { whatsapp_recipients: updated } });
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {
    (acc[alert.category] = acc[alert.category] || []).push(alert);
    return acc;
  }, {} as Record<string, AlertConfig[]>);

  const categoryLabels: Record<string, string> = {
    production: 'Production Alerts',
    quality: 'Quality Alerts',
    workforce: 'Workforce Alerts',
    logistics: 'Logistics Alerts',
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" /> Notification Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure which critical events trigger WhatsApp alerts
        </p>
      </div>

      {/* WhatsApp Status Banner */}
      <Card className="border-[1.5px] border-dashed border-muted-foreground/30 bg-muted/30">
        <CardContent className="p-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">WhatsApp Cloud API</p>
            <p className="text-[11px] text-muted-foreground">
              Credentials not configured yet. Alerts will be queued until WhatsApp is connected.
            </p>
          </div>
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
            Pending Setup
          </Badge>
        </CardContent>
      </Card>

      {Object.entries(groupedAlerts).map(([category, categoryAlerts]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
            {categoryLabels[category] || category}
          </h2>

          {categoryAlerts.map((alert, i) => {
            const Icon = ALERT_ICONS[alert.alert_type] || Bell;
            return (
              <Card
                key={alert.id}
                className="border-[1.5px] hover:shadow-md transition-shadow animate-pop-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${CATEGORY_COLORS[category]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{alert.label}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                    </div>
                    <Switch
                      checked={alert.is_enabled}
                      onCheckedChange={() => handleToggle(alert)}
                      disabled={!isAdmin}
                    />
                  </div>

                  {alert.is_enabled && (
                    <div className="pl-12 space-y-3">
                      {/* Threshold */}
                      {alert.threshold_value !== null && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Threshold:</Label>
                          <Input
                            type="number"
                            className="h-7 w-20 text-xs"
                            defaultValue={alert.threshold_value}
                            onBlur={(e) => handleThresholdChange(alert, e.target.value)}
                            disabled={!isAdmin}
                          />
                          <span className="text-xs text-muted-foreground">{alert.threshold_unit}</span>
                        </div>
                      )}

                      {/* Recipients */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">WhatsApp Recipients:</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {(alert.whatsapp_recipients || []).map((phone, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs gap-1 pr-1"
                            >
                              {phone}
                              {isAdmin && (
                                <button
                                  onClick={() => removeRecipient(alert, idx)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {editingRecipient === alert.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                placeholder="+1234567890"
                                className="h-6 w-32 text-xs"
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addRecipient(alert)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => addRecipient(alert)}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            isAdmin && (
                              <button
                                onClick={() => { setEditingRecipient(alert.id); setNewPhone(''); }}
                                className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {alerts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BellOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No alert configurations found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
