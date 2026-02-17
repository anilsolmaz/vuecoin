# VueCoin

Cryptocurrency arbitrage monitoring dashboard tracking prices across **Paribu**, **Binance**, **BTCTurk**, and **Chiliz**.

![Dashboard Screenshot](client/src/assets/dashboard_screenshot.png)

## Features

- **Real-time Arbitrage Tracking**: Calculates Return on Investment (ROI) instantly by comparing the highest bid and lowest ask prices across supported exchanges.
- **Multi-Exchange Support**: Fetches and normalizes data from Paribu, Binance, and BTCTurk.
- **Live Dashboard**: Built with Vue 3 for a responsive and reactive user interface.
- **Controller-Service Architecture**: Backend logic is organized into clean controllers and services for better maintainability and scalability.

## Project Structure

This is a monorepo containing both the backend API and the frontend Vue application:

- **`/` (Root)**: Express.js Backend API
  - Runs on port `3000`
  - **`server/controllers`**: Handles incoming HTTP requests (e.g., `DataController.js`).
  - **`server/services`**: Contains business logic and data fetching mechanisms (e.g., `CoinDataService.js`).
  - Aggregates data from exchanges and caches it in Redis (optional/if configured) or memory.

- **`/client`**: Vue 3 Frontend
  - Runs on port `8080`
  - Displays real-time dashboard with arbitrage opportunities.

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Quick Start (Development)

We have a unified script to start both the backend and frontend servers efficiently.

1.  **Install Dependencies**:
    ```bash
    npm install
    cd client && npm install
    cd ..
    ```

2.  **Start Development Servers**:
    ```bash
    node start-dev.js
    ```
    This command will launch the backend server on port `3000` and the Vue frontend service.

### Manual Setup

If you prefer to run them separately:

**1. Start Backend**
```bash
npm install
npm run dev
# Server running at http://localhost:3000
```

**2. Start Frontend**
```bash
cd client
npm install
npm run serve
# Frontend running at http://localhost:8080
```