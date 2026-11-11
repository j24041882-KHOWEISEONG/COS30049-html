from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent


class SimpleModel:
    def __init__(self):
        self._model = None

    def model(self):
        if self._model is None:
            self._model = joblib.load(ROOT / "simple_model.pkl")
        return self._model

    def labels(self):
        encoder = self.model().named_steps["preprocessor"].named_transformers_["cat"]
        categories, fuels = encoder.categories_
        return list(categories), list(fuels)

    def predict(self, population, income):
        model = self.model()
        categories, fuels = self.labels()
        results = []
        for category in categories:
            for fuel in fuels:
                inputs = pd.DataFrame({
                    "above 15": [population],
                    "income_mean": [income],
                    "category": [category],
                    "fuel": [fuel]
                })
                result = int(model.predict(inputs)[0])
                results.append([category, fuel, result])
        return results
