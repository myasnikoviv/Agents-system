import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-sky-500 ${className}`.trim()}
      {...props}
    />
  );
}
