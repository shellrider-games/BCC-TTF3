import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error
import pickle
from datetime import datetime
import warnings
import matplotlib.pyplot as plt
import os

warnings.filterwarnings('ignore')

FREQ = '15min'
PERIODS_PER_HOUR = 4
PERIODS_PER_DAY = 96
PERIODS_PER_WEEK = 672


print("LOADING DATA")

data = pd.read_csv("./clean_data/full_old.csv", delimiter=';', low_memory=False)

print(f"Raw data shape: {data.shape}")
print(f"Columns: {data.columns.tolist()}")


print("DATA PREPARATION")


data.rename(columns={
    'Name': 'poi_id',
    'value': 'people_count'
}, inplace=True)

data['people_count'] = np.maximum(0, data['people_count'])
print("✓ Negative 'people_count' values have been set to 0.")

data['timestamp'] = pd.to_datetime(data['timestamp'])

columns_to_keep = [
    'poi_id', 'timestamp', 'people_count',
    'temperature_2m', 'relative_humidity_2m', 'precipitation',
    'wind_speed_10m', 'cloud_cover_low', 'cloud_cover_mid', 
    'cloud_cover_high', 'is_holiday'
]

columns_to_keep = [col for col in columns_to_keep if col in data.columns]
data = data[columns_to_keep].copy()

# Sort by POI and timestamp (Correct for feature engineering)
data = data.sort_values(['poi_id', 'timestamp'])

print(f"Cleaned data shape: {data.shape}")
print(f"Date range: {data['timestamp'].min()} to {data['timestamp'].max()}")
print(f"Unique POIs: {data['poi_id'].nunique()}")
print(f"POI names: {data['poi_id'].unique().tolist()}")

# Diagnose data quality
print("\n--- Data Quality Check ---")
duplicates = data.groupby(['poi_id', 'timestamp']).size()
n_duplicates = (duplicates > 1).sum()
print(f"Duplicate timestamps: {n_duplicates:,}")

data['time_diff'] = data.groupby('poi_id')['timestamp'].diff()
time_gaps = data['time_diff'].dt.total_seconds() / 60
print(f"Time gap stats (minutes):")
print(f"  Mean: {time_gaps.mean():.2f}")
print(f"  Median: {time_gaps.median():.2f}")
print(f"  Gaps > 20min: {(time_gaps > 20).sum():,}")
print(f"  Max gap: {time_gaps.max():.1f} minutes ({time_gaps.max()/60:.1f} hours)")

# Sample of Duplicate Rows
if n_duplicates > 0:
    print("\n--- Sample of Duplicate Rows (before cleaning) ---")
    is_duplicate_row = data.duplicated(subset=['poi_id', 'timestamp'], keep=False)
    duplicate_rows = data[is_duplicate_row]
    print(duplicate_rows.sort_values(['poi_id', 'timestamp']).head(10))
    print("...")

# --- 3. RESAMPLE TO REGULAR 15-MIN INTERVALS ---
print("\n" + "="*60)
print("RESAMPING TO 15-MIN INTERVALS")
print("="*60)

resampled_data = []

for poi_name in data['poi_id'].unique():
    print(f"  Processing: {poi_name}")
    
    poi_data = data[data['poi_id'] == poi_name].copy()
    
    # Remove duplicates - average values for same timestamp
    poi_data = poi_data.groupby('timestamp').agg({
        'people_count': 'mean',
        'temperature_2m': 'mean',
        'relative_humidity_2m': 'mean',
        'precipitation': 'sum',  # Sum precipitation
        'wind_speed_10m': 'mean',
        'cloud_cover_low': 'mean',
        'cloud_cover_mid': 'mean',
        'cloud_cover_high': 'mean',
        'is_holiday': 'max'  # If any entry is holiday, mark as holiday
    }).reset_index()
    
    poi_data = poi_data.set_index('timestamp')
    
    # Resample to 15-min intervals
    numeric_cols = ['people_count', 'temperature_2m', 'relative_humidity_2m',
                   'wind_speed_10m', 'cloud_cover_low', 'cloud_cover_mid', 
                   'cloud_cover_high']
    
    resampled = poi_data[numeric_cols].resample(FREQ).mean()
    
    # Precipitation: sum over interval
    if 'precipitation' in poi_data.columns:
        resampled['precipitation'] = poi_data['precipitation'].resample(FREQ).sum()
    
    # Holiday: forward fill
    if 'is_holiday' in poi_data.columns:
        resampled['is_holiday'] = poi_data['is_holiday'].resample(FREQ).ffill()
    
    # Forward fill missing values (up to 1 hour = 4 periods)
    resampled = resampled.ffill(limit=4)
    
    # Backward fill for start of series
    resampled = resampled.bfill(limit=4)
    
    # Add POI identifier
    resampled['poi_id'] = poi_name
    
    resampled_data.append(resampled.reset_index())

