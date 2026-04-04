import { Download, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { InfoCard } from '../components/common/InfoCard';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { reportsApi } from '../services/api/client';
import { buildReportCsv, buildReportPdf, ReportTab, triggerFileDownload } from '../modules/reports/export';

export function ReportsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as ReportTab | null) ?? 'equipment';
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const equipment = useApiQuery({ queryKey: ['report-equipment'], queryFn: reportsApi.equipmentStatus });
  const cabinets = useApiQuery({ queryKey: ['report-cabinets'], queryFn: reportsApi.switchCabinets });
  const zones = useApiQuery({ queryKey: ['report-zones'], queryFn: reportsApi.zones });
  const zoneLoad = useApiQuery({ queryKey: ['report-zones-load'], queryFn: reportsApi.zonesLoad });

  const tabs = [
    { key: 'equipment', label: t('reports.tab.equipment') },
    { key: 'cabinets', label: t('reports.tab.cabinets') },
    { key: 'zones', label: t('reports.tab.zones') },
    { key: 'zone-load', label: t('reports.tab.zoneLoad') }
  ];

  const reportDataByTab = useMemo(() => ({
    equipment: equipment.data?.data ?? [],
    cabinets: cabinets.data?.data ?? [],
    zones: zones.data?.data ?? [],
    'zone-load': zoneLoad.data?.data ?? []
  }), [equipment.data?.data, cabinets.data?.data, zones.data?.data, zoneLoad.data?.data]);

  const meta = equipment.data?.meta ?? cabinets.data?.meta ?? zones.data?.meta ?? zoneLoad.data?.meta;

  const handleCsvExport = async () => {
    setIsExportingCsv(true);

    try {
      const csvContent = buildReportCsv(tab, reportDataByTab[tab]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      triggerFileDownload(blob, `report-${tab}.csv`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handlePdfExport = async () => {
    setIsExportingPdf(true);

    try {
      const pdfContent = buildReportPdf(tab, reportDataByTab[tab]);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      triggerFileDownload(blob, `report-${tab}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.reports') }]} />}
        actions={(
          <>
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={handleCsvExport}
              disabled={isExportingCsv}
              aria-label={`${t('common.exportCsv')} ${tabs.find((item) => item.key === tab)?.label ?? tab}`}
              aria-busy={isExportingCsv}
            >
              {isExportingCsv ? t('common.processing') : t('common.exportCsv')}
            </Button>
            <Button
              variant="secondary"
              icon={<FileText className="h-4 w-4" />}
              onClick={handlePdfExport}
              disabled={isExportingPdf}
              aria-label={`${t('common.downloadPdf')} ${tabs.find((item) => item.key === tab)?.label ?? tab}`}
              aria-busy={isExportingPdf}
            >
              {isExportingPdf ? t('common.processing') : t('common.downloadPdf')}
            </Button>
          </>
        )}
      />
      <MockBanner meta={meta} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setParams({ tab: item.key })} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === item.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'equipment' ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title={t('reports.typesCovered')} value={String(equipment.data?.data.length ?? 0)} description={t('reports.typesCoveredDesc')} />
            <InfoCard title={t('reports.activeAssets')} value={String(equipment.data?.data.reduce((sum, item) => sum + item.active_count, 0) ?? 0)} description={t('reports.activeAssetsDesc')} />
            <InfoCard title={t('reports.maintenanceAssets')} value={String(equipment.data?.data.reduce((sum, item) => sum + item.maintenance_count, 0) ?? 0)} description={t('reports.maintenanceAssetsDesc')} />
          </div>
          <DataTable columns={[{ key: 'type', header: t('equipment.type'), render: (row) => row.type }, { key: 'total', header: t('reports.total'), render: (row) => row.total_count }, { key: 'active', header: t('status.active'), render: (row) => row.active_count }, { key: 'inactive', header: t('reports.inactive'), render: (row) => row.inactive_count }, { key: 'maintenance', header: t('reports.maintenance'), render: (row) => row.maintenance_count }]} data={equipment.data?.data ?? []} />
        </div>
      ) : null}
      {tab === 'cabinets' ? <DataTable columns={[{ key: 'name', header: t('equipment.rack'), render: (row) => row.name }, { key: 'zone', header: t('equipment.zone'), render: (row) => row.zone_name ?? '—' }, { key: 'equipment', header: t('reports.equipment'), render: (row) => row.equipment_count }, { key: 'weight', header: t('reports.weightLoad'), render: (row) => `${row.current_weight}/${row.weight_limit}` }, { key: 'energy', header: t('reports.energyLoad'), render: (row) => `${row.current_energy_consumption}/${row.energy_limit}` }]} data={cabinets.data?.data ?? []} /> : null}
      {tab === 'zones' ? <DataTable columns={[{ key: 'name', header: t('equipment.zone'), render: (row) => row.name }, { key: 'racks', header: t('reports.racks'), render: (row) => row.switch_cabinet_count }, { key: 'equipment', header: t('reports.equipment'), render: (row) => row.equipment_count }, { key: 'weight', header: t('reports.totalWeight'), render: (row) => row.total_equipment_weight }, { key: 'energy', header: t('reports.energy'), render: (row) => row.total_energy_consumption }]} data={zones.data?.data ?? []} /> : null}
      {tab === 'zone-load' ? <DataTable columns={[{ key: 'zone', header: t('equipment.zone'), render: (row) => row.zone_name }, { key: 'racks', header: t('reports.racks'), render: (row) => row.switch_cabinet_count }, { key: 'weight', header: t('reports.weightPercent'), render: (row) => `${row.weight_load_percent}%` }, { key: 'energy', header: t('reports.energyPercent'), render: (row) => `${row.energy_load_percent}%` }, { key: 'overload', header: t('reports.overloadedRacks'), render: (row) => row.overloaded_by_energy_cabinets + row.overloaded_by_weight_cabinets }]} data={zoneLoad.data?.data ?? []} /> : null}
    </div>
  );
}
