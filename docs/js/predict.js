const DATA_URL = "data/merged_pop_vehicle_income_cleaned.csv";
const form = document.getElementById("predict-form");
const errorBox = document.getElementById("form-error");
const note = document.getElementById("chart-note");
const saveButton = document.getElementById("save-forecast");
const savedList = document.getElementById("saved-list");
const savedNote = document.getElementById("saved-note");
let predictions = [];
let spec = null;
let viewToken = 0;
let canSave = false;
let baselineYear = null;
const baseline = new Map();

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

function setSaveReady(ready) {
  canSave = ready;
  saveButton.disabled = !ready;
}

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function focusChoice() {
  return {
    category: document.getElementById("focus-category").value,
    fuel: document.getElementById("focus-fuel").value
  };
}

function pairCount(rows, category, fuel) {
  const match = rows.find((item) => item[0] === category && item[1] === fuel);
  return match ? Number(match[2]) : 0;
}

function gapText(predicted, category, fuel) {
  const base = baseline.get(`${category}|${fuel}`);
  if (base == null || baselineYear == null) return { label: "", tone: "flat" };
  const gap = predicted - base;
  if (gap === 0) return { label: `Same as ${baselineYear}`, tone: "flat" };
  const direction = gap > 0 ? "more than" : "fewer than";
  return {
    label: `${Math.abs(gap).toLocaleString("en-MY")} ${direction} ${baselineYear}`,
    tone: gap > 0 ? "up" : "down"
  };
}

function scenarioSentence(rows, population, income, category, fuel, prefix) {
  const predicted = pairCount(rows, category, fuel);
  const gap = gapText(predicted, category, fuel);
  const comparison = gap.label ? ` ${gap.label}.` : "";
  return `${prefix} ${category} · ${fuel}: ${predicted.toLocaleString("en-MY")}.${comparison} Population ${Number(population).toLocaleString("en-MY")} and mean income RM ${Number(income).toLocaleString("en-MY")}.`;
}

function renderSaved(items) {
  savedList.innerHTML = "";
  if (!items.length) {
    savedNote.hidden = false;
    return;
  }
  savedNote.hidden = true;
  items.forEach((item) => {
    const li = document.createElement("li");
    const text = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = item.name;
    const reason = document.createElement("p");
    reason.className = "reason";
    reason.textContent = item.reason || "";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `${item.focus_category} · ${item.focus_fuel}`;
    const figure = document.createElement("div");
    figure.className = "scenario-figure";
    const caption = document.createElement("span");
    caption.textContent = "Predicted registrations";
    const value = document.createElement("b");
    value.textContent = Number(item.focus_count || 0).toLocaleString("en-MY");
    const gap = gapText(Number(item.focus_count || 0), item.focus_category, item.focus_fuel);
    const delta = document.createElement("em");
    delta.className = gap.tone;
    delta.textContent = gap.label;
    figure.append(caption, value, delta);
    const meta = document.createElement("small");
    meta.textContent = `${formatWhen(item.created_at)} · population ${Number(item.population).toLocaleString("en-MY")} · RM ${Number(item.income).toLocaleString("en-MY")}`;
    text.append(eyebrow, title, reason, figure, meta);
    li.className = "scenario";
    const actions = document.createElement("div");
    actions.className = "saved-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "ghost";
    open.textContent = "Open";
    open.addEventListener("click", () => openSaved(item.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removeSaved(item.id, item.name));
    actions.append(open, remove);
    li.append(text, actions);
    savedList.append(li);
  });
}

let baselinePromise = null;

function loadBaseline() {
  if (!baselinePromise) baselinePromise = readBaseline();
  return baselinePromise;
}

async function readBaseline() {
  let records;
  try {
    const response = await fetch("historical");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) records = data;
    }
  } catch (error) {
    records = null;
  }
  if (!records) {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("missing data");
    records = d3.csvParse(await response.text());
  }
  const parsed = records.map((row) => ({
    year: Number(row.year),
    category: row.category,
    fuel: row.fuel,
    count: Number(row.count) || 0
  }));
  baselineYear = d3.max(parsed, (row) => row.year);
  parsed.filter((row) => row.year === baselineYear).forEach((row) => {
    const key = `${row.category}|${row.fuel}`;
    baseline.set(key, (baseline.get(key) || 0) + row.count);
  });
  return parsed;
}

async function loadSaved() {
  try {
    await loadBaseline();
    const response = await fetch("forecasts");
    if (!response.ok) throw new Error("missing");
    const items = await response.json();
    renderSaved(items);
    console.group("Saved forecasts");
    console.table(items);
    console.groupEnd();
  } catch (error) {
    savedNote.hidden = false;
    savedNote.textContent = "Saving needs the Python server. The chart above can still show the latest recorded year.";
  }
}

