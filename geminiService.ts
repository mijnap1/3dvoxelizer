import { VoxelDesignResponse } from './types';

export const analyzeImageForVoxel = async (
  base64Image: string,
  mimeType: string,
): Promise<VoxelDesignResponse> => {
  const response = await fetch('/api/voxelize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Voxelization failed';
    throw new Error(message);
  }

  return payload as VoxelDesignResponse;
};
