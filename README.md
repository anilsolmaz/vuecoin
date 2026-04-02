# 📈 VueCoin Arbitrage Platform

**Real-time cryptocurrency arbitrage engine** engineered to detect price discrepancies across global exchanges with sub-second latency. A full-stack solution processing real-time order books to surface highly profitable trading opportunities.

👉 **[Launch Interactive Live Demo](https://anilsolmaz.github.io/vuecoin/)** 

![VueCoin Performance Dashboard](client/src/assets/dashboard_screenshot.png)

## Overview

VueCoin is a full-stack arbitrage monitoring system designed to detect and analyze price differences across Turkish and global cryptocurrency exchanges in real-time. The platform collects live market data from **240+ coin pairs** across **Paribu, Binance, BTCTurk, and Chiliz**, calculates cross-exchange and intra-exchange arbitrage opportunities using order book depth analysis, and delivers actionable insights through a live dashboard and automated Telegram alerts.

## 🚀 Key Technical Achievements

### High-Performance Data Pipeline
- **Sub-second Event Loop:** Engineered a highly aggressive parallel polling architecture to decouple market collection from bulk endpoints, driving latency down from industry-standard ~15s to consistently under **1s processing time**.
- **Real-Time Data Streaming:** Implemented `Socket.IO` to push massive live datasets directly to the frontend, resulting in an instantly reactive client dashboard without the overhead of HTTP polling.
- **In-Memory Redis Pub/Sub:** Designed a robust caching layer using Redis to act as the central nervous system, maximizing backend throughput and drastically curbing redundant external API ratelimits.

### Arbitrage Engine
- **Cross-exchange & intra-exchange** arbitrage detection comparing bid/ask prices across all supported exchanges
- **Order book depth analysis** — when ROI thresholds are triggered, the engine fetches real order books and matches asks against bids to calculate realistic trade volumes and effective profit
- **Bid/Ask-aware cross-rate conversions** — TRY↔USDT conversions use actual bid/ask rates (not mid-prices) for accurate cost estimation
- **Configurable alert thresholds** — minimum ROI%, minimum profit (TRY), and cooldown timers are adjustable through the Settings UI

### Monitoring & Alerts
- **Automated Telegram push notifications** for high-ROI arbitrage opportunities with trade details
- **New listing detection** — monitors Paribu's market list every second and sends instant alerts when new coins are listed, with direct links to ByBit, Binance, and Gate.io
- **Exchange health monitoring** — tracks API status for each exchange and sends recovery/failure notifications via Telegram

### Dashboard
- **Live arbitrage dashboard** with Top Deals (ranked by ROI) and All Markets (alphabetical) views
- **Top Coins ticker** — pinned watchlist of key assets with live prices
- **Portfolio tracker** — track holdings, calculate balances in TRY/USD, with cloud-synced profiles
- **Profit calculator** — live estimation tool using real-time market prices
- **Dark/Light mode** with responsive mobile-first design

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Node.js, Express.js, Socket.IO |
| **Frontend** | Vue.js 3 (Options API) |
| **Caching** | Redis (ioredis) |
| **Notifications** | Telegram Bot API |
| **Infrastructure** | AWS EC2 (Ubuntu), PM2, Screen |
| **Exchange APIs** | Paribu, Binance, BTCTurk, Chiliz |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Vue.js Frontend                       │
│              Dashboard · Portfolio · Settings                 │
└──────────────────┬────────────────────────┬──────────────────┘
                   │ Socket.IO (WebSocket)  │ REST API
┌──────────────────▼────────────────────────▼──────────────────┐
│                     Express.js Backend                        │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Worker     │  │  CoinDataService │  │ ListingMonitor   │ │
│  │  (1s cycle)  │  │  (Arb Engine)    │  │ (New Listings)   │ │
│  └──────┬──────┘  └────────┬────────┘  └────────┬─────────┘ │
│         │                  │                     │            │
│  ┌──────▼──────────────────▼─────────────────────▼─────────┐ │
│  │                    Redis Cache                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                  │                     │            │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌─────────▼──────────┐ │
│  │   Paribu    │  │    Binance    │  │     BTCTurk        │ │
│  │   API       │  │    API        │  │     API            │ │
│  └─────────────┘  └───────────────┘  └────────────────────┘ │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │  TelegramService     │  │  ExchangeMonitorService      │  │
│  │  (Push Alerts)       │  │  (Health Tracking)           │  │
│  └──────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

```
vuecoin-bot/
├── server.js                    # Express + Socket.IO entry point
├── server/
│   ├── worker.js                # Background data polling (1s interval)
│   ├── services/
│   │   ├── CoinDataService.js   # Core arbitrage engine & data aggregation
│   │   ├── ListingMonitorService.js  # New listing detection
│   │   ├── TelegramService.js   # Telegram notification delivery
│   │   ├── ExchangeMonitorService.js # API health monitoring
│   │   └── RedisService.js      # Redis client singleton
│   ├── controllers/             # HTTP request handlers
│   ├── routes/                  # API route definitions
│   ├── configs/                 # Exchange configs & market lists
│   └── js/                      # Exchange API integration functions
├── client/                      # Vue.js 3 SPA
│   └── src/
│       ├── views/               # Dashboard, Portfolio, Settings pages
│       ├── components/          # Reusable coin cards & widgets
│       └── assets/              # Coin/exchange icons
└── tests/                       # Unit & integration tests
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- Redis server
- npm

### Development Setup

1. **Install dependencies**:
    ```bash
    npm install
    cd client && npm install && cd ..
    ```

2. **Configure environment** — copy and edit the env file:
    ```bash
    cp server/.env.example server/.env
    ```

3. **Start both servers**:
    ```bash
    node start-dev.js
    ```
    Backend runs on `http://localhost:3000`, frontend on `http://localhost:8080`.

### Manual Setup

**Backend:**
```bash
npm run dev
# Server running at http://localhost:3000
```

**Frontend:**
```bash
cd client
npm run serve
# Frontend running at http://localhost:8080
```

## License

This project is proprietary and not open for redistribution.