<div align="center">
</div>

# 3D Voxelizer

Turn any image into an interactive 3D voxel diorama and export it as a `.glb` model.

## What It Does

- Upload a photo and generate a voxel design with AI.
- View and rotate the generated model in a Three.js scene.
- Inspect palette and block stats.
- Export the voxel result as `.glb`.

## Tech Stack

- Frontend: React + TypeScript + Vite
- 3D Rendering: Three.js
- AI: Gemini (`@google/genai`)
- API Runtime: Vercel Serverless Function (`/api/voxelize`)

## Project Structure

- `/App.tsx` UI and app flow
- `/VoxelScene.tsx` Three.js scene rendering + GLB export
- `/geminiService.ts` frontend client call to API route
- `/api/voxelize.ts` server-side Gemini call (API key stays here)
- `/types.ts` shared response/data types

## Security Model

- The browser never calls Gemini directly.
- The browser only calls `/api/voxelize`.
- `GEMINI_API_KEY` is read only on the server in `/api/voxelize.ts`.
- Do not put API keys in client code, Vite `define`, or public env variables.

## Local Development

Prerequisites:
- Node.js 18+

Setup:
1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`:
   `GEMINI_API_KEY=your_gemini_api_key_here`
3. Run local dev:
   `npm run dev`

Notes:
- `npm run dev` now serves frontend + local `/api/voxelize` in Vite.
- `npm run dev:secure` still works via `vercel dev` if you want to mirror Vercel runtime.

## Deployment (GitHub + Vercel)

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add environment variable in Vercel project settings:
   `GEMINI_API_KEY=your_gemini_api_key_here`
4. Deploy.

## Environment Variables

- `GEMINI_API_KEY` required on the server.

## NPM Scripts

- `npm run dev` start Vite dev server with local API middleware
- `npm run dev:secure` run Vite + Vercel API routes locally
- `npm run build` build production frontend bundle
- `npm run preview` preview production frontend build

## Troubleshooting

- `Voxel matrix failure`:
  Check Vercel logs or local terminal output for `/api/voxelize` errors.
- `Server is missing GEMINI_API_KEY`:
  Add the key in local `.env.local` and Vercel environment settings.
- API works locally but not in production:
  Confirm the key is set in the correct Vercel environment (Production/Preview).

## License

Private project unless you choose to add an open-source license.
