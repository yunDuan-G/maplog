import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Rect, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toolbar } from './Toolbar';
import { ImageGallery } from './ImageGallery';
import { useMapState } from '../hooks/useMapState';
import useImage from 'use-image';
import { saveNineGridGalleryImage } from '../services/db';

// GridCell component for rendering individual grid cells
interface GridCellProps {
  cellId: string;
  row: number;
  col: number;
  cellState: any;
  selectedId: string | null;
  hoveredId: string | null;
  isEditing: boolean;
  dragOverId: string | null;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
  setIsEditing: (editing: boolean) => void;
  updateProvince: (id: string, updates: any) => void;
  gridSpacing: number;
}

const GridCell: React.FC<GridCellProps> = ({
  cellId,
  row,
  col,
  cellState,
  selectedId,
  hoveredId,
  isEditing,
  dragOverId,
  setHoveredId,
  setSelectedId,
  setIsEditing,
  updateProvince,
  gridSpacing
}) => {
  const [img, status] = useImage(cellState?.image || '');
  const imageRef = useRef<any>(null); // The Ghost/Master image
  const clippedImageRef = useRef<any>(null); // The Clipped/Slave image
  const trRef = useRef<any>(null);
  const groupRef = useRef<any>(null);
  
  const isSelected = selectedId === cellId;
  const isHovered = hoveredId === cellId;
  const isDimmed = !!hoveredId && hoveredId !== cellId;
  
  // Calculate position of the cell
  const x = col * (CELL_WIDTH + gridSpacing);
  const y = row * (CELL_HEIGHT + gridSpacing);
  
  // Calculate scale based on selection and hover state
  const scale = isSelected ? 1.08 : (isHovered ? 1.04 : 1);
  
  // Calculate center of the cell for correct scaling pivot
  const centerX = x + CELL_WIDTH / 2;
  const centerY = y + CELL_HEIGHT / 2;
  
  // Sync the clipped image with the ghost image during interactions
  const syncImages = () => {
    const master = imageRef.current;
    const slave = clippedImageRef.current;
    if (master && slave) {
      slave.setAttrs({
        x: master.x(),
        y: master.y(),
        scaleX: master.scaleX(),
        scaleY: master.scaleY(),
        rotation: master.rotation(),
      });
    }
  };
  
  const handleDragMove = () => {
    syncImages();
  };
  
  const handleTransform = () => {
    syncImages();
  };
  
  const handleDragEnd = (e: any) => {
    updateProvince(cellId, {
      ...cellState!,
      x: e.target.x(),
      y: e.target.y()
    });
  };
  
  const handleTransformEnd = (e: any) => {
    const node = imageRef.current;
    if (!node) return;
    updateProvince(cellId, {
      ...cellState!,
      x: node.x(),
      y: node.y(),
      scale: node.scaleX(),
      rotation: node.rotation()
    });
  };
  
  // Handle mouse enter and leave events only when no cell is selected
  const handleMouseEnter = () => {
    if (!selectedId) {
      setHoveredId(cellId);
    }
  };
  
  const handleMouseLeave = () => {
    if (!selectedId) {
      setHoveredId(null);
    }
  };
  
  // Move group to top when hovered or selected
  useEffect(() => {
    if ((isHovered || isSelected) && groupRef.current) {
      groupRef.current.moveToTop();
    }
  }, [isHovered, isSelected]);
  
  // Use useLayoutEffect to ensure nodes are attached before paint if possible
  React.useLayoutEffect(() => {
    if (isEditing && isSelected && imageRef.current && trRef.current) {
      // Force update transformer nodes
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isEditing, isSelected, img]);
  
  return (
    <Group
      ref={groupRef}
      key={cellId} 
      id={cellId}
      opacity={isDimmed ? 0.3 : 1}
      // Pivot scaling around the center of the cell
      x={centerX}
      y={centerY}
      offsetX={centerX}
      offsetY={centerY}
      scaleX={scale}
      scaleY={scale}
      // Add shadow effect on hover and selection
      shadowBlur={isSelected ? 45 : isHovered ? 25 : 0}
      shadowColor={isSelected ? 'rgba(15,23,42,0.7)' : isHovered ? 'rgba(0,0,0,0.4)' : 'transparent'}
      shadowOffsetY={isSelected ? 30 : isHovered ? 16 : 0}
      shadowOffsetX={isSelected ? 16 : isHovered ? 8 : 0}
    >
      {/* 1. Ghost Image (The Master) - Visible only when editing */}
      {cellState?.image && img && status === 'loaded' && isEditing && isSelected && (
        <KonvaImage
          ref={imageRef}
          image={img}
          x={cellState.x}
          y={cellState.y}
          scaleX={cellState.scale}
          scaleY={cellState.scale}
          rotation={cellState.rotation}
          opacity={0.4} // Dimmed
          draggable={true}
          onDragMove={handleDragMove}
          onTransform={handleTransform}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        />
      )}
      
      {/* 2. Clipped Image (The Slave) - Always visible if image exists */}
      {cellState?.image && img && status === 'loaded' && (
        <Group
          clipFunc={(ctx) => {
            // Apply the rectangular clip for the cell
            ctx.rect(x, y, CELL_WIDTH, CELL_HEIGHT);
          }}
          listening={false} // Pass events through to Ghost (if editing) or Background Rect
        >
          <KonvaImage
            ref={clippedImageRef}
            image={img}
            x={cellState.x}
            y={cellState.y}
            scaleX={cellState.scale}
            scaleY={cellState.scale}
            rotation={cellState.rotation}
            listening={false}
          />
        </Group>
      )}
      
      {/* 3. Background Rect (Border/Shape) */}
      <Rect
        x={x}
        y={y}
        width={CELL_WIDTH}
        height={CELL_HEIGHT}
        fill={cellState?.image ? 'transparent' : '#f9fafb'}
        stroke={
          isSelected
            ? '#4b5563'
            : dragOverId === cellId
            ? '#3b82f6'
            : isHovered
            ? '#94a3b8'
            : '#cbd5e1'
        }
        strokeWidth={isSelected ? 1.6 : dragOverId === cellId ? 2 : 1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.cancelBubble = true;
          setSelectedId(cellId);
          setIsEditing(true);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          setSelectedId(cellId);
          setIsEditing(true);
        }}
        listening={!cellState?.image || !isEditing} // If editing image, let clicks pass to image
      />
      
      {/* 4. Transformer */}
      {isEditing && isSelected && cellState?.image && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          anchorFill="#ffffff"
          anchorStroke="#333333"
          borderStroke="#333333"
          anchorSize={10}
          anchorCornerRadius={5}
          borderDash={[4, 4]}
        />
      )}
    </Group>
  );
};

const EXPORT_WIDTH = 2400;
const EXPORT_HEIGHT = 1800;
const EXPORT_TITLE_FONT_SIZE = 72;
const EXPORT_SUBTITLE_FONT_SIZE = 28;
const EXPORT_TITLE_FONT_FAMILY = "'PingFang SC Thin', 'PingFang SC-Light', 'Helvetica Neue UltraLight', 'Helvetica Neue', 'Microsoft YaHei UI Light', 'Microsoft YaHei', sans-serif";

const CELL_WIDTH = 300;
const CELL_HEIGHT = 300;
const GRID_SPACING = 20;

const VIEW_CENTER_OFFSET_Y = 110;

// 生成唯一ID的函数
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  } else {
    // fallback方法生成UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export const NineGridCanvas: React.FC = () => {
  const { states, updateProvince, resetProvince, resetAll, setAllStates } = useMapState('ninegrid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [gridSpacing, setGridSpacing] = useState(() => {
    const savedSpacing = localStorage.getItem('gridSpacing');
    return savedSpacing ? parseInt(savedSpacing) : GRID_SPACING;
  });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const [gridSize, setGridSize] = useState(3); // 默认为3x3
  const [showGridSizeModal, setShowGridSizeModal] = useState(false);
  const [gridRows, setGridRows] = useState(() => {
    const savedRows = localStorage.getItem('gridRows');
    return savedRows ? parseInt(savedRows) : 3;
  });
  const [gridCols, setGridCols] = useState(() => {
    const savedCols = localStorage.getItem('gridCols');
    return savedCols ? parseInt(savedCols) : 3;
  });
  const [compressionSettings, setCompressionSettings] = useState({
    enableCompression: false,
    compressionThreshold: 1, // 单位：MB
    compressionQuality: 0.7,
    maxWidth: 1920
  });

  // Viewport state（相对于 baseScale 的缩放）
  const [viewState, setViewState] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 加载压缩设置
  const loadCompressionSettings = () => {
    const savedSettings = localStorage.getItem('gallerySettings');
    if (savedSettings) {
      try {
        setCompressionSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('加载压缩设置失败:', error);
      }
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadCompressionSettings();
    
    // 监听设置变化
    const handleSettingsUpdated = () => {
      loadCompressionSettings();
    };
    
    window.addEventListener('gallerySettingsUpdated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('gallerySettingsUpdated', handleSettingsUpdated);
    };
  }, []);
  
  // Reset hoveredId when selectedId changes
  useEffect(() => {
    if (selectedId) {
      setHoveredId(null);
    }
  }, [selectedId]);

  // 不再需要监听数据更新事件，由用户确认后手动刷新

  // 生成格子ID
  const gridCells = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      gridCells.push(`cell-${row}-${col}`);
    }
  }

  // Calculate initial fit
  useEffect(() => {
    const fitGrid = () => {
      const padding = 80;
      const gridTotalWidth = gridCols * CELL_WIDTH + (gridCols - 1) * gridSpacing;
      const gridTotalHeight = gridRows * CELL_HEIGHT + (gridRows - 1) * gridSpacing;
      
      const availableWidth = window.innerWidth - padding * 2;
      const availableHeight = window.innerHeight - padding * 2;
      
      const scale = Math.min(
        availableWidth / gridTotalWidth,
        availableHeight / gridTotalHeight
      ) * 0.9;
      
      const x = (window.innerWidth - gridTotalWidth * scale) / 2;
      const y = (window.innerHeight - gridTotalHeight * scale) / 2;

      setBaseScale(scale);
      setViewState({ scale: 1, x, y });
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };

    fitGrid();
    window.addEventListener('resize', fitGrid);
    return () => window.removeEventListener('resize', fitGrid);
  }, [gridRows, gridCols, gridSpacing]);

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
    const padding = 80;
    const gridTotalWidth = gridCols * CELL_WIDTH + (gridCols - 1) * gridSpacing;
    const gridTotalHeight = gridRows * CELL_HEIGHT + (gridRows - 1) * gridSpacing;
    
    const availableWidth = window.innerWidth - padding * 2;
    const availableHeight = window.innerHeight - padding * 2;

    const scale = Math.min(
      availableWidth / gridTotalWidth,
      availableHeight / gridTotalHeight
    ) * 0.9;

    const x = (window.innerWidth - gridTotalWidth * scale) / 2;
    const y = (window.innerHeight - gridTotalHeight * scale) / 2;

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
  
  const handleOpenGridSizeModal = () => {
    // 打开弹窗前，保持当前的行数和列数
    setShowGridSizeModal(true);
  };
  
  const handleConfirmGridSize = () => {
    // 确保行数和列数在合理范围内（1-10）
    const rows = Math.max(1, Math.min(10, parseInt(gridRows.toString()) || 3));
    const cols = Math.max(1, Math.min(10, parseInt(gridCols.toString()) || 3));
    const spacing = Math.max(0, Math.min(50, parseInt(gridSpacing.toString()) ?? 20));
    
    // 更新行数、列数和格子间隔距离
    setGridRows(rows);
    setGridCols(cols);
    setGridSpacing(spacing);
    
    // 保存到本地存储
    localStorage.setItem('gridRows', rows.toString());
    localStorage.setItem('gridCols', cols.toString());
    localStorage.setItem('gridSpacing', spacing.toString());
    
    // 关闭弹窗
    setShowGridSizeModal(false);
  };

  const fillCellWithImage = async (
    cellId: string,
    image: string
  ) => {
    const [_, row, col] = cellId.split('-').map(Number);
    const cellX = col * (CELL_WIDTH + gridSpacing);
    const cellY = row * (CELL_HEIGHT + gridSpacing);

    const img = new Image();
    img.onload = async () => {
      let scale = 1;
      let x = 0;
      let y = 0;

      const coverScale = Math.max(CELL_WIDTH / img.width, CELL_HEIGHT / img.height);
      scale = coverScale * 1.05;
      x = cellX + CELL_WIDTH / 2 - (img.width * scale) / 2;
      y = cellY + CELL_HEIGHT / 2 - (img.height * scale) / 2;

      setSelectedId(cellId);
      setIsEditing(true);

      await updateProvince(cellId, {
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
    setShowExportPreview(true);
    setPreviewImage(null);
    setSelectedId(null);
    setIsEditing(false);
    // 生成初始预览
    setTimeout(() => {
        setIsExporting(true);
        setTimeout(handleGeneratePreview, 50);
    }, 100);
  };

  const handleDeleteCurrentCellImage = () => {
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
    
    setTimeout(() => {
        const stage = stageRef.current;

        const oldScaleX = stage.scaleX();
        const oldScaleY = stage.scaleY();
        const oldX = stage.x();
        const oldY = stage.y();

        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        stage.batchDraw();

        // 计算网格的实际宽度和高度
        const gridTotalWidth = gridCols * CELL_WIDTH + (gridCols - 1) * gridSpacing;
        const gridTotalHeight = gridRows * CELL_HEIGHT + (gridRows - 1) * gridSpacing;
        
        // 计算导出区域的起始位置
        const exportX = isExporting ? 0 : (showExportPreview ? 400 : 0);
        const exportY = isExporting ? 0 : (showExportPreview ? 120 : 0);

        const uri = stage.toDataURL({ 
            pixelRatio: 3,
            x: exportX,
            y: exportY,
            width: gridTotalWidth,
            height: gridTotalHeight,
            mimeType: 'image/jpeg',
            quality: 1
        });

        stage.scale({ x: oldScaleX, y: oldScaleY });
        stage.position({ x: oldX, y: oldY });
        stage.batchDraw();

        setPreviewImage(uri);
        setIsExporting(false);
    }, 100);
  };

  const handleConfirmExport = () => {
    if (previewImage) {
        const link = document.createElement('a');
        link.download = 'nine-grid-puzzle.jpg';
        link.href = previewImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShowExportPreview(false);
    }
  };

  const handleExportArchive = async () => {
    // 获取九宫格图库中的所有图片
    const { getAllNineGridGalleryImages } = await import('../services/db');
    const galleryImages = await getAllNineGridGalleryImages();
    
    const data = {
      type: 'ninegrid',
      timestamp: Date.now(),
      states: states,
      galleryImages: galleryImages,
      gridConfig: {
        rows: gridRows,
        cols: gridCols,
        spacing: gridSpacing
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = '九宫格数据导出.json';
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
        if (data.type !== 'ninegrid') {
          alert('导入失败，请选择九宫格类型的存档文件');
          return;
        }
        
        // 导入排版数据
        await setAllStates(data.states || {});
        
        // 导入九宫格配置
        if (data.gridConfig) {
          const { rows, cols, spacing } = data.gridConfig;
          if (rows && cols) {
            setGridRows(rows);
            setGridCols(cols);
            localStorage.setItem('gridRows', rows.toString());
            localStorage.setItem('gridCols', cols.toString());
          }
          if (spacing !== undefined) {
            setGridSpacing(spacing);
            localStorage.setItem('gridSpacing', spacing.toString());
          }
        }
        
        // 导入图库图片
        if (data.galleryImages && Array.isArray(data.galleryImages)) {
          const { saveNineGridGalleryImage, clearNineGridGallery } = await import('../services/db');
          
          // 清空现有图库
          await clearNineGridGallery();
          
          // 保存导入的图片
          for (const image of data.galleryImages) {
            await saveNineGridGalleryImage(image);
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
    
    // Find the cell group
    let node = hit;
    let cellId: string | undefined;
    
    while (node && node !== stage) {
        const id = node.id();
        if (id && gridCells.includes(id)) {
            cellId = id;
            break;
        }
        const parent = node.getParent();
        if (!parent) break;
        node = parent;
    }
    
    if (!cellId) return;

    // Handle drag from gallery
    const galleryImage = e.dataTransfer.getData('gallery-image');
    if (galleryImage) {
        fillCellWithImage(cellId, galleryImage);
        return;
    }

    // Handle file drop
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // 检查是否需要压缩
      const shouldCompress = compressionSettings.enableCompression && 
        file.size > compressionSettings.compressionThreshold * 1024 * 1024;
      
      if (shouldCompress) {
        // 触发压缩模态框
        window.dispatchEvent(new CustomEvent('openImageCompressor', { 
          detail: { 
            file, 
            type: 'ninegrid' as const, 
            onComplete: (compressedBase64: string) => {
              fillCellWithImage(cellId!, compressedBase64);
            }
          } 
        }));
      } else {
        // 直接处理图片文件
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          // 填充到格子
          fillCellWithImage(cellId!, base64);
          // 保存到图库
          const newImage = {
            id: generateUUID(),
            data: base64,
            timestamp: Date.now(),
          };
          await saveNineGridGalleryImage(newImage);
          // 触发事件通知图库刷新
          window.dispatchEvent(new CustomEvent('galleryImagesUpdated', { detail: { type: 'ninegrid' } }));
        };
        reader.readAsDataURL(file);
      }
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

      // Find the cell group
      let node = hit;
      let cellId: string | undefined;
      
      while (node && node !== stage) {
          const id = node.id();
          if (id && gridCells.includes(id)) {
              cellId = id;
              break;
          }
          const parent = node.getParent();
          if (!parent) break;
          node = parent;
      }

      if (cellId) {
          setDragOverId(cellId);
      } else {
          setDragOverId(null);
      }
  };

  const handleFillWithGalleryImage = (image: string) => {
    if (!selectedId) {
      alert('请先选择一个格子');
      return;
    }
    fillCellWithImage(selectedId, image);
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
    let cellId: string | undefined;

    while (node && node !== stage) {
      const id = node.id && node.id();
      if (id && gridCells.includes(id)) {
        cellId = id;
        break;
      }
      const parent = node.getParent && node.getParent();
      if (!parent) break;
      node = parent;
    }

    if (!isEditing) {
      if (!cellId) {
        setSelectedId(null);
      }
      return;
    }

    if (cellId !== selectedId) {
      setSelectedId(null);
      setIsEditing(false);
    }
  };

  // 计算格子的位置
  const getCellPosition = (row: number, col: number) => {
    return {
      x: col * (CELL_WIDTH + gridSpacing),
      y: row * (CELL_HEIGHT + gridSpacing)
    };
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
        type="ninegrid"
        onOpenSettings={() => {
          // 触发设置模态框的显示，由 App.tsx 处理
          window.dispatchEvent(new CustomEvent('openGallerySettings'));
        }}
        onOpenCompressor={(file) => {
          // 触发压缩模态框的显示，由 App.tsx 处理
          window.dispatchEvent(new CustomEvent('openImageCompressor', { detail: { file, type: 'ninegrid' } }));
        }}
      />

      {!showExportPreview && (
        <div className="absolute top-12 left-12 z-10 pointer-events-none select-none">
            <h1 className="text-4xl font-extralight tracking-[0.2em] text-gray-900">九宫格拼图</h1>
            <div className="h-px w-24 bg-gray-400 my-4"></div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Nine Grid · 照片拼图</p>
        </div>
      )}

      {/* Export Preview Panel - Centered */}
      {showExportPreview && (
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white/95 p-6 rounded-2xl shadow-2xl backdrop-blur-md border border-gray-200 transition-all duration-300 ease-in-out w-[90vw] max-w-6xl h-[85vh] flex`}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0 w-full absolute top-6 left-6 right-6">
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    导出设置与预览
                </h2>
                <button 
                    onClick={() => setShowExportPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div className="flex flex-1 mt-16 gap-6">
                {/* 左侧：导出设置 */}
                <div className="w-1/3 space-y-4">



                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={() => setShowExportPreview(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleConfirmExport}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 active:scale-95 transition-all shadow-lg text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <span>保存图片</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                    </div>
                    
                    <p className="text-center text-[10px] text-gray-400 mt-4">
                        预览模式下背景为白色，导出将包含当前视图内容
                    </p>
                </div>
                
                {/* 右侧：实时预览 */}
                <div className="w-2/3 flex-1 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative group">
                    {previewImage ? (
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                    ) : (
                        <div className="animate-pulse flex flex-col items-center text-gray-400">
                            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
                            <span className="text-sm">正在生成预览...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {/* Grid Size Modal */}
      {showGridSizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 w-80 max-w-[80vw]">
            <h3 className="text-lg font-medium text-gray-900 mb-4">设置格子数量</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">行数</label>
                <input 
                  type="number" 
                  value={gridRows}
                  onChange={(e) => setGridRows(parseInt(e.target.value) || 0)}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">列数</label>
                <input 
                  type="number" 
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value) || 0)}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">格子间隔距离 (px)</label>
                <input 
                  type="number" 
                  value={gridSpacing}
                  onChange={(e) => setGridSpacing(parseInt(e.target.value) || 0)}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowGridSizeModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmGridSize}
                className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800"
              >
                确认
              </button>
            </div>
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
          type="ninegrid"
          onOpenGridSizeModal={handleOpenGridSizeModal}
          canDeleteCurrent={!!(selectedId && states[selectedId]?.image)}
          onDeleteCurrent={handleDeleteCurrentCellImage}
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
                <Rect 
                    x={0} 
                    y={0} 
                    width={EXPORT_WIDTH} 
                    height={EXPORT_HEIGHT} 
                    fill="white" 
                    visible={showExportPreview} 
                />

                    {/* 导出内容：标题 + 九宫格 */}
                    <Group ref={exportContentRef}>

                    
                    {/* 九宫格 */}
                    <Group 
                        x={isExporting ? 0 : (showExportPreview ? 400 : 0)} 
                        y={isExporting ? 0 : (showExportPreview ? 120 : 0)}
                    >
                        {gridCells.map((cellId) => {
                            const [_, row, col] = cellId.split('-').map(Number);
                            const cellState = states[cellId];
                            
                            return (
                                <GridCell
                                    key={cellId}
                                    cellId={cellId}
                                    row={row}
                                    col={col}
                                    cellState={cellState}
                                    selectedId={selectedId}
                                    hoveredId={hoveredId}
                                    isEditing={isEditing}
                                    dragOverId={dragOverId}
                                    setHoveredId={setHoveredId}
                                    setSelectedId={setSelectedId}
                                    setIsEditing={setIsEditing}
                                    updateProvince={updateProvince}
                                    gridSpacing={gridSpacing}
                                />
                            );
                        })}
                    </Group>
                </Group>
            </Group>
        </Layer>
      </Stage>

      <div className="hidden md:block absolute bottom-4 left-4 text-stone-400 text-sm pointer-events-none select-none">
        <p>拖拽或点击图片填充 · 滚轮缩放 · 拖拽平移</p>
        {selectedId && (
          <p className="mt-1 text-xs text-emerald-500 whitespace-nowrap">
            已选中：{(() => {
              const [_, row, col] = selectedId.split('-').map(Number);
              return `${row + 1}-${col + 1}`;
            })()} · 在右侧图库中选择图片填充。
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
                已选中：{(() => {
                  const [_, row, col] = selectedId.split('-').map(Number);
                  return `${row + 1}-${col + 1}`;
                })()} · 在图库中选择图片填充。
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};