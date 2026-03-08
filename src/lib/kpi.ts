// Factory-Level KPI Calculation Engine

export interface KPIInput {
  totalOutput: number;
  totalTarget: number;
  totalManpower: number;
  totalMachines: number;
  totalWorkingMinutes: number;
  totalDowntimeMinutes: number;
  totalNptMinutes: number;
  totalDefects: number;
  totalChecked: number;
  totalRework: number;
  weightedSmv: number;
  plannedOperators: number;
  presentOperators: number;
  // Extended inputs
  totalLaborCost?: number;
  totalSamProduced?: number;
  cutQty?: number;
  shippedQty?: number;
  orderedQty?: number;
  onTimeOrders?: number;
  totalOrders?: number;
  separations?: number;
  avgHeadcount?: number;
}

export interface KPIResult {
  key: string;
  label: string;
  value: number;
  unit: string;
  target?: number;
  status: 'success' | 'warning' | 'danger';
  trend?: 'up' | 'down' | 'flat';
  description: string;
}

/** Factory Efficiency % = (total_output × weighted_smv) / (total_manpower × working_mins) × 100 */
export function calcFactoryEfficiency(input: KPIInput): number {
  const denom = input.totalManpower * input.totalWorkingMinutes;
  if (denom === 0) return 0;
  return (input.totalOutput * input.weightedSmv) / denom * 100;
}

/** Overall Labor Productivity = total_output / total_operators */
export function calcLaborProductivity(input: KPIInput): number {
  if (input.presentOperators === 0) return 0;
  return input.totalOutput / input.presentOperators;
}

/** Cost per SAM = total_labor_cost / total_sam_produced */
export function calcCostPerSAM(input: KPIInput): number {
  if (!input.totalSamProduced || input.totalSamProduced === 0) return 0;
  return (input.totalLaborCost ?? 0) / input.totalSamProduced;
}

/** Man to Machine Ratio = total_operators / total_machines */
export function calcManToMachineRatio(input: KPIInput): number {
  if (input.totalMachines === 0) return 0;
  return input.totalManpower / input.totalMachines;
}

/** Cut to Ship Ratio = shipped_qty / cut_qty × 100 */
export function calcCutToShipRatio(input: KPIInput): number {
  if (!input.cutQty || input.cutQty === 0) return 0;
  return ((input.shippedQty ?? 0) / input.cutQty) * 100;
}

/** Order to Ship Ratio = shipped_qty / ordered_qty × 100 */
export function calcOrderToShipRatio(input: KPIInput): number {
  if (!input.orderedQty || input.orderedQty === 0) return 0;
  return ((input.shippedQty ?? 0) / input.orderedQty) * 100;
}

/** On Time Delivery % = on_time_orders / total_orders × 100 */
export function calcOnTimeDelivery(input: KPIInput): number {
  if (!input.totalOrders || input.totalOrders === 0) return 0;
  return ((input.onTimeOrders ?? 0) / input.totalOrders) * 100;
}

/** RFT (Right First Time) % = (checked - defects) / checked × 100 */
export function calcRFT(input: KPIInput): number {
  if (input.totalChecked === 0) return 0;
  return ((input.totalChecked - input.totalDefects) / input.totalChecked) * 100;
}

/** DHU % = defects / checked × 100 */
export function calcDHU(input: KPIInput): number {
  if (input.totalChecked === 0) return 0;
  return (input.totalDefects / input.totalChecked) * 100;
}

/** Lost Time % = (downtime + npt) / available_mins × 100 */
export function calcLostTime(input: KPIInput): number {
  if (input.totalWorkingMinutes === 0) return 0;
  return ((input.totalDowntimeMinutes + input.totalNptMinutes) / input.totalWorkingMinutes) * 100;
}

/** Absenteeism % = (planned - present) / planned × 100 */
export function calcAbsenteeism(input: KPIInput): number {
  if (input.plannedOperators === 0) return 0;
  return ((input.plannedOperators - input.presentOperators) / input.plannedOperators) * 100;
}

/** Employee Turnover % = separations / avg_headcount × 100 */
export function calcEmployeeTurnover(input: KPIInput): number {
  if (!input.avgHeadcount || input.avgHeadcount === 0) return 0;
  return ((input.separations ?? 0) / input.avgHeadcount) * 100;
}

/** Capacity Utilization % = (working_mins - downtime - npt) / working_mins × 100 */
export function calcCapacityUtilization(input: KPIInput): number {
  if (input.totalWorkingMinutes === 0) return 0;
  return ((input.totalWorkingMinutes - input.totalDowntimeMinutes - input.totalNptMinutes) / input.totalWorkingMinutes) * 100;
}

/** Achievement % = actual_output / target × 100 */
export function calcAchievement(input: KPIInput): number {
  if (input.totalTarget === 0) return 0;
  return (input.totalOutput / input.totalTarget) * 100;
}

/** Productivity per Machine = output / machines */
export function calcProductivityPerMachine(input: KPIInput): number {
  if (input.totalMachines === 0) return 0;
  return input.totalOutput / input.totalMachines;
}

