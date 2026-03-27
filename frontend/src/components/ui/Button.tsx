import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    'border-blue-600 bg-blue-700 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700',
  ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-slate-800',
};

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`h-9 rounded-md border px-3 text-sm font-semibold transition-colors ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
