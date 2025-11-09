# Data Pipeline

## Data Preprocessing

Issues: Irrehular timestamps, duplicate entries, corrupt data (neg. people counts)

- **Clamps** corrupt negative values to 0
- **Aggregates** true duplicates by taking their mean
- **Resamples** all data onto a strict 15-minute grid to make it usable for time-series modeling

## Feature Engineering

Creating the context

Over 50 features grouped into 3 categories:

- **Time & Holiday Features:** `hour`, `day_of_week`, `month`, and `is_holiday`
- **Lag & Rolling Features:**  giving the model recent history, like `lag_15min`, `lag_1h`, and `rolling_mean_1h`
- **External Features:**  15 Weather forecast features (`temperature`, `precipitation`, …)

## Validation

**Strict Rolling Forecast Cross-Validation** to prevent data leakage

## Model

LightGBM (Gradient Boosting Machine) [https://lightgbm.readthedocs.io/en/latest/index.html](https://lightgbm.readthedocs.io/en/latest/index.html) 

Why?

- fast, memory efficient (training time < 2mins)
- native support for categorical features (treating poi as different categories)

## Daily Workflow

- **Step 1: Get New Data:** runs every night, the pipeline loads all historical data and appends the *new* 24 hours of 'actuals' from yesterday.
- **Step 2: Full Retraining:** **retraining the entire model from scratch** on new complete dataset to learn from new trends or changes
- **Step 3: Get Future Data:** We fetch a 24-hour, 15-minute weather forecast for all 30 POIs.
- **Step 4: Run the Autoregressive Loop:** To predict 24 hours (96 steps), we run a loop:
    1. predict 06:15 AM using real history
    2. **feed that 06:15 AM prediction back into history**
    3. re-calculate features and predict 06:30 AM
    4. autoregressive forecast: Repeat this 96 (num of 15 min chunks in 24hrs)  times
- **Step 5:  Output:**  loop generates a single clean `24_hour_forecast.json` file for the frontend
    
    ![Screenshot 2025-11-09 at 09.19.04.png](Hackathon%20Data%20Pipeline/Screenshot_2025-11-09_at_09.19.04.png)
    

## **Model Results**

Cross Validation Results

Average RMSE: 68.50 ± 131.76
**Average MAE:  5.98 ± 6.44**
Average MAPE: 11.2% ± 4.9%

![cv_mae_by_fold.png](Hackathon%20Data%20Pipeline/cv_mae_by_fold.png)

![learning_curves.png](Hackathon%20Data%20Pipeline/learning_curves.png)

![fold_10_predictions.png](Hackathon%20Data%20Pipeline/fold_10_predictions.png)