export interface ImageData {
  base64: string;
  mimeType: string;
  url?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export type GarmentType = 'shirt' | 'long_dress' | 'short_dress' | 'long_skirt' | 'short_skirt' | 'pants' | 'jacket' | 'other';
