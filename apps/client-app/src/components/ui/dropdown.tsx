import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  key: string;
  label: ReactNode;
  active?: boolean;
  onClick: () => void;
}

interface Props {
  label: ReactNode;
  open: boolean;
  onToggle: () => void;
  options: DropdownOption[];
  title?: string;
  icon?: ReactNode;
  compact?: boolean;
  align?: 'left' | 'right';
}

export function Dropdown({
  label,
  open,
  onToggle,
  options,
  title,
  icon,
  compact = false,
  align = 'left',
}: Props) {
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={[
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-600 bg-slate-900 px-2.5 text-xs text-slate-100',
          'hover:border-slate-500 hover:bg-slate-800',
          compact ? 'px-2' : '',
        ].join(' ')}
      >
        {icon}
        <span className="max-w-[190px] truncate">{label}</span>
        <ChevronDown size={12} />
      </button>
      {open ? (
        <div
          className={[
            'absolute z-20 mt-1 min-w-[170px] overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
          onClick={(event) => event.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={[
                'block w-full px-2.5 py-1.5 text-left text-xs text-slate-200 transition-colors',
                option.active ? 'bg-slate-800 text-sky-300' : 'hover:bg-slate-800',
              ].join(' ')}
              onClick={option.onClick}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