data = pd.concat(resampled_data, ignore_index=True)

print(f"\nResampled data shape: {data.shape}")
print(f"Date range: {data['timestamp'].min()} to {data['timestamp'].max()}")

# Verify regularity
data = data.sort_values(['poi_id', 'timestamp']).reset_index(drop=True)
data['time_diff'] = data.groupby('poi_id')['timestamp'].diff()
time_diff_minutes = data['time_diff'].dt.total_seconds() / 60

print(f"\n✓ After resampling:")
print(f"  Unique gap values: {time_diff_minutes.value_counts().head(3).to_dict()}")
print(f"  All gaps are 15min: {(time_diff_minutes.dropna() == 15.0).all()}")

# Drop remaining NaN values from resampling
data = data.dropna(subset=['people_count'])
print(f"  Final shape after dropping NaN: {data.shape}")

# --- 4. Feature Engineering ---
print("\n" + "="*60)
print("FEATURE ENGINEERING")
print("="*60)

def create_features(df):
    """
    Creates features for regular 15-minute intervals.
    Fast and efficient with simple shift().
    """
    df = df.copy()
    
    print("  Creating time features...")
    df['hour'] = df['timestamp'].dt.hour
    df['minute'] = df['timestamp'].dt.minute
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_of_month'] = df['timestamp'].dt.day
    df['month'] = df['timestamp'].dt.month
    df['is_weekend'] = (df['timestamp'].dt.dayofweek >= 5).astype(int)
    df['time_of_day'] = df['hour'] + df['minute'] / 60
    df['is_business_hours'] = ((df['hour'] >= 9) & (df['hour'] <= 17)).astype(int)
    df['quarter_hour'] = df['minute'] // 15
    
    # Part of day
    df['is_morning'] = ((df['hour'] >= 6) & (df['hour'] < 12)).astype(int)
    df['is_afternoon'] = ((df['hour'] >= 12) & (df['hour'] < 18)).astype(int)
    df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] < 22)).astype(int)
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] < 6)).astype(int)
    
    # Holiday features
    print("  Creating holiday features...")
    df['is_holiday'] = df['is_holiday'].fillna(0).astype(int)
    df['is_holiday_eve'] = df.groupby('poi_id')['is_holiday'].shift(-PERIODS_PER_DAY).fillna(0).astype(int)
    df['is_holiday_aftermath'] = df.groupby('poi_id')['is_holiday'].shift(PERIODS_PER_DAY).fillna(0).astype(int)
    df['is_weekend_or_holiday'] = ((df['is_weekend'] == 1) | (df['is_holiday'] == 1)).astype(int)
    
    # Interaction features
    print("  Creating interaction features...")
    df['hour_x_weekend'] = df['hour'].astype(str) + '_' + df['is_weekend'].astype(str)
    df['hour_x_dow'] = df['hour'].astype(str) + '_' + df['day_of_week'].astype(str)
    
    # --- LAG FEATURES ---
    print("  Creating lag features...")
    lag_configs = {
        'lag_15min': 1,
        'lag_1h': PERIODS_PER_HOUR,
        'lag_3h': 3 * PERIODS_PER_HOUR,
        'lag_6h': 6 * PERIODS_PER_HOUR,
        'lag_24h': PERIODS_PER_DAY,
        'lag_48h': 2 * PERIODS_PER_DAY,
        'lag_7d': PERIODS_PER_WEEK,
        'lag_14d': 2 * PERIODS_PER_WEEK
    }
    
    for name, periods in lag_configs.items():
        df[name] = df.groupby('poi_id')['people_count'].shift(periods)
    
    # --- ROLLING FEATURES ---
    print("  Creating rolling features...")
    
    # 1 hour rolling
    df['rolling_mean_1h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_HOUR, min_periods=1).mean()
    )
    df['rolling_std_1h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_HOUR, min_periods=1).std()
    )
    df['rolling_max_1h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_HOUR, min_periods=1).max()
    )
    df['rolling_min_1h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_HOUR, min_periods=1).min()
    )
    
    # 3 hour rolling
    df['rolling_mean_3h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=3*PERIODS_PER_HOUR, min_periods=1).mean()
    )
    df['rolling_std_3h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=3*PERIODS_PER_HOUR, min_periods=1).std()
    )
    
    # 24 hour rolling
    df['rolling_mean_24h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_DAY, min_periods=1).mean()
    )
    df['rolling_std_24h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_DAY, min_periods=1).std()
    )
    df['rolling_max_24h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_DAY, min_periods=1).max()
    )
    df['rolling_min_24h'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_DAY, min_periods=1).min()
    )
    
    # 7 day rolling
    df['rolling_mean_7d'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_WEEK, min_periods=1).mean()
    )
    df['rolling_std_7d'] = df.groupby('poi_id')['people_count'].transform(
        lambda x: x.shift(1).rolling(window=PERIODS_PER_WEEK, min_periods=1).std()
    )
    
    # --- TREND FEATURES ---
    print("  Creating trend features...")
    df['diff_from_1h_ago'] = df['people_count'] - df['lag_1h']
    df['diff_from_yesterday'] = df['people_count'] - df['lag_24h']
    df['diff_from_last_week'] = df['people_count'] - df['lag_7d']
    
    df['ratio_to_1h_ago'] = df['people_count'] / (df['lag_1h'] + 0.1)
    df['ratio_to_yesterday'] = df['people_count'] / (df['lag_24h'] + 0.1)
    df['ratio_to_last_week'] = df['people_count'] / (df['lag_7d'] + 0.1)
    
    return df

