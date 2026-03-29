import type { ReactNode } from "react";

type FormFieldCardProps = {
  label: string;
  className?: string;
  children: ReactNode;
};

export function FormFieldCard({ label, className, children }: FormFieldCardProps) {
  return (
    <label className={`rounded-xl border border-(--line) bg-white/70 p-4 ${className ?? ""}`.trim()}>
      <p className="mono mb-2 text-xs uppercase text-(--ink-soft)">{label}</p>
      {children}
    </label>
  );
}
