import React from 'react';

export interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmActionModalProps {
  pending: PendingConfirmation | null;
  busy?: boolean;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  pending,
  busy = false,
  onCancel,
}) => {
  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f2942]/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white border border-[#dce6f0] rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h3 id="confirm-modal-title" className="text-lg font-bold text-[#123e68] mb-2">
          {pending.title}
        </h3>
        <p className="text-sm text-[#52677e] leading-relaxed mb-6">
          {pending.description}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-[#dce6f0] text-sm font-semibold text-[#52677e] hover:bg-[#f5faff] transition-colors whitespace-nowrap"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => pending.onConfirm()}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#1677d2] text-sm font-semibold text-white hover:bg-[#105ca8] transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {busy ? 'Đang thực hiện...' : pending.confirmLabel || 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};
