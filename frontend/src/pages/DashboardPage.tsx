import { Activity, Cable, Cpu, MapPinned, ShieldCheck, SquareStack } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApiQuery';
import { dashboardApi } from '../services/api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { InfoCard } from '../components/common/InfoCard';
import { LoadingState } from '../components/common/LoadingState';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { RecentActivityFeed } from '../modules/dashboard/RecentActivityFeed';

export function DashboardPage() {
  const query = useApiQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.getOverview });

  if (query.isLoading) return <LoadingState label="Preparing dashboard overview..." />;
  if (!query.data) return null;

  const { counts, recentActivity, quickLinks } = query.data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of data center assets, infrastructure health and the most frequent navigation entry points for operators."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard' }]} />}
        actions={<><Button variant="secondary">Export snapshot</Button><Button>New asset</Button></>}
      />
      <MockBanner meta={query.data.meta} />
      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard title="Equipment" value={String(counts.equipment)} description="Servers, patch panels and related assets" icon={<Cpu className="h-5 w-5" />} />
        <InfoCard title="Switch cabinets" value={String(counts.switchCabinets)} description="Racks with live load monitoring" icon={<SquareStack className="h-5 w-5" />} />
        <InfoCard title="Zones" value={String(counts.zones)} description="Placement domains and location context" icon={<MapPinned className="h-5 w-5" />} />
        <InfoCard title="UPS" value={String(counts.ups)} description="Power backup assets with power and patch ports" icon={<ShieldCheck className="h-5 w-5" />} />
        <InfoCard title="Cables" value={String(counts.cables)} description="Managed by type, length and compatibility" icon={<Cable className="h-5 w-5" />} />
        <InfoCard title="Connections" value={String(counts.connections)} description="Tracked connections across available ports" icon={<Activity className="h-5 w-5" />} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
                <p className="mt-1 text-sm text-slate-500">Primary enterprise flows for manual testing and operational routines.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[{ label: 'Add equipment', href: '/equipment' }, { label: 'Review rack layout', href: '/switch-cabinets' }, { label: 'Create connection', href: '/connections' }, { label: 'Open UPS details', href: '/ups' }, { label: 'Navigate by zone', href: '/zones' }, { label: 'Run reports', href: '/reports' }].map((action) => (
                <Link key={action.label} to={action.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">{action.label}</Link>
              ))}
            </div>
          </div>
          <RecentActivityFeed items={recentActivity} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Reports shortcuts</h3>
          <p className="mt-1 text-sm text-slate-500">Prepared entry points for analysts and administrators.</p>
          <div className="mt-4 space-y-3">
            {quickLinks.map((item) => (
              <Link key={item.label} to={item.href} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                <span>{item.label}</span>
                <span>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
