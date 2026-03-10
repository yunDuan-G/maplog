import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, ChevronDown, Image as ImageIcon, Link, Database } from 'lucide-react';
import { 
  saveMapGalleryImage, 
  getAllMapGalleryImages, 
  deleteMapGalleryImage, 
  clearMapGallery, 
  saveNineGridGalleryImage, 
  getAllNineGridGalleryImages, 
  deleteNineGridGalleryImage, 
  clearNineGridGallery, 
  GalleryImage 
} from '../services/db';
import { CustomModal } from './CustomModal';

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (e: React.DragEvent, image: string) => void;
  onFillWithImage: (image: string) => void;
  hasActiveProvince: boolean;
  type: 'map' | 'ninegrid';
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  isOpen, 
  onClose, 
  onDragStart, 
  onFillWithImage,
  hasActiveProvince,
  type,
}) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'confirm' | 'alert'>('confirm');
  const [importData, setImportData] = useState<any>(null);
  const [importType, setImportType] = useState<'map' | 'ninegrid'>('map');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, [type]);

  const loadImages = async () => {
    try {
      const loadedImages = type === 'map' 
        ? await getAllMapGalleryImages() 
        : await getAllNineGridGalleryImages();
      setImages(loadedImages.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to load gallery images:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // 处理弹窗确认
  const handleModalConfirm = async () => {
    setShowConfirmModal(false);
    
    try {
      const data = importData;
      const currentType = importType;
      
      // 导入排版数据
      const { setAllStates } = await import('../hooks/useMapState');
      await setAllStates(data.states || {}, currentType);
      
      // 导入图库图片
      if (data.galleryImages && Array.isArray(data.galleryImages)) {
        // 清空现有图库
        if (currentType === 'map') {
          await clearMapGallery();
        } else {
          await clearNineGridGallery();
        }
        
        // 保存导入的图片
        for (const image of data.galleryImages) {
          if (currentType === 'map') {
            await saveMapGalleryImage(image);
          } else {
            await saveNineGridGalleryImage(image);
          }
        }
        
        // 重新加载图库
        loadImages();
      }
      
      // 导入九宫格配置
      if (currentType === 'ninegrid' && data.gridConfig) {
        const { rows, cols, spacing } = data.gridConfig;
        if (rows && cols) {
          localStorage.setItem('gridRows', rows.toString());
          localStorage.setItem('gridCols', cols.toString());
        }
        if (spacing !== undefined) {
          localStorage.setItem('gridSpacing', spacing.toString());
        }
      }
      
      // 数据导入成功，页面将自动刷新
      setModalTitle('导入成功');
      setModalMessage('数据导入成功！页面将自动刷新以应用更改。');
      setModalType('alert');
      setShowAlertModal(true);
    } catch (err) {
      setModalTitle('导入失败');
      setModalMessage('导入失败：请检查文件格式');
      setModalType('alert');
      setShowAlertModal(true);
      console.error(err);
    }
  };

  // 处理弹窗取消
  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setImportData(null);
  };

  // 处理弹窗关闭
  const handleAlertClose = () => {
    setShowAlertModal(false);
    // 如果是导入成功的弹窗，则刷新页面
    if (modalTitle === '导入成功') {
      window.location.reload();
    }
  };

  // 生成唯一ID的函数，支持fallback
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      //  fallback方法生成UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // 处理图片文件
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const newImage: GalleryImage = {
            id: generateUUID(),
            data: base64,
            timestamp: Date.now(),
          };
          if (type === 'map') {
            await saveMapGalleryImage(newImage);
          } else {
            await saveNineGridGalleryImage(newImage);
          }
          setImages(prev => [newImage, ...prev]);
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.json')) {
        // 处理 JSON 文件（导出的数据）
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            
            // 验证数据类型
            if (data.type && (data.type === 'map' || data.type === 'ninegrid')) {
              if (data.type !== type) {
                setModalTitle('导入失败');
                setModalMessage(`导入失败：请将${data.type === 'map' ? '地图' : '九宫格'}数据拖放到对应类型的图库中`);
                setModalType('alert');
                setShowAlertModal(true);
                return;
              }
              
              // 显示确认对话框
              const confirmMessage = `导入数据将会：\n1. 清空当前${type === 'map' ? '地图' : '九宫格'}的所有排版数据\n2. 清空当前图库中的所有图片\n${type === 'ninegrid' ? '3. 重置九宫格配置（行数、列数、间隔）' : ''}\n\n确定要继续导入吗？`;
              
              setModalTitle('确认导入');
              setModalMessage(confirmMessage);
              setImportData(data);
              setImportType(type);
              setShowConfirmModal(true);
            } else {
              setModalTitle('导入失败');
              setModalMessage('导入失败：无效的数据文件格式');
              setModalType('alert');
              setShowAlertModal(true);
            }
          } catch (err) {
            setModalTitle('导入失败');
            setModalMessage('导入失败：请检查文件格式');
            setModalType('alert');
            setShowAlertModal(true);
            console.error(err);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  // 处理删除确认
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteImageId(id);
    setModalTitle('确认删除');
    setModalMessage('确定要删除这张图片吗？');
    setModalType('confirm');
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteImageId) {
      if (type === 'map') {
        await deleteMapGalleryImage(deleteImageId);
      } else {
        await deleteNineGridGalleryImage(deleteImageId);
      }
      setImages(prev => prev.filter(img => img.id !== deleteImageId));
      setDeleteImageId(null);
    }
    setShowConfirmModal(false);
  };

  const handleDeleteCancel = () => {
    setDeleteImageId(null);
    setShowConfirmModal(false);
  };
  
  // 处理清空图库确认
  const handleClearAllClick = () => {
    setModalTitle('确认清空');
    setModalMessage('确定要清空图片库吗？');
    setModalType('confirm');
    setShowConfirmModal(true);
  };

  const handleClearAllConfirm = async () => {
    if (type === 'map') {
      await clearMapGallery();
    } else {
      await clearNineGridGallery();
    }
    setImages([]);
    setShowConfirmModal(false);
  };

  const handleClearAllCancel = () => {
    setShowConfirmModal(false);
  };

  // 处理导入数据文件
  const handleImportDataClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportDataFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
    // Reset input
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };



  const panelTransform = isOpen
    ? 'translate-y-0 md:translate-x-0 md:translate-y-0'
    : 'translate-y-full md:translate-x-full md:translate-y-0 pointer-events-none';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div
      className={`fixed z-[50] transform transition-transform duration-300 ease-in-out 
        inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto
        ${panelTransform}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="mx-auto max-w-3xl bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 rounded-t-3xl flex flex-col h-[55vh] w-full
        md:h-full md:w-[360px] md:max-w-none md:rounded-t-none md:rounded-l-3xl">
        {/* Header */}
        <div className="relative p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/70 rounded-t-3xl md:rounded-t-none">
          <h2 className="text-lg font-light tracking-widest text-gray-800 flex items-center gap-2">
            <ImageIcon size={18} />
            图库
          </h2>
          <div className="flex items-center gap-1">
             {images.length > 0 && (
                <button 
                    onClick={handleClearAllClick}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="清空图库"
                >
                    <Trash2 size={16} />
                </button>
             )}
          </div>
          <button 
            onClick={onClose}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 text-xs font-medium flex items-center gap-1 transition-colors md:hidden"
            title="收起图库"
          >
            <ChevronDown size={14} />
            收起
          </button>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3">
            {/* Upload Tile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
            >
              <Upload size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-[10px] text-gray-500 font-medium group-hover:text-blue-600">
                上传图片
              </span>
            </button>
            <button
              type="button"
              onClick={handleImportDataClick}
              className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
            >
              <Database size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-[10px] text-gray-500 font-medium group-hover:text-blue-600">
                导入数据
              </span>
            </button>



            {images.map((img) => (
              <div 
                key={img.id} 
                className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                draggable
                onDragStart={(e) => onDragStart(e, img.data)}
                onClick={() => setActiveImageId(prev => prev === img.id ? null : img.id)}
              >
                <img 
                  src={img.data} 
                  alt="Gallery item" 
                  className="w-full h-full object-cover"
                />
                {activeImageId === img.id && hasActiveProvince && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFillWithImage(img.data);
                      setActiveImageId(null);
                    }}
                    className="absolute inset-0 bg-black/45 text-white text-xs font-medium flex items-center justify-center"
                  >
                    填充到选中省份
                  </button>
                )}
                <button 
                  onClick={(e) => handleDeleteClick(img.id, e)}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          {images.length === 0 && (
            <div className="mt-3 text-center text-gray-400 text-xs">
              暂无图片，先上传几张吧～
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          <input 
            type="file" 
            ref={importFileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleImportDataFile} 
          />
        </div>
      </div>

      {/* 自定义弹窗 */}
      <CustomModal
        isOpen={showConfirmModal}
        title={modalTitle}
        message={modalMessage}
        confirmText={deleteImageId ? '删除' : (importData ? '导入' : '确定')}
        cancelText="取消"
        onConfirm={deleteImageId ? handleDeleteConfirm : (importData ? handleModalConfirm : handleClearAllConfirm)}
        onCancel={deleteImageId ? handleDeleteCancel : (importData ? handleModalCancel : handleClearAllCancel)}
        type="confirm"
      />

      <CustomModal
        isOpen={showAlertModal}
        title={modalTitle}
        message={modalMessage}
        confirmText="确定"
        onConfirm={handleAlertClose}
        type="alert"
      />
    </div>
  );
};
