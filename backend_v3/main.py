from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import (
    add_notice,
    delete_forecast,
    get_forecast,
    init_db,
    list_forecasts,
    list_notices,
    mark_notices_seen,
    save_forecast,
)
from model import SimpleModel
from utils import logger

SITE = Path(__file__).resolve().parent.parent / "docs"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
model = SimpleModel()
init_db()


class PredictionInput(BaseModel):
    population: int = Field(..., gt=1, description="Population of people above 15")
    income: int = Field(..., ge=1, description="Mean income of population")


CATEGORIES = {"bus", "car", "lorry", "motorcycle", "other", "trailer", "van"}
FUELS = {"diesel", "electric", "greendiesel", "hybrid", "other", "petrol"}


class ForecastInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    reason: str = Field(..., min_length=1, max_length=160)
    category: str
    fuel: str
    population: int = Field(..., gt=1, description="Population of people above 15")
    income: int = Field(..., ge=1, description="Mean income of population")

    def cleaned(self, value):
        return " ".join(value.split())


@app.post("/predict")
async def predict_price(body: PredictionInput):
    try:
        results = model.predict(body.population, body.income)
        logger.info(f"{results}")
        return {"Predictions": results}
    except Exception as error:
        logger.error(f"Error during prediction: {str(error)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(error)}")


@app.get("/forecasts")
async def read_forecasts():
    return list_forecasts()


@app.get("/forecasts/{forecast_id}")
async def read_forecast(forecast_id: int):
    record = get_forecast(forecast_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return record


@app.post("/forecasts")
async def create_forecast(body: ForecastInput):
    name = body.cleaned(body.name)
    reason = body.cleaned(body.reason)
    category = body.category.strip().lower()
    fuel = body.fuel.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Give this scenario a name.")
    if not reason:
        raise HTTPException(status_code=400, detail="Write what this scenario is testing.")
    if category not in CATEGORIES or fuel not in FUELS:
        raise HTTPException(status_code=400, detail="Choose a vehicle type and a fuel from the lists.")
    try:
        predictions = model.predict(body.population, body.income)
        record = save_forecast(name, reason, category, fuel, body.population, body.income, predictions)
        focus_count = next(
            (count for item_category, item_fuel, count in record["predictions"]
             if item_category == category and item_fuel == fuel),
            None,
        )
        add_notice("saved", name, reason, category, fuel, body.population, body.income, focus_count)
        logger.info(f"Saved scenario {record['id']} {name}")
        return record
    except Exception as error:
        logger.error(f"Error saving forecast: {str(error)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(error)}")


@app.delete("/forecasts/{forecast_id}")
async def remove_forecast(forecast_id: int):
    record = get_forecast(forecast_id)
    if record is None or not delete_forecast(forecast_id):
        raise HTTPException(status_code=404, detail="Forecast not found")
    focus_count = next(
        (count for item_category, item_fuel, count in record["predictions"]
         if item_category == record["focus_category"] and item_fuel == record["focus_fuel"]),
        None,
    )
    add_notice(
        "removed",
        record["name"],
        record["reason"],
        record["focus_category"],
        record["focus_fuel"],
        record["population"],
        record["income"],
        focus_count,
    )
    return {"deleted": forecast_id}


@app.get("/notices")
async def read_notices():
    return list_notices()


@app.post("/notices/read")
async def read_all_notices():
    mark_notices_seen()
    return list_notices()


app.mount("/", StaticFiles(directory=SITE, html=True), name="site")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
