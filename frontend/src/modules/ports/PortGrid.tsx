import { Cable, PlugZap } from 'lucide-react';
import { useI18n } from '../../i18n/provider';
import { Port } from '../../types/entities';
import { cn } from '../../utils/cn';

export function PortGrid({ ports }: { ports: Port[] }) {

  const { t } = useI18n();
  const patchPorts = ports.filter((port) => port.port_type === 'patch');
  const powerPorts = ports.filter((port) => port.port_type === 'power');

  const renderSection = (title: string, items: Port[], variant: 'patch' | 'power') => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        {variant === 'patch' ? <Cable className="h-4 w-4 text-brand-600" /> : <PlugZap className="h-4 w-4 text-amber-600" />}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((port) => (
          <div key={port.id} className={cn('rounded-xl border p-3 text-sm', port.status === 'busy' ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50')}>
            <p className="font-semibold text-slate-900">{t('ports.port', { number: port.port_number })}</p>
            <p className="mt-1 text-xs text-slate-600">{port.cable_type}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{t(`ports.${port.status}` as const)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {renderSection(t('ports.patch'), patchPorts, 'patch')}
      {renderSection(t('ports.power'), powerPorts, 'power')}

    </div>
  );
}
