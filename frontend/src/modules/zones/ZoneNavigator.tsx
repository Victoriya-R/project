import { Link } from 'react-router-dom';
import { Equipment, SwitchCabinet, Zone } from '../../types/entities';
import { StatusBadge } from '../../components/common/StatusBadge';

export function ZoneNavigator({ zones, cabinets, equipment }: { zones: Zone[]; cabinets: SwitchCabinet[]; equipment: Equipment[] }) {
  return (
    <div className="space-y-4">
      {zones.map((zone) => {
        const zoneCabinets = cabinets.filter((cabinet) => cabinet.zone_id === zone.id);
        return (
          <div key={zone.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Zone</p>
                <h3 className="text-lg font-semibold text-slate-900">{zone.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{zone.description}</p>
              </div>
              <Link to={`/zones/${zone.id}`} className="text-sm font-medium text-brand-600">Open zone</Link>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {zoneCabinets.map((cabinet) => {
                const items = equipment.filter((item) => item.switch_cabinet_id === cabinet.id);
                return (
                  <div key={cabinet.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{cabinet.name}</p>
                        <p className="text-xs text-slate-500">{items.length} assets in rack</p>
                      </div>
                      <Link to={`/switch-cabinets/${cabinet.id}`} className="text-sm font-medium text-brand-600">Rack view</Link>
                    </div>
                    <div className="mt-4 space-y-2">
                      {items.map((item) => (
                        <Link key={item.id} to={`/equipment/${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50/50">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.model}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
