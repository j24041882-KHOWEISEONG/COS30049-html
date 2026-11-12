import logging

def setup_logger():
    logging.basicConfig(level=logging.INFO) # Your logs will normally appear in the VS Code Terminal where you started Uvicorn.
    logger = logging.getLogger(__name__)
    return logger

logger = setup_logger()



# # to save files to a txt file
# import logging

# logger = logging.getLogger("backend")

# logger.setLevel(logging.INFO)

# file_handler = logging.FileHandler("backend.log") # logs saved to backend.log file

# formatter = logging.Formatter(
#     "%(asctime)s - %(levelname)s - %(message)s"
# )

# file_handler.setFormatter(formatter)

# logger.addHandler(file_handler) 