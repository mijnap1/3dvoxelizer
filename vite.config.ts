import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { voxelizeWithGemini } from './server/voxelizeWithGemini';

async function readJsonBody(req: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const bodyText = Buffer.concat(chunks).toString('utf8');
  if (!bodyText) {
    return {};
  }
  return JSON.parse(bodyText);
}

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'local-voxelize-api',
        configureServer(server) {
          server.middlewares.use('/api/voxelize', async (req, res, next) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
          }

          if (!apiKey) {
            sendJson(res, 500, { error: 'Server is missing GEMINI_API_KEY' });
            return;
          }

          try {
            const body = await readJsonBody(req);
            const base64Image = body?.base64Image;
            if (!base64Image || typeof base64Image !== 'string') {
              sendJson(res, 400, { error: 'Missing base64Image' });
              return;
            }
            const mimeType = body?.mimeType;
            if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
              sendJson(res, 400, { error: 'Missing or invalid mimeType' });
              return;
            }

            if (base64Image.length > 8_000_000) {
              sendJson(res, 413, { error: 'Image payload is too large' });
              return;
            }

            const payload = await voxelizeWithGemini(base64Image, apiKey, mimeType);
            sendJson(res, 200, payload);
          } catch (error) {
            if (error instanceof SyntaxError) {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            sendJson(res, 500, { error: message });
          }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
