# Full-Stack AI Chatbot Application

A production-grade AI Assistant application built with **React (Vite)**, **Node.js (Express)**, **MongoDB Atlas**, and **Google Gemini API**.

---

## 🚀 Cloud Deployment Guide

### 1. Backend Deployment (Render)

1. Connect your repository to [Render](https://render.com/).
2. Create a new **Web Service**.
3. Set **Root Directory**: `server`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add the following **Environment Variables** in Render Dashboard:
   * `PORT`: `5000` *(or leave blank for Render default)*
   * `NODE_ENV`: `production`
   * `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   * `GEMINI_API_KEY`: `your_google_gemini_api_key`
   * `JWT_SECRET`: `your_secure_jwt_secret_key`
   * `FRONTEND_URL`: `https://your-app.vercel.app`

---

### 2. Frontend Deployment (Vercel)

1. Import your repository to [Vercel](https://vercel.com/).
2. Set **Framework Preset**: `Vite`
3. Set **Root Directory**: `client`
4. Add the following **Environment Variable** in Vercel Dashboard:
   * `VITE_API_BASE_URL`: `https://your-render-backend-url.onrender.com/api/v1`
5. Deploy!

---

## 📋 Environment Variables Reference

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-chatbot
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 🛠 Local Development Commands

### Start Backend Server
```bash
cd server
npm run dev
```

### Start Frontend Dev Server
```bash
cd client
npm run dev
```

---

## 📦 Production Build Commands

### Test Backend Production Startup
```bash
cd server
npm start
```

### Build Frontend Bundle
```bash
cd client
npm run build
```

---

## 🔌 API Endpoint Summary

* `GET /health` & `GET /api/v1/health` -> Health Check Status
* `POST /api/v1/auth/register` -> User Registration
* `POST /api/v1/auth/login` -> User Login
* `GET /api/v1/auth/me` -> Current User Profile *(Protected)*
* `GET /api/v1/conversations` -> List User Conversations *(Protected)*
* `POST /api/v1/conversations` -> Create Conversation *(Protected)*
* `DELETE /api/v1/conversations/:id` -> Delete Conversation *(Protected)*
* `POST /api/v1/chat` -> AI Chat Generation *(Supports Auth & Guest)*
