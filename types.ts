
export interface VoxelCluster {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
}

export interface VoxelDesignResponse {
  name: string;
  description: string;
  elements: {
    terrain: string[];
    objects: string[];
    structures: string[];
  };
  palette: {
    hex: string;
    name: string;
    usage: string;
  }[];
  clusters: VoxelCluster[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface ProcessingState {
  status: 'idle' | 'analyzing' | 'generating' | 'complete' | 'error';
  message: string;
}