# Note: The data frame `data` is still sorted by ['poi_id', 'timestamp']
# This is correct for the `create_features` function
df = create_features(data)

# Drop rows with NaN values
print(f"\nRows before dropna: {len(df):,}")
df = df.dropna()
print(f"Rows after dropna: {len(df):,}")

# --- 5. Define Features and Target ---

# Re-sort by timestamp. This is ESSENTIAL for TimeSeriesSplit to work correctly.
print("\nRe-sorting data by timestamp for correct time-series validation...")
df = df.sort_values('timestamp').reset_index(drop=True)

TARGET = 'people_count'

FEATURES = [
    # POI
    'poi_id',
    
    # Time features
    'hour', 'minute', 'quarter_hour', 'day_of_week', 'day_of_month', 'month',
    'is_weekend', 'is_business_hours', 'time_of_day',
    'is_morning', 'is_afternoon', 'is_evening', 'is_night',
    
    # Holiday features
    'is_holiday', 'is_holiday_eve', 'is_holiday_aftermath', 'is_weekend_or_holiday',
    
    # Weather features
    'temperature_2m', 'precipitation', 'relative_humidity_2m',
    'wind_speed_10m', 'cloud_cover_high', 'cloud_cover_low', 'cloud_cover_mid',
    
    # Lag features
    'lag_15min', 'lag_1h', 'lag_3h', 'lag_6h', 'lag_24h', 'lag_48h', 'lag_7d', 'lag_14d',
    
    # Rolling features
    'rolling_mean_1h', 'rolling_std_1h', 'rolling_max_1h', 'rolling_min_1h',
    'rolling_mean_3h', 'rolling_std_3h',
    'rolling_mean_24h', 'rolling_std_24h', 'rolling_max_24h', 'rolling_min_24h',
    'rolling_mean_7d', 'rolling_std_7d',
    
    # Trend features
    'diff_from_1h_ago', 'diff_from_yesterday', 'diff_from_last_week',
    'ratio_to_1h_ago', 'ratio_to_yesterday', 'ratio_to_last_week',
    
    # Interaction features
    'hour_x_weekend', 'hour_x_dow'
]

