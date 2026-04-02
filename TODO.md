# Pesaki Server Implementation TODO

## Phase 1: Database Schema
- [x] Edit pesaki/supabase/schema.sql: Add wallet_ledger table, debit_wallet/credit_wallet RPCs, spin_prizes, predictions, aviator_rounds, aviator_bets, spin_results tables + RLS

## Phase 2: Server Core
- [x] src/utils/logger.ts (Pino)
- [x] src/utils/hash.ts (SHA256 provably fair)
- [ ] src/api/index.ts: Register auth middleware (skip mpesa/health)

## Phase 3: API Routes (Zod schemas + auth + logic)
- [ ] src/api/routes/wallet.ts
- [ ] src/api/routes/spin.ts
- [ ] src/api/routes/prediction.ts
- [ ] src/api/routes/aviator.ts
- [ ] src/api/routes/mpesa.ts (no auth)
- [ ] src/api/routes/health.ts (no auth)

## Phase 4: Socket.io
- [ ] src/socket/index.ts (server + auth middleware)
- [ ] src/socket/namespaces/aviator.ts (events → engine)

## Phase 5: Games & Cron
- [ ] src/games/spin/engine.ts (complete weighted RNG)
- [ ] src/games/prediction/engine.ts (complete)
- [ ] src/cron/fetchMarketData.ts (Frankfurter API → Redis)
- [ ] src/cron/settlePredictions.ts
- [ ] src/cron/index.ts (node-cron register)

## Phase 6: Root Files
- [ ] package.json (deps/scripts)
- [ ] .env.example
- [ ] README.md
- [ ] npm install
- [ ] Test: npm run dev, /health, endpoints

Current: Phase 1 Step 1
