from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from model import SimpleModel
from pydantic import BaseModel, Field
from utils import logger


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # URL of React application
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the model
model = SimpleModel()


class PredictionInput(BaseModel):
    # Field defines constraints for input validation
    population: int = Field(..., gt=1, description="Population of people above 15")  # Must be greater than 0
    income: int = Field(..., ge=1, description="Mean income of population")  # Must be between 1 and 10 inclusive

@app.get("/")
async def root():
    return {"message": "Welcome to the Vehicle Prediction API"}

# @app.get("/predict/{population}/{income}") 
# async def predict_price_path(population: int, income: int):
#     price = model.predict(population, income)
#     return price


@app.post("/predict") 
async def predict_price(input: PredictionInput):
    try:
        results = model.predict(input.population, input.income)
        logger.info(f"{results}")

        return {"Predictions": results}

    except Exception as e:
        # Handle any unexpected errors during prediction and raise a 500 Internal Server Error
        logger.error(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

