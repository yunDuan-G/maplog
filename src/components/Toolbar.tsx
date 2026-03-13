import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Download, Trash2, Plus, MessageSquare, Database } from 'lucide-react';

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onExportImage: () => void;
  onExportData?: () => void;
  onResetAll: () => void;
  scale: number;
  onToggleGallery: () => void;
  type?: 'map' | 'ninegrid';
  canDeleteCurrent?: boolean;
  onDeleteCurrent?: () => void;
  showSingleProvince?: boolean;
  onToggleSingleProvince?: (value: boolean) => void;
  singleProvinceId?: string | null;
  onSelectProvince?: (id: string | null) => void;
  provinceOptions?: Array<{ id: string; name: string }>;
  onOpenGridSizeModal?: () => void;
}

const TooltipButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
  variant?: 'default' | 'danger' | 'primary';
}> = ({ onClick, icon, label, className = '', variant = 'default' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const baseStyles = "relative rounded-xl transition-all duration-300 ease-out flex items-center justify-center group";
  const sizeStyles = "p-2 md:p-3";
  const variants = {
    default: "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
    primary: "text-gray-600 hover:bg-blue-50 hover:text-blue-600",
    danger: "text-gray-600 hover:bg-red-50 hover:text-red-600",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variants[variant]} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="transform transition-transform duration-200 group-hover:scale-110">
        {icon}
      </div>
      
      {/* High-end Tooltip */}
      <div 
        className={`
          absolute bottom-full mb-3 px-3 py-1.5 
          bg-gray-900/90 text-white text-xs font-medium tracking-wide
          rounded-lg shadow-xl backdrop-blur-sm whitespace-nowrap
          transform transition-all duration-200 origin-bottom
          pointer-events-none z-50
          ${showTooltip ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}
        `}
      >
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900/90"></div>
      </div>
    </button>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onExportImage,
  onExportData,
  onResetAll,
  scale,
  onToggleGallery,
  type = 'map',
  canDeleteCurrent,
  onDeleteCurrent,
  showSingleProvince = false,
  onToggleSingleProvince,
  singleProvinceId,
  onSelectProvince,
  provinceOptions = [],
  onOpenGridSizeModal,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showProvinceSelector, setShowProvinceSelector] = useState(false);

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        {canDeleteCurrent && onDeleteCurrent && (
          <button
            onClick={onDeleteCurrent}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border border-red-200 text-[11px] text-red-500 bg-white/95 hover:bg-red-50 hover:border-red-300 shadow-md transition-colors"
          >
            删除当前省份照片
          </button>
        )}
        <div className="
          flex items-center gap-1 p-2 
          bg-white/80 backdrop-blur-xl 
          border border-white/40 shadow-2xl shadow-black/5
          rounded-2xl transition-all duration-300 hover:shadow-black/10 hover:bg-white/90
          overflow-x-auto scrollbar-hide
          md:overflow-visible
        ">
          {/* View Controls Group */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200/50">
            <TooltipButton onClick={onZoomOut} icon={<ZoomOut size={20} strokeWidth={1.5} />} label="缩小" />
            <div className="w-10 md:w-12 text-center text-xs font-medium text-gray-400 font-mono select-none">
              {Math.round(scale * 100)}%
            </div>
            <TooltipButton onClick={onZoomIn} icon={<ZoomIn size={20} strokeWidth={1.5} />} label="放大" />
            <TooltipButton onClick={onResetView} icon={<Maximize size={20} strokeWidth={1.5} />} label="重置视图" />
          </div>

          {/* Action Controls Group */}
          <div className="flex items-center gap-1 pl-2">
            <TooltipButton 
              onClick={onToggleGallery} 
              icon={<Plus size={20} strokeWidth={1.5} />} 
              label="打开图库" 
              variant="primary"
              className="md:hidden"
            />
            {onOpenGridSizeModal && (
              <TooltipButton 
                onClick={onOpenGridSizeModal} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>} 
                label="设置格子数量" 
                variant="primary"
              />
            )}
            {/* <TooltipButton 
              onClick={() => setShowProvinceSelector(true)} 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>} 
              label={showSingleProvince ? `显示单个省份: ${provinceOptions.find(p => p.id === singleProvinceId)?.name || '未选择'}` : "显示单个省份"} 
              variant={showSingleProvince ? "primary" : "default"}
            /> */}

            <TooltipButton 
              onClick={onExportImage} 
              icon={<Download size={20} strokeWidth={1.5} />} 
              label="保存图片" 
              variant="primary"
            />
            {onExportData && (
              <TooltipButton 
                onClick={onExportData} 
                icon={<Database size={20} strokeWidth={1.5} />} 
                label="导出数据" 
                variant="primary"
              />
            )}
            <TooltipButton 
              onClick={() => setShowConfirmReset(true)} 
              icon={<Trash2 size={20} strokeWidth={1.5} />} 
              label={type === 'map' ? "清空地图" : "清空格子图片"} 
              variant="danger"
            />
          </div>
        </div>
      </div>

      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-5 py-4 w-72 max-w-[80vw]">
            <h3 className="text-sm font-medium text-gray-900 mb-2">{type === 'map' ? '清空地图？' : '清空格子图片？'}</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {type === 'map' ? '这将清除所有省份已填的照片和位置调整，操作不可撤销。' : '这将清除所有格子已填的照片和位置调整，操作不可撤销。'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onResetAll();
                  setShowConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-full bg-red-500 text-xs text-white hover:bg-red-600 shadow-sm"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {showProvinceSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-5 py-4 w-80 max-w-[80vw]">
            <h3 className="text-sm font-medium text-gray-900 mb-3">显示单个省份</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="toolbarSingleProvince" 
                  checked={showSingleProvince}
                  onChange={(e) => onToggleSingleProvince?.(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="toolbarSingleProvince" className="text-sm text-gray-600">只显示单个省份</label>
              </div>
              {showSingleProvince && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">选择省份</label>
                  <select 
                    value={singleProvinceId || ''}
                    onChange={(e) => onSelectProvince?.(e.target.value || null)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">选择省份</option>
                    {provinceOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowProvinceSelector(false)}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
