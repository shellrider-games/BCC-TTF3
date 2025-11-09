#!/usr/bin/env python3
import argparse
import openmeteo_requests
import pandas as pd
import requests
import requests_cache
from retry_requests import retry
from datetime import datetime
   
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

df = pd.read_csv(args.filepath,usecols=['TrackerID','Latitude', 'Longitude'], sep=';',decimal=',')

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

    hourly_data["poi_id'"] = row.TrackerID
    hourly_data["temperature_2m"] = hourly_temperature_2m
    hourly_data["relative_humidity_2m"] = hourly_relative_humidity_2m
    hourly_data["precipitation"] = hourly_precipitation
    hourly_data["wind_speed_10m"] = hourly_wind_speed_10m
    hourly_data["cloud_cover_low"] = hourly_cloud_cover_low
    hourly_data["cloud_cover_mid"] = hourly_cloud_cover_mid
    hourly_data["cloud_cover_high"] = hourly_cloud_cover_high

    hourly_dataframe = pd.DataFrame(data = hourly_data)

    dataframes.append(hourly_dataframe)
    hourly_dataframe.to_csv("data/"+current_time_string+row.TrackerID+".csv",index=False)

concatenated_df = pd.concat(dataframes, ignore_index=True)
concatenated_df.to_csv("data/"+current_time_string+"ALL_POI.csv",index=False)