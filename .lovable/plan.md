

# Factory Level KPIs — Implementation Plan

The project is still at the blank starter stage — no database, no auth, no pages have been built yet. Given the extensive scope discussed across previous messages (full MES system with 120+ MIS reports, operator grades, style changeovers, etc.), I'll build the **foundational infrastructure + Factory KPI Dashboard** as the first deliverable.

---

## What Gets Built

### 1. Supabase Database Schema (Core Tables + Factory KPIs)

**Tables:**
- `factories` — id, name, location, created_at
- `floors` — id, factory_id (FK), name, floor_index
- `lines` — id, floor_id (FK), line_number, type, machine_count, operator_count, helper_count, ie_name, supervisor, is_active
- `styles` — id, style_no, buyer, product_category (enum), smv, sam, target_efficiency, operation_count
- `production_plans` — id, date, line_id, style_id, target_qty, working_hours, planned_efficiency, target_efficiency, ie_person_id, production_manager_id, planned_operators, planned_helpers
- `hourly_production` — id, plan_id, hour_slot, produced_qty, defects, rework, checked_qty, downtime_minutes, npt_minutes, operators_present, helpers_present, downtime_reason
- `downtime` — id, line_id, plan_id, reason, minutes, occurred_at
- `profiles` — id (FK auth.users), full_name, phone, factory_id
- `user_roles` — id, user_id (FK), role (admin/manager/line_chief/operator)
- `operators` — id, name, employee_no, grade (A/B/C/D), line_id, factory_id, is_active
- `style_changeovers` — id, line_id, from_style_id, to_style_id, changeover_date, hours_lost, learning_curve_days
- `factory_daily_summary` — id, factory_id, date, total_output, total_target, efficiency_pct, dhu_pct, absenteeism_pct, npt_pct, rft_pct, cut_to_ship_ratio, on_time_delivery_pct, employee_turnover_pct, cost_per_sam, man_to_machine_ratio, lost_time_pct

**Enums:** `app_role`, `product_category` (11 garment types), `operator_grade`, `downtime_reason_type`

**RLS:** Enabled on all tables with `has_role()` security definer function.

### 2. KPI Calculation Engine (`src/lib/kpi.ts`)

All 12 Factory-Level KPIs with formulas:

| KPI | Formula |
|-----|---------|
| Factory Efficiency % | (total_output × weighted_smv) / (total_manpower × working_mins) × 100 |
| Overall Labor Productivity | total_output / total_operators |
| Cost per SAM | total_labor_cost / total_sam_produced |
| Man to Machine Ratio | total_operators / total_machines |
| Cut to Ship Ratio | shipped_qty / cut_qty × 100 |
| Order to Ship Ratio | shipped_qty / ordered_qty × 100 |
| On Time Delivery % | on_time_orders / total_orders × 100 |
| RFT (Right First Time) % | (checked - defects) / checked × 100 |
| DHU % | defects / checked × 100 |
| Lost Time % | (downtime + npt) / available_mins × 100 |
| Absenteeism % | (planned - present) / planned × 100 |
| Employee Turnover % | separations / avg_headcount × 100 |

### 3. App Layout & Navigation

- **Sidebar** with sections: Dashboard, Production Planning, Data Entry, Reports, MIS, Admin
- **Top bar** with factory selector dropdown, date picker, user menu
- Role-based menu visibility

### 4. Factory KPI Dashboard Page (`/dashboard`)

- **KPI Cards Grid** (3×4 grid) — each card shows: metric name, current value, target value, trend arrow (↑↓), color coding (green ≥90% of target, yellow 70-89%, red <70%)
- **Line Status Table** — all lines with style, target, output, efficiency, status
- **Efficiency Trend Chart** (Recharts line chart) — day-wise trend for selected date range
- **Downtime Pareto** (Recharts bar chart) — sorted by reason

### 5. Auth & Role-Based Routing

- Login/signup pages with email auth
- Protected routes with role checks
- Redirect based on role after login

---

## File Structure

```text
src/
├── lib/kpi.ts                    # KPI calculation functions
├── types/database.ts             # All TypeScript types
├── contexts/AuthContext.tsx       # Auth state & role management
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx         # Sidebar + topbar shell
│   │   ├── AppSidebar.tsx        # Navigation sidebar
│   │   └── TopBar.tsx            # Factory selector, date, user menu
│   ├── kpi/
│   │   ├── KPICard.tsx           # Single KPI card with target comparison
│   │   └── KPIGrid.tsx           # 3×4 responsive grid of KPI cards
│   └── charts/
│       ├── EfficiencyTrendChart.tsx
│       └── DowntimeParetoChart.tsx
├── pages/
│   ├── Auth.tsx                  # Login/Signup
│   ├── Dashboard.tsx             # Factory KPI dashboard
│   └── Index.tsx                 # Redirect to dashboard or auth
```

---

## Build Order

1. **Supabase setup** — Create all tables, enums, RLS policies, seed sample factory data
2. **Types + KPI engine** — TypeScript types and all 12 KPI calculation functions
3. **Auth** — Login page, AuthContext, protected routes
4. **App layout** — Sidebar navigation, top bar with factory/date selectors
5. **KPI Dashboard** — KPI cards grid with all 12 metrics, line status table, efficiency trend chart, downtime pareto chart

This establishes the complete foundation that all subsequent features (hourly data entry, production planning, MIS reports, TV display) will build on.

