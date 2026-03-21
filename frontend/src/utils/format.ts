export const formatNumber = (value: number | null | undefined, suffix = '') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('ru-RU').format(Number(value)) + suffix;
};

export const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(0)}%`;
};

export const safeDateLabel = (value: string) => value;