categorical_cols = ['poi_id', 'hour', 'minute', 'quarter_hour', 'day_of_week', 
                   'month', 'is_holiday', 'is_weekend', 'is_weekend_or_holiday',
                   'hour_x_weekend', 'hour_x_dow']

df[categorical_cols] = df[categorical_cols].astype('category')

X = df[FEATURES]
y = df[TARGET]

print(f"\nFeature matrix: {X.shape}")
print(f"Target vector: {y.shape}")
print(f"Memory usage: {X.memory_usage(deep=True).sum() / 1024**2:.1f} MB")

# --- 6. Cross-Validation ---
print("\n" + "="*60)
print("ROLLING FORECAST CROSS-VALIDATION")
print("="*60)

# 💡 --- NEW CODE: CREATE PLOT DIRECTORY --- 💡
PLOT_DIR = './model_results/cross_val_plots'
os.makedirs(PLOT_DIR, exist_ok=True)
print(f"✓ Plots will be saved to: {PLOT_DIR}")

# Use the standard TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)

fold_rmse = []
fold_mae = []
fold_mape = []

for fold, (train_index, test_index) in enumerate(tscv.split(X)):
    print(f"\n--- FOLD {fold + 1} ---")
    
    X_train, X_test = X.iloc[train_index], X.iloc[test_index]
    y_train, y_test = y.iloc[train_index], y.iloc[test_index]
    
    # Get timestamp for logging
    train_dates = df.iloc[train_index]['timestamp']
    test_dates = df.iloc[test_index]['timestamp']
    
    print(f"Train: {train_dates.min().date()} to {train_dates.max().date()} ({len(X_train):,})")
    print(f"Test:  {test_dates.min().date()} to {test_dates.max().date()} ({len(X_test):,})")
    
    model = lgb.LGBMRegressor(
        objective='regression',
        metric='rmse',
        n_estimators=2000,
        learning_rate=0.03,
        num_leaves=31,
        max_depth=8,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        n_jobs=-1,
        random_state=42,
        verbose=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
    )
    
    preds = model.predict(X_test)
    preds = np.maximum(preds, 0)
    
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)
    
    # This is a good fix for the 'inf' MAPE!
    mape = np.mean(np.abs((y_test - preds) / (y_test + 1))) * 100
    
    fold_rmse.append(rmse)
    fold_mae.append(mae)
    fold_mape.append(mape)
    
    print(f"RMSE: {rmse:.2f} | MAE: {mae:.2f} | Scaled MAPE: {mape:.1f}%")

    # 💡 --- NEW PLOTTING BLOCK --- 💡
    print("  Generating plots...")
    
    # 1. Create a DataFrame for easy plotting
    # We use df.iloc[test_index] to get the correct poi_id and timestamp
    plot_df = pd.DataFrame({
        'timestamp': df.iloc[test_index]['timestamp'],
        'poi_id': df.iloc[test_index]['poi_id'],
        'actual': y_test,
        'predicted': preds
    })
    
    # 2. Get all unique POIs in this test set
    pois = plot_df['poi_id'].unique()
    n_pois = len(pois)
    
    # 3. Set up the subplot grid
    n_cols = 5  # 5 plots wide
    n_rows = int(np.ceil(n_pois / n_cols)) # Calculate rows needed
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(20, n_rows * 4))
    axes = axes.flatten() # Make it easy to iterate
    
    # 4. Loop through each POI and create its subplot
    for i, poi_name in enumerate(pois):
        ax = axes[i]
        
        # Filter data for this POI (handling the 'nan' POI)
        if pd.isna(poi_name):
            poi_data = plot_df[plot_df['poi_id'].isna()]
            title = "POI: nan"
        else:
            poi_data = plot_df[plot_df['poi_id'] == poi_name]
            title = poi_name
        
        # Plot the lines
        poi_data.plot(x='timestamp', y='actual', label='Actual', ax=ax, alpha=0.8)
        poi_data.plot(x='timestamp', y='predicted', label='Predicted', ax=ax, linestyle='--', alpha=0.8)
        
        # Format the subplot
        ax.set_title(title, fontsize=10)
        ax.legend()
        ax.tick_params(axis='x', rotation=45, labelsize=8)
        ax.set_xlabel('Timestamp', fontsize=8)

    # 5. Hide any unused subplots
    for i in range(n_pois, len(axes)):
        axes[i].set_visible(False)
        
    # 6. Set main title and save
    fig.suptitle(f'Cross-Validation Fold {fold + 1} (Test: {test_dates.min().date()} to {test_dates.max().date()})', fontsize=16, y=1.02)
    plt.tight_layout()
    plot_filename = os.path.join(PLOT_DIR, f'fold_{fold + 1}_predictions.png')
    plt.savefig(plot_filename)
    plt.close(fig) # Close figure to free memory
    print(f"  ✓ Plot saved to: {plot_filename}")
    # 💡 --- END OF PLOTTING BLOCK --- 💡


