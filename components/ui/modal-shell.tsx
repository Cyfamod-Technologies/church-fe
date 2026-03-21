import type { ReactNode } from "react";

export function ModalShell({
  title,
  children,
  onClose,
  footer,
  size = "md",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <>
      <div className="modal fade show" role="dialog" style={{ display: "block" }}>
        <div className={`modal-dialog ${size === "lg" ? "modal-lg" : ""}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button className="btn-close" onClick={onClose} type="button" />
            </div>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
