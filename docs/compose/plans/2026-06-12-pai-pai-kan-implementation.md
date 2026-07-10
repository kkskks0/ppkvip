# 「排排看」肝胆排毒分析平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app that analyzes liver/gallbladder cleanse discharge photos using MiMo AI vision, integrates WeChat Pay, and delivers professional health analysis reports.

**Architecture:** React SPA (Vite + MUI + Tailwind) frontend, Express.js API server, SQLite via Prisma ORM, MiMo-V2.5 for image analysis, WeChat Pay JSAPI for payments.

**Tech Stack:** React 18, Vite 5, MUI 5, Tailwind 3, Zustand, Axios, Express 4, Prisma 5, Sharp, jsonwebtoken, wechatpay-node-v3

**Spec:** `docs/system_design.md` (v1.1)

---

## File Structure

```
pai_pai_kan/
├── package.json
├── .gitignore
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── public/favicon.svg
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── routes/auth.ts
│       ├── routes/upload.ts
│       ├── routes/payment.ts
│       ├── routes/report.ts
│       ├── routes/user.ts
│       ├── services/ai.ts
│       ├── services/payment.ts
│       ├── services/report.ts
│       ├── services/encryption.ts
│       ├── services/storage.ts
│       ├── middleware/auth.ts
│       ├── middleware/errorHandler.ts
│       ├── utils/jwt.ts
│       └── utils/crypto.ts
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── types/index.ts
    ├── types/user.ts
    ├── types/report.ts
    ├── types/payment.ts
    ├── services/api.ts
    ├── services/auth.ts
    ├── services/upload.ts
    ├── services/payment.ts
    ├── services/report.ts
    ├── store/authStore.ts
    ├── store/reportStore.ts
    ├── hooks/useAuth.ts
    ├── hooks/useUpload.ts
    ├── hooks/usePayment.ts
    ├── hooks/useReport.ts
    ├── utils/constants.ts
    ├── utils/helpers.ts
    ├── components/layout/BottomNav.tsx
    ├── components/layout/PageLayout.tsx
    ├── components/layout/Header.tsx
    ├── components/home/HeroSection.tsx
    ├── components/home/FlowSteps.tsx
    ├── components/upload/CameraCapture.tsx
    ├── components/upload/AlbumPicker.tsx
    ├── components/upload/ImagePreview.tsx
    ├── components/upload/ReferenceGuide.tsx
    ├── components/payment/PlanSelector.tsx
    ├── components/payment/UserInfoForm.tsx
    ├── components/payment/WechatPayButton.tsx
    ├── components/analysis/AnalysisLoading.tsx
    ├── components/report/ReportCard.tsx
    ├── components/report/ColorAnalysis.tsx
    ├── components/report/ShapeAnalysis.tsx
    ├── components/report/SizeAnalysis.tsx
    ├── components/report/CompositionAnalysis.tsx
    ├── components/report/PatternAnalysis.tsx
    ├── components/report/ComprehensiveAnalysis.tsx
    ├── components/report/DietAdvice.tsx
    ├── components/report/LifestyleAdvice.tsx
    ├── components/report/DownloadButton.tsx
    ├── components/profile/MemberStatus.tsx
    ├── components/profile/ReportTimeline.tsx
    ├── pages/HomePage.tsx
    ├── pages/UploadPage.tsx
    ├── pages/PaymentPage.tsx
    ├── pages/AnalysisPage.tsx
    ├── pages/ReportPage.tsx
    ├── pages/ProfilePage.tsx
    ├── pages/AuthPage.tsx
    └── routes/index.tsx
```

---

## Task 1: Project Infrastructure Setup

**Covers:** [S1] (scaffolding)

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `public/favicon.svg`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`
- Create: `server/package.json`, `server/tsconfig.json`, `server/.env.example`, `server/src/index.ts`, `server/src/config.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "pai-pai-kan",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "html2canvas": "^1.4.1",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/file-saver": "^2.0.7",
    "eslint": "^8.55.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
