from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

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


class PredictionInput(BaseModel):
    population: int = Field(..., gt=1, description="Population of people above 15")
    income: int = Field(..., ge=1, description="Mean income of population")


@app.post("/predict")
async def predict_price(body: PredictionInput):
    try:
        results = model.predict(body.population, body.income)
        logger.info(f"{results}")
        return {"Predictions": results}
    except Exception as error:
        logger.error(f"Error during prediction: {str(error)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(error)}")


app.mount("/", StaticFiles(directory=SITE, html=True), name="site")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
