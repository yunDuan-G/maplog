import React, { useState, useEffect } from 'react';

interface GallerySettingsProps {
  onClose: () => void;
}

export const GallerySettings: React.FC<GallerySettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState({
    enableCompression: false,
    compressionThreshold: 1, // 单位：MB
    compressionQuality: 0.7,
    maxWidth: 0
  });

  useEffect(() => {
    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('gallerySettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // 保存设置到本地存储
    localStorage.setItem('gallerySettings', JSON.stringify(settings));
    // 触发自定义事件，通知其他组件设置已更新
    window.dispatchEvent(new CustomEvent('gallerySettingsUpdated'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 w-80 max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">图库设置</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              开启图片压缩
            </label>
            <input
              type="checkbox"
              checked={settings.enableCompression}
              onChange={(e) => handleSettingChange('enableCompression', e.target.checked)}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              压缩阈值 (MB)
            </label>
            <input
              type="number"
              value={settings.compressionThreshold}
              onChange={(e) => handleSettingChange('compressionThreshold', parseFloat(e.target.value))}
              min="0.1"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              当图片大小超过此值时自动压缩
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              压缩质量 (0.1 - 1.0)
            </label>
            <input
              type="number"
              value={settings.compressionQuality}
              onChange={(e) => handleSettingChange('compressionQuality', parseFloat(e.target.value))}
              step="0.1"
              min="0.1"
              max="1.0"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大宽度 (px, 0为不限制)
            </label>
            <input
              type="number"
              value={settings.maxWidth}
              onChange={(e) => handleSettingChange('maxWidth', parseInt(e.target.value, 10))}
              min="0"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              建议设置为0，以保持原始图片质量
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};