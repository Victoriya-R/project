import { EquipmentStatusReportRow, SwitchCabinetReportRow, ZoneLoadReportRow, ZoneReportRow } from '../../types/entities';

export type ReportTab = 'equipment' | 'cabinets' | 'zones' | 'zone-load';

export type ReportDataByTab = {
  equipment: EquipmentStatusReportRow[];
  cabinets: SwitchCabinetReportRow[];
  zones: ZoneReportRow[];
  'zone-load': ZoneLoadReportRow[];
};

export interface ReportColumn {
  key: string;
  header: string;
}

const REPORT_COLUMNS: { [K in ReportTab]: ReportColumn[] } = {
  equipment: [
    { key: 'type', header: 'Type' },
    { key: 'total_count', header: 'Total' },
    { key: 'active_count', header: 'Active' },
    { key: 'inactive_count', header: 'Inactive' },
    { key: 'maintenance_count', header: 'Maintenance' }
  ],
  cabinets: [
    { key: 'name', header: 'Rack' },
    { key: 'zone_name', header: 'Zone' },
    { key: 'equipment_count', header: 'Equipment' },
    { key: 'current_weight', header: 'Current weight' },
    { key: 'weight_limit', header: 'Weight limit' },
    { key: 'current_energy_consumption', header: 'Current energy' },
    { key: 'energy_limit', header: 'Energy limit' }
  ],
  zones: [
    { key: 'name', header: 'Zone' },
    { key: 'switch_cabinet_count', header: 'Racks' },
    { key: 'equipment_count', header: 'Equipment' },
    { key: 'total_equipment_weight', header: 'Total weight' },
    { key: 'total_energy_consumption', header: 'Energy' }
  ],
  'zone-load': [
    { key: 'zone_name', header: 'Zone' },
    { key: 'switch_cabinet_count', header: 'Racks' },
    { key: 'weight_load_percent', header: 'Weight %' },
    { key: 'energy_load_percent', header: 'Energy %' },
    { key: 'overloaded_by_weight_cabinets', header: 'Weight overloaded' },
    { key: 'overloaded_by_energy_cabinets', header: 'Energy overloaded' }
  ]
};

const sanitizeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/"/g, '""');
};

export const getReportColumns = (tab: ReportTab): ReportColumn[] => REPORT_COLUMNS[tab];

export const buildReportCsv = <TTab extends ReportTab>(tab: TTab, rows: ReportDataByTab[TTab]): string => {
  const columns = getReportColumns(tab);
  const header = columns.map((column) => `"${column.header}"`).join(',');
  const body = rows.map((row) => columns.map((column) => `"${sanitizeValue((row as Record<string, unknown>)[column.key])}"`).join(',')).join('\n');

  return body ? `${header}\n${body}` : header;
};

const buildPdfRow = (cells: string[]): string => {
  const escaped = cells.map((cell) => cell.replace(/[()\\]/g, '\\$&'));
  return escaped.join(' | ');
};

const buildPdfContent = (title: string, lines: string[]): string => {
  const contentLines = [title, '', ...lines];
  const textBlocks = contentLines
    .map((line, index) => `1 0 0 1 50 ${770 - index * 18} Tm (${line}) Tj`)
    .join('\n');

  const stream = `BT\n/F1 11 Tf\n${textBlocks}\nET`;

  return `%PDF-1.3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000243 00000 n \n0000000313 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${350 + stream.length}\n%%EOF`;
};

export const buildReportPdf = <TTab extends ReportTab>(tab: TTab, rows: ReportDataByTab[TTab]): string => {
  const columns = getReportColumns(tab);
  const header = buildPdfRow(columns.map((column) => column.header));
  const contentRows = rows.map((row) => buildPdfRow(columns.map((column) => sanitizeValue((row as Record<string, unknown>)[column.key]))));

  return buildPdfContent(`Report: ${tab}`, [header, ...contentRows]);
};

export const triggerFileDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
