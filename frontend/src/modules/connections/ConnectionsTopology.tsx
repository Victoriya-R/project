import { useEffect, useMemo, useRef, useState } from 'react';
import { Cable, Connection, Equipment, Port } from '../../types/entities';
import { useI18n } from '../../i18n/provider';
import { cn } from '../../utils/cn';

function PortTypeIcon({ type }: { type: Port['port_type'] }) {
  if (type === 'power') {
    return (
      <div className="relative h-10 w-10 rounded-[18px] border-2 border-slate-700 bg-slate-100">
        <span className="absolute left-[11px] top-[11px] h-4 w-1.5 rounded-full bg-slate-700" />
        <span className="absolute right-[11px] top-[11px] h-4 w-1.5 rounded-full bg-slate-700" />
        <span className="absolute bottom-[8px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 rounded-md border-2 border-slate-700 bg-slate-100">
      <span className="absolute inset-x-1.5 top-1.5 h-4 rounded-sm bg-slate-700" />
      <span className="absolute left-[7px] top-[22px] h-2.5 w-1 rounded-full bg-slate-700" />
      <span className="absolute left-[13px] top-[22px] h-2.5 w-1 rounded-full bg-slate-700" />
      <span className="absolute right-[13px] top-[22px] h-2.5 w-1 rounded-full bg-slate-700" />
      <span className="absolute right-[7px] top-[22px] h-2.5 w-1 rounded-full bg-slate-700" />
    </div>
  );
}

function PortCard({
  port,
  highlighted,
  busy,
  side,
  innerRef
}: {
  port?: Port;
  highlighted: boolean;
  busy: boolean;
  side: 'left' | 'right';
  innerRef?: (node: HTMLDivElement | null) => void;
}) {
  const { t } = useI18n();

  if (!port) {
    return <div className="h-[92px]" />;
  }

  return (
    <div
      ref={innerRef}
      className={cn(
        'flex h-[92px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-soft transition',
        side === 'right' ? 'flex-row-reverse text-right' : '',
        highlighted
          ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200'
          : busy
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-200 bg-white'
      )}
    >
      <PortTypeIcon type={port.port_type} />
      <div className={cn('min-w-0', side === 'right' ? 'text-right' : '')}>
        <p className="font-semibold text-slate-900">{t('ports.port', { number: port.port_number })}</p>
        <p className="text-xs text-slate-500">{t(`cables.type.${port.cable_type}` as const)}</p>
        <p className={cn('mt-1 text-xs font-medium', highlighted ? 'text-emerald-700' : busy ? 'text-amber-700' : 'text-slate-500')}>
          {highlighted ? t('connections.connectedPort') : t(`ports.${port.status}` as const)}
        </p>
      </div>
    </div>
  );
}

export function ConnectionsTopology({
  connection,
  cable,
  sourceDevice,
  targetDevice,
  sourcePorts,
  targetPorts
}: {
  connection: Connection;
  cable?: Cable;
  sourceDevice: Equipment;
  targetDevice: Equipment;
  sourcePorts: Port[];
  targetPorts: Port[];
}) {
  const { t } = useI18n();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sourcePortRef = useRef<HTMLDivElement | null>(null);
  const targetPortRef = useRef<HTMLDivElement | null>(null);
  const [path, setPath] = useState('');
  const [cableBadge, setCableBadge] = useState<{ x: number; y: number } | null>(null);

  const sortedSourcePorts = useMemo(() => [...sourcePorts].sort((left, right) => left.port_number - right.port_number), [sourcePorts]);
  const sortedTargetPorts = useMemo(() => [...targetPorts].sort((left, right) => left.port_number - right.port_number), [targetPorts]);
  const rows = useMemo(() => Array.from({ length: Math.max(sortedSourcePorts.length, sortedTargetPorts.length) }, (_, index) => ({
    source: sortedSourcePorts[index],
    target: sortedTargetPorts[index]
  })), [sortedSourcePorts, sortedTargetPorts]);

  useEffect(() => {
    const updatePath = () => {
      if (!wrapperRef.current || !sourcePortRef.current || !targetPortRef.current) {
        setPath('');
        setCableBadge(null);
        return;
      }

      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const sourceRect = sourcePortRef.current.getBoundingClientRect();
      const targetRect = targetPortRef.current.getBoundingClientRect();
      const startX = sourceRect.right - wrapperRect.left;
      const startY = sourceRect.top - wrapperRect.top + sourceRect.height / 2;
      const endX = targetRect.left - wrapperRect.left;
      const endY = targetRect.top - wrapperRect.top + targetRect.height / 2;
      const middleX = (startX + endX) / 2;
      const controlOffset = Math.max(70, Math.abs(endX - startX) / 3);

      setPath(`M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`);
      setCableBadge({ x: middleX, y: (startY + endY) / 2 });
    };

    updatePath();
    window.addEventListener('resize', updatePath);
    return () => window.removeEventListener('resize', updatePath);
  }, [connection.a_port_id, connection.b_port_id, rows]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {[sourceDevice, targetDevice].map((device) => (
          <div key={device.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(`equipment.type.${device.type}` as const)}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{device.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t('equipment.detail.serial')}: {device.serial}
            </p>
          </div>
        ))}
      </div>

      <div ref={wrapperRef} className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-6">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={cable?.type === 'powerCable' ? '#f59e0b' : '#2563eb'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={cable?.type === 'powerCable' ? '12 10' : undefined}
            />
          ) : null}
        </svg>

        {cableBadge ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-brand-200 bg-white px-4 py-3 text-center shadow-soft"
            style={{ left: cableBadge.x, top: cableBadge.y }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('connections.cable')}</p>
            <p className="mt-1 font-semibold text-slate-900">{cable ? `${t(`cables.type.${cable.type}` as const)} · ${cable.length}m` : `#${connection.cable_id}`}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
          <div className="space-y-3">
            {rows.map((row, index) => (
              <PortCard
                key={`source-${row.source?.id ?? index}`}
                port={row.source}
                side="left"
                busy={row.source?.status === 'busy'}
                highlighted={row.source?.id === connection.a_port_id}
                innerRef={row.source?.id === connection.a_port_id ? (node) => { sourcePortRef.current = node; } : undefined}
              />
            ))}
          </div>

          <div className="hidden lg:block" />

          <div className="space-y-3">
            {rows.map((row, index) => (
              <PortCard
                key={`target-${row.target?.id ?? index}`}
                port={row.target}
                side="right"
                busy={row.target?.status === 'busy'}
                highlighted={row.target?.id === connection.b_port_id}
                innerRef={row.target?.id === connection.b_port_id ? (node) => { targetPortRef.current = node; } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
