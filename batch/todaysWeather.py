#!/usr/bin/env python3
import argparse
import openmeteo_requests
import pandas as pd
import requests
import requests_cache
from retry_requests import retry
from datetime import datetime
import numpy as np
   
parser = argparse.ArgumentParser(
    description="Run a batch job using latitude and longitude coordinates."
)

parser.add_argument(
    'filepath',
    type=str,
    help='Path to the POI CSV file'
)

args = parser.parse_args()

now = datetime.now()
current_time_string = now.strftime("%Y-%m-%d-%H")

df = pd.read_csv(args.filepath,usecols=['Name','Latitude', 'Longitude'], sep=';',decimal=',')


cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)
url = "https://api.open-meteo.com/v1/forecast"

def fetch_api_data(row):
    params = {
    	"latitude": row.Latitude,
    	"longitude": row.Longitude,
	    "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"],
	    "forecast_days": 1,
    }
    
    try:
        response = openmeteo.weather_api(url, params=params)[0]
        return response 
    except requests.exceptions.RequestException as e:
        print(f"API call failed for row: {e}")
        return None

dataframes = []

for row in df.itertuples():
    response = fetch_api_data(row)
    
    hourly = response.Hourly()
    hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
    hourly_relative_humidity_2m = hourly.Variables(1).ValuesAsNumpy()
    hourly_precipitation = hourly.Variables(2).ValuesAsNumpy()
    hourly_wind_speed_10m = hourly.Variables(3).ValuesAsNumpy()
    hourly_cloud_cover_low = hourly.Variables(4).ValuesAsNumpy()
    hourly_cloud_cover_mid = hourly.Variables(5).ValuesAsNumpy()
    hourly_cloud_cover_high = hourly.Variables(6).ValuesAsNumpy()

    hourly_data = {"date": pd.date_range(
        start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
        end =  pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
        freq = pd.Timedelta(seconds = hourly.Interval()),
        inclusive = "left"
    )}

    hourly_data["poi_id"] = row.Name
    hourly_data["temperature_2m"] = hourly_temperature_2m
    hourly_data["relative_humidity_2m"] = hourly_relative_humidity_2m
    hourly_data["precipitation"] = hourly_precipitation
    hourly_data["wind_speed_10m"] = hourly_wind_speed_10m
    hourly_data["cloud_cover_low"] = hourly_cloud_cover_low
    hourly_data["cloud_cover_mid"] = hourly_cloud_cover_mid
    hourly_data["cloud_cover_high"] = hourly_cloud_cover_high
    hourly_data["is_holiday"] = False

    hourly_dataframe = pd.DataFrame(data = hourly_data)

    dataframes.append(hourly_dataframe)
    hourly_dataframe.to_csv("data/"+current_time_string+str(row.Name)+".csv",index=False)

concatenated_df = pd.concat(dataframes, ignore_index=True)
concatenated_df.to_csv("data/"+current_time_string+"ALL_POI.csv",index=False)
concatenated_df['date'] = pd.to_datetime(concatenated_df['date'])
grouped_by_time = concatenated_df.groupby('date')

output_dir = "data/" 

for timestamp, group_df in grouped_by_time:
    poi_list = df["Name"]
    simulated_weather_data = {
        'poi_id': poi_list,
        # Simulate slightly different weather for each POI
        'temperature_2m': np.random.uniform(10.0, 14.0, size=len(poi_list)),
        'relative_humidity_2m': np.random.uniform(70.0, 80.0, size=len(poi_list)),
        'precipitation': np.random.choice([0.0, 0.1], size=len(poi_list), p=[0.9, 0.1]),
        'wind_speed_10m': np.random.uniform(3.0, 7.0, size=len(poi_list)),
        'cloud_cover_low': np.random.uniform(10.0, 30.0, size=len(poi_list)),
        'cloud_cover_mid': np.random.uniform(40.0, 60.0, size=len(poi_list)),
        'cloud_cover_high': np.random.uniform(0.0, 20.0, size=len(poi_list)),
        'is_holiday': [False] * len(poi_list) # (Example: Check a holiday calendar)
    }
    future_weather_df = pd.DataFrame(simulated_weather_data)
    
    # Format the timestamp for a clean file name (e.g., YYYY-MM-DD-HH)
    time_string = timestamp.strftime("%Y-%m-%d-%H")
    
    # Construct the file path
    filename = f"{output_dir}{time_string}_all_poi.csv"
    group_df = group_df.drop(axis=1, columns=["date"])

    print("Random Data: " + str(future_weather_df.shape) + "Actual Data: " + str(group_df.shape))
    # Save the group DataFrame to the new file
    # Index is excluded as it's not useful here
    group_df.to_csv(filename, index=False)