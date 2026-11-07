const DATA_URL = "data/merged_pop_vehicle_income_cleaned.csv";
const form = document.getElementById("predict-form");
const errorBox = document.getElementById("form-error");
const note = document.getElementById("chart-note");
let predictions = [];
let spec = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("show");
}

function wholeNumber(value) {
  return /^-?\d+$/.test(value.trim());
}

function chartSpec() {
  const fuels = [...new Set(predictions.map((item) => item[1]))].sort();
  const categories = [...new Set(predictions.map((item) => item[0]))].sort();
  return {
    type: "stacked",
    label: "Predicted registrations by fuel",
    labels: fuels,
    xTitle: "Fuel",
    yTitle: "Predicted registrations",
    series: categories.map((category, index) => ({
      name: category,
      color: PALETTE[index % PALETTE.length],
      values: fuels.map((fuel) => {
        const match = predictions.find((item) => item[0] === category && item[1] === fuel);
        return match ? Number(match[2]) : 0;
      })
    }))
  };
}

function draw() {
  spec = chartSpec();
  drawChart("#pred-chart", spec);
}

function fillTable() {
  const body = document.getElementById("pred-body");
  body.innerHTML = "";
  [...predictions]
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
    .forEach(([category, fuel, count]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${category}</td><td>${fuel}</td><td>${Number(count).toLocaleString("en-MY")}</td>`;
      body.appendChild(tr);
    });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const incomeText = document.getElementById("income").value;
  const populationText = document.getElementById("population").value;
  if (!populationText.trim() || !incomeText.trim()) {
    showError("Enter both average income and population. Leave neither field blank.");
    return;
  }
  if (!wholeNumber(incomeText) || Number(incomeText) < 1) {
    showError("Average income must be a whole number of at least 1.");
    return;
  }
  if (!wholeNumber(populationText) || Number(populationText) <= 1) {
    showError("Population must be a whole number greater than 1.");
    return;
  }
  const population = Number(populationText);
  const income = Number(incomeText);
  note.textContent = "Calculating the forecast…";
  try {
    const response = await fetch("predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ population, income })
    });
    if (!response.ok) throw new Error("The prediction service returned an error.");
    const payload = await response.json();
    predictions = payload.Predictions || payload.predictions || [];
    if (!predictions.length) throw new Error("The prediction service returned no results.");
  } catch (error) {
    showError("This page can show the latest recorded year. To calculate a new forecast, start Python v3 and open the site from that server.");
    return;
  }
  draw();
  fillTable();
  const carPetrol = predictions.find((item) => item[0] === "car" && item[1] === "petrol");
  const motoPetrol = predictions.find((item) => item[0] === "motorcycle" && item[1] === "petrol");
  note.textContent = `Forecast for population ${population.toLocaleString("en-MY")} and mean income RM ${income.toLocaleString("en-MY")}. Petrol cars: ${Number(carPetrol?.[2] || 0).toLocaleString("en-MY")}. Petrol motorcycles: ${Number(motoPetrol?.[2] || 0).toLocaleString("en-MY")}.`;
});

document.getElementById("show-table").addEventListener("click", () => {
  if (!predictions.length) {
    showError("Choose Predict before opening the data table.");
    return;
  }
  clearError();
  document.getElementById("table-dialog").showModal();
});

document.getElementById("show-enlarge").addEventListener("click", () => {
  if (!spec) {
    showError("Choose Predict before enlarging the chart.");
    return;
  }
  clearError();
  const dialog = document.getElementById("enlarge");
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => drawChart("#enlarge-chart", spec));
});

document.getElementById("close-table").addEventListener("click", () => document.getElementById("table-dialog").close());
document.getElementById("close-enlarge").addEventListener("click", () => document.getElementById("enlarge").close());

async function showLatestYear() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("missing data");
  const parsed = d3.csvParse(await response.text()).map((row) => ({
    year: Number(row.year),
    category: row.category,
    fuel: row.fuel,
    count: Number(row.count) || 0
  }));
  const latest = d3.max(parsed, (row) => row.year);
  const totals = new Map();
  parsed.filter((row) => row.year === latest).forEach((row) => {
    const key = `${row.category}|${row.fuel}`;
    totals.set(key, (totals.get(key) || 0) + row.count);
  });
  predictions = [...totals.entries()].map(([key, count]) => {
    const [category, fuel] = key.split("|");
    return [category, fuel, count];
  });
  draw();
  fillTable();
  note.textContent = `This stacked chart shows ${latest} registrations so the page is not empty. Fuel is on the horizontal axis and each colour is a vehicle type. Choose Predict to replace it with the model forecast.`;
}

showLatestYear().catch(() => {
  note.textContent = "The chart could not load.";
});
