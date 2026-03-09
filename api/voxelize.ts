import { voxelizeWithGemini } from '../server/voxelizeWithGemini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    return;
  }

  const base64Image = req.body?.base64Image;
  if (!base64Image || typeof base64Image !== 'string') {
    res.status(400).json({ error: 'Missing base64Image' });
    return;
  }
  const mimeType = req.body?.mimeType;
  if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    res.status(400).json({ error: 'Missing or invalid mimeType' });
    return;
  }

  if (base64Image.length > 8_000_000) {
    res.status(413).json({ error: 'Image payload is too large' });
    return;
  }

  try {
    const payload = await voxelizeWithGemini(base64Image, apiKey, mimeType);
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
