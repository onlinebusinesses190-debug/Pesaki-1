# Pesaki Platform

![Pesaki Logo Ecosystem](https://via.placeholder.com/800x400?text=Pesaki+Platform)

**Pesaki** is an advanced, Kenyan market-linked gaming and financial predictions platform. Built with modern web technologies and a focus on beautiful, dynamic UI experiences, the platform provides users with interactive environments to participate in market dynamics directly from their dashboard.

## Overview

Pesaki blends dynamic trading concepts with predictive gameplay, offering a suite of real-world connected experiences like Forex trading and real-time Nairobi Securities Exchange (NSE) interaction alongside arcade-style market multiplier games. Users can transition seamlessly between **Real Play** and **Demo Mode**.

## Technology Stack

### Frontend Core
- **Next.js (v16.1)** using the **App Router** for intuitive routing and data fetching.
- **React (v19.2)** for robust component structure.
- **TailwindCSS (v4)** for high-utility, aesthetic, and fully responsive styling.
- **Lucide React** for consistent, clean iconography.
- **Lightweight Charts** (`lightweight-charts`) for rendering dynamic financial visualization components.

### Backend & Infrastructure
- **Supabase SSR / JS**: Manages robust authentication, real-time database operations, and secure user states.
- **Server Actions**: Direct from Next.js, securely handles wallet mutations, transaction validation, and game states without exposing extra API endpoints.

### Integrations
- **Safaricom Daraja (M-Pesa STK Push API)**: Used internally for managing real-money instant payments directly from the application's wallet module.

---

## Codebase Architecture

The application is structured inside a highly modular Next.js directory layout (`src/`):

### `/src/app`
The backbone of the application’s route structure:
- **`/actions`**: Next.js Server actions encapsulating database operations (e.g., `wallet.ts` for handling atomic Supabase transaction requests across `real` and `demo` states).
- **`/api`**: Route handlers providing controlled proxy connections and secure webhook endpoints.
  - `/api/fx` - Proxies or returns current Forex exchange rates.
  - `/api/nse` - Serves live or cached updates from the Nairobi Securities Exchange.
  - `/api/mpesa` - Manages incoming webhooks from Safaricom API.
- **`/dashboard`**: The primary authenticated layout. Wraps the main games, trading pages, and the unified `SidebarShell` layout. Includes sub-routes like `/fx`, `/invest`, `/aviator`, and more.
- **`/login`**: Supabase authentication flow interface.
- **`/mode-selection`**: Transition screens allowing users to select "Real Money" or "Demo" modes.

### `/src/components`
Reusable presentation and logic units:
- **`/dashboard/SidebarShell.tsx`**: The core application shell ensuring consistent navigation, responsive mobile drawers, user's current play state (Demo vs. Real), and an overview of their available wallet balance.
- **`/aviator`, `/fx`, etc.**: Extracted unique subcomponents tailored for specific games or trading canvases (Charts, Bet forms, multiplier visuals).

### `/src/utils`
- **`/supabase`**: Contains configuration and clients (e.g., `server.ts`, `client.ts`, `middleware.ts`) handling Next.js SSR-oriented session management securely on every request.

---

## Ecosystem & Features

The platform focuses on variety and deep engagement, organizing content around the following models:

### 1. Binary FX (`/dashboard/fx`)
A fully-fledged Forex simulation and trading hub providing real-time views and leverage trading concepts translated for intuitive gameplay.

### 2. Kenyan Market (Invest) (`/dashboard/invest`)
Utilizes real APIs to serve actual Nairobi Securities Exchange market statuses to users, enabling them to bet on the upward or downward movement of notable Kenyan companies.

### 3. Market Spin & Up/Down (`/dashboard/spin`, `/dashboard/up-down`)
*Currently in active development.* Instant-win games based on chance and abstracted market movement directions.

### 4. AviMarket (`/dashboard/aviator`)
*Currently in active development.* A market-styled variation on the classic multiplier crash game, tasking the user to predict how far the market will "fly" before a crash happens.

---

## Wallet & Modes System

Pesaki integrates dual-state wallets within its Supabase architecture. 
- **Demo Mode**: Upon signing up, users receive a non-transferable token balance allowing them to simulate trades and bets freely.
- **Real Mode**: Connected tightly to Daraja M-Pesa. Here, users deposit direct funds (KSh) starting from KSh 10, entering actual monetary stakes seamlessly from the exact same interface.

The `Server Actions` ensure atomic validation, intercepting game requests to confirm enough funds are present, resolving race conditions across components.

---

## Running the Application Locally

Create a `.env.local` file at the root containing your Supabase Keys, API access tokens, and the M-Pesa configurations.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Visit `http://localhost:3000` to interact with the environment. Let the Next.js compiler parse all optimized UI blocks.

---

## Future Enhancements
- Completing and uncovering `AviMarket` real-time multiplier logic.
- Refining real-time web-socket subscriptions for the `/invest` and `/fx` features.
- Dynamic user profiles and platform ranks.
