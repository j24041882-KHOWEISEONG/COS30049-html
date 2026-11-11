# Friend version

This copy follows the backend folder from the zip. `backend\main.py` and `backend\model.py` are the original files and are not edited. `historical_dataset.csv` and `simple_model.pkl` sit in `backend` with them.

The website code is only in `frontend`.

```powershell
cd frontend
npm install
npm start
```

Open http://localhost:3000

Start Python from the `backend` folder so the original files can find the model and the CSV:

```powershell
cd backend
pip install -r requirements.txt
python main.py
```
