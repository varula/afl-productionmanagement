

## Plan: Add File-Type Icons and Print-Friendly PDF Generation to Reports

### What Changes

**1. File-type icons per report**
- Add a `format` field to each report (`'pdf' | 'excel' | 'word'`) in the reports data array
- Replace the generic `FileText` icon with distinct colored icons per format:
  - **PDF**: Red-tinted `FileText` icon (or a custom SVG inline for the PDF look)
  - **Excel**: Green-tinted `Sheet` icon (using Lucide's `Sheet` or `Table2`)
  - **Word**: Blue-tinted `FileType` icon
- Since Lucide doesn't have brand-specific Word/Excel/PDF icons, we'll use visually distinct Lucide icons with color coding and a small format badge label

**2. Generate print-friendly PDF reports**
- Each report's Download button will open a new print-friendly page/dialog showing the report content formatted for PDF output
- Use `window.print()` with a dedicated print-optimized layout (CSS `@media print` styles)
- Create a `ReportPrintView` component that renders a clean, branded report layout with:
  - Factory header / logo area
  - Report title, date, type
  - Report-specific data table (pulling from dashboard/production data where available, or placeholder structured content)
  - Print-friendly styling (no shadows, proper margins, black text)
- Add print CSS to `index.css` with `@media print` rules hiding sidebar, nav, and non-print elements
- The Download button will trigger: render the print view in a dialog/overlay, then call `window.print()`

### Files to Create/Modify

| File | Action |
|---|---|
| `src/pages/ReportsPage.tsx` | Add format field, file-type icons, print button handler |
| `src/components/reports/ReportPrintView.tsx` | **Create** - Print-friendly report layout component |
| `src/index.css` | Add `@media print` styles |

### Report Format Assignments
- Daily Output Report → PDF
- Shipment Tracker → Excel
- Delay Analysis → PDF
- Line Efficiency Summary → Excel
- Machine Status Report → PDF
- QC Summary → PDF
- Buyer Performance → Excel
- Inventory Snapshot → Word

