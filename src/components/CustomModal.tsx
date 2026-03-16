import React from 'react';

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'confirm' | 'alert';
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'confirm'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 w-80 max-w-[80vw] animate-scale-in">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && onCancel && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {confirmText}
            </button>
          )}
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl ${type === 'confirm' ? 'bg-black text-white hover:bg-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'} transition-colors`}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
