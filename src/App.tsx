import { useState, useEffect } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { NineGridCanvas } from './components/NineGridCanvas';
import { Map, Grid } from 'lucide-react';

export default function App() {
  // 从 localStorage 读取保存的视图状态，默认值为 'map'
  const [currentView, setCurrentView] = useState<'map' | 'ninegrid'>(() => {
    const savedView = localStorage.getItem('currentView');
    return (savedView === 'map' || savedView === 'ninegrid') ? savedView : 'map';
  });

  // 当 currentView 变化时，保存到 localStorage
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

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


    </main>
  );
}
