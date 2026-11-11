# Malaysia Vehicle Registration Platform

Group 12 website. Version 5 is the page we share.

## Navigation

The menu uses the v3 colours: cream bar, dark text, and a gold pill for the open page. Home, Historical, and Prediction use that same cream, gold, and ink on every page.

1. **Home** shows the overview: total registrations, cars, motorcycles, and the two summary charts.
2. **Historical Data** shows the historical dashboard. Filters are year, state, average income, vehicle type, and fuel. Each chart has a table and a larger view.
3. **Prediction** asks for population aged above 15 and mean income, then draws the D3 forecast charts.

## Historical data

The historical page requests the file in this order:

1. `GET http://localhost:8000/historical-data` when the Python server is running.
2. `GET /historical` on our own server.
3. `data/historical_dataset.csv` on the public page.

The charts use D3. The cleaned national file from v3 is the earlier overview. v5 reads the state-level file, so the same registrations can be filtered by state.

## Prediction

Predict uses the Python server on port 8000 when it is running. On the public page it uses the saved model in the browser and keeps prediction history in that browser.

## Run it in VS Code

Download the repository, then open `final-version`. The React app is in `frontend` and the Python server is in `backend`.

In `final-version/frontend`:

```powershell
npm install
npm start
```

`npm install` is required once. `npm start` opens the React app at http://localhost:3000. Node.js must be installed first.

In `final-version/backend`:

```powershell
pip install -r requirements.txt
python main.py
```

## Two copies

`final-version` is the copy to use. Its backend is the original `main.py` and `model.py`, and the historical page has the checkbox filters. `friend-version` keeps that same original backend with the earlier website.

## Live links

- Both sites: https://j24041882-khoweiseong.github.io/COS30049-html/
- Our folder: https://github.com/j24041882-KHOWEISEONG/COS30049-html/tree/main/final-version
- Our site: https://j24041882-khoweiseong.github.io/COS30049-html/final-version/frontend/build/
- Friend folder: https://github.com/j24041882-KHOWEISEONG/COS30049-html/tree/main/friend-version
- Friend site: https://j24041882-khoweiseong.github.io/COS30049-html/friend-version/frontend/build/
