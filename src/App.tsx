import { useState, useEffect } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { NineGridCanvas } from './components/NineGridCanvas';
import { Map, Grid } from 'lucide-react';
import { GallerySettings } from './components/GallerySettings.tsx';
import { ImageCompressor } from './components/ImageCompressor.tsx';
import { saveMapGalleryImage, saveNineGridGalleryImage, GalleryImage } from './services/db';

export default function App() {
  // 从 localStorage 读取保存的视图状态，默认值为 'map'
  const [currentView, setCurrentView] = useState<'map' | 'ninegrid'>(() => {
    const savedView = localStorage.getItem('currentView');
    return (savedView === 'map' || savedView === 'ninegrid') ? savedView : 'map';
  });

  // 图库设置模态框状态
  const [showGallerySettings, setShowGallerySettings] = useState(false);
  
  // 图片压缩模态框状态
  const [showImageCompressor, setShowImageCompressor] = useState(false);
  const [currentCompressFile, setCurrentCompressFile] = useState<File | null>(null);
  const [currentCompressType, setCurrentCompressType] = useState<'map' | 'ninegrid'>('map');

  // 当 currentView 变化时，保存到 localStorage
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // 监听来自子组件的设置事件
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowGallerySettings(true);
    };

    window.addEventListener('openGallerySettings', handleOpenSettings);
    return () => {
      window.removeEventListener('openGallerySettings', handleOpenSettings);
    };
  }, []);

  // 监听来自子组件的压缩事件
  useEffect(() => {
    const handleOpenCompressor = (event: CustomEvent) => {
      const { file, type, onComplete } = event.detail;
      setCurrentCompressFile(file);
      setCurrentCompressType(type);
      setShowImageCompressor(true);
      // 保存回调函数
      window['__compressCompleteCallback'] = onComplete;
    };

    window.addEventListener('openImageCompressor', handleOpenCompressor as EventListener);
    return () => {
      window.removeEventListener('openImageCompressor', handleOpenCompressor as EventListener);
      delete window['__compressCompleteCallback'];
    };
  }, []);

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

  // 处理压缩完成
  const handleCompress = async (compressedBlob: Blob) => {
    if (currentCompressFile) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newImage: GalleryImage = {
          id: generateUUID(),
          data: base64,
          timestamp: Date.now(),
        };
        if (currentCompressType === 'map') {
          await saveMapGalleryImage(newImage);
        } else {
          await saveNineGridGalleryImage(newImage);
        }
        // 调用回调函数（如果存在）
        if (window['__compressCompleteCallback']) {
          window['__compressCompleteCallback'](base64);
          delete window['__compressCompleteCallback'];
        }
        // 触发自定义事件，通知图库组件刷新
        window.dispatchEvent(new CustomEvent('galleryImagesUpdated', { detail: { type: currentCompressType } }));
        setShowImageCompressor(false);
        setCurrentCompressFile(null);
      };
      reader.readAsDataURL(compressedBlob);
    }
  };

  // 处理压缩取消
  const handleCompressCancel = () => {
    setShowImageCompressor(false);
    setCurrentCompressFile(null);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-slate-100">
      {/* 左侧工具栏 */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl shadow-black/5 rounded-2xl p-2 transition-all duration-300 hover:shadow-black/10 hover:bg-white/90">
        <button
          onClick={() => setCurrentView('map')}
          className={`p-3 rounded-xl transition-all duration-300 ease-out flex items-center justify-center ${currentView === 'map' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
          title="中国地图"
        >
          <Map size={20} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setCurrentView('ninegrid')}
          className={`p-3 rounded-xl transition-all duration-300 ease-out flex items-center justify-center ${currentView === 'ninegrid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
          title="九宫格"
        >
          <Grid size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* 主要内容 */}
      {currentView === 'map' ? <MapCanvas /> : <NineGridCanvas />}

      {/* 图库设置模态框 */}
      {showGallerySettings && (
        <GallerySettings
          onClose={() => setShowGallerySettings(false)}
        />
      )}

      {/* 图片压缩模态框 */}
      {showImageCompressor && currentCompressFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <ImageCompressor
              originalFile={currentCompressFile}
              onCompress={handleCompress}
              onCancel={handleCompressCancel}
            />
          </div>
        </div>
      )}

    </main>
  );
};