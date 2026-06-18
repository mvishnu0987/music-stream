# Deployment Guide: How to Publish Melodify Online

To make your website accessible to everyone with a public URL, you need to host both parts of your full-stack application:
1. **The Backend API Server:** (e.g. hosted on **Render** or **Railway**)
2. **The Frontend Web App:** (e.g. hosted on **Vercel**, **Netlify**, or **Render**)

Here is the step-by-step guide to publishing your app for free:

---

## Step 1: Push your Code to GitHub

All modern hosting platforms build directly from GitHub. If your project isn't already on GitHub:
1. Go to [GitHub](https://github.com/) and create a new repository.
2. Initialize and push your workspace:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

---

## Step 2: Deploy the Backend API Server on Render

[Render](https://render.com/) is a great hosting provider that offers a free tier for Web Services.

1. Create a free account at [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure these settings:
   - **Name:** `melodify-api`
   - **Language:** `Node`
   - **Root Directory:** `artifacts/api-server`
   - **Build Command:** `pnpm install && pnpm run build` (or `npm install && npm run build`)
   - **Start Command:** `node dist/index.mjs`
5. Click **Deploy Web Service**. 
6. Render will compile your server and give you a public URL (e.g., `https://melodify-api.onrender.com`). **Save this URL.**

---

## Step 3: Link the Frontend to your New Backend URL

Before deploying the frontend, you need to tell it where the backend is hosted.

1. In your project, open the frontend folder: `artifacts/music-app`.
2. Look for the API base URL configuration (usually in `.env.production` or a configuration file).
3. Set the API environment variable to point to your Render backend URL (e.g. `VITE_API_URL=https://melodify-api.onrender.com`).
4. Commit and push these changes to GitHub:
   ```bash
   git add .
   git commit -m "configure production API URL"
   git push
   ```

---

## Step 4: Deploy the Vite Frontend on Vercel or Netlify

[Vercel](https://vercel.com/) and [Netlify](https://www.netlify.com/) are the absolute best platforms for hosting Vite frontend applications. They are extremely fast and completely free for personal use.

### Option A: Hosting on Vercel (Recommended)
1. Go to [Vercel](https://vercel.com/) and sign up with GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the configuration settings:
   - **Framework Preset:** Select **Vite**
   - **Root Directory:** Click Edit and select `artifacts/music-app`
   - **Build Command:** `pnpm run build` (Vercel automatically detects package managers)
   - **Output Directory:** `dist/public` (or `dist`)
5. Click **Deploy**. Vercel will build your frontend and give you a public, open link (e.g., `https://melodify.vercel.app`) that anyone can use!

---

## Summary of URL Access
Once completed, anyone visiting your Vercel link (`https://melodify.vercel.app`) will load the website, play audio, and access playlists, which will communicate directly with your Render API (`https://melodify-api.onrender.com`) in the background!
