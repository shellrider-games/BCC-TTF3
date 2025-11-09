from flask import Flask, request, make_response
from datetime import datetime, timedelta, timezone
from flask_cors import CORS, cross_origin
import pandas as pd

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['DEBUG'] = True
DATA_FILE_PATH = 'data/TTF3_POI_Weather_Full.csv'
CSV_DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S%z" 

df = pd.read_csv(DATA_FILE_PATH, sep=';', decimal=',')
df["timestamp"] = pd.to_datetime(df["timestamp"], format=CSV_DATETIME_FORMAT, errors='coerce')

@app.route('/api/v1/visitors', methods=['GET'])
def visitors():
    try:
        date_str = request.args.get('date')
        if not date_str:
            return "Missing parameter: date", 400

        start_date = datetime.strptime(date_str, "%Y-%m-%d")
        start_date = start_date.replace(tzinfo=timezone.utc)
        end_date = start_date + timedelta(days=1)

        mask = (df["timestamp"] >= start_date) & (df["timestamp"] < end_date)
        filtered = df[mask]
        csv_output = filtered.to_csv(index=False)
        response = make_response(csv_output)
        response.headers["Content-Type"] = "text/csv"

        return response
    except ValueError as e:
        return "Could not create datetime from provided value", 400



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=42069)