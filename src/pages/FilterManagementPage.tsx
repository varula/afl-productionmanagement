import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Filter, Plus, Pencil, Trash2, GripVertical, FolderPlus } from 'lucide-react';
import {
  useAllSidebarFilters,
  useFilterGroupMutations,
  useFilterItemMutations,
  type FilterGroup,
  type FilterItem,
} from '@/hooks/useSidebarFilters';

const ROUTE_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/plans', label: 'Orders' },
  { value: '/floors', label: 'Floors & Lines' },
  { value: '/hourly-entry', label: 'Hourly Entry' },
  { value: '/lost-time', label: 'Lost Time' },
  { value: '/workers', label: 'Workers' },
  { value: '/machines', label: 'Machines' },
  { value: '/qc', label: 'QC' },
  { value: '/inventory', label: 'Inventory' },
  { value: '/analytics', label: 'Analytics' },
  { value: '/shipments', label: 'Shipments' },
  { value: '/mis', label: 'MIS Reports' },
  { value: '/planning', label: 'Planning' },
  { value: '/overtime', label: 'Overtime' },
  { value: '/ie', label: 'IE Module' },
  { value: '/admin/settings', label: 'Settings' },
  { value: '/admin/factories', label: 'Factory Setup' },
  { value: '/admin/users', label: 'User Management' },
];

function AddGroupDialog({ onAdd }: { onAdd: (route: string, title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState('');
  const [title, setTitle] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <FolderPlus className="h-3.5 w-3.5" /> Add Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Filter Group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Module (Route)</Label>
            <Select value={route} onValueChange={setRoute}>
              <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Group Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. By Status" />
          </div>
          <Button className="w-full" onClick={() => {
            if (!route || !title.trim()) { toast.error('Fill all fields'); return; }
            onAdd(route, title.trim());
            setOpen(false);
            setRoute('');
            setTitle('');
          }}>Create Group</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ groupId, onAdd }: { groupId: string; onAdd: (data: { group_id: string; label: string; filter_key: string; sort_order: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [filterKey, setFilterKey] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
          <Plus className="h-3 w-3" /> Add Filter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Filter Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Pending" />
          </div>
          <div>
            <Label className="text-xs">Filter Key</Label>
            <Input value={filterKey} onChange={e => setFilterKey(e.target.value)} placeholder="e.g. status-pending" />
          </div>
          <Button className="w-full" onClick={() => {
            if (!label.trim() || !filterKey.trim()) { toast.error('Fill all fields'); return; }
            onAdd({ group_id: groupId, label: label.trim(), filter_key: filterKey.trim(), sort_order: 99 });
            setOpen(false);
            setLabel('');
            setFilterKey('');
          }}>Add Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterItemRow({ item, onUpdate, onDelete }: {
  item: FilterItem;
  onUpdate: (id: string, data: Partial<FilterItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [filterKey, setFilterKey] = useState(item.filter_key);
  const [badgeValue, setBadgeValue] = useState(item.badge_value || '');

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      {editing ? (
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Input value={label} onChange={e => setLabel(e.target.value)} className="h-7 text-xs" placeholder="Label" />
            <Input value={filterKey} onChange={e => setFilterKey(e.target.value)} className="h-7 text-xs w-32" placeholder="Key" />
            <Input value={badgeValue} onChange={e => setBadgeValue(e.target.value)} className="h-7 text-xs w-16" placeholder="Badge" />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={() => {
              onUpdate(item.id, { label, filter_key: filterKey, badge_value: badgeValue || null });
              setEditing(false);
            }}>Save</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setEditing(false); setLabel(item.label); setFilterKey(item.filter_key); setBadgeValue(item.badge_value || ''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm truncate">{item.label}</span>
          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{item.filter_key}</code>
          {item.badge_value && <Badge variant="secondary" className="text-[10px] h-4">{item.badge_value}</Badge>}
          {item.is_default && <Badge className="text-[10px] h-4 bg-primary/10 text-primary">default</Badge>}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Switch
              checked={item.is_default}
              onCheckedChange={checked => onUpdate(item.id, { is_default: checked })}
              className="scale-75"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function FilterManagementPage() {
  const { data: allGroups = [], isLoading } = useAllSidebarFilters();
  const { addGroup, updateGroup, deleteGroup } = useFilterGroupMutations();
  const { addItem, updateItem, deleteItem } = useFilterItemMutations();
  const [routeFilter, setRouteFilter] = useState<string>('all');

  // Group by route
  const routes = [...new Set(allGroups.map(g => g.route))].sort();
  const filtered = routeFilter === 'all' ? allGroups : allGroups.filter(g => g.route === routeFilter);

  const handleAddGroup = (route: string, title: string) => {
    const maxSort = allGroups.filter(g => g.route === route).reduce((m, g) => Math.max(m, g.sort_order), -1);
    addGroup.mutate({ route, title, sort_order: maxSort + 1 }, {
      onSuccess: () => toast.success('Group created'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleAddItem = (data: { group_id: string; label: string; filter_key: string; sort_order: number }) => {
    addItem.mutate(data, {
      onSuccess: () => toast.success('Filter added'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleUpdateItem = (id: string, data: Partial<FilterItem>) => {
    updateItem.mutate({ id, ...data }, {
      onSuccess: () => toast.success('Updated'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup.mutate(id, {
      onSuccess: () => toast.success('Group deleted'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleToggleGroup = (id: string, is_active: boolean) => {
    updateGroup.mutate({ id, is_active }, {
      onSuccess: () => toast.success(is_active ? 'Enabled' : 'Disabled'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const routeLabel = (r: string) => ROUTE_OPTIONS.find(o => o.value === r)?.label || r;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" /> Sidebar Filter Management
          </h1>
          <p className="text-sm text-muted-foreground">Add, edit, reorder, and toggle sidebar filters for every module</p>
        </div>
        <AddGroupDialog onAdd={handleAddGroup} />
      </div>

      {/* Route filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={routeFilter === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setRouteFilter('all')}>All Modules</Button>
        {routes.map(r => (
          <Button key={r} variant={routeFilter === r ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setRouteFilter(r)}>
            {routeLabel(r)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading filters...</p>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map(group => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 flex-1 text-left">
                  <Badge variant="outline" className="text-[10px]">{routeLabel(group.route)}</Badge>
                  <span className="font-semibold text-sm">{group.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{group.items.length} items</Badge>
                  {!group.is_active && <Badge variant="destructive" className="text-[10px]">disabled</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-1">
                  {group.items.map(item => (
                    <FilterItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-3 pt-2 border-t">
                  <AddItemDialog groupId={group.id} onAdd={handleAddItem} />
                  <Switch
                    checked={group.is_active}
                    onCheckedChange={checked => handleToggleGroup(group.id, checked)}
                  />
                  <span className="text-xs text-muted-foreground self-center">{group.is_active ? 'Active' : 'Disabled'}</span>
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => handleDeleteGroup(group.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete Group
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
