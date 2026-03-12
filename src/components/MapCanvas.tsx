import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Path, Group, Rect, Text } from 'react-konva';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Province } from './Province';
import { PROVINCE_CONFIGS, MAP_WIDTH, MAP_HEIGHT, MAP_OFFSET_X, MAP_OFFSET_Y, NINE_DASH_PATHS } from '../constants/mapData';
import { useMapState } from '../hooks/useMapState';
import { Toolbar } from './Toolbar';
import { ImageGallery } from './ImageGallery';
import { PROVINCE_NAMES } from '../utils/provinceMap';

// 基础导出尺寸
const BASE_EXPORT_WIDTH = 4200;
const BASE_EXPORT_HEIGHT = 3150;
const EXPORT_MAP_SCALE = 2.6;
const EXPORT_TITLE_FONT_SIZE = 144;
const EXPORT_SUBTITLE_FONT_SIZE = 56;
const EXPORT_TITLE_FONT_FAMILY = "'PingFang SC Thin', 'PingFang SC-Light', 'Helvetica Neue UltraLight', 'Helvetica Neue', 'Microsoft YaHei UI Light', 'Microsoft YaHei', sans-serif";

// Helper to calculate bounding box of SVG path
const calculatePathBounds = (path: string) => {
    // Extract all numbers from path string
    const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number);
    if (!numbers || numbers.length < 2) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Most commands in the path string are pairs of coordinates.
    // We iterate by 2, assuming x, y pairs.
    for (let i = 0; i < numbers.length; i += 2) {
        const x = numbers[i];
        // Ensure y exists (if odd number of coordinates, skip last)
        if (i + 1 >= numbers.length) break;
        const y = numbers[i+1];
        
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    if (minX === Infinity || minY === Infinity) return null;

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
};

// Calculate export dimensions based on aspect ratio
const calculateExportDimensions = (aspectRatio: '16:9' | '4:3' | '4:5' | 'original') => {
    const baseWidth = BASE_EXPORT_WIDTH;
    const baseHeight = BASE_EXPORT_HEIGHT;
    
    switch (aspectRatio) {
        case '16:9':
            return {
                width: baseWidth,
                height: Math.round(baseWidth * 9 / 16)
            };
        case '4:3':
            return {
                width: baseWidth,
                height: Math.round(baseWidth * 3 / 4)
            };
        case '4:5':
            return {
                width: Math.round(baseHeight * 4 / 5),
                height: baseHeight
            };
        case 'original':
        default:
            return {
                width: baseWidth,
                height: baseHeight
            };
    }
};

const VIEW_CENTER_OFFSET_Y = 110;

