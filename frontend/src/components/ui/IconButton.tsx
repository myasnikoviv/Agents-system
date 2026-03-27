import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function IconButton({ active = false, className = '', children, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full border text-slate-300 transition-colors',
        active ? 'border-sky-500 bg-sky-900/40 text-sky-100' : 'border-slate-600 bg-slate-800 hover:bg-slate-700',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
