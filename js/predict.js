const PALETTE = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"];
const API_URL = "http://localhost:8000/predict";

const form = document.getElementById("predict-form");
const errorBox = document.getElementById("form-error");
const note = document.getElementById("chart-note");
let predictions = [];
let categoryChart;
let enlargeChart;
let drawToken = 0;

Chart.defaults.font.family = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = "#1c2430";

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

function chartConfig() {
  const fuels = [...new Set(predictions.map((item) => item[1]))].sort();
  const categories = [...new Set(predictions.map((item) => item[0]))].sort();
  return {
    type: "bar",
    data: {
      labels: fuels,
      datasets: categories.map((category, index) => ({
        label: category,
        data: fuels.map((fuel) => {
          const match = predictions.find((item) => item[0] === category && item[1] === fuel);
          return match ? Number(match[2]) : 0;
        }),
        backgroundColor: PALETTE[index % PALETTE.length],
        barPercentage: 0.8,
        categoryPercentage: 0.85
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, title: { display: true, text: "Fuel" } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: "Predicted registrations" } }
      }
    }
  };
}

function draw() {
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("predCategory"), chartConfig());
  note.textContent = "Fuel is on the horizontal axis. Each colour is one vehicle type, stacked in the same bar.";
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

  const token = ++drawToken;
  const population = Number(populationText);
  const income = Number(incomeText);
  note.textContent = "Calculating the forecast…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ population, income })
    });
    if (!response.ok) throw new Error("The prediction service returned an error.");
    const payload = await response.json();
    if (token !== drawToken) return;
    predictions = payload.Predictions || payload.predictions || [];
    if (!predictions.length) throw new Error("The prediction service returned no results.");
  } catch (error) {
    if (token !== drawToken) return;
    showError("The prediction could not be completed. Start backend_v2 on http://localhost:8000, then open this page at http://localhost:3000.");
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
  if (!categoryChart) {
    showError("Choose Predict before enlarging the chart.");
    return;
  }
  clearError();
  if (enlargeChart) enlargeChart.destroy();
  enlargeChart = new Chart(document.getElementById("enlargeChart"), chartConfig());
  document.getElementById("enlarge").showModal();
});

document.getElementById("close-table").addEventListener("click", () => document.getElementById("table-dialog").close());
document.getElementById("close-enlarge").addEventListener("click", () => document.getElementById("enlarge").close());

async function showLatestYear() {
  const token = ++drawToken;
  const response = await fetch("backend_v2/merged_pop_vehicle_income_cleaned.csv");
  if (!response.ok) throw new Error("missing data");
  const lines = (await response.text()).trim().split(/\r?\n/).filter(Boolean);
  const unquote = (value) => {
    const text = String(value ?? "").trim();
    return text.length >= 2 && text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text;
  };
  const headers = lines[0].split(",").map(unquote);
  const parsed = lines.slice(1).map((line) => {
    const cols = line.split(",").map(unquote);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index];
    });
    return { year: Number(row.year), category: row.category, fuel: row.fuel, count: Number(row.count) || 0 };
  });
  const latest = Math.max(...parsed.map((row) => row.year));
  const totals = new Map();
  parsed.filter((row) => row.year === latest).forEach((row) => {
    const key = `${row.category}|${row.fuel}`;
    totals.set(key, (totals.get(key) || 0) + row.count);
  });
  if (token !== drawToken) return;
  predictions = [...totals.entries()].map(([key, count]) => {
    const [category, fuel] = key.split("|");
    return [category, fuel, count];
  });
  draw();
  fillTable();
  note.textContent = `This stacked chart shows ${latest} registrations so the page is not empty. Fuel is on the horizontal axis and each colour is a vehicle type. Choose Predict to replace it with the model forecast.`;
}

showLatestYear().catch(() => {
  note.textContent = "The chart could not load. Open this page at http://localhost:3000/predict.html.";
});
