from fastapi import FastAPI,HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse
from model import SimpleModel
from pydantic import BaseModel, Field
from utils import logger
from datetime import datetime, timezone
import pandas as pd
import time
from pathlib import Path
import uuid
historical_data_cache = None
historical_data_mtime = None

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # URL of React application
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Request-ID"]
)

# Add custom logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request.state.request_id = request_id = str(uuid.uuid4())
    start_time = time.time()
    status_code = 500

    try:
        response = await call_next(request)

        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id

        return response

    finally:
        process_time = time.time() - start_time

        logger.info(
            "Request ID: %s | %s %s | Status: %s | Duration: %.4f seconds",
            request_id,
            request.method,
            request.url.path,
            status_code,
            process_time
        )

    
# custom http exception handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", "unknown")

    logger.warning(
        "Request ID: %s | HTTP %s: %s",
        request_id,
        exc.status_code,
        exc.detail
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail
        },
        headers={
            "X-Request-ID": request_id
        }
    )

# general exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")

    logger.exception(
        "Request ID: %s | Unhandled exception",
        request_id
    )

    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": 500,
            "message": "An unexpected server error occurred. Please try again later."
        },
        headers={
            "X-Request-ID": request_id
        }
    )

# validation exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")

    logger.warning(
        "Request ID: %s | Request validation failed: %s",
        request_id,
        exc.errors()
    )

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "code": 422,
            "message": "Invalid input data.",
        },
        headers={
            "X-Request-ID": request_id
        }
    )


# Initialize the model
try:
    model = SimpleModel()
    logger.info("Prediction model initialized successfully.")

except Exception as e:
    logger.critical(
        "Failed to initialize SimpleModel.",
        exc_info=True
    )
    raise RuntimeError(f"Model initialization failed.") from e

# Pydantic class for validating user input
class PredictionInput(BaseModel):
    # Field defines constraints for input validation
    population: int = Field(..., gt=0, description="Population of people above 15")  # input must be greater than 0
    income: int = Field(..., gt=0, description="Mean income of population")  # input must be greater than 0

prediction_history = []
next_history_id = 1

@app.post("/predict") 
async def predict_count(user_input: PredictionInput):
    global next_history_id

    try:
        # get predictions
        predictions = model.predict(user_input.population, user_input.income)
        logger.info(f"New Prediction: {predictions}")

        if not isinstance(predictions, list):
            raise ValueError("Model returned an invalid prediction format.")

        results = []

        # check and convert result into dictionary data type
        for prediction in predictions:
            if not isinstance(prediction, (list, tuple)) or len(prediction) != 3:
                raise ValueError("Invalid prediction result.")

            results.append({
                "type": str(prediction[0]),
                "fuel": str(prediction[1]),
                "number": int(prediction[2])
            })

        # save both inputs and prediction results 
        history_item = {
            "id": next_history_id,
            "population": user_input.population,
            "income": user_input.income,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "predictions": results
        }

        # add to prediction_history list for later retrieval
        prediction_history.append(history_item)
        next_history_id += 1
        logger.info(f"Prediction history saved: ID {history_item['id']}")

        return {
            "id": history_item["id"],
            "Predictions": results
        }
    
    except HTTPException:
        raise

    except Exception:
        logger.exception("Error during prediction")
        raise HTTPException(
                status_code=500,
                detail="An error occurred while generating the prediction."
            )

# retrieve whole prediction history
@app.get("/predictions")
async def get_predictions():
    try:
        # return newest predictions first
        history = list(reversed(prediction_history))

        logger.info(
            "Retrieved %s prediction history records.",
            len(history)
        )

        return {
            "history": history
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error retrieving prediction history.")
        raise HTTPException(
                status_code=500,
                detail="An error occurred while retrieving prediction history."
            )

# retrieve single historical prediction by id
@app.get("/predictions/{history_id}")
async def get_prediction_by_id(history_id: int):
    try:
        for item in prediction_history:
            if item["id"] == history_id:
                logger.info(
                    "Retrieved prediction history ID: %s",
                    history_id
                )
                return item

        raise HTTPException(
                status_code=404,
                detail="Prediction history not found."
            )

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error retrieving prediction history by id.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving selected prediction history."
        )

@app.get("/historical-data")
async def get_historical_data():
    global historical_data_cache, historical_data_mtime
    try:
        BASE_DIR = Path(__file__).resolve().parent
        CSV_PATH = BASE_DIR / "dataset" / "historical_dataset.csv"
        
        # Get the dataset file last modification time
        current_mtime = CSV_PATH.stat().st_mtime_ns

        # Reload only when cache is empty or CSV changes
        if (
            historical_data_cache is None
            or historical_data_mtime != current_mtime
        ):

            logger.info(
                "Loading or refreshing historical CSV cache."
            )

            df = pd.read_csv(CSV_PATH)

            # Convert CSV into JSON-compatible records
            new_data = df.to_dict(orient="records")

            # Update cache only after successful reading
            historical_data_cache = new_data
            historical_data_mtime = current_mtime

            logger.info(
                "Historical CSV cache updated successfully."
            )

        else:
            logger.info(
                "Returning historical data from cache."
            )

        return {
            "status": "success",
            "data": historical_data_cache
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail="Historical CSV file not found on the server."
        )
    
    except pd.errors.ParserError:

        logger.exception("Historical CSV file has an invalid format.")

        raise HTTPException(
            status_code=400,
            detail="Historical CSV file has an invalid format."
        )

    except Exception:
        logger.exception("Unexpected error reading historical CSV file.")
        
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving historical data."
        )
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
