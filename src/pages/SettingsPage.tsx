import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Factory, Users, Bell, Shield, Database, Filter, Sliders, Building, Clock, Target, Link2, FileText, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useActiveFilter } from '@/hooks/useActiveFilter';

const sections = [
  { key: 'st-company', icon: Building, title: 'Company Profile', desc: 'Manage company name, logo, and general settings' },
  { key: 'st-floors', icon: Factory, title: 'Floor & Line Setup', desc: 'Manage factories, floors, and production lines', path: '/admin/factories' },
  { key: 'st-shift', icon: Clock, title: 'Shift Config', desc: 'Configure shift timings, break schedules, and overtime rules' },
  { key: 'st-kpi', icon: Target, title: 'KPI Targets', desc: 'Set efficiency, quality, and delivery target thresholds' },
  { key: 'st-notif', icon: Bell, title: 'Notifications', desc: 'Configure WhatsApp alerts for downtime, quality, and shipment issues', path: '/admin/notifications' },
  { key: 'st-users', icon: Users, title: 'User Management', desc: 'Add users, assign roles (Admin, Manager, Line Chief, Operator)', path: '/admin/users' },
  { key: 'st-integrations', icon: Link2, title: 'Integrations', desc: 'Connect external services and APIs' },
  { key: 'st-filters', icon: Filter, title: 'Sidebar Filters', desc: 'Add, edit, reorder sidebar filters for every module', path: '/admin/filters' },
  { key: 'st-audit', icon: FileText, title: 'Audit Log', desc: 'View system activity and change history' },
  { key: 'st-backup', icon: HardDrive, title: 'Backup & Export', desc: 'Export data, manage backups, data retention policies' },
  { key: 'st-security', icon: Shield, title: 'Security', desc: 'Password policies, session management' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const activeFilter = useActiveFilter();

  // Filter sections based on sidebar selection
  const filteredSections = activeFilter && activeFilter !== 'st-company'
    ? sections.filter(s => s.key === activeFilter)
    : sections;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="space-y-3">
        {filteredSections.map((s, i) => (
          <Card key={s.key} className="border-[1.5px] hover:shadow-md transition-shadow animate-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
              {s.path && (
                <Button variant="outline" size="sm" onClick={() => navigate(s.path!)}>Configure</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!activeFilter || activeFilter === 'st-company') && (
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2"><CardTitle className="text-[13px] font-bold">Quick Toggles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Email notifications', desc: 'Receive daily summaries via email' },
              { label: 'Auto-confirm email signups', desc: 'Skip email verification for new users' },
              { label: 'Dark mode', desc: 'Switch to dark theme' },
            ].map(t => (
              <div key={t.label} className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <p className="text-[10.5px] text-muted-foreground">{t.desc}</p>
                </div>
                <Switch />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
