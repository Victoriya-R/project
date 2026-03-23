import { cn } from '../../utils/cn';

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  stacked?: boolean;
};

export function BrandMark({ className, imageClassName, titleClassName, stacked = false }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', stacked && 'flex-col text-center', className)}>
      <img
        src="/brand-logo.svg"
        alt="Data Center logo"
        className={cn('h-11 w-11 shrink-0 object-contain', imageClassName)}
      />
      <div className={cn('min-w-0', stacked && 'flex flex-col items-center')}>
        <p className={cn('text-lg font-semibold leading-none text-inherit', titleClassName)}>Data Center</p>
      </div>
    </div>
  );
}
