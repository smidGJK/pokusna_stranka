export type TransferType =
  | 'metro-a'
  | 'metro-b'
  | 'metro-c'
  | 'metro-d'
  | 'train'
  | 'tram'
  | 'bus'
  | 'ferry'
  | 'funicular'
  | 'airport';

export interface Stop {
  id: string;
  name: string;
  minutes: number; // travel time in minutes from the previous stop
  zone: string; // e.g. "P", "0", "B", "1", "2"
  isRequestStop?: boolean; // Zastávka na znamení (x)
  transfers?: TransferType[];
  platform?: string; // Optional platform indicator (e.g. "stanoviště A")
}

export interface RouteConfig {
  lineNumber: string;
  lineType: 'bus' | 'tram' | 'trolleybus' | 'night';
  stops: Stop[];
}

export interface ActiveSimulationState {
  currentIndex: number; // Index of the CURRENT / NEXT stop being approached
  isDeparted: boolean; // whether departed or at stop
  elapsedSeconds: number;
}
