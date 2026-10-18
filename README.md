# PlateSync 🍽️⚡

PlateSync is a real-time multiplayer restaurant ordering Progressive Web App (PWA) where diners sitting at the same table can collaborate on a shared cart, place synchronized orders, and receive real-time updates from the kitchen display system (KDS).

---

## 🛠️ Tech Stack & Phase 1 Architecture

- **Frontend**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Real-Time WebSockets**: [Socket.IO](https://socket.io/) (v4) with TypeScript schemas
- **Backend API Server**: [Express](https://expressjs.com/) running alongside Next.js on port 3001
- **Database & ORM**: [Prisma](https://www.prisma.io/) with PostgreSQL schema
- **Caching & Pub/Sub**: [ioredis](https://github.com/redis/ioredis)
- **Validation**: [Zod](https://zod.dev/) schemas for table sessions, orders, and cart updates
- **Icons & Motion**: [Lucide React](https://lucide.dev/) & [Framer Motion](https://www.framer.com/motion/)

---

## 📁 Project Structure

```
platesync/
├── prisma/
│   └── schema.prisma           # Database models (Restaurant, Table, Session, MenuItem, Order, OrderItem)
├── server/
│   ├── index.ts                # Express app + Socket.IO server setup (port 3001)
│   ├── events.ts               # Socket.IO room management (table join, cart sync, orders)
│   └── types.ts                # Strongly-typed Socket.IO client/server events
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main landing & live real-time diagnostics dashboard
│   │   └── globals.css         # Tailwind CSS styling
│   ├── components/
│   │   └── TableSyncDashboard.tsx # Interactive real-time test bench for table sync
│   └── lib/
│       ├── prisma.ts           # PrismaClient singleton
│       ├── redis.ts            # ioredis client singleton with auto-retry
│       ├── socket-client.ts    # Socket.IO client helper hook & instance
│       └── validations/        # Zod schemas for table sessions, cart items, and orders
│           ├── table.ts
│           ├── order.ts
│           └── index.ts
├── .env.example                # Template for environment variables
├── .env                        # Local development environment configuration
├── package.json                # Project dependencies and concurrent scripts
└── tsconfig.json               # TypeScript configuration
```

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env` (already created by default):

```bash
cp .env.example .env
```

Environment variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/tablesync?schema=public`)
- `REDIS_URL`: Redis connection string (e.g. `redis://localhost:6379`)
- `PORT`: Express + Socket.IO server port (default `3001`)
- `NEXT_PUBLIC_WS_URL`: WebSocket URL consumed by the client (`http://localhost:3001`)
- `NEXT_PUBLIC_APP_URL`: Next.js frontend origin (`http://localhost:3000`)

### 2. Run the Development Environment

Run both the Next.js frontend and Express + Socket.IO server with a single command:

```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Express + Socket.IO Server**: [http://localhost:3001](http://localhost:3001)
- **Server Health Check**: [http://localhost:3001/health](http://localhost:3001/health)
- **Server Diagnostics**: [http://localhost:3001/api/status](http://localhost:3001/api/status)

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `concurrently ...` | Runs Next.js and Socket.IO server simultaneously |
| `npm run dev:next` | `next dev` | Runs only the Next.js App Router frontend |
| `npm run dev:server` | `tsx watch server/index.ts` | Runs only the Express + Socket.IO TypeScript server with auto-reload |
| `npm run build` | `prisma generate && next build` | Compiles the production build and generates Prisma Client |
| `npm run start` | `concurrently ...` | Runs production servers concurrently |
| `npm run db:generate` | `prisma generate` | Generates Prisma ORM client |
| `npm run db:push` | `prisma db push` | Pushes schema directly to the database |
| `npm run db:studio` | `prisma studio` | Opens Prisma Studio visual database browser |
| `npm run lint` | `eslint` | Runs code linting |
