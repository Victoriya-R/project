import { RecentActivity } from '../../types/entities';
import { StatusBadge } from '../../components/common/StatusBadge';

export function RecentActivityFeed({ items }: { items: RecentActivity[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Recent changes</h3>
        <span className="text-sm text-slate-500">Live audit style feed</span>
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.entity} · {item.time}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
