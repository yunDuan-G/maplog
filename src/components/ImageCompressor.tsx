import React, { useState, useRef, useEffect } from 'react';

interface ImageCompressorProps {
  onCompress: (compressedBlobs: Blob[]) => void;
  onCancel: () => void;
  originalFiles?: File[];
  compressionProgress?: number;
  compressedCount?: number;
  onProgressUpdate?: (progress: number, count: number) => void;
}

export const ImageCompressor: React.FC<ImageCompressorProps> = ({
  onCompress,
  onCancel,
  originalFiles = [],
  compressionProgress = 0,
  compressedCount = 0,
  onProgressUpdate
}) => {
  const [quality, setQuality] = useState<number>(0.7);
  const [maxWidth, setMaxWidth] = useState<number>(1920);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [totalOriginalSize, setTotalOriginalSize] = useState<number>(0);

  // 从本地存储加载压缩设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('gallerySettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.compressionQuality !== undefined) {
          setQuality(settings.compressionQuality);
        }
        if (settings.maxWidth !== undefined) {
          setMaxWidth(settings.maxWidth);
        }
      } catch (error) {
        console.error('加载压缩设置失败:', error);
      }
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (originalFiles.length > 0) {
      const totalSize = originalFiles.reduce((sum, file) => sum + file.size, 0);
      setTotalOriginalSize(totalSize);
    }
  }, [originalFiles]);

  const compressImage = async () => {
    if (originalFiles.length === 0) return;

    setIsCompressing(true);

    try {
      const compressedBlobs: Blob[] = [];
      const totalFiles = originalFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = originalFiles[i];
        const blob = await new Promise<Blob>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = canvasRef.current || document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              // 计算新尺寸 (保持宽高比)
              if (maxWidth > 0 && width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              
              // 对于JPEG，填充白色背景以防透明区域变黑
              if (ctx) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);

                // 高质量绘图设置
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.drawImage(img, 0, 0, width, height);

                // 导出为 Blob
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      resolve(blob);
                    } else {
                      reject(new Error('压缩失败，Blob为空'));
                    }
                  },
                  'image/jpeg',
                  quality
                );
              } else {
                reject(new Error('无法获取Canvas上下文'));
              }
            };
            img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
        });

        compressedBlobs.push(blob);
        
        // 更新进度
        const currentCount = i + 1;
        const progress = (currentCount / totalFiles) * 100;
        if (onProgressUpdate) {
          onProgressUpdate(progress, currentCount);
        }
      }

      onCompress(compressedBlobs);
    } catch (error) {
      console.error('压缩失败:', error);
      alert('压缩失败: ' + (error as Error).message);
    } finally {
      setIsCompressing(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">图片压缩</h3>
      
      {originalFiles.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            待压缩图片 ({originalFiles.length} 张)
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {originalFiles.slice(0, 5).map((file, index) => (
              <div key={index}>
                {file.name} ({formatSize(file.size)})
              </div>
            ))}
            {originalFiles.length > 5 && (
              <div className="text-gray-500">
                ... 还有 {originalFiles.length - 5} 张图片
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-gray-200">
              总大小: {formatSize(totalOriginalSize)}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            压缩质量 (0.1 - 1.0)
          </label>
          <input
            type="number"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
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
            value={maxWidth}
            onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
            min="0"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={compressImage}
          disabled={originalFiles.length === 0 || isCompressing}
          className="flex-1 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
        >
          {isCompressing ? '压缩中...' : '开始压缩'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
      </div>

      {isCompressing && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">压缩进度</h4>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${compressionProgress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">
            已压缩: {compressedCount} / {originalFiles.length} 张
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};