"use client";
import { useEffect, useRef } from "react";

export function Modal({
  title,
  onClose,
  children,
  footer,
  footerRail,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  footerRail?: React.ReactNode;
  className?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      const openModals = document.querySelectorAll(".modal-backdrop");
      const topModal = openModals.item(openModals.length - 1);
      if (event.key === "Escape" && topModal === backdropRef.current) {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`feature-modal${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="feature-modal-body">{children}</div>
        <footer className="feature-modal-footer">
          {footerRail && (
            <div className="modal-footer-rail">{footerRail}</div>
          )}
          <div className="modal-actions">{footer}</div>
        </footer>
      </section>
    </div>
  );
}


