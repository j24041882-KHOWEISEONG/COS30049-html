import csv
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import SimpleModel
from utils import logger

SITE = Path(__file__).resolve().parent
CLEANED = SITE / "data" / "historical_dataset.csv"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
model = SimpleModel()


class PredictionInput(BaseModel):
    population: int = Field(..., gt=1, description="Population of people above 15")
    income: int = Field(..., ge=1, description="Mean income of population")


def read_rows():
    if not CLEANED.exists():
        raise HTTPException(status_code=404, detail="Historical file not found")
    with CLEANED.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


@app.get("/historical-data")
async def read_historical_data():
    return read_rows()


@app.get("/historical")
async def read_historical():
    return read_rows()


@app.post("/predict")
async def predict_price(body: PredictionInput):
    try:
        results = model.predict(body.population, body.income)
        logger.info(f"{results}")
        return {"Predictions": results}
    except Exception as error:
        logger.error(f"Error during prediction: {str(error)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(error)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