# --- 7. Results ---
print("\n" + "="*60)
print("CROSS-VALIDATION RESULTS")
print("="*60)
print(f"Average RMSE: {np.mean(fold_rmse):.2f} ± {np.std(fold_rmse):.2f}")
print(f"Average MAE:  {np.mean(fold_mae):.2f} ± {np.std(fold_mae):.2f}")
print(f"Average MAPE: {np.mean(fold_mape):.1f}% ± {np.std(fold_mape):.1f}%")

# --- 8. Train Final Model ---
print("\n" + "="*60)
print("TRAINING FINAL MODEL")
print("="*60)

final_model = lgb.LGBMRegressor(
    objective='regression',
    metric='rmse',
    n_estimators=2000,
    learning_rate=0.03,
    num_leaves=31,
    max_depth=8,
    min_child_samples=20,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=0.1,
    n_jobs=-1,
    random_state=42,
    verbose=-1
)

final_model.fit(X, y, categorical_feature=categorical_cols)
print(f"✓ Final model trained on {len(X):,} samples")

# --- 9. Feature Importance ---
print("\n" + "="*60)
print("TOP 25 FEATURES BY IMPORTANCE")
print("="*60)

feature_importance = pd.DataFrame({
    'feature': FEATURES,
    'importance': final_model.feature_importances_
}).sort_values('importance', ascending=False)

for idx, row in feature_importance.head(25).iterrows():
    print(f"{row['feature']:30s} {row['importance']:8.1f}")

# Save feature importance
feature_importance.to_csv('./model_results/feature_importance.csv', index=False)
print("\n✓ Feature importance saved to: feature_importance.csv")

# --- 10. Save Model ---
print("\n" + "="*60)
print("SAVING MODEL & METADATA")
print("="*60)

with open('live_model.pkl', 'wb') as f:
    pickle.dump(final_model, f)
final_model.booster_.save_model('./model_results/live_model.txt')

metadata = {
    'training_date': datetime.now().isoformat(),
    'data_frequency': FREQ,
    'n_samples': len(X),
    'n_features': len(FEATURES),
    'n_pois': df['poi_id'].nunique(),
    'features': FEATURES,
    'categorical_features': categorical_cols,
    'date_range': {
        'start': df['timestamp'].min().isoformat(),
        'end': df['timestamp'].max().isoformat()
    },
    'cross_validation': {
        'n_folds': 5,
        'rmse_mean': float(np.mean(fold_rmse)),
        'rmse_std': float(np.std(fold_rmse)),
        'mae_mean': float(np.mean(fold_mae)),
        'mae_std': float(np.std(fold_mae)),
        'mape_mean': float(np.mean(fold_mape)),
        'mape_std': float(np.std(fold_mape))
    },
    'pois': df['poi_id'].unique().tolist()
}

import json
with open('./model_results/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("✓ Model saved:")
print("  - live_model.pkl (for Python)")
print("  - live_model.txt (LGBM format)")
print("✓ Metadata saved: model_metadata.json")

print("\n" + "="*60)
print("✅ PIPELINE COMPLETE")
print("="*60)
print(f"\n📊 Final Stats:")
print(f"   Training samples: {len(X):,}")
print(f"   Date range: {df['timestamp'].min().date()} to {df['timestamp'].max().date()}")
print(f"   POIs: {df['poi_id'].nunique()}")
print(f"   CV RMSE: {np.mean(fold_rmse):.2f}")
print(f"   CV MAE: {np.mean(fold_mae):.2f}")