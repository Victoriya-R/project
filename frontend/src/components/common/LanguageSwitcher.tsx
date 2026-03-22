import { Languages } from 'lucide-react';
import { useI18n } from '../../i18n/provider';
import { cn } from '../../utils/cn';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      <div className="px-2 text-slate-500"><Languages className="h-4 w-4" /></div>
      {(['ru', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', language === item ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
        >
          {item === 'ru' ? t('language.russian') : t('language.english')}
        </button>
      ))}
    </div>
  );
}
