import { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"><div className="grid gap-3 lg:grid-cols-5">{children}</div></div>;
}
