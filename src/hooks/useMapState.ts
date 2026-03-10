import { useState, useEffect, useCallback } from 'react';
import { ProvinceState } from '../types';
import { 
  getAllMapProvincesData, 
  saveMapProvinceData, 
  deleteMapProvinceData, 
  clearAllMapProvincesData,
  getAllNineGridProvincesData, 
  saveNineGridProvinceData, 
  deleteNineGridProvinceData, 
  clearAllNineGridProvincesData
} from '../services/db';

export function useMapState(type: 'map' | 'ninegrid') {
  const [states, setStates] = useState<Record<string, ProvinceState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = type === 'map' 
          ? await getAllMapProvincesData() 
          : await getAllNineGridProvincesData();
        const stateMap: Record<string, ProvinceState> = {};
        data.forEach((d) => {
          // Handle potential data mismatch from previous versions or DB format
          const scale = (d as any).scale || (d as any).scaleX || 1;
          stateMap[d.id] = {
            id: d.id,
            image: d.image,
            x: d.x,
            y: d.y,
            scale: scale,
            rotation: d.rotation,
          };
        });
        setStates(stateMap);
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [type]);

  const updateProvince = useCallback(async (id: string, updates: Partial<ProvinceState>) => {
    setStates((prev) => {
      const currentState = prev[id] || {
        id,
        image: null,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      };
      const newState = { ...currentState, ...updates };
      
      // Save to DB asynchronously
      // We explicitly map ProvinceState to the format expected by DB if strictly typed
      if (type === 'map') {
        saveMapProvinceData({
          ...newState,
          scaleX: newState.scale,
          scaleY: newState.scale,
        } as any);
      } else {
        saveNineGridProvinceData({
          ...newState,
          scaleX: newState.scale,
          scaleY: newState.scale,
        } as any);
      }

      return { ...prev, [id]: newState };
    });
  }, [type]);

  const resetProvince = useCallback(async (id: string) => {
    setStates((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    if (type === 'map') {
      await deleteMapProvinceData(id);
    } else {
      await deleteNineGridProvinceData(id);
    }
  }, [type]);

  const resetAll = useCallback(async () => {
    setStates({});
    if (type === 'map') {
      await clearAllMapProvincesData();
    } else {
      await clearAllNineGridProvincesData();
    }
  }, [type]);

  const setAllStates = useCallback(async (newStates: Record<string, ProvinceState>) => {
    setStates(newStates);
    if (type === 'map') {
      await clearAllMapProvincesData();
      for (const id in newStates) {
        const state = newStates[id];
        await saveMapProvinceData({
          ...state,
          scaleX: state.scale,
          scaleY: state.scale,
        } as any);
      }
    } else {
      await clearAllNineGridProvincesData();
      for (const id in newStates) {
        const state = newStates[id];
        await saveNineGridProvinceData({
          ...state,
          scaleX: state.scale,
          scaleY: state.scale,
        } as any);
      }
    }
  }, [type]);

  return {
    states,
    loading,
    updateProvince,
    resetProvince,
    resetAll,
    setAllStates
  };
}

// 独立的 setAllStates 函数，用于外部导入
export const setAllStates = async (newStates: Record<string, ProvinceState>, type: 'map' | 'ninegrid') => {
  if (type === 'map') {
    await clearAllMapProvincesData();
    for (const id in newStates) {
      const state = newStates[id];
      await saveMapProvinceData({
        ...state,
        scaleX: state.scale,
        scaleY: state.scale,
      } as any);
    }
  } else {
    await clearAllNineGridProvincesData();
    for (const id in newStates) {
      const state = newStates[id];
      await saveNineGridProvinceData({
        ...state,
        scaleX: state.scale,
        scaleY: state.scale,
      } as any);
    }
  }
  
  // 不再自动触发刷新，由用户确认后手动刷新
};
