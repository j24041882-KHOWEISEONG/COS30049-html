# Malaysia Vehicle Registration

This folder is split into two parts.

- `frontend` is the React website. `App.js` is in `frontend/src`.
- `backend` is the Python server. `main.py` and `model.py` are in `backend`.

## Run the website in VS Code

Open the `frontend` folder, then in the terminal:

```powershell
npm install
npm start
```

`npm install` is only needed the first time. When the terminal says compiled successfully, open http://localhost:3000.

## Run the Python server

Open the `backend` folder, then:

```powershell
pip install -r requirements.txt
python main.py
```

The server runs at http://localhost:8000. The website still opens if this server is off.
