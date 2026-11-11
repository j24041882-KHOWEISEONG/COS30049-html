# note: evaluation step removed because idk what is being evaluated when not separated into training and test step
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
import joblib

class SimpleModel:
    def __init__(self):
        # Initialize the model 
        self.model =RandomForestRegressor(n_estimators=100, random_state=42)

    def train(self):
        # Load dataset
        df = pd.read_csv("model_dataset.csv")

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
        
        # Create pipeline to train model
        self.pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', self.model)
        ])

        # Train model
        self.pipeline.fit(X, y)
        
        # Save the model
        joblib.dump(self.pipeline, 'simple_model.pkl')

    def predict(self, population, income):
        # Load the model
        model = joblib.load('simple_model.pkl')

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
                result = int(model.predict(inputs)[0])
                results.append([category, fuel, result])

        return results

# Example usage (for initial training)
if __name__ == "__main__":
    model = SimpleModel()
    model.train()

    predictions = model.predict(population=50000, income=4500)
    print(predictions)