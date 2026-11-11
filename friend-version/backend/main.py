from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from model import SimpleModel
from pydantic import BaseModel, Field
from utils import logger
from datetime import datetime
import pandas as pd


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # URL of React application
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CSV_FILE_PATH = "historical_dataset.csv"

# Initialize the model
model = SimpleModel()


class PredictionInput(BaseModel):
    # Field defines constraints for input validation
    population: int = Field(..., gt=1, description="Population of people above 15")  # Must be greater than 0
    income: int = Field(..., ge=1, description="Mean income of population")  # Must be between 1 and 10 inclusive


@app.post("/predict") 
async def predict_price(input: PredictionInput):
    global next_history_id
    try:
        predictions = model.predict(input.population, input.income)
        logger.info(f"{predictions}")

        results = [
                {
                    "type": prediction[0],
                    "fuel": prediction[1],
                    "number": prediction[2]
                }
                for prediction in predictions
            ]
        

        # Save both inputs and prediction results
        history_item = {
            "id": next_history_id,
            "population": input.population,
            "income": input.income,
            "created_at": datetime.now().astimezone().isoformat(),
            "predictions": results
        }

        prediction_history.append(history_item)
        next_history_id += 1
        logger.info(f"Prediction history saved: ID {history_item['id']}")

        return {
            "id": history_item["id"],
            "Predictions": results
        }

    except Exception as e:
        # Handle any unexpected errors during prediction and raise a 500 Internal Server Error
        logger.error(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


prediction_history = []
next_history_id = 1

@app.get("/predictions")
async def get_predictions():
    
    try:
        # Return newest predictions first
        return {
            "history": list(reversed(prediction_history))
        }

    except Exception as e:
        logger.error(
            f"Error retrieving predictions: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# Retrieve one specific historical prediction
@app.get("/predictions/{history_id}")
async def get_prediction_by_id(history_id: int):
    try:
        for item in prediction_history:
            if item["id"] == history_id:
                return item

        raise HTTPException(
            status_code=404,
            detail="Prediction history not found"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Error retrieving prediction: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

    
@app.get("/historical-data")
async def get_historical_data():
    try:
        # Read the CSV file using pandas
        df = pd.read_csv(CSV_FILE_PATH)
        
        # Convert the dataframe into a dictionary/JSON format records
        data_records = df.to_dict(orient="records")
        
        return {
            "status": "success",
            "data": data_records
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Historical CSV file not found on the server.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading CSV file: {str(e)}")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