*.local
server/uploads/
server/prisma/*.db
server/prisma/migrations/
```

- [ ] **Step 3: Create .env.example**

```
VITE_API_BASE_URL=http://localhost:3001/api
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50',
        secondary: '#FFC107',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 8: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 9: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>排排看 - 肝胆排毒分析</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create public/favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#4CAF50"/>
  <text x="50" y="60" text-anchor="middle" fill="white" font-size="30" font-weight="bold">排</text>
</svg>
```

- [ ] **Step 11: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 12: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 13: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 14: Create src/App.tsx**

```tsx
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import AppRoutes from './routes'

const theme = createTheme({
  palette: {
    primary: { main: '#4CAF50' },
    secondary: { main: '#FFC107' },
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}
```

- [ ] **Step 15: Create src/routes/index.tsx (stub)**

```tsx
import { Routes, Route } from 'react-router-dom'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
    </Routes>
  )
}
```

- [ ] **Step 16: Create server/package.json**

```json
{
  "name": "pai-pai-kan-server",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.7.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "jsonwebtoken": "^9.0.0",
    "node-cron": "^3.0.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node-cron": "^3.0.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^9.0.0",
    "prisma": "^5.7.0"
  }
}
```

- [ ] **Step 17: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 18: Create server/.env.example**

```
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret-here"
MIMO_API_KEY="sk-cw9iod9aazt3tg6qwp4j97w2usxydx8sd618f4zbmec3out7"
MIMO_API_BASE_URL="https://api.xiaomimimo.com/v1"
MIMO_MODEL="mimo-v2.5"
WECHAT_APP_ID=""
WECHAT_MCH_ID=""
WECHAT_API_KEY=""
WECHAT_NOTIFY_URL=""
```

- [ ] **Step 19: Create server/src/config.ts**

```typescript
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  mimo: {
    apiKey: process.env.MIMO_API_KEY || '',
    baseUrl: process.env.MIMO_API_BASE_URL || 'https://api.xiaomimimo.com/v1',
    model: process.env.MIMO_MODEL || 'mimo-v2.5',
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
  },
}
```

- [ ] **Step 20: Create server/src/index.ts**

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
```

- [ ] **Step 21: Install dependencies and verify**

Run: `npm install` (root) and `cd server && npm install`
Run: `cd server && npx prisma db push`
Run: `npm run dev` (root) — verify React page loads
Run: `cd server && npm run dev` — verify `GET /api/health` returns `{ status: "ok" }`

- [ ] **Step 22: Commit**

```bash
git init
git add .
git commit -m "feat: project infrastructure setup (React + Express scaffolding)"
```

---

## Task 2: Data Layer + Authentication

**Covers:** [S1] (database, auth)

**Files:**
- Create: `server/prisma/schema.prisma`, `server/src/middleware/auth.ts`, `server/src/middleware/errorHandler.ts`, `server/src/utils/jwt.ts`, `server/src/utils/crypto.ts`, `server/src/routes/auth.ts`, `server/src/routes/user.ts`, `server/src/services/encryption.ts`
- Create: `src/types/index.ts`, `src/types/user.ts`, `src/types/report.ts`, `src/types/payment.ts`, `src/services/api.ts`, `src/services/auth.ts`, `src/services/report.ts`, `src/store/authStore.ts`, `src/store/reportStore.ts`, `src/hooks/useAuth.ts`, `src/hooks/useReport.ts`, `src/utils/constants.ts`, `src/utils/helpers.ts`

- [ ] **Step 1: Create Prisma schema**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id             String    @id @default(uuid())
  phone          String    @unique
  name           String?
  age            Int?
  memberType     String    @default("FREE") // FREE | ANNUAL
  memberExpireAt DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  reports        Report[]
  payments       Payment[]
}

model Report {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  imageUrl    String
  imageKey    String
  analysis    String   @default("{}") // JSON string
  reportType  String   @default("SINGLE_PAY") // SINGLE_PAY | ANNUAL_MEMBER
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  expiresAt   DateTime?
}

model Payment {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Float
  productType String   // SINGLE_ANALYSIS | ANNUAL_MEMBER
  tradeNo     String   @unique
  prepayId    String?
  status      String   @default("PENDING") // PENDING | PAID | REFUNDED | CLOSED
  createdAt   DateTime @default(now())
  paidAt      DateTime?
}
```

- [ ] **Step 2: Run Prisma migration**

Run: `cd server && npx prisma db push`

- [ ] **Step 3: Create server/src/utils/jwt.ts**

```typescript
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface JwtPayload {
  userId: string
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}
```

- [ ] **Step 4: Create server/src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 1001, message: '未登录' })
  }

  try {
    const token = authHeader.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ code: 1002, message: 'Token已过期' })
  }
}
```

- [ ] **Step 5: Create server/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err.message)
  res.status(500).json({ code: 5000, message: '服务器内部错误' })
}
```

- [ ] **Step 6: Create server/src/routes/auth.ts**

```typescript
import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { signToken } from '../utils/jwt'

const router = Router()
const prisma = new PrismaClient()

const codeStore = new Map<string, { code: string; expires: number }>()

router.post('/send-code', async (req: Request, res: Response) => {
  const { phone } = req.body
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ code: 2001, message: '手机号格式错误' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  codeStore.set(phone, { code, expires: Date.now() + 5 * 60 * 1000 })

  console.log(`[验证码] ${phone}: ${code}`)
  res.json({ code: 0, data: null, message: 'ok' })
})

router.post('/login', async (req: Request, res: Response) => {
  const { phone, code } = req.body
  if (!phone || !code) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }

  const stored = codeStore.get(phone)
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ code: 1003, message: '验证码错误或已过期' })
  }

  codeStore.delete(phone)

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  })

  const token = signToken(user.id)
  res.json({ code: 0, data: { token, user }, message: 'ok' })
})

router.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) return res.status(404).json({ code: 3002, message: '用户不存在' })
  res.json({ code: 0, data: user, message: 'ok' })
})

export default router
```

- [ ] **Step 7: Create server/src/routes/user.ts**

```typescript
import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/profile', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  res.json({ code: 0, data: user, message: 'ok' })
})

router.put('/profile', async (req: Request, res: Response) => {
  const { name, age } = req.body
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, age },
  })
  res.json({ code: 0, data: user, message: 'ok' })
})

router.get('/membership', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  res.json({
    code: 0,
    data: {
      memberType: user?.memberType,
      memberExpireAt: user?.memberExpireAt,
    },
    message: 'ok',
  })
})

export default router
```

- [ ] **Step 8: Update server/src/index.ts with routes**

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'
import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
```

- [ ] **Step 9: Create frontend types**

```typescript
// src/types/user.ts
export interface User {
  id: string
  phone: string
  name?: string
  age?: number
  memberType: 'FREE' | 'ANNUAL'
  memberExpireAt?: string
  createdAt: string
  updatedAt: string
}

// src/types/report.ts
export interface ColorInfo {
  name: string
  hexColor: string
  formationTime: string
  interpretation: string
}

export interface ShapeInfo {
  type: string
  description: string
  significance: string
}

export interface SizeInfo {
  category: string
  estimatedRangeMm: string
  referenceObject: string
}

export interface TextureInfo {
  type: string
  visualCues: string
}

export interface CompositionInfo {
  type: string
  confidence: string
  reasoning: string
}

export interface PatternInfo {
  type: string
  description: string
}

export interface QuantityInfo {
  estimatedCount: number
  density: string
}

export interface AnalysisResult {
  color: ColorInfo
  shape: ShapeInfo
  size: SizeInfo
  texture: TextureInfo
  composition: CompositionInfo
  pattern: PatternInfo
  quantity: QuantityInfo
  comprehensiveAnalysis: string
  dietAdvice: string[]
  lifestyleAdvice: string[]
  nextStepAdvice: string
  disclaimer: string
}

export interface Report {
  id: string
  userId: string
  imageUrl: string
  imageKey: string
  analysis: AnalysisResult
  reportType: 'SINGLE_PAY' | 'ANNUAL_MEMBER'
  isDeleted: boolean
  createdAt: string
  expiresAt?: string
}

// src/types/payment.ts
export interface Payment {
  id: string
  userId: string
  amount: number
  productType: 'SINGLE_ANALYSIS' | 'ANNUAL_MEMBER'
  tradeNo: string
  prepayId?: string
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'CLOSED'
  createdAt: string
  paidAt?: string
}

// src/types/index.ts
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}
```

- [ ] **Step 10: Create src/services/api.ts**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 11: Create src/services/auth.ts**

```typescript
import api from './api'
import type { ApiResponse, User } from '../types'

export async function sendCode(phone: string) {
  const res = await api.post<ApiResponse<null>>('/auth/send-code', { phone })
  return res.data
}

export async function login(phone: string, code: string) {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { phone, code })
  return res.data
}

export async function getMe() {
  const res = await api.get<ApiResponse<User>>('/auth/me')
  return res.data
}
```

- [ ] **Step 12: Create src/store/authStore.ts**

```typescript
import { create } from 'zustand'
import type { User } from '../types'
import * as authService from '../services/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isMember: boolean
  login: (phone: string, code: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isMember: false,

  login: async (phone, code) => {
    const res = await authService.login(phone, code)
    if (res.code === 0) {
      localStorage.setItem('token', res.data.token)
      set({
        token: res.data.token,
        user: res.data.user,
        isAuthenticated: true,
        isMember: res.data.user.memberType === 'ANNUAL',
      })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAuthenticated: false, isMember: false })
  },

  loadUser: async () => {
    try {
      const res = await authService.getMe()
      if (res.code === 0) {
        set({ user: res.data, isMember: res.data.memberType === 'ANNUAL' })
      }
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false, isMember: false })
    }
  },
}))
```

- [ ] **Step 13: Create src/utils/constants.ts**

```typescript
export const PRICING = {
  SINGLE_ANALYSIS: { price: 9.9, label: '单次分析' },
  ANNUAL_MEMBER: { price: 59.9, label: '年费会员' },
} as const

export const REPORT_EXPIRE_DAYS = 7
export const REPORT_PHYSICAL_DELETE_DAYS = 30
```

- [ ] **Step 14: Create src/utils/helpers.ts**

```typescript
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

export function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}
```

- [ ] **Step 15: Verify auth flow**

Run: `cd server && npm run dev`
Test: `curl -X POST http://localhost:3001/api/auth/send-code -H "Content-Type: application/json" -d '{"phone":"13800138000"}'`
Test: Check server console for verification code
Test: `curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"phone":"13800138000","code":"<code>"}'`

- [ ] **Step 16: Commit**

```bash
git add .
git commit -m "feat: data layer + authentication system"
```

---

## Task 3: File Upload + AI Analysis Service

**Covers:** [S1] (upload, AI analysis)

**Files:**
- Create: `server/src/routes/upload.ts`, `server/src/routes/report.ts`, `server/src/services/ai.ts`, `server/src/services/report.ts`, `server/src/services/storage.ts`
- Create: `src/services/upload.ts`, `src/services/report.ts` (update), `src/store/reportStore.ts`, `src/hooks/useUpload.ts`, `src/hooks/useReport.ts`

- [ ] **Step 1: Create server/src/services/storage.ts**

```typescript
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function saveFile(buffer: Buffer, originalName: string, userId: string): { filePath: string; fileName: string } {
  const date = new Date()
  const dir = path.join(UPLOAD_DIR, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, userId)
  ensureDir(dir)

  const ext = path.extname(originalName) || '.jpg'
  const fileName = `${uuid()}${ext}`
  const filePath = path.join(dir, fileName)

  fs.writeFileSync(filePath, buffer)
  return { filePath, fileName }
}

export function readFile(filePath: string): Buffer {
  return fs.readFileSync(filePath)
}
```

- [ ] **Step 2: Create server/src/services/ai.ts**

```typescript
import https from 'https'
import { config } from '../config'

interface MiMoResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const base64 = imageBuffer.toString('base64')

  const systemPrompt = `你是一位资深的肝胆排毒分析专家，基于《神奇的肝胆排石法》（Andreas Moritz 著）及中医肝胆理论进行分析。

## 颜色分类参考
| 颜色 | 形成时间 | 意义 |
|------|---------|------|
| 鲜绿色 | 近几周至几个月 | 近期形成的胆固醇结石 |
| 翠绿色 | 几个月至一年 | 典型胆固醇性结石，最常见 |
| 墨绿色 | 一年以上 | 较陈旧结石，胆汁色素已氧化 |
| 黄褐色 | 不定 | 胆固醇含量极高 |
| 米黄色/乳白色 | 较长时间 | 纯胆固醇性结石，陈年 |
| 棕褐色 | 较长时间 | 色素性结石，与胆汁淤积相关 |
| 白色/灰白色 | 长期 | 高度钙化，最陈旧 |
| 黑色 | 长期 | 胆红素钙结石，质地坚硬 |

## 形态分类参考
| 形态 | 意义 |
|------|------|
| 豌豆状圆形 | 典型胆囊胆固醇结石 |
| 桑葚状/菜花状 | 多个小结晶聚集 |
| 米粒状 | 早期胆固醇结晶 |
| 管状/圆柱状 | 肝内胆管铸型结石 |
| 树枝状 | 胆管分支铸型 |
| 泥沙状 | 尚未凝结的胆固醇结晶 |
| 絮状/棉絮状 | 胆汁中胆固醇絮状凝集 |

## 大小分类
| 分类 | 直径 |
|------|------|
| 微细型 | <1mm |
| 细沙型 | 1-2mm |
| 米粒型 | 2-4mm |
| 豌豆型 | 4-7mm |
| 黄豆型 | 7-10mm |
| 花生型 | 10-15mm |
| 蚕豆型 | >15mm |

## 成分分类
1. 胆固醇性结石（80-90%）：黄绿色至墨绿色，浮于水面
2. 胆红素性结石（5-10%）：棕褐色至黑色
3. 混合性结石（5-15%）：土黄色至棕褐色
4. 胆管铸型：管状或树枝状，墨绿色
5. 钙化性结石核心：白色或灰白色

## 排出模式
- 模式一：大量鲜绿色碎石 → 近期大量胆固醇结晶
- 模式二：大量墨绿色管状铸型 → 肝内胆管严重堵塞
- 模式三：白色核心+绿色外壳 → 陈年核心+近期包裹
- 模式四：大量泥沙状物 → 早期结晶阶段
- 模式五：混合颜色形态 → 不同时期形成
- 模式六：几乎无排出物 → 准备不足或系统干净

## 饮食建议知识库
推荐：十字花科蔬菜、大蒜、姜黄、甜菜根、柠檬、绿茶、全谷物
禁忌：蛋黄、动物内脏、虾蟹、肥肉、油炸食品、酒精、咖啡、冷饮
排毒果汁：绿色排毒汁（芹菜+黄瓜+青苹果+生姜+菠菜）、红色护肝汁（甜菜根+胡萝卜+苹果+柠檬）

请严格按JSON格式输出，只返回JSON：`

  const userPrompt = `请分析这张图片中的肝胆排毒排出物，输出JSON：

{
  "color": { "name": "颜色名称", "hexColor": "#XXXXXX", "formationTime": "形成时间", "interpretation": "健康解读" },
  "shape": { "type": "形态类型", "description": "描述", "significance": "意义" },
  "size": { "category": "大小分类", "estimatedRangeMm": "范围", "referenceObject": "参照物" },
  "texture": { "type": "质地类型", "visualCues": "视觉线索" },
  "composition": { "type": "成分类型", "confidence": "置信度", "reasoning": "判断依据" },
  "pattern": { "type": "排出模式", "description": "模式说明" },
  "quantity": { "estimatedCount": 数字, "density": "密度" },
  "comprehensiveAnalysis": "综合分析",
  "dietAdvice": ["建议1", "建议2", "建议3", "建议4", "建议5"],
  "lifestyleAdvice": ["建议1", "建议2", "建议3"],
  "nextStepAdvice": "下一步建议",
  "disclaimer": "健康提示"
}`

  const payload = JSON.stringify({
    model: config.mimo.model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 2048,
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${config.mimo.baseUrl}/chat/completions`)
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.mimo.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 60000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json: MiMoResponse = JSON.parse(data)
            resolve(json.choices[0]?.message?.content || '')
          } catch {
            reject(new Error('Failed to parse MiMo response'))
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('MiMo API timeout'))
    })
    req.write(payload)
    req.end()
  })
}
```

- [ ] **Step 3: Create server/src/routes/upload.ts**

```typescript
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import { saveFile } from '../services/storage'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(authMiddleware)

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ code: 2001, message: '请选择图片' })
  }

  const { filePath, fileName } = saveFile(req.file.buffer, req.file.originalname, req.user!.userId)
  const previewUrl = `/uploads/${fileName}`

  res.json({
    code: 0,
    data: { uploadId: fileName, previewUrl, filePath },
    message: 'ok',
  })
})

export default router
```

- [ ] **Step 4: Create server/src/services/report.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import { v4 as uuid } from 'uuid'
import { analyzeImage } from './ai'
import { readFile } from './storage'

const prisma = new PrismaClient()

export async function generateReport(userId: string, imageUrl: string, imageKey: string, userInfo: { name?: string; age?: number }) {
  const report = await prisma.report.create({
    data: {
      userId,
      imageUrl,
      imageKey,
      reportType: 'SINGLE_PAY',
    },
  })

  const imageBuffer = readFile(imageKey)
  const mimeType = imageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const analysisText = await analyzeImage(imageBuffer, mimeType)
  let analysis: Record<string, unknown>
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { comprehensiveAnalysis: analysisText }
  } catch {
    analysis = { comprehensiveAnalysis: analysisText }
  }

  await prisma.report.update({
    where: { id: report.id },
    data: { analysis: JSON.stringify(analysis) },
  })

  return { reportId: report.id, status: 'COMPLETED' }
}

export async function getReport(reportId: string, userId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, userId, isDeleted: false },
  })
  if (!report) return null
  return { ...report, analysis: JSON.parse(report.analysis as string) }
}

export async function listReports(userId: string) {
  const reports = await prisma.report.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  })
  return reports.map((r) => ({ ...r, analysis: JSON.parse(r.analysis as string) }))
}
```

- [ ] **Step 5: Create server/src/routes/report.ts**

```typescript
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { generateReport, getReport, listReports } from '../services/report'

const router = Router()
router.use(authMiddleware)

router.post('/generate', async (req: Request, res: Response) => {
  const { imageUrl, imageKey, userName, userAge } = req.body
  if (!imageUrl || !imageKey) {
    return res.status(400).json({ code: 2001, message: '参数缺失' })
  }

  try {
    const result = await generateReport(req.user!.userId, imageUrl, imageKey, { name: userName, age: userAge })
    res.json({ code: 0, data: result, message: 'ok' })
  } catch (err) {
    console.error('AI analysis error:', err)
    res.status(500).json({ code: 5001, message: 'AI分析失败' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const report = await getReport(req.params.id, req.user!.userId)
  if (!report) return res.status(404).json({ code: 3002, message: '报告不存在' })
  res.json({ code: 0, data: report, message: 'ok' })
})

router.get('/', async (req: Request, res: Response) => {
  const reports = await listReports(req.user!.userId)
  res.json({ code: 0, data: reports, message: 'ok' })
})

export default router
```

- [ ] **Step 6: Update server/src/index.ts with upload + report routes**

Add to index.ts:
```typescript
import uploadRoutes from './routes/upload'
import reportRoutes from './routes/report'

app.use('/api/upload', uploadRoutes)
app.use('/api/report', reportRoutes)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
```

- [ ] **Step 7: Create frontend upload/report services**

```typescript
// src/services/upload.ts
import api from './api'
import type { ApiResponse } from '../types'

export async function uploadImage(file: File, onProgress?: (p: number) => void) {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post<ApiResponse<{ uploadId: string; previewUrl: string; filePath: string }>>(
    '/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))) }
  )
  return res.data
}

// src/services/report.ts (update)
import api from './api'
import type { ApiResponse, Report } from '../types'

export async function generateReport(imageUrl: string, imageKey: string, userName?: string, userAge?: number) {
  const res = await api.post<ApiResponse<{ reportId: string; status: string }>>('/report/generate', { imageUrl, imageKey, userName, userAge })
  return res.data
}

export async function getReport(reportId: string) {
  const res = await api.get<ApiResponse<Report>>(`/report/${reportId}`)
  return res.data
}

export async function listReports() {
  const res = await api.get<ApiResponse<Report[]>>('/report')
  return res.data
}
```

- [ ] **Step 8: Create src/store/reportStore.ts**

```typescript
import { create } from 'zustand'
import type { Report } from '../types'
import * as reportService from '../services/report'

interface ReportState {
  currentReport: Report | null
  reports: Report[]
  analysisStatus: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'
  submitAnalysis: (imageUrl: string, imageKey: string, userName?: string, userAge?: number) => Promise<string>
  fetchReport: (reportId: string) => Promise<void>
  fetchReports: () => Promise<void>
}

export const useReportStore = create<ReportState>((set) => ({
  currentReport: null,
  reports: [],
  analysisStatus: 'idle',

  submitAnalysis: async (imageUrl, imageKey, userName, userAge) => {
    set({ analysisStatus: 'analyzing' })
    try {
      const res = await reportService.generateReport(imageUrl, imageKey, userName, userAge)
      if (res.code === 0) {
        set({ analysisStatus: 'completed' })
        return res.data.reportId
      }
      throw new Error(res.message)
    } catch {
      set({ analysisStatus: 'error' })
      throw new Error('分析失败')
    }
  },

  fetchReport: async (reportId) => {
    const res = await reportService.getReport(reportId)
    if (res.code === 0) set({ currentReport: res.data })
  },

  fetchReports: async () => {
    const res = await reportService.listReports()
    if (res.code === 0) set({ reports: res.data })
  },
}))
```

- [ ] **Step 9: Verify upload flow**

Test: Upload a test image via curl to `POST /api/upload`
Test: Generate report via `POST /api/report/generate`
Test: Verify MiMo API returns analysis JSON

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: file upload + MiMo AI analysis service"
```

---

## Task 4: Payment Service (WeChat Pay Stub)

**Covers:** [S1] (payment)

**Files:**
- Create: `server/src/routes/payment.ts`, `server/src/services/payment.ts`

- [ ] **Step 1: Create server/src/services/payment.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import { v4 as uuid } from 'uuid'

const prisma = new PrismaClient()

export async function createOrder(userId: string, productType: string, amount: number) {
  const tradeNo = `PPK${Date.now()}${uuid().slice(0, 8)}`
  const payment = await prisma.payment.create({
    data: { userId, amount, productType, tradeNo, status: 'PENDING' },
  })
  return { paymentId: payment.id, tradeNo }
}

export async function getPaymentStatus(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  return payment?.status || 'PENDING'
}

export async function handleWechatNotify(tradeNo: string) {
  const payment = await prisma.payment.findFirst({ where: { tradeNo } })
  if (!payment) return false

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PAID', paidAt: new Date() },
  })

  if (payment.productType === 'ANNUAL_MEMBER') {
    const expireAt = new Date()
    expireAt.setFullYear(expireAt.getFullYear() + 1)
    await prisma.user.update({
      where: { id: payment.userId },
      data: { memberType: 'ANNUAL', memberExpireAt: expireAt },
    })
  }

  return true
}
```

- [ ] **Step 2: Create server/src/routes/payment.ts**

```typescript
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { createOrder, getPaymentStatus, handleWechatNotify } from '../services/payment'

const router = Router()

router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const { productType } = req.body
  const amount = productType === 'ANNUAL_MEMBER' ? 59.9 : 9.9

  const order = await createOrder(req.user!.userId, productType, amount)

  res.json({
    code: 0,
    data: {
      ...order,
      payParams: {
        appId: process.env.WECHAT_APP_ID,
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: Math.random().toString(36).slice(2),
        package: `prepay_id=${order.tradeNo}`,
        signType: 'RSA',
        paySign: 'stub-sign',
      },
    },
    message: 'ok',
  })
})

router.get('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const status = await getPaymentStatus(req.params.id)
  res.json({ code: 0, data: { status }, message: 'ok' })
})

router.post('/notify', async (req: Request, res: Response) => {
  const { trade_no } = req.body
  await handleWechatNotify(trade_no)
  res.json({ code: 'SUCCESS', message: 'ok' })
})

export default router
```

- [ ] **Step 3: Update server/src/index.ts with payment route**

```typescript
import paymentRoutes from './routes/payment'
app.use('/api/payment', paymentRoutes)
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: payment service (WeChat Pay stub)"
```

---

## Task 5: Frontend Pages + Components

**Covers:** [S1] (UI pages)

**Files:** All page and component files listed in file structure

- [ ] **Step 1: Create layout components**

```tsx
// src/components/layout/Header.tsx
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

export default function Header({ title }: { title: string }) {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6">{title}</Typography>
      </Toolbar>
    </AppBar>
  )
}

// src/components/layout/BottomNav.tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'

const tabs = [
  { label: '首页', path: '/', icon: <HomeIcon /> },
  { label: '分析', path: '/upload', icon: <CameraAltIcon /> },
  { label: '报告', path: '/profile', icon: <HistoryIcon /> },
  { label: '我的', path: '/profile', icon: <PersonIcon /> },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const value = tabs.findIndex((t) => t.path === location.pathname) || 0

  return (
    <BottomNavigation
      value={value}
      onChange={(_, newValue) => navigate(tabs[newValue].path)}
      showLabels
      sx={{ position: 'fixed', bottom: 0, width: '100%' }}
    >
      {tabs.map((tab) => (
        <BottomNavigationAction key={tab.label} label={tab.label} icon={tab.icon} />
      ))}
    </BottomNavigation>
  )
}

// src/components/layout/PageLayout.tsx
import Box from '@mui/material/Box'
import Header from './Header'
import BottomNav from './BottomNav'

export default function PageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ pb: 8 }}>
      <Header title={title} />
      <Box sx={{ p: 2 }}>{children}</Box>
      <BottomNav />
    </Box>
  )
}
```

- [ ] **Step 2: Create HomePage**

```tsx
// src/pages/HomePage.tsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <PageLayout title="排排看">
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h4" gutterBottom>肝胆排毒分析</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          拍照上传，AI 智能分析您的肝胆排毒排出物
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/upload')}>
          开始分析
        </Button>
      </Box>
    </PageLayout>
  )
}
```

- [ ] **Step 3: Create UploadPage**

```tsx
// src/pages/UploadPage.tsx
import { useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { uploadImage } from '../services/upload'
import { compressImage } from '../utils/helpers'

export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!fileRef.current?.files?.[0]) return
    setUploading(true)
    try {
      const compressed = await compressImage(fileRef.current.files[0])
      const res = await uploadImage(new File([compressed], 'photo.jpg'))
      if (res.code === 0) {
        sessionStorage.setItem('uploadData', JSON.stringify(res.data))
        navigate('/payment')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageLayout title="上传图片">
      <Box sx={{ textAlign: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
        {preview ? (
          <Card sx={{ mb: 2 }}>
            <CardMedia component="img" image={preview} sx={{ maxHeight: 300 }} />
          </Card>
        ) : (
          <Button variant="outlined" fullWidth sx={{ py: 8, mb: 2 }} onClick={() => fileRef.current?.click()}>
            <Typography>拍照或选择图片</Typography>
          </Button>
        )}
        <Button variant="contained" fullWidth size="large" disabled={!preview || uploading} onClick={handleUpload}>
          {uploading ? '上传中...' : '开始分析'}
        </Button>
      </Box>
    </PageLayout>
  )
}
```

- [ ] **Step 4: Create PaymentPage**

```tsx
// src/pages/PaymentPage.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { PRICING } from '../utils/constants'

export default function PaymentPage() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('SINGLE_ANALYSIS')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')

  const handlePay = () => {
    // WeChat Pay integration - stub for now
    alert('微信支付功能需要在微信环境中测试')
    navigate('/analysis/test')
  }

  return (
    <PageLayout title="选择方案">
      <RadioGroup value={plan} onChange={(e) => setPlan(e.target.value)}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControlLabel value="SINGLE_ANALYSIS" control={<Radio />} label={`单次分析 ¥${PRICING.SINGLE_ANALYSIS.price}`} />
          </CardContent>
        </Card>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControlLabel value="ANNUAL_MEMBER" control={<Radio />} label={`年费会员 ¥${PRICING.ANNUAL_MEMBER.price}`} />
          </CardContent>
        </Card>
      </RadioGroup>

      <TextField fullWidth label="姓名" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth label="年龄" type="number" value={age} onChange={(e) => setAge(e.target.value)} sx={{ mb: 2 }} />

      <Button variant="contained" fullWidth size="large" onClick={handlePay}>
        微信支付
      </Button>
    </PageLayout>
  )
}
```

- [ ] **Step 5: Create AnalysisPage**

```tsx
// src/pages/AnalysisPage.tsx
import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useReportStore } from '../store/reportStore'

export default function AnalysisPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentReport, fetchReport, analysisStatus } = useReportStore()

  useEffect(() => {
    if (id) fetchReport(id)
  }, [id])

  useEffect(() => {
    if (currentReport) navigate(`/report/${currentReport.id}`)
  }, [currentReport])

  return (
    <PageLayout title="分析中">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">AI 正在分析您的排出物...</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          MiMo 视觉模型正在识别颜色、形态、成分
        </Typography>
      </Box>
    </PageLayout>
  )
}
```

- [ ] **Step 6: Create ReportPage + report components**

```tsx
// src/pages/ReportPage.tsx
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import PageLayout from '../components/layout/PageLayout'
import { useReportStore } from '../store/reportStore'
import ColorAnalysis from '../components/report/ColorAnalysis'
import ShapeAnalysis from '../components/report/ShapeAnalysis'
import SizeAnalysis from '../components/report/SizeAnalysis'
import CompositionAnalysis from '../components/report/CompositionAnalysis'
import PatternAnalysis from '../components/report/PatternAnalysis'
import ComprehensiveAnalysis from '../components/report/ComprehensiveAnalysis'
import DietAdvice from '../components/report/DietAdvice'
import LifestyleAdvice from '../components/report/LifestyleAdvice'

export default function ReportPage() {
  const { id } = useParams()
  const { currentReport, fetchReport } = useReportStore()

  useEffect(() => {
    if (id) fetchReport(id)
  }, [id])

  if (!currentReport) return <PageLayout title="报告"><Typography>加载中...</Typography></PageLayout>

  const a = currentReport.analysis as any

  return (
    <PageLayout title="分析报告">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {a.color && <ColorAnalysis data={a.color} />}
        {a.shape && <ShapeAnalysis data={a.shape} />}
        {a.size && <SizeAnalysis data={a.size} />}
        {a.composition && <CompositionAnalysis data={a.composition} />}
        {a.pattern && <PatternAnalysis data={a.pattern} />}
        {a.comprehensiveAnalysis && <ComprehensiveAnalysis data={a.comprehensiveAnalysis} />}
        {a.dietAdvice && <DietAdvice data={a.dietAdvice} />}
        {a.lifestyleAdvice && <LifestyleAdvice data={a.lifestyleAdvice} />}
      </Box>
    </PageLayout>
  )
}

// src/components/report/ColorAnalysis.tsx
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

export default function ColorAnalysis({ data }: { data: any }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>颜色分析</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: data.hexColor, border: '1px solid #ccc' }} />
          <Typography fontWeight="bold">{data.name}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">形成时间：{data.formationTime}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{data.interpretation}</Typography>
      </CardContent>
    </Card>
  )
}

// Similar components for ShapeAnalysis, SizeAnalysis, CompositionAnalysis, PatternAnalysis, ComprehensiveAnalysis, DietAdvice, LifestyleAdvice
// Each follows the same Card + CardContent pattern
```

- [ ] **Step 7: Create ProfilePage + AuthPage**

```tsx
// src/pages/ProfilePage.tsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <PageLayout title="个人中心">
      {isAuthenticated && user ? (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">{user.name || user.phone}</Typography>
              <Typography color="text.secondary">
                {user.memberType === 'ANNUAL' ? '年费会员' : '普通用户'}
              </Typography>
            </CardContent>
          </Card>
          <Button variant="outlined" fullWidth onClick={() => { logout(); navigate('/') }}>
            退出登录
          </Button>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ mb: 2 }}>请先登录</Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>去登录</Button>
        </Box>
      )}
    </PageLayout>
  )
}

// src/pages/AuthPage.tsx
import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useAuthStore } from '../store/authStore'
import { sendCode } from '../services/auth'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const handleSendCode = async () => {
    await sendCode(phone)
    setCodeSent(true)
  }

  const handleLogin = async () => {
    await login(phone, code)
    navigate('/')
  }

  return (
    <PageLayout title="登录">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
        <TextField fullWidth label="手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField fullWidth label="验证码" value={code} onChange={(e) => setCode(e.target.value)} disabled={!codeSent} />
        <Button variant="outlined" onClick={handleSendCode} disabled={!phone || codeSent}>
          {codeSent ? '已发送' : '获取验证码'}
        </Button>
        <Button variant="contained" fullWidth onClick={handleLogin} disabled={!phone || !code}>
          登录
        </Button>
      </Box>
    </PageLayout>
  )
}
```

- [ ] **Step 8: Update routes/index.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import UploadPage from '../pages/UploadPage'
import PaymentPage from '../pages/PaymentPage'
import AnalysisPage from '../pages/AnalysisPage'
import ReportPage from '../pages/ReportPage'
import ProfilePage from '../pages/ProfilePage'
import AuthPage from '../pages/AuthPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/analysis/:id" element={<AnalysisPage />} />
      <Route path="/report/:id" element={<ReportPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<AuthPage />} />
    </Routes>
  )
}
```

- [ ] **Step 9: Verify all pages render**

Run: `npm run dev`
Test: Navigate to each route, verify pages load

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: frontend pages and components"
```

---

## Task 6: Cleanup + Polish

**Covers:** [S1] (final integration)

- [ ] **Step 1: Add node-cron cleanup task to server**

```typescript
// Add to server/src/index.ts
import cron from 'node-cron'

cron.schedule('0 2 * * *', async () => {
  const prisma = new PrismaClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  await prisma.report.updateMany({ where: { createdAt: { lt: cutoff }, isDeleted: false }, data: { isDeleted: true, deletedAt: new Date() } })
  console.log('Cleanup job completed')
})
```

- [ ] **Step 2: Final verification**

Run: `npm run build` (frontend) — should succeed
Run: `cd server && npm run build` — should succeed
Test: Full flow — upload → payment stub → analysis → report

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: cleanup, cron jobs, final integration"
```
