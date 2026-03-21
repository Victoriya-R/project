import { Equipment, SwitchCabinet } from '../../types/entities';
import { formatNumber, formatPercent } from '../../utils/format';
import { StatusBadge } from '../../components/common/StatusBadge';

function RackUnit({ item, unit }: { item?: Equipment; unit: number }) {
  return (
    <div className={`grid grid-cols-[56px_1fr] items-center gap-3 rounded-xl border p-2 ${item ? 'border-brand-100 bg-brand-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="rounded-lg bg-slate-950 px-2 py-2 text-center text-xs font-semibold text-white">U{unit}</div>
      {item ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">{item.model}</span>
            <StatusBadge status={item.status} />
          </div>
        </div>
      ) : (
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Available slot</p>
      )}
    </div>
  );
}

export function RackVisualizer({ cabinet }: { cabinet: SwitchCabinet }) {
  const units = Array.from({ length: 12 }).map((_, index) => ({ unit: 12 - index, equipment: cabinet.equipment?.[index] }));
  const currentWeight = cabinet.equipment?.reduce((sum, item) => sum + Number(item.weight ?? 0), 0) ?? 0;
  const currentEnergy = cabinet.equipment?.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0) ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-4 shadow-soft">
        <div className="rounded-[22px] bg-slate-800 p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>{cabinet.name}</span>
            <span>{cabinet.serial_number}</span>
          </div>
          <div className="space-y-2">
            {units.map((slot) => <RackUnit key={slot.unit} unit={slot.unit} item={slot.equipment} />)}
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Capacity overview</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">Weight usage</span><span className="font-medium text-slate-900">{formatNumber(currentWeight, ' kg')} / {formatNumber(cabinet.weight, ' kg')}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min((currentWeight / cabinet.weight) * 100, 100)}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">Load: {formatPercent((currentWeight / cabinet.weight) * 100)}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">Energy usage</span><span className="font-medium text-slate-900">{formatNumber(currentEnergy, ' W')} / {formatNumber(cabinet.energy_limit, ' W')}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${(currentEnergy / cabinet.energy_limit) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((currentEnergy / cabinet.energy_limit) * 100, 100)}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">Load: {formatPercent((currentEnergy / cabinet.energy_limit) * 100)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Warnings</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>{currentWeight > cabinet.weight ? '⚠️ Weight limit exceeded' : '✅ Weight limit is within configured threshold.'}</li>
            <li>{currentEnergy > cabinet.energy_limit ? '⚠️ Energy limit exceeded' : '✅ Energy load is within configured threshold.'}</li>
            <li>Future-ready layout: rack view already reserves unit slots so backend can later support unit-based placement.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
