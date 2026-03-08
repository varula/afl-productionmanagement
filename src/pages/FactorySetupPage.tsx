import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Plus, Layers, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const factories = [
  {
    name: 'Armana Apparels Ltd.',
    location: '232/234, Tejgoan Link Road, Dhaka',
    floors: 3,
    lines: 9,
    workers: 1400,
    status: 'active',
  },
  {
    name: 'Armana Fashions Ltd.',
    location: 'Plot 45, DEPZ, Savar, Dhaka',
    floors: 1,
    lines: 3,
    workers: 500,
    status: 'active',
  },
];

export default function FactorySetupPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" /> Factory Setup
          </h1>
          <p className="text-sm text-muted-foreground">{factories.length} factories configured</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Factory</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {factories.map((f, i) => (
          <Card key={f.name} className="border-[1.5px] hover:shadow-md transition-shadow animate-pop-in" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{f.name}</h3>
                  <p className="text-[10.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {f.location}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">{f.status}</Badge>
              </div>
              <div className="flex gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground"><Layers className="h-3 w-3" /> {f.floors} floors</span>
                <span className="text-muted-foreground">{f.lines} lines</span>
                <span className="text-muted-foreground">{f.workers} workers</span>
              </div>
              <Button variant="outline" size="sm" className="w-full">Manage</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
