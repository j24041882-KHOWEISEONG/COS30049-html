import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model"/ "simple_model.pkl"
DATASET_PATH = BASE_DIR / "dataset" / "model_dataset.csv"

class SimpleModel:
    def __init__(self):
        # loads saved model if exists, else train new model
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
        else:
            self.train()

    def train(self):
        # Load dataset
        df = pd.read_csv(DATASET_PATH)

        # Extract and seperate desired features into numerical and categorical in preperation for scaling and encoding step
        numerical_features = ['above 15', 'income_mean']
        categorical_features = [ 'category', 'fuel']

        # Defining the features and labels
        X = df[numerical_features + categorical_features]
        y = df['count']

        # Create columnTransformer to scale numerical and encode categorical values
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numerical_features), 
                ('cat', OneHotEncoder(), categorical_features)
            ])

        # Defines the model
        self.modelType =RandomForestRegressor(n_estimators=100, random_state=42)

        # Create pipeline to train model
        self.model = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', self.modelType)
        ])

        # Train model
        self.model.fit(X, y)
        
        # Save the model
        joblib.dump(self.model, '/model/simple_model.pkl')

    def predict(self, population, income):
        all_category = ['van', 'other', 'motorcycle', 'trailer', 'car', 'bus', 'lorry']
        all_fuel =['hydrogen', 'hybrid_diesel', 'hybrid_petrol', 'electric', 'other', 'lng', 'petrol_ng', 'petrol_lng', 'petrol', 'greendiesel_ng', 'diesel_ng', 'greendiesel', 'diesel', 'ng']

        results = []

        for category in all_category:
            for fuel in all_fuel:
                inputs = pd.DataFrame(
                    {
                        'above 15': [population], 
                        'income_mean': [income], 
                        'category': [category],
                        'fuel': [fuel]
                    }
                )
                result = int(self.model.predict(inputs)[0])
                results.append([category, fuel, result])

        return results


if __name__ == "__main__":
    model = SimpleModel()

    # Example usage 
    predictions = model.predict(population=50000, income=4500)
    print(predictions)