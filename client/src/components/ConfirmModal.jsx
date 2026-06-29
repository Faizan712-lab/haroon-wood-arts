import "./ConfirmModal.css";

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="confirm-modal-backdrop"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <h2 id="confirm-modal-title">
          {title}
        </h2>

        <p>
          {message}
        </p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={
              danger
                ? "confirm-modal-confirm danger"
                : "confirm-modal-confirm"
            }
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
