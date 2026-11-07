from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent


class SimpleModel:
    def predict(self, population, income):
        saved = joblib.load(ROOT / "simple_model.pkl")
        model = saved["pipeline"]
        results = []
        for category in saved["categories"]:
            for fuel in saved["fuels"]:
                inputs = pd.DataFrame({
                    "above 15": [population],
                    "income_mean": [income],
                    "category": [category],
                    "fuel": [fuel]
                })
                result = int(model.predict(inputs)[0])
                results.append([category, fuel, result])
        return results
