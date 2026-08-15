"use client";

import { Modal } from "./Modal";
import type { ConfirmationController } from "./useConfirmation";

export function ConfirmDialog({
  confirmation,
}: {
  confirmation: ConfirmationController;
}) {
  if (!confirmation.pending) return null;
  return (
    <Modal
      title={confirmation.pending.title}
      onClose={() => confirmation.respond(false)}
      footer={
        <>
          <button
            className="secondary-button"
            onClick={() => confirmation.respond(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="primary-button danger-button"
            onClick={() => confirmation.respond(true)}
            type="button"
          >
            {confirmation.pending.confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal-confirmation-copy">
        {confirmation.pending.message}
      </p>
    </Modal>
  );
}