export const MapCanvas: React.FC = () => {
  const { states, updateProvince, resetProvince, resetAll, setAllStates } = useMapState('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTitle, setExportTitle] = useState('旅行拼图');
  const [exportSubtitle, setExportSubtitle] = useState('Imprint China · 旅行照片拼图');
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportStep, setExportStep] = useState<'edit' | 'preview'>('edit');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const [exportBackgroundColor, setExportBackgroundColor] = useState<string>('#FFFFFF');
  const [showSingleProvince, setShowSingleProvince] = useState(false);
  const [singleProvinceId, setSingleProvinceId] = useState<string | null>(null);
  const [exportAspectRatio, setExportAspectRatio] = useState<'16:9' | '4:3' | '4:5' | 'original'>('original');
  const [showExportTitle, setShowExportTitle] = useState(true);
  const [showExportSubtitle, setShowExportSubtitle] = useState(true);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });

  // Viewport state（相对于 baseScale 的缩放）
  const [viewState, setViewState] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 不再需要监听数据更新事件，由用户确认后手动刷新

  // Calculate initial fit
  useEffect(() => {
    const fitMap = () => {
      const padding = 50;
      const availableWidth = window.innerWidth - padding * 2;
      const availableHeight = window.innerHeight - padding * 2;
      
      const scale = Math.min(
        availableWidth / MAP_WIDTH,
        availableHeight / MAP_HEIGHT
      );
      
      const x = (window.innerWidth - MAP_WIDTH * scale) / 2;
      const y = (window.innerHeight - MAP_HEIGHT * scale) / 2 + VIEW_CENTER_OFFSET_Y;

      setBaseScale(scale);
      setViewState({ scale: 1, x, y });
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };

    fitMap();
    window.addEventListener('resize', fitMap);
    return () => window.removeEventListener('resize', fitMap);
  }, []);

  const stageRef = useRef<any>(null);
  const mapContentRef = useRef<any>(null);
  const exportContentRef = useRef<any>(null);
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistRef = useRef<number | null>(null);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const handleZoomIn = () => {
    setViewState(prev => ({
      ...prev,
      scale: prev.scale * 1.2
    }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({
      ...prev,
      scale: prev.scale / 1.2
    }));
  };

  const handleResetView = () => {
    const padding = 50;
    const availableWidth = window.innerWidth - padding * 2;
    const availableHeight = window.innerHeight - padding * 2;

    const scale = Math.min(
      availableWidth / MAP_WIDTH,
      availableHeight / MAP_HEIGHT
    );

    const x = (window.innerWidth - MAP_WIDTH * scale) / 2;
    const y = (window.innerHeight - MAP_HEIGHT * scale) / 2 + VIEW_CENTER_OFFSET_Y;

    setBaseScale(scale);
    setViewState({
      scale: 1,
      x,
      y,
    });
  };
  
  const handleToggleGallery = () => {
    setIsGalleryOpen(prev => !prev);
  };

  const fillProvinceWithImage = async (
    provinceId: string,
    image: string,
    boundsOverride?: { width: number; height: number; centerX: number; centerY: number }
  ) => {
    const provinceConfig = PROVINCE_CONFIGS.find(p => p.id === provinceId);
    const bounds = boundsOverride ?? (provinceConfig ? calculatePathBounds(provinceConfig.path) : null);

    const img = new Image();
    img.onload = async () => {
      let scale = 1;
      let x = 0;
      let y = 0;

      if (bounds) {
        const coverScale = Math.max(bounds.width / img.width, bounds.height / img.height);
        scale = coverScale * 1.05;
        x = bounds.centerX - (img.width * scale) / 2;
        y = bounds.centerY - (img.height * scale) / 2;
      } else {
        const targetSize = 300;
        scale = targetSize / Math.max(img.width, img.height);
        x = -(img.width * scale) / 2;
        y = -(img.height * scale) / 2;
      }

      setSelectedId(provinceId);
      setIsEditing(true);

      await updateProvince(provinceId, {
        image,
        x,
        y,
        scale,
        rotation: 0,
      });
    };
    img.src = image;
  };
  
  const handleExportClick = () => {
    // Reset panel position to center of screen
    setPanelPosition({
      x: window.innerWidth / 2 - 550, // 550 is half of 1100px
      y: window.innerHeight / 2 - 350 // Approximate half height
    });
    setShowExportPreview(true);
    setExportStep('edit');
    setPreviewImage(null);
    setSelectedId(null);
    setIsEditing(false);
    
    // Auto generate preview when opening export panel
    setTimeout(() => {
      handleGeneratePreview();
    }, 100);
  };

  const handleDeleteCurrentProvinceImage = () => {
    if (!selectedId) return;
    const current = states[selectedId];
    if (!current || !current.image) return;
    resetProvince(selectedId);
    setSelectedId(null);
    setIsEditing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing || !selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        resetProvince(selectedId);
        setSelectedId(null);
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, selectedId, resetProvince]);

  const handleGeneratePreview = () => {
    if (!stageRef.current) return;

    setIsExporting(true);
    setIsGeneratingPreview(true);
    
    setTimeout(() => {
        const stage = stageRef.current;

        const oldScaleX = stage.scaleX();
        const oldScaleY = stage.scaleY();
        const oldX = stage.x();
        const oldY = stage.y();

        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        stage.batchDraw();

        const exportDimensions = calculateExportDimensions(exportAspectRatio);
        const uri = stage.toDataURL({ 
            pixelRatio: 3,
            x: 0,
            y: 0,
            width: exportDimensions.width,
            height: exportDimensions.height,
            mimeType: 'image/jpeg',
            quality: 1
        });

        stage.scale({ x: oldScaleX, y: oldScaleY });
        stage.position({ x: oldX, y: oldY });
        stage.batchDraw();

        setPreviewImage(uri);
        setIsExporting(false);
        setIsGeneratingPreview(false);
    }, 100);
  };

  const handleConfirmExport = () => {
    if (previewImage) {
        const link = document.createElement('a');
        link.download = 'imprint-china-map.jpg';
        link.href = previewImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShowExportPreview(false);
        setExportStep('edit');
        handleResetView();
    }
  };

  const handleExportArchive = async () => {
    // 获取地图图库中的所有图片
    const { getAllMapGalleryImages } = await import('../services/db');
    const galleryImages = await getAllMapGalleryImages();
    
    const data = {
      type: 'map',
      timestamp: Date.now(),
      states: states,
      galleryImages: galleryImages
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = '中国地图数据导出.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportArchive = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // 确保数据类型正确
        if (data.type !== 'map') {
          alert('导入失败，请选择地图类型的存档文件');
          return;
        }
        
        // 导入排版数据
        await setAllStates(data.states || {});
        
        // 导入图库图片
        if (data.galleryImages && Array.isArray(data.galleryImages)) {
          const { saveMapGalleryImage, clearMapGallery } = await import('../services/db');
          
          // 清空现有图库
          await clearMapGallery();
          
          // 保存导入的图片
          for (const image of data.galleryImages) {
            await saveMapGalleryImage(image);
          }
        }
        
        alert('导入成功！');
      } catch (err) {
        alert('导入失败，请检查文件格式');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // handleSmartFill 已移除

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
    
    const stage = stageRef.current;
    if (!stage) return;
    
    stage.setPointersPositions(e);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const hit = stage.getIntersection(pos);
    if (!hit) return;
    
    // Find the province group
    let node = hit;
    let provinceId: string | undefined;
    
    while (node && node !== stage) {
        const id = node.id();
        if (id && PROVINCE_CONFIGS.find(p => p.id === id)) {
            provinceId = id;
            break;
        }
        const parent = node.getParent();
        if (!parent) break;
        node = parent;
    }
    
    if (!provinceId) return;

    const provinceConfig = PROVINCE_CONFIGS.find(p => p.id === provinceId);
    const bounds = provinceConfig ? calculatePathBounds(provinceConfig.path) : null;

    // Handle drag from gallery
    const galleryImage = e.dataTransfer.getData('gallery-image');
    if (galleryImage) {
        fillProvinceWithImage(provinceId, galleryImage, bounds || undefined);
        return;
    }

    // Handle file drop
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // 触发压缩模态框
      window.dispatchEvent(new CustomEvent('openImageCompressor', { 
        detail: { 
          file, 
          type: 'map' as const, 
          onComplete: (compressedBase64: string) => {
            fillProvinceWithImage(provinceId!, compressedBase64, bounds || undefined);
          }
        } 
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      
      stage.setPointersPositions(e);
      const pos = stage.getPointerPosition();
      if (!pos) {
          setDragOverId(null);
          return;
      }

      const hit = stage.getIntersection(pos);
      if (!hit) {
          setDragOverId(null);
          return;
      }

      // Find the province group
      let node = hit;
      let provinceId: string | undefined;
      
      while (node && node !== stage) {
          const id = node.id();
          if (id && PROVINCE_CONFIGS.find(p => p.id === id)) {
              provinceId = id;
              break;
          }
          const parent = node.getParent();
          if (!parent) break;
          node = parent;
      }

      if (provinceId) {
          setDragOverId(provinceId);
      } else {
          setDragOverId(null);
      }
  };

  const handleFillWithGalleryImage = (image: string) => {
    if (!selectedId) {
      alert('请先选择一个省份');
      return;
    }
    const provinceConfig = PROVINCE_CONFIGS.find(p => p.id === selectedId);
    const bounds = provinceConfig ? calculatePathBounds(provinceConfig.path) : null;
    fillProvinceWithImage(selectedId, image, bounds || undefined);
    setIsGalleryOpen(false);
  };

  const handleTouchMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!e.evt.touches || e.evt.touches.length === 0) return;

    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      if (!touch1 || !touch2) return;

      e.evt.preventDefault();

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      const newCenter = getCenter(p1, p2);
      const newDist = getDistance(p1, p2);

      if (!lastDistRef.current) {
        lastDistRef.current = newDist;
        lastCenterRef.current = newCenter;
        setIsPinching(true);
        return;
      }

      const oldScale = stage.scaleX();
      const rawScaleBy = newDist / lastDistRef.current;
      const adjustedScaleBy = Math.pow(rawScaleBy, 1.4);
      const tentativeStageScale = oldScale * adjustedScaleBy;

      const MIN_RELATIVE_SCALE = 0.6;
      const MAX_RELATIVE_SCALE = 4;

      let relativeScale = tentativeStageScale / baseScale;

      if (relativeScale < MIN_RELATIVE_SCALE) {
        relativeScale = MIN_RELATIVE_SCALE;
      } else if (relativeScale > MAX_RELATIVE_SCALE) {
        relativeScale = MAX_RELATIVE_SCALE;
      }

      const newStageScale = baseScale * relativeScale;

      const pointTo = {
        x: (newCenter.x - stage.x()) / oldScale,
        y: (newCenter.y - stage.y()) / oldScale,
      };

      const newPos = {
        x: newCenter.x - pointTo.x * newStageScale,
        y: newCenter.y - pointTo.y * newStageScale,
      };

      setViewState({
        scale: relativeScale,
        x: newPos.x,
        y: newPos.y,
      });

      lastDistRef.current = newDist;
      lastCenterRef.current = newCenter;
      setIsPinching(true);
      return;
    }

    if (e.evt.touches.length === 1 && !isEditing) {
      const touch = e.evt.touches[0];
      if (!touch) return;

      e.evt.preventDefault();

      const currentPoint = { x: touch.clientX, y: touch.clientY };

      if (!lastPanPointRef.current) {
        lastPanPointRef.current = currentPoint;
        return;
      }

      const dx = currentPoint.x - lastPanPointRef.current.x;
      const dy = currentPoint.y - lastPanPointRef.current.y;

      lastPanPointRef.current = currentPoint;

      setViewState(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  };

  const handleTouchEnd = () => {
    lastDistRef.current = null;
    lastCenterRef.current = null;
    lastPanPointRef.current = null;
    setIsPinching(false);
  };

  // Drag handling for export panel
  const handleDragStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y
    });
    positionRef.current = { ...panelPosition };
  }, [panelPosition]);

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    
    // Calculate new position
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Update ref for final position
    positionRef.current = { x: newX, y: newY };
    
    // Directly update DOM for smooth movement (hardware accelerated)
    // Use requestAnimationFrame for even smoother performance
    requestAnimationFrame(() => {
      if (panelRef.current) {
        panelRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = React.useCallback(() => {
    // Update React state only at the end of drag
    setPanelPosition(positionRef.current);
    setIsDragging(false);
  }, []);

  // Add global mouse move and up listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleTouchStart = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!e.evt.touches) return;

    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      if (!touch1 || !touch2) return;

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      lastDistRef.current = getDistance(p1, p2);
      lastCenterRef.current = getCenter(p1, p2);
      setIsPinching(true);
      e.evt.preventDefault();
    } else {
      lastDistRef.current = null;
      lastCenterRef.current = null;
      setIsPinching(false);
    }
  };

  const handleStageClickOrTap = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    let node: any = e.target;
    let provinceId: string | undefined;

    while (node && node !== stage) {
      const id = node.id && node.id();
      if (id && PROVINCE_CONFIGS.find(p => p.id === id)) {
        provinceId = id;
        break;
      }
      const parent = node.getParent && node.getParent();
      if (!parent) break;
      node = parent;
    }

    if (!isEditing) {
      if (!provinceId) {
        setSelectedId(null);
      }
      return;
    }

    if (provinceId !== selectedId) {
      setSelectedId(null);
      setIsEditing(false);
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#F5F5F7] flex flex-col items-center justify-center overflow-hidden font-sans"
      onDragOver={handleDragOver}
      onDrop={handleFileDrop}
    >
      <ImageGallery 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onDragStart={(e, image) => {
          e.dataTransfer.setData('gallery-image', image);
        }}
        onFillWithImage={handleFillWithGalleryImage}
        hasActiveProvince={!!selectedId}
        type="map"
        onOpenSettings={() => {
          // 触发设置模态框的显示，由 App.tsx 处理
          window.dispatchEvent(new CustomEvent('openGallerySettings'));
        }}
        onOpenCompressor={(file) => {
          // 触发压缩模态框的显示，由 App.tsx 处理
          window.dispatchEvent(new CustomEvent('openImageCompressor', { detail: { file, type: 'map' } }));
        }}
      />

      {!showExportPreview && (
        <div className="absolute top-12 left-12 z-10 pointer-events-none select-none">
            <h1 className="text-4xl font-extralight tracking-[0.2em] text-gray-900">旅行拼图</h1>
            <div className="h-px w-24 bg-gray-400 my-4"></div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Imprint China · 旅行照片拼图</p>
        </div>
      )}

      {/* Export Preview Panel - Draggable */}
      {showExportPreview && (
        <div 
          ref={panelRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)`,
            zIndex: 50,
            transition: 'transform 0s' // Disable transition for dragging
          }}
          className="bg-white/95 p-6 rounded-2xl shadow-2xl backdrop-blur-md border border-gray-200 w-[1100px] h-[700px] flex"
        >
            <div 
              className="flex items-center justify-between mb-4 flex-shrink-0 cursor-move w-full absolute top-6 left-6 right-6"
              onMouseDown={handleDragStart}
            >
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    导出设置与预览
                </h2>
                <button 
                    onClick={() => {
                        setShowExportPreview(false);
                        handleResetView();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            {/* 左侧设置区域 */}
            <div className="w-96 pt-16 pr-6 border-r border-gray-200">
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">主标题</label>
                        <input 
                            type="text" 
                            value={exportTitle}
                            onChange={(e) => setExportTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-light tracking-widest transition-all"
                            placeholder="输入主标题..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">副标题</label>
                        <input 
                            type="text" 
                            value={exportSubtitle}
                            onChange={(e) => setExportSubtitle(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs tracking-widest uppercase transition-all"
                            placeholder="输入副标题..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">显示设置</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                id="singleProvince" 
                                checked={showSingleProvince}
                                onChange={(e) => {
                                    setShowSingleProvince(e.target.checked);
                                    if (!e.target.checked) {
                                        setExportAspectRatio('original');
                                    }
                                }}
                                className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="singleProvince" className="text-sm text-gray-600">只显示单个省份</label>
                        </div>
                        {showSingleProvince && (
                            <div className="mt-2">
                                <select 
                                    value={singleProvinceId || ''}
                                    onChange={(e) => setSingleProvinceId(e.target.value || null)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                >
                                    <option value="">选择省份</option>
                                    {PROVINCE_CONFIGS.map((config) => (
                                        <option key={config.id} value={config.id}>
                                            {PROVINCE_NAMES[config.id] || config.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    {showSingleProvince && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">图片比例</label>
                            <select 
                                value={exportAspectRatio}
                                onChange={(e) => setExportAspectRatio(e.target.value as '16:9' | '4:3' | '4:5' | 'original')}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            >
                                <option value="original">原始比例</option>
                                <option value="16:9">16:9</option>
                                <option value="4:3">4:3</option>
                                <option value="4:5">4:5</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">标题显示</label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="showExportTitle" 
                                    checked={showExportTitle}
                                    onChange={(e) => setShowExportTitle(e.target.checked)}
                                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="showExportTitle" className="text-sm text-gray-600">显示主标题</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="showExportSubtitle" 
                                    checked={showExportSubtitle}
                                    onChange={(e) => setShowExportSubtitle(e.target.checked)}
                                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="showExportSubtitle" className="text-sm text-gray-600">显示副标题</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">背景颜色</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { name: '白色', value: '#FFFFFF' },
                                { name: '灰色', value: '#F5F5F5' },
                                { name: '米色', value: '#FFF8E1' },
                                { name: '黑色', value: '#000000' }
                            ].map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setExportBackgroundColor(color.value)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${exportBackgroundColor === color.value ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShowExportPreview(false);
                            handleResetView();
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => {
                            // Trigger preview generation
                            setIsExporting(true); // Temporarily show text on map
                            // Use timeout to ensure render cycle completes
                            setTimeout(handleGeneratePreview, 50);
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 active:scale-95 transition-all shadow-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <span>更新预览</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                </div>
                
                <p className="text-center text-[10px] text-gray-400 mt-4">
                    预览模式下背景为白色，导出将包含当前视图内容
                </p>
            </div>
            
            {/* 右侧预览区域 */}
            <div className="flex-1 pt-16 pl-6 flex flex-col">
                <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center mb-6 relative group">
                    {isGeneratingPreview ? (
                        <div className="animate-pulse flex flex-col items-center text-gray-400">
                            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
                            <span className="text-sm">正在生成预览...</span>
                        </div>
                    ) : previewImage ? (
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                    ) : (
                        <div className="animate-pulse flex flex-col items-center text-gray-400">
                            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
                            <span className="text-sm">点击更新预览...</span>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={handleConfirmExport}
                    disabled={!previewImage}
                    className={`w-full px-4 py-2.5 rounded-xl ${previewImage ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} active:scale-95 transition-all shadow-lg text-sm font-medium flex items-center justify-center gap-2`}
                >
                    <span>确认导出图片</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
            </div>
        </div>
      )}

      {!isMobile && (
        <button
          onClick={handleToggleGallery}
          className={`hidden md:flex fixed top-1/2 right-0 -translate-y-1/2 z-[70] px-1.5 py-5 rounded-l-xl bg-white/95 border border-r-0 border-gray-200 text-[11px] text-gray-700 shadow-md hover:bg-gray-50 hover:text-gray-900 items-center justify-center flex-col gap-0.5 transition-transform duration-300 ease-in-out
            ${isGalleryOpen ? 'md:translate-x-[-360px]' : 'md:translate-x-0'}`}
        >
          {isGalleryOpen ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
          <span className="text-[10px] tracking-[0.2em] text-gray-500">图库</span>
        </button>
      )}

      {!(isMobile && isGalleryOpen) && (
        <Toolbar 
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onExportImage={handleExportClick}
          onExportData={handleExportArchive}
          onResetAll={resetAll}
          scale={viewState.scale}
          onToggleGallery={handleToggleGallery}
          type="map"
          canDeleteCurrent={!!(selectedId && states[selectedId]?.image)}
          onDeleteCurrent={handleDeleteCurrentProvinceImage}
          showSingleProvince={showSingleProvince}
          onToggleSingleProvince={setShowSingleProvince}
          singleProvinceId={singleProvinceId}
          onSelectProvince={setSingleProvinceId}
          provinceOptions={PROVINCE_CONFIGS.map(config => ({
            id: config.id,
            name: PROVINCE_NAMES[config.id] || config.id
          }))}
        />
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!isEditing && !isPinching}
        onWheel={(e) => {
          if (isEditing) return;
          e.evt.preventDefault();
          const scaleBy = 1.1;
          const stage = e.target.getStage();
          const oldScale = stage!.scaleX();
          const mousePointTo = {
            x: stage!.getPointerPosition()!.x / oldScale - stage!.x() / oldScale,
            y: stage!.getPointerPosition()!.y / oldScale - stage!.y() / oldScale,
          };

          const newStageScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
          const relativeScale = newStageScale / baseScale;

          setViewState({
            scale: relativeScale,
            x: -(mousePointTo.x - stage!.getPointerPosition()!.x / newStageScale) * newStageScale,
            y: -(mousePointTo.y - stage!.getPointerPosition()!.y / newStageScale) * newStageScale,
          });
        }}
        scaleX={baseScale * viewState.scale}
        scaleY={baseScale * viewState.scale}
        x={viewState.x}
        y={viewState.y}
        onDragEnd={(e) => {
            if (e.target !== e.target.getStage()) return;
            setViewState(prev => ({
                ...prev,
                x: e.target.x(),
                y: e.target.y()
            }));
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleStageClickOrTap}
        onTap={handleStageClickOrTap}
      >
        <Layer>
            <Group ref={mapContentRef}>
                {/* Background for export */}
                {(() => {
                    const exportDimensions = calculateExportDimensions(exportAspectRatio);
                    return (
                        <Rect 
                            x={0} 
                            y={0} 
                            width={exportDimensions.width} 
                            height={exportDimensions.height} 
                            fill={exportBackgroundColor} 
                            visible={isExporting || showExportPreview} 
                        />
                    );
                })()}

                    {/* 导出内容：标题 + 中国地图 */}
                    <Group ref={exportContentRef}>
                        {/* Export Title & Subtitle - Visible during export OR preview */}
                        {(isExporting || showExportPreview) && showExportTitle && (
                            <Group x={80} y={120}>
                                <Text
                                    text={exportTitle}
                                    fontSize={EXPORT_TITLE_FONT_SIZE}
                                    fontFamily={EXPORT_TITLE_FONT_FAMILY}
                                    fill={exportBackgroundColor === '#000000' ? '#FFFFFF' : '#111827'}
                                    letterSpacing={0.2 * EXPORT_TITLE_FONT_SIZE}
                                />
                                {showExportSubtitle && (
                                    <>
                                        <Rect
                                            x={0}
                                            y={EXPORT_TITLE_FONT_SIZE + 24}
                                            width={400}
                                            height={1}
                                            fill={exportBackgroundColor === '#000000' ? '#FFFFFF' : '#9CA3AF'}
                                        />
                                        <Text
                                            text={exportSubtitle}
                                            y={EXPORT_TITLE_FONT_SIZE + 48}
                                            fontSize={EXPORT_SUBTITLE_FONT_SIZE}
                                            fontFamily="sans-serif"
                                            fill={exportBackgroundColor === '#000000' ? '#FFFFFF' : '#6B7280'}
                                        />
                                    </>
                                )}
                            </Group>
                        )}
                    
                    {/* Nine-Dash Line & Provinces - Offset Group */}
                    {(() => {
                        // 当只显示单个省份时，计算其边界并调整位置和缩放
                        if (showSingleProvince && singleProvinceId && (isExporting || showExportPreview)) {
                            const provinceConfig = PROVINCE_CONFIGS.find(p => p.id === singleProvinceId);
                            if (provinceConfig) {
                                const bounds = calculatePathBounds(provinceConfig.path);
                                if (bounds) {
                                    const exportDimensions = calculateExportDimensions(exportAspectRatio);
                                    // 计算居中位置
                                    const centerX = exportDimensions.width / 2;
                                    const centerY = exportDimensions.height / 2;
                                    
                                    // 计算缩放比例，使省份占据图片的主要位置
                                    const maxDimension = Math.max(bounds.width, bounds.height);
                                    const exportArea = Math.min(exportDimensions.width, exportDimensions.height) * 0.7; // 70% of the export area
                                    const scale = exportArea / maxDimension;
                                    
                                    // 计算位置偏移，使省份居中
                                    const x = centerX - (bounds.centerX * scale);
                                    const y = centerY - (bounds.centerY * scale);
                                    
                                    return (
                                        <Group 
                                            x={x}
                                            y={y}
                                            scaleX={scale}
                                            scaleY={scale}
                                        >
                                            {PROVINCE_CONFIGS.map((config) => {
                                                if (config.id !== singleProvinceId) {
                                                    return null;
                                                }
                                                return (
                                                    <Province
                                                        key={config.id}
                                                        config={config}
                                                        state={states[config.id]}
                                                        isSelected={selectedId === config.id}
                                                        isHovered={hoveredId === config.id}
                                                        isDimmed={!!hoveredId && hoveredId !== config.id}
                                                        isDragTarget={dragOverId === config.id}
                                                        onSelect={(id) => {
                                                            setSelectedId(id);
                                                            setIsEditing(true);
                                                            setHoveredId(null);
                                                        }}
                                                        onHover={(id) => {
                                                            if (isEditing) return;
                                                            setHoveredId(id);
                                                        }}
                                                        onUpdate={updateProvince}
                                                        isEditing={isEditing}
                                                    />
                                                );
                                            })}
                                        </Group>
                                    );
                                }
                            }
                        }
                        
                        // 默认情况：显示所有省份
                        return (
                            <Group 
                                x={(isExporting || showExportPreview) ? MAP_OFFSET_X : 0} 
                                y={(isExporting || showExportPreview) ? MAP_OFFSET_Y : 0}
                                scaleX={(isExporting || showExportPreview) ? EXPORT_MAP_SCALE : 1}
                                scaleY={(isExporting || showExportPreview) ? EXPORT_MAP_SCALE : 1}
                            >
                                {PROVINCE_CONFIGS.map((config) => {
                                    // 当选择了单个省份时，只显示选中的省份
                                    if (showSingleProvince && singleProvinceId && config.id !== singleProvinceId) {
                                        return null;
                                    }
                                    return (
                                        <Province
                                            key={config.id}
                                            config={config}
                                            state={states[config.id]}
                                            isSelected={selectedId === config.id}
                                            isHovered={hoveredId === config.id}
                                            isDimmed={!!hoveredId && hoveredId !== config.id}
                                            isDragTarget={dragOverId === config.id}
                                            onSelect={(id) => {
                                                setSelectedId(id);
                                                setIsEditing(true);
                                                setHoveredId(null);
                                            }}
                                            onHover={(id) => {
                                                if (isEditing) return;
                                                setHoveredId(id);
                                            }}
                                            onUpdate={updateProvince}
                                            isEditing={isEditing}
                                        />
                                    );
                                })}
                                
                                {/* Nine-Dash Line */}
                                {NINE_DASH_PATHS.map((path, index) => (
                                    <Path
                                    key={index}
                                    data={path}
                                    stroke="#E2E8F0"
                                    strokeWidth={1.5}
                                    dash={[5, 5]}
                                    listening={false}
                                    />
                                ))}
                            </Group>
                        );
                    })()}
                </Group>
            </Group>
        </Layer>
      </Stage>

      <div className="hidden md:block absolute bottom-4 left-4 text-stone-400 text-sm pointer-events-none select-none">
        <p>拖拽或点击图片填充 · 滚轮缩放 · 拖拽平移</p>
        {selectedId && (
          <p className="mt-1 text-xs text-emerald-500 whitespace-nowrap">
            已选中：{PROVINCE_NAMES[selectedId] || '某个省份'} · 在右侧图库中选择图片填充。
          </p>
        )}
      </div>

      <div className="md:hidden fixed bottom-32 left-1/2 -translate-x-1/2 text-[10px] text-stone-500 pointer-events-none select-none text-center px-3">
        <p className="whitespace-nowrap">
          {!isEditing && '点击图片填充 · 双指缩放 · 拖拽平移'}
          {selectedId && (
            <>
              {!isEditing && ' · '}
              <span className="text-emerald-500">
                已选中：{PROVINCE_NAMES[selectedId] || '某个省份'} · 在图库中选择图片填充。
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};