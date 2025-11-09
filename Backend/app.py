from flask import Flask, request
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['DEBUG'] = True

@app.route('/api/v1/visitors', methods=['GET'])
def visitors():
    try:
        date_str = request.args.get('date')
        if not date_str:
            return "Missing parameter: date", 400

        start_date = datetime.strptime(date_str, "%Y-%m-%d")
        end_date = start_date + timedelta(days=1)
        return "Success"
    except ValueError as e:
        return "Could not create datetime from provided value", 400



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=42069)