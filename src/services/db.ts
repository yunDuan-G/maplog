import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'imprint-china-db';
const MAP_STORE_NAME = 'map-province-photos';
const NINEGRID_STORE_NAME = 'ninegrid-province-photos';
const MAP_GALLERY_STORE_NAME = 'map-image-gallery';
const NINEGRID_GALLERY_STORE_NAME = 'ninegrid-image-gallery';

export interface ProvinceData {
  id: string;
  image: string; // base64 or blob url
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface GalleryImage {
  id: string;
  data: string; // base64
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase<any>>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 4, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
            db.createObjectStore('province-photos', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
            db.createObjectStore('image-gallery', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
            db.createObjectStore(MAP_GALLERY_STORE_NAME, { keyPath: 'id' });
            db.createObjectStore(NINEGRID_GALLERY_STORE_NAME, { keyPath: 'id' });
        }
        if (oldVersion < 4) {
            db.createObjectStore(MAP_STORE_NAME, { keyPath: 'id' });
            db.createObjectStore(NINEGRID_STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Map Gallery Operations
export const saveMapGalleryImage = async (image: GalleryImage) => {
    const db = await getDB();
    return db.put(MAP_GALLERY_STORE_NAME, image);
};

export const getAllMapGalleryImages = async (): Promise<GalleryImage[]> => {
    const db = await getDB();
    return db.getAll(MAP_GALLERY_STORE_NAME);
};

export const deleteMapGalleryImage = async (id: string) => {
    const db = await getDB();
    return db.delete(MAP_GALLERY_STORE_NAME, id);
};

export const clearMapGallery = async () => {
  const db = await getDB();
  return db.clear(MAP_GALLERY_STORE_NAME);
};

// NineGrid Gallery Operations
export const saveNineGridGalleryImage = async (image: GalleryImage) => {
    const db = await getDB();
    return db.put(NINEGRID_GALLERY_STORE_NAME, image);
};

export const getAllNineGridGalleryImages = async (): Promise<GalleryImage[]> => {
    const db = await getDB();
    return db.getAll(NINEGRID_GALLERY_STORE_NAME);
};

export const deleteNineGridGalleryImage = async (id: string) => {
    const db = await getDB();
    return db.delete(NINEGRID_GALLERY_STORE_NAME, id);
};

export const clearNineGridGallery = async () => {
  const db = await getDB();
  return db.clear(NINEGRID_GALLERY_STORE_NAME);
};

// Map Province Operations
export const saveMapProvinceData = async (data: ProvinceData) => {
  const db = await getDB();
  return db.put(MAP_STORE_NAME, data);
};

export const getMapProvinceData = async (id: string): Promise<ProvinceData | undefined> => {
  const db = await getDB();
  return db.get(MAP_STORE_NAME, id);
};

export const getAllMapProvincesData = async (): Promise<ProvinceData[]> => {
  const db = await getDB();
  return db.getAll(MAP_STORE_NAME);
};

export const deleteMapProvinceData = async (id: string) => {
  const db = await getDB();
  return db.delete(MAP_STORE_NAME, id);
};

export const clearAllMapProvincesData = async () => {
  const db = await getDB();
  return db.clear(MAP_STORE_NAME);
};

// NineGrid Province Operations
export const saveNineGridProvinceData = async (data: ProvinceData) => {
  const db = await getDB();
  return db.put(NINEGRID_STORE_NAME, data);
};

export const getNineGridProvinceData = async (id: string): Promise<ProvinceData | undefined> => {
  const db = await getDB();
  return db.get(NINEGRID_STORE_NAME, id);
};

export const getAllNineGridProvincesData = async (): Promise<ProvinceData[]> => {
  const db = await getDB();
  return db.getAll(NINEGRID_STORE_NAME);
};

export const deleteNineGridProvinceData = async (id: string) => {
  const db = await getDB();
  return db.delete(NINEGRID_STORE_NAME, id);
};

export const clearAllNineGridProvincesData = async () => {
  const db = await getDB();
  return db.clear(NINEGRID_STORE_NAME);
};
