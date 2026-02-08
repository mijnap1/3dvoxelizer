<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voxelizer.AI

Public voxelizer website with a protected Gemini key.

## Security Model

- Browser never calls Gemini directly.
- Browser calls `/api/voxelize`.
- `GEMINI_API_KEY` is only read on the server function (`api/voxelize.ts`).

## Local Development

Prerequisites: Node.js.

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and set your key:
   `GEMINI_API_KEY=your_key_here`
3. Run secure local dev (frontend + API):
   `npm run dev:secure`

Note: `npm run dev` runs Vite only and does not include the serverless API route.

## Deploy Publicly (Vercel + GitHub)

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Set environment variable in Vercel project settings:
   `GEMINI_API_KEY=your_key_here`
4. Deploy.

After deploy, users can use the site publicly, but your API key is not exposed in frontend code or network requests.
