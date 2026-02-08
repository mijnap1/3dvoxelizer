import { GoogleGenAI, Type } from '@google/genai';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    elements: {
      type: Type.OBJECT,
      properties: {
        terrain: { type: Type.ARRAY, items: { type: Type.STRING } },
        objects: { type: Type.ARRAY, items: { type: Type.STRING } },
        structures: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['terrain', 'objects', 'structures'],
    },
    palette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hex: { type: Type.STRING },
          name: { type: Type.STRING },
          usage: { type: Type.STRING },
        },
        required: ['hex', 'name', 'usage'],
      },
    },
    clusters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          z: { type: Type.NUMBER },
          w: { type: Type.NUMBER },
          h: { type: Type.NUMBER },
          d: { type: Type.NUMBER },
          color: { type: Type.STRING },
        },
        required: ['x', 'y', 'z', 'w', 'h', 'd', 'color'],
      },
    },
    dimensions: {
      type: Type.OBJECT,
      properties: {
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
        depth: { type: Type.NUMBER },
      },
      required: ['width', 'height', 'depth'],
    },
  },
  required: ['name', 'description', 'elements', 'palette', 'clusters', 'dimensions'],
};

const PROMPT = `Act as a world-class voxel engineer and digital sculptor.
Your goal is to perform a surgical 3D reconstruction of the provided image into a high-fidelity voxel diorama.

RECONSTRUCTION PRINCIPLES:
1. GRID-PERFECT ALIGNMENT:
   - Every cluster MUST be aligned to a strict 0.5 unit grid.
   - Coordinates (x, y, z) and dimensions (w, h, d) must be precisely calculated so adjacent clusters touch perfectly without gaps or overlapping volume.
   - If two clusters are adjacent, ensure their boundary coordinates are identical (e.g., if cluster A ends at x=2.5, cluster B should start at x=2.5).

2. HIGH-DENSITY CLUSTERING (150-300 clusters):
   - Use "Micro-Clusters" (0.5x0.5x0.5) to capture intricate details, curves, and thin features.
   - Reconstruct silhouettes with "stepped" voxel layers to simulate smooth gradients in a 3D block environment.

3. VOLUMETRIC INTEGRITY:
   - Ensure the model is fully 3D (manifold). Define the rear, sides, and top/bottom surfaces logicially based on the input image.
   - Eliminate "floating" or disconnected clusters unless they are intentional atmospheric effects.

4. 360-DEGREE READABILITY:
   - The model must look cohesive and structurally sound from any viewing angle.
   - Use color value variations within the palette to define planes and depth (e.g., top-facing surfaces slightly lighter, bottom-facing slightly darker).

OUTPUT REQUIREMENTS:
- name: Professional diorama title.
- description: Brief structural/artistic summary.
- clusters: 150-300 clusters.
  - x, y, z: CENTER coordinates (multiples of 0.25 or 0.5).
  - w, h, d: Dimensions (multiples of 0.5).
  - color: Hex code from the image.
- dimensions: Bounding box size (32-64 range).`;

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

  if (base64Image.length > 8_000_000) {
    res.status(413).json({ error: 'Image payload is too large' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: PROMPT,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!response.text) {
      res.status(502).json({ error: 'No response text from Gemini' });
      return;
    }

    res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
