import { AlertTriangle, CheckCircle2, Clock3, PauseCircle, Wrench } from 'lucide-react';
import { EntityStatus } from '../../types/entities';
import { useI18n } from '../../i18n/provider';
import { cn } from '../../utils/cn';

const styleMap: Record<EntityStatus, { className: string; icon: JSX.Element }> = {
  active: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  inactive: { className: 'bg-slate-100 text-slate-700 ring-slate-200', icon: <PauseCircle className="h-3.5 w-3.5" /> },
  maintenance: { className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: <Wrench className="h-3.5 w-3.5" /> },
  warning: { className: 'bg-rose-50 text-rose-700 ring-rose-200', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  planned: { className: 'bg-blue-50 text-blue-700 ring-blue-200', icon: <Clock3 className="h-3.5 w-3.5" /> }
};

export function StatusBadge({ status }: { status: EntityStatus }) {
  const { t } = useI18n();
  const item = styleMap[status] ?? styleMap.inactive;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', item.className)}>{item.icon}{t(`status.${status}` as const)}</span>;

}
