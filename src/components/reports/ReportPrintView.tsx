import React, { forwardRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReportPrintViewProps {
  report: {
    name: string;
    type: string;
    date: string;
    format: string;
  };
}

const sampleData: Record<string, { columns: string[]; rows: string[][] }> = {
  'Daily Output Report': {
    columns: ['Line', 'Style', 'Target', 'Output', 'Efficiency %', 'Status'],
    rows: [
      ['Line 1', 'ST-1024', '500', '478', '87.2%', 'On Track'],
      ['Line 2', 'ST-1031', '450', '412', '82.5%', 'At Risk'],
      ['Line 3', 'ST-1018', '520', '535', '94.1%', 'On Track'],
      ['Line 4', 'ST-1027', '480', '390', '72.8%', 'Behind'],
      ['Line 5', 'ST-1033', '500', '510', '91.6%', 'On Track'],
    ],
  },
  'Shipment Tracker': {
    columns: ['Order #', 'Buyer', 'Style', 'Qty', 'Ship Date', 'Status'],
    rows: [
      ['ORD-4521', 'H&M', 'ST-1024', '12,000', 'Mar 15, 2026', 'On Track'],
      ['ORD-4522', 'Zara', 'ST-1031', '8,500', 'Mar 12, 2026', 'Delayed'],
      ['ORD-4523', 'GAP', 'ST-1018', '15,000', 'Mar 20, 2026', 'On Track'],
      ['ORD-4524', 'Uniqlo', 'ST-1027', '6,000', 'Mar 18, 2026', 'At Risk'],
    ],
  },
  'Delay Analysis': {
    columns: ['Reason', 'Occurrences', 'Total Minutes', 'Lines Affected', '% of Working Time'],
    rows: [
      ['Machine Breakdown', '8', '245', '4', '3.2%'],
      ['No Feeding', '5', '180', '3', '2.4%'],
      ['Power Failure', '2', '120', 'All', '1.6%'],
      ['Style Changeover', '3', '210', '3', '2.8%'],
      ['Quality Issue', '4', '95', '2', '1.3%'],
    ],
  },
  'Line Efficiency Summary': {
    columns: ['Line', 'SMV', 'Operators', 'Target', 'Output', 'Efficiency %', 'DHU %'],
    rows: [
      ['Line 1', '8.5', '35', '500', '478', '87.2%', '2.1%'],
      ['Line 2', '12.3', '42', '450', '412', '82.5%', '3.8%'],
      ['Line 3', '6.8', '30', '520', '535', '94.1%', '1.5%'],
      ['Line 4', '9.2', '38', '480', '390', '72.8%', '4.2%'],
      ['Line 5', '7.5', '32', '500', '510', '91.6%', '1.9%'],
    ],
  },
  'Machine Status Report': {
    columns: ['Machine ID', 'Type', 'Line', 'Status', 'Last Service', 'Next Service'],
    rows: [
      ['MC-001', 'Lockstitch', 'Line 1', 'Running', 'Feb 28', 'Mar 28'],
      ['MC-002', 'Overlock', 'Line 1', 'Running', 'Mar 01', 'Mar 31'],
      ['MC-003', 'Flatlock', 'Line 2', 'Down', 'Feb 15', 'Overdue'],
      ['MC-004', 'Bartack', 'Line 3', 'Running', 'Mar 05', 'Apr 05'],
      ['MC-005', 'Button Hole', 'Line 4', 'Maintenance', 'Mar 07', 'Mar 08'],
    ],
  },
  'QC Summary': {
    columns: ['Line', 'Checked', 'Defects', 'DHU %', 'Rework', 'RFT %', 'Pass Rate'],
    rows: [
      ['Line 1', '478', '10', '2.1%', '8', '97.9%', '98.3%'],
      ['Line 2', '412', '16', '3.8%', '12', '96.2%', '96.1%'],
      ['Line 3', '535', '8', '1.5%', '5', '98.5%', '99.1%'],
      ['Line 4', '390', '18', '4.2%', '14', '95.8%', '95.4%'],
      ['Line 5', '510', '10', '1.9%', '7', '98.1%', '98.6%'],
    ],
  },
  'Buyer Performance': {
    columns: ['Buyer', 'Orders', 'Total Qty', 'Delivered', 'On-Time %', 'Quality Score'],
    rows: [
      ['H&M', '12', '144,000', '98,000', '92%', 'A'],
      ['Zara', '8', '68,000', '45,000', '85%', 'B+'],
      ['GAP', '15', '180,000', '160,000', '96%', 'A+'],
      ['Uniqlo', '6', '36,000', '28,000', '88%', 'B'],
    ],
  },
  'Inventory Snapshot': {
    columns: ['Item', 'Category', 'In Stock', 'Reserved', 'Available', 'Reorder Level'],
    rows: [
      ['Denim Fabric 12oz', 'Fabric', '25,000 yds', '18,000 yds', '7,000 yds', '5,000 yds'],
      ['YKK Zipper #5', 'Trims', '50,000 pcs', '32,000 pcs', '18,000 pcs', '10,000 pcs'],
      ['Rivets Antique Brass', 'Trims', '120,000 pcs', '80,000 pcs', '40,000 pcs', '20,000 pcs'],
      ['Care Labels', 'Labels', '200,000 pcs', '150,000 pcs', '50,000 pcs', '30,000 pcs'],
    ],
  },
};

const ReportPrintView = forwardRef<HTMLDivElement, ReportPrintViewProps>(({ report }, ref) => {
  const data = sampleData[report.name] || sampleData['Daily Output Report'];

  return (
    <div ref={ref} className="print-report p-8 bg-white text-black max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-black">Factory MIS</h1>
            <p className="text-sm text-gray-600">Manufacturing Intelligence System</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
            <p className="text-xs text-gray-500">Format: {report.format.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-black">{report.name}</h2>
        <div className="flex gap-4 mt-1">
          <span className="text-sm text-gray-600">Category: {report.type}</span>
          <span className="text-sm text-gray-600">Date: {report.date}</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="mb-8">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {data.columns.map((col) => (
                <th key={col} className="border border-gray-400 bg-gray-100 px-3 py-2 text-left font-semibold text-black text-xs">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-gray-300 px-3 py-1.5 text-xs text-black">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 mt-8">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Factory MIS — Confidential</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
});

ReportPrintView.displayName = 'ReportPrintView';

export default ReportPrintView;
