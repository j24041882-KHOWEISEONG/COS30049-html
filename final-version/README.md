# Our version

This copy uses our edited backend. `backend\main.py` and `backend\model.py` were shortened. The saved model file `simple_model.pkl` is still the original one.

The website code is in `frontend`.

```powershell
cd frontend
npm install
npm start
```

Open http://localhost:3000

The Python server reads the historical file from `frontend\public\data`.

```powershell
cd backend
pip install -r requirements.txt
python main.py
```
