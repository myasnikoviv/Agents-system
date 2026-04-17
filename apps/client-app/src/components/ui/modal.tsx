import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy: string;
}

export function Modal({ title, subtitle, children, footer, labelledBy }: Props) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-2xl shadow-slate-950/60">
        <div>
          <h3 id={labelledBy} className="m-0 text-base font-semibold text-slate-100">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col gap-2">{children}</div>
        {footer ? <div className="flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