/** Productivity per Labor = output / (operators + helpers) */
export function calcProductivityPerLabor(input: KPIInput): number {
  if (input.totalManpower === 0) return 0;
  return input.totalOutput / input.totalManpower;
}

/** Takt Time (seconds) = available_seconds / required_output */
export function calcTaktTime(input: KPIInput): number {
  if (input.totalTarget === 0) return 0;
  return (input.totalWorkingMinutes * 60) / input.totalTarget;
}

/** NPT % = npt_minutes / working_minutes × 100 */
export function calcNPT(input: KPIInput): number {
  if (input.totalWorkingMinutes === 0) return 0;
  return (input.totalNptMinutes / input.totalWorkingMinutes) * 100;
}

function getStatus(value: number, target: number, invert = false): 'success' | 'warning' | 'danger' {
  const ratio = invert ? target / Math.max(value, 0.01) : value / Math.max(target, 0.01);
  if (ratio >= 0.9) return 'success';
  if (ratio >= 0.7) return 'warning';
  return 'danger';
}

export function computeAllKPIs(input: KPIInput, targets?: Partial<Record<string, number>>): KPIResult[] {
  const t = targets ?? {};
  return [
    {
      key: 'factory_efficiency',
      label: 'Factory Efficiency',
      value: round2(calcFactoryEfficiency(input)),
      unit: '%',
      target: t.factory_efficiency ?? 65,
      status: getStatus(calcFactoryEfficiency(input), t.factory_efficiency ?? 65),
      description: 'Overall production efficiency across all lines',
    },
    {
      key: 'labor_productivity',
      label: 'Labor Productivity',
      value: round2(calcLaborProductivity(input)),
      unit: 'pcs/person',
      target: t.labor_productivity,
      status: getStatus(calcLaborProductivity(input), t.labor_productivity ?? 20),
      description: 'Output per operator',
    },
    {
      key: 'cost_per_sam',
      label: 'Cost per SAM',
      value: round2(calcCostPerSAM(input)),
      unit: '$',
      target: t.cost_per_sam,
      status: getStatus(calcCostPerSAM(input), t.cost_per_sam ?? 0.05, true),
      description: 'Labor cost per standard allowed minute',
    },
    {
      key: 'man_to_machine',
      label: 'Man:Machine Ratio',
      value: round2(calcManToMachineRatio(input)),
      unit: ':1',
      target: t.man_to_machine,
      status: 'success',
      description: 'Operators per machine',
    },
    {
      key: 'cut_to_ship',
      label: 'Cut to Ship',
      value: round2(calcCutToShipRatio(input)),
      unit: '%',
      target: t.cut_to_ship ?? 98,
      status: getStatus(calcCutToShipRatio(input), t.cut_to_ship ?? 98),
      description: 'Shipped vs cut quantity ratio',
    },
    {
      key: 'order_to_ship',
      label: 'Order to Ship',
      value: round2(calcOrderToShipRatio(input)),
      unit: '%',
      target: t.order_to_ship ?? 98,
      status: getStatus(calcOrderToShipRatio(input), t.order_to_ship ?? 98),
      description: 'Shipped vs ordered quantity ratio',
    },
    {
      key: 'on_time_delivery',
      label: 'On Time Delivery',
      value: round2(calcOnTimeDelivery(input)),
      unit: '%',
      target: t.on_time_delivery ?? 95,
      status: getStatus(calcOnTimeDelivery(input), t.on_time_delivery ?? 95),
      description: 'Orders delivered on schedule',
    },
    {
      key: 'rft',
      label: 'Right First Time',
      value: round2(calcRFT(input)),
      unit: '%',
      target: t.rft ?? 90,
      status: getStatus(calcRFT(input), t.rft ?? 90),
      description: 'Pass rate without rework',
    },
    {
      key: 'dhu',
      label: 'DHU %',
      value: round2(calcDHU(input)),
      unit: '%',
      target: t.dhu ?? 5,
      status: getStatus(calcDHU(input), t.dhu ?? 5, true),
      description: 'Defects per hundred units',
    },
    {
      key: 'lost_time',
      label: 'Lost Time',
      value: round2(calcLostTime(input)),
      unit: '%',
      target: t.lost_time ?? 10,
      status: getStatus(calcLostTime(input), t.lost_time ?? 10, true),
      description: 'Total non-productive + downtime',
    },
    {
      key: 'absenteeism',
      label: 'Absenteeism',
      value: round2(calcAbsenteeism(input)),
      unit: '%',
      target: t.absenteeism ?? 5,
      status: getStatus(calcAbsenteeism(input), t.absenteeism ?? 5, true),
      description: 'Worker attendance gap',
    },
    {
      key: 'employee_turnover',
      label: 'Employee Turnover',
      value: round2(calcEmployeeTurnover(input)),
      unit: '%',
      target: t.employee_turnover ?? 5,
      status: getStatus(calcEmployeeTurnover(input), t.employee_turnover ?? 5, true),
      description: 'Staff leaving rate',
    },
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
