import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={`${item.label}-${index}`}>
          {item.href ? <Link to={item.href} className="transition hover:text-slate-900">{item.label}</Link> : <span className="text-slate-900">{item.label}</span>}
          {index < items.length - 1 ? <ChevronRight className="h-4 w-4" /> : null}
        </div>
      ))}
    </nav>
  );
}
