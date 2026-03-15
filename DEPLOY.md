# Deploying Shot Caller to Vercel

This guide explains how to deploy Shot Caller (a Vite + Express hybrid app) to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **Environment Variables**: Have your API keys ready

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**: Ensure your latest code is pushed to GitHub
   ```bash
   git push origin brian-3
   ```

2. **Import Project**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your GitHub repository (`shot-caller-vr`)
   - Choose the `brian-3` branch

3. **Configure Environment Variables**:
   Add these in the Vercel dashboard under "Environment Variables":
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   GOOGLE_API_KEY=your_gemini_key_here
   MARBLE_LABS_API_KEY=your_key_here
   OPENROUTER_API_KEY=your_key_here
   NODE_ENV=production
   ```

4. **Deploy**: Click "Deploy"

### Option 2: Deploy via CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # First deployment (will prompt for configuration)
   vercel

   # Subsequent deployments
   vercel --prod
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add GOOGLE_MAPS_API_KEY
   vercel env add GOOGLE_API_KEY
   vercel env add MARBLE_LABS_API_KEY
   vercel env add OPENROUTER_API_KEY
   ```

## Architecture

Shot Caller uses a hybrid deployment model on Vercel:

- **Static Assets**: Vite build output (`dist/`) served from Vercel's CDN
- **API Server**: Express app wrapped as serverless function (`api/server.ts`)
- **Routing**: `/api/*` requests routed to serverless function, everything else serves static files

## Configuration Files

- **vercel.json**: Vercel deployment configuration
- **api/server.ts**: Serverless function wrapper for Express server
- **.vercelignore**: Files to exclude from deployment

## Troubleshooting

### Build Failures

If the build fails:
1. Check build logs in Vercel dashboard
2. Verify `npm run build` works locally
3. Ensure all dependencies are in `package.json`

### API Errors

If API routes fail:
1. Check serverless function logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Check function timeout (max 60s for Pro plan)

### Large Bundle Size

Some chunks may exceed 500KB. This is expected for:
- Three.js and Babylon.js (3D rendering)
- Gaussian splat renderer
- Physics engine

To optimize:
- Use dynamic imports for heavy modules
- Enable gzip compression (automatic on Vercel)
- Consider splitting large vendor chunks

## Monitoring

- **Analytics**: Enable in Vercel dashboard > Analytics
- **Logs**: View in Vercel dashboard > Deployments > [your deployment] > Functions
- **Errors**: Set up error tracking (Sentry, LogRocket, etc.)

## Custom Domain

1. Go to Vercel dashboard > Settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Commits to `main` branch
- **Preview**: Commits to other branches (like `brian-3`)
- **Pull Requests**: Each PR gets a unique preview URL

To change the production branch:
1. Go to Settings > Git
2. Change "Production Branch" to `brian-3`
