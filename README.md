# TourSight

> A predictive model and dashboard for forecasting visitor traffic at points of interest. Built during the Tourism Technology Festival 3.0

**Note:** The original dataset used for this project is proprietary and cannot be shared. This repository provides the complete code pipeline, allowing you to train the model and run the dashboard using your own data, provided it matches the schema defined below.

---

## Dashboard Preview

![screenshot.png](screenshot.png)

## Features

* Machine learning model to predict visitor counts.
* Interactive dashboard to visualize historical data and future predictions.

---

## Technology Stack

* **Modeling:**  LightGBM, scikit-learn
* **Backend:** Flask
* **Dashboard:** D3, matplotlib
* **Data Processing:** Pandas, NumPy
---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You will need the following tools installed on your system:

* Python 3.12

## Data Schema (Important)

To use this project, you must provide your own data. The model pipeline expects your data to be in a specific format.

Your data **must** contain the following columns:

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `installationId` | `string` | `Identifier of the Point of Interest (POI)` |
| `timestamp` | `datetime` | `Date and Time of the observation` |
| `value` | `integer` | `Amount of people located at the POI` |
| `Ort` | `string` | `Name of the location` |
| `Latitude` | `float` | `Latitude of the POI` |
| `Longitude` | `float` | `Longitude of the POI` |
| `temperature_2m` | `float` | `Temperature at 2m height` |
| `relative_humidity_2m` | `float` | `Relative humidity at 2m height` |
| `precipitation` | `float` | `Rain, Snow and Hail (mm)` |
| `wind_speed_10m` | `float` | `Wind speed at 10m (km/h)` |
| `cloud_cover_low` | `float` | `Low cloud coverage (%)` |
| `cloud_cover_mid` | `float` | `Medium cloud coverage (%)` |
| `wind_speed_10m` | `float` | `High cloud coverage (%)` |
---


## Weather data

This project uses the Open-Meteo v1 API to get weather data which used in the prediction model. For mor information on the API please refer to their documentation at https://open-meteo.com/en/docs.

 The script `batch/todaysWeather.py` takes the path to a CSV file as the first positional argument. The CSV file needs to have at least the 3 columns named `TrackerID`, `Latitude` and `Longitude`. The CSV file is using `;`as a seperator  and `,` as a comma file. The script will use the weather API for each row's coordinate and get save todays hourly weather as a CSV file.

 Minimal CSV example:
```csv
TrackerID;Latitude;Longitude
XISKO;47.83468443576882;13.1133425789364
```
