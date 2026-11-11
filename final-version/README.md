# Final version

This copy uses the original backend from the zip. `backend\main.py` and `backend\model.py` are unchanged. The website is in `frontend`.

```powershell
cd frontend
npm install
npm start
```

Open http://localhost:3000

Run Python from the `backend` folder so it can find `historical_dataset.csv`.

```powershell
cd backend
pip install -r requirements.txt
python main.py
```
