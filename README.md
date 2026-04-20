# HortiHeat Tracker 2.0

**Live Demo:** [HortiHeat Tracker on Vercel](https://hortiheat-tracker.vercel.app/)

## 📖 About the Project

**HortiHeat Tracker** is a web-based precision agriculture application designed to monitor crop growth and estimate harvest timing by calculating **Heat Unit (HU)** accumulation from the planting date to maturity, it provides data-driven insights for optimal harvest planning. 

The application is tailored for key horticultural commodities, specifically: **Shallot (Red Onion), Chili, Potato, and Garlic**.

## ✨ Key Features

* **Heat-Unit Accumulation Tracking:** Accurately track crop growth stages based on the commodity's specific Base Temperature (Tbase) and Cumulative Heat Unit target.
* **Flexible Temperature Sourcing:**
    * **Location Coordinates:** Input latitude/longitude or paste a **Google Maps link** to automatically fetch local environmental data.
    * **Local CSV Import:** Upload on-farm sensor data for localized accuracy.
* **Interactive Data Visualization:** Downloadable dynamic charts displaying humidity, temperature variations, and heat-unit accumulation trends over time.
* **Extended Weather Forecasting:** Integrated 15-day short-range forecast support to project future heat units and estimate exact harvest windows.
* **Dataset Management:** Preview raw data directly in the dashboard and download complete datasets for further agricultural research or offline record-keeping.

## ⚙️ How It Works

1. **Select a Data Source:** Choose to upload historical/current CSV data or fetch location-based weather via coordinates/Google Maps.
2. **Configure Parameters:** * Select your target **Commodity**. 
    * Define the **Planting Start Date**.
    * The system applies the relevant **Tbase** and **Cumulative Heat Unit target** for the selected crop.
3. **Analyze Growth:** The application calculates daily heat units and compares the accumulated total against the crop's maturity target, projecting a visual timeline for the harvest.

## 🚀 Setup & Installation

To run this project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Zreaei/HortiHeat-Tracker.git
   ```

2. **Navigate to the directory:**
   ```bash
   cd HortiHeat-Tracker
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Data Sources & Tech Stack

* **Frontend / Framework:** Next.js & Tailwind CSS
* **Weather API:** Forecast and location-based historical data provided by [Open-Meteo](https://open-meteo.com/) (No API key required).
