import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Factory, Users, Bell, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const sections = [
  { icon: Factory, title: 'Factory Configuration', desc: 'Manage factories, floors, and production lines', path: '/admin/factories' },
  { icon: Users, title: 'User Management', desc: 'Add users, assign roles (Admin, Manager, Line Chief, Operator)', path: '/admin/users' },
  { icon: Bell, title: 'Notifications', desc: 'Configure WhatsApp alerts for downtime, quality, and shipment issues', path: '/admin/notifications' },
  { icon: Shield, title: 'Security', desc: 'Password policies, session management, audit logs' },
  { icon: Database, title: 'Data & Backup', desc: 'Export data, manage backups, data retention policies' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <Card key={s.title} className="border-[1.5px] hover:shadow-md transition-shadow animate-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => s.path && navigate(s.path)}>Configure</Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
