import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFactoryId } from '@/hooks/useActiveFilter';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Target, CalendarDays, ClipboardList, RefreshCw, Scissors, Calendar as CalendarIcon, Ship, Droplets,
} from 'lucide-react';

import { DayPlanTab } from '@/components/planning/DayPlanTab';
import { WeekPlanTab } from '@/components/planning/WeekPlanTab';
import { MonthPlanTab } from '@/components/planning/MonthPlanTab';
import { SeasonPlanTab } from '@/components/planning/SeasonPlanTab';
import { WashingPlanTab } from '@/components/planning/WashingPlanTab';
import { LineRunningDaysTab } from '@/components/planning/LineRunningDaysTab';
import { StyleChangeoverTab } from '@/components/planning/StyleChangeoverTab';
import { SampleMakingTab } from '@/components/planning/SampleMakingTab';

export default function PlanningModule() {
  const factoryId = useFactoryId();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [department, setDepartment] = useState<'sewing' | 'finishing'>('sewing');
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Planning Module
          </h1>
          <p className="text-sm text-muted-foreground">
            Day, Week, Month & Season Plans — Line Running Days, Style Changeovers & Samples
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Department Toggle */}
          <div className="flex items-center rounded-md border border-border bg-muted p-0.5">
            <Button
              variant={department === 'sewing' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setDepartment('sewing')}
            >
              Sewing
            </Button>
            <Button
              variant={department === 'finishing' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setDepartment('finishing')}
            >
              Finishing
            </Button>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(selectedDate, 'EEE, MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Sub-module Tabs */}
      <Tabs defaultValue="day_plan">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="day_plan" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" /> Day Plan
          </TabsTrigger>
          <TabsTrigger value="week_plan" className="gap-1.5 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" /> Week Plan
          </TabsTrigger>
          <TabsTrigger value="month_plan" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Month Plan
          </TabsTrigger>
          <TabsTrigger value="season_plan" className="gap-1.5 text-xs">
            <Ship className="h-3.5 w-3.5" /> Season Plan
          </TabsTrigger>
          <TabsTrigger value="washing" className="gap-1.5 text-xs">
            <Droplets className="h-3.5 w-3.5" /> Washing Plan
          </TabsTrigger>
          <TabsTrigger value="line_running" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Line Running Days
          </TabsTrigger>
          <TabsTrigger value="changeover" className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Style Changeover
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-1.5 text-xs">
            <Scissors className="h-3.5 w-3.5" /> Sample Making
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day_plan" className="mt-4">
          <DayPlanTab factoryId={factoryId} selectedDate={dateStr} department={department} />
        </TabsContent>

        <TabsContent value="week_plan" className="mt-4">
          <WeekPlanTab factoryId={factoryId} selectedDate={dateStr} department={department} />
        </TabsContent>

        <TabsContent value="month_plan" className="mt-4">
          <MonthPlanTab factoryId={factoryId} selectedDate={dateStr} department={department} />
        </TabsContent>

        <TabsContent value="season_plan" className="mt-4">
          <SeasonPlanTab factoryId={factoryId} department={department} />
        </TabsContent>

        <TabsContent value="line_running" className="mt-4">
          <LineRunningDaysTab factoryId={factoryId} selectedDate={dateStr} department={department} />
        </TabsContent>

        <TabsContent value="changeover" className="mt-4">
          <StyleChangeoverTab factoryId={factoryId} department={department} />
        </TabsContent>

        <TabsContent value="samples" className="mt-4">
          <SampleMakingTab factoryId={factoryId} department={department} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
