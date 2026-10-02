import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ClipboardList, X } from "lucide-react";

export function Button({
  kind = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`button ${kind}`} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <ClipboardList />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className={`modal ${wide ? "wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">БАЗИС CRM</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