function applyForecast(nextPredictions, population, income, message) {
  predictions = nextPredictions;
  draw();
  fillTable();
  note.textContent = message;
  console.group("Forecast results");
  console.log("Population:", population, "Mean income:", income);
  console.table(predictions.map(([category, fuel, count]) => ({ category, fuel, count: Number(count) })));
  console.groupEnd();
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
  const token = ++viewToken;
  note.textContent = "Calculating the forecast…";
  try {
    const response = await fetch("predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ population, income })
    });
    if (!response.ok) throw new Error("The prediction service returned an error.");
    const payload = await response.json();
    const nextPredictions = payload.Predictions || payload.predictions || [];
    if (!nextPredictions.length) throw new Error("The prediction service returned no results.");
    if (token !== viewToken) return;
    const focus = focusChoice();
    applyForecast(nextPredictions, population, income, scenarioSentence(nextPredictions, population, income, focus.category, focus.fuel, "Forecast."));
    setSaveReady(true);
  } catch (error) {
    if (token !== viewToken) return;
    setSaveReady(false);
    showError("This page can show the latest recorded year. To calculate a new forecast, start Python v3 and open the site from that server.");
  }
});

saveButton.addEventListener("click", async () => {
  clearError();
  if (!canSave) {
    showError("Choose Predict before saving a forecast.");
    return;
  }
  const name = document.getElementById("forecast-name").value.trim();
  const reason = document.getElementById("forecast-reason").value.trim();
  const incomeText = document.getElementById("income").value;
  const populationText = document.getElementById("population").value;
  const focus = focusChoice();
  if (!name) {
    showError("Give this scenario a name before saving.");
    return;
  }
  if (name.length > 80) {
    showError("The name can be at most 80 characters.");
    return;
  }
  if (!reason) {
    showError("Write what this scenario is testing.");
    return;
  }
  if (reason.length > 160) {
    showError("The reason can be at most 160 characters.");
    return;
  }
  if (!wholeNumber(incomeText) || Number(incomeText) < 1 || !wholeNumber(populationText) || Number(populationText) <= 1) {
    showError("Check the income and population, then choose Predict again before saving.");
    return;
  }
  saveButton.disabled = true;
  try {
    const response = await fetch("forecasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        reason,
        category: focus.category,
        fuel: focus.fuel,
        population: Number(populationText),
        income: Number(incomeText)
      })
    });
    if (!response.ok) throw new Error("save failed");
    const record = await response.json();
    viewToken += 1;
    applyForecast(record.predictions, record.population, record.income, scenarioSentence(record.predictions, record.population, record.income, record.focus_category, record.focus_fuel, `Saved “${record.name}”.`));
    await loadSaved();
  } catch (error) {
    showError("The forecast could not be saved. Start Python v3 and open the site from that server.");
  }
  saveButton.disabled = !canSave;
});

async function openSaved(id) {
  clearError();
  const token = ++viewToken;
  try {
    const response = await fetch(`forecasts/${id}`);
    if (!response.ok) throw new Error("missing");
    const record = await response.json();
    if (token !== viewToken) return;
    document.getElementById("forecast-name").value = record.name;
    document.getElementById("forecast-reason").value = record.reason || "";
    document.getElementById("focus-category").value = record.focus_category;
    document.getElementById("focus-fuel").value = record.focus_fuel;
    document.getElementById("income").value = record.income;
    document.getElementById("population").value = record.population;
    applyForecast(record.predictions, record.population, record.income, scenarioSentence(record.predictions, record.population, record.income, record.focus_category, record.focus_fuel, `Opened “${record.name}”.`));
    setSaveReady(true);
  } catch (error) {
    if (token !== viewToken) return;
    showError("That saved forecast could not be opened.");
  }
}

async function removeSaved(id, name) {
  clearError();
  try {
    const response = await fetch(`forecasts/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("missing");
    await loadSaved();
    note.textContent = `Deleted “${name}”.`;
  } catch (error) {
    showError("That saved forecast could not be deleted.");
  }
}

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
  const token = ++viewToken;
  const parsed = await loadBaseline();
  if (!parsed || token !== viewToken) return;
  const latest = baselineYear;
  predictions = [...baseline.entries()].map(([key, count]) => {
    const [category, fuel] = key.split("|");
    return [category, fuel, count];
  });
  draw();
  fillTable();
  note.textContent = `This stacked chart shows ${latest} registrations so the page is not empty. Fuel is on the horizontal axis and each colour is a vehicle type. Choose Predict to replace it with the model forecast.`;
  console.group(`Recorded registrations in ${latest}`);
  console.table(predictions.map(([category, fuel, count]) => ({ category, fuel, count: Number(count) })));
  console.groupEnd();
}

loadSaved();
showLatestYear().catch(() => {
  note.textContent = "The chart could not load.";
});
