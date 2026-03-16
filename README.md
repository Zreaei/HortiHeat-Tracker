# HortiHeat Tracker

HortiHeat Tracker is a precision agriculture web application that helps estimate harvest timing for horticultural commodities using heat-unit accumulation.

This project is a Next.js + Tailwind implementation and supports both local CSV data and location-based weather retrieval.

## Key Features

- GDH-based heat-unit accumulation tracking.
- Commodity-oriented harvest timing workflow via cumulative HU targets.
- Local CSV import for on-farm sensor data.
- Location-based weather loading and short-range forecast support.
- Interactive charts for humidity, temperature, and heat-unit trends.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open http://localhost:3000.

## Forecast Data Source

Forecast data is provided by Open-Meteo (no API key required).
