# Malaysia Vehicle Registration Platform

Group 12 website. Version 5 is the page we share.

## Navigation

The menu bar has three pages:

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

## Live links

- Home chooser: https://j24041882-khoweiseong.github.io/COS30049-html/
- v3, previous cleaned file: https://j24041882-khoweiseong.github.io/COS30049-html/v3/
- v4, our pages with the zip data: https://j24041882-khoweiseong.github.io/COS30049-html/v4/
- v5, this platform: https://j24041882-khoweiseong.github.io/COS30049-html/v5/
