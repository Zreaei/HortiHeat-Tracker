# HortiHeat Tracker 🌾🌡️

**HortiHeat Tracker** is a precision agriculture web application designed to help farmers and researchers accurately estimate the harvest dates of specific horticultural commodities (such as red onion, chili, potato, and garlic). 

Unlike traditional agricultural tools that rely on daily Growing Degree Days (GDD), HortiHeat Tracker utilizes hourly **Cumulative Heat Units (Growing Degree Hours / GDH)** to capture dynamic microclimate fluctuations with high precision. To ensure data sovereignty and maximum accuracy, the platform empowers users to bypass generalized public weather APIs by directly importing local temperature datasets (`.csv`) gathered from their own on-farm sensors.

### ✨ Key Features
* **GDH-Based Heat Unit Calculation:** High-precision hourly thermal accumulation tracking.
* **Commodity-Specific Modeling:** Built-in thresholds for selecting various commodities (red onion, chili, potato, garlic).
* **Estimated Harvest Date:** Proactive harvest scheduling based on cumulative heat data.
* **Local Dataset Import:** Support for importing custom `.csv` temperature data for true microclimate accuracy.
* **API-Based Weather Detection:** Automated temperature identification based on geolocation coordinates.
* **Interactive & Exportable Graphs:** Visualizations for Maximum, Minimum, and Mean Temperature & Humidity, which can be easily exported for further reporting.
