// (3) HISTORICAL START
const DATA_URL = "data/merged_pop_vehicle_income_cleaned.csv";
const PAGE_SIZE = 12;
const rows = [];
const incomeRows = [];
const specs = {};
let tableRows = [];
let tablePage = 0;

const yearSelect = document.getElementById("year");
const incomeSelect = document.getElementById("income");
const categorySelect = document.getElementById("category");
const fuelSelect = document.getElementById("fuel");

function sumBy(list, key) {
  const totals = new Map();
  list.forEach((row) => totals.set(row[key], (totals.get(row[key]) || 0) + row.count));
  return [...totals.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function yearFacts(list) {
  const byYear = new Map();
  list.forEach((row) => {
    if (!byYear.has(row.year)) byYear.set(row.year, row);
  });
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]);
}

function filtered() {
  return rows.filter((row) => {
    if (yearSelect.value !== "all" && String(row.year) !== yearSelect.value) return false;
    if (incomeSelect.value !== "all" && row.incomeKey !== incomeSelect.value) return false;
    if (categorySelect.value !== "all" && row.category !== categorySelect.value) return false;
    if (fuelSelect.value !== "all" && row.fuel !== fuelSelect.value) return false;
    return true;
  });
}

function selectedIncome() {
  return incomeRows.filter((row) => yearSelect.value === "all" || String(row.year) === yearSelect.value);
}

function fillSelect(select, values, label) {
  select.innerHTML = `<option value="all">All</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label ? label(value) : value;
    select.appendChild(option);
  });
}

function unique(key) {
  return [...new Set(rows.map((row) => String(row[key])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function barSpec(labels, values, label, yTitle) {
  return {
    type: "bar",
    label,
    labels,
    yTitle,
    series: [{
      name: "Registrations",
      values,
      colors: labels.map((_, index) => PALETTE[index % PALETTE.length])
    }]
  };
}

function horizontalSpec(labels, values, colors, label, xTitle, yTitle) {
  return {
    type: "bar",
    horizontal: true,
    label,
    labels,
    xTitle,
    yTitle,
    compact: false,
    series: [{ name: yTitle, values, colors }]
  };
}

function lineSpec(labels, series, label, xTitle, yTitle, compact) {
  return { type: "line", label, labels, series, xTitle, yTitle, compact };
}

function draw() {
  const list = filtered();
  const total = list.reduce((sum, row) => sum + row.count, 0);
  const categories = sumBy(list, "category").sort((a, b) => b[1] - a[1]);
  const fuels = sumBy(list, "fuel").sort((a, b) => b[1] - a[1]);
  const yearSpan = [...new Set(list.map((row) => row.year))].sort((a, b) => a - b);
  document.getElementById("summary-total").textContent = total.toLocaleString("en-MY");
  document.getElementById("summary-type").textContent = categories[0] ? categories[0][0] : "—";
  document.getElementById("summary-fuel").textContent = fuels[0] ? fuels[0][0] : "—";
  document.getElementById("summary-years").textContent = yearSpan.length ? (yearSpan.length === 1 ? String(yearSpan[0]) : `${yearSpan[0]}–${yearSpan[yearSpan.length - 1]}`) : "—";
  document.getElementById("summary").textContent = "Population and income use the age and income columns from the same cleaned file.";
  const years = [...new Set(list.map((row) => row.year))].sort((a, b) => a - b);
  const facts = yearFacts(list);
  const income = selectedIncome();
  const oneYear = years.length <= 1;

  document.getElementById("trend-title").textContent = oneYear && years[0] ? `Registrations in ${years[0]}` : "Registrations over time";
  document.getElementById("population-title").textContent = facts.length === 1 ? `Population in ${facts[0][0]}` : "Population by age group";
  document.getElementById("income-title").textContent = income.length === 1 ? `Household income in ${income[0].year}` : "Household income";
  document.getElementById("trend-chart").classList.toggle("tall", oneYear);
  document.getElementById("population-chart").classList.toggle("tall", facts.length <= 1);
  document.getElementById("income-chart").classList.toggle("tall", income.length <= 1);

  specs.category = horizontalSpec(
    categories.map((item) => item[0]),
    categories.map((item) => item[1]),
    categories.map((_, index) => PALETTE[index % PALETTE.length]),
    "By vehicle type",
    "Registrations",
    "Vehicle type"
  );
  specs.fuel = horizontalSpec(
    fuels.map((item) => item[0]),
    fuels.map((item) => item[1]),
    fuels.map((_, index) => PALETTE[index % PALETTE.length]),
    "By fuel",
    "Registrations",
    "Fuel"
  );

  if (oneYear) {
    const pairs = sumBy(list, "category").sort((a, b) => b[1] - a[1]);
    const yearLabel = years[0] ? String(years[0]) : "Selected year";
    specs.trend = horizontalSpec(pairs.map((item) => item[0]), pairs.map((item) => item[1]), pairs.map((_, index) => PALETTE[index % PALETTE.length]), document.getElementById("trend-title").textContent, "Registrations", yearLabel);
  } else {
    const names = [...new Set(list.map((row) => row.category))].sort();
    specs.trend = lineSpec(years, names.map((category, index) => ({
      name: category,
      color: PALETTE[index % PALETTE.length],
      values: years.map((year) => list.filter((row) => row.year === year && row.category === category).reduce((sum, row) => sum + row.count, 0))
    })), "Registrations over time", "Year", "Registrations", true);
  }

  if (facts.length <= 1) {
    const row = facts[0] ? facts[0][1] : {};
    const yearLabel = facts[0] ? String(facts[0][0]) : "Selected year";
    specs.population = horizontalSpec(["Above 15", "Below 14"], [row.above15 || 0, row.below14 || 0], ["#0072B2", "#D55E00"], document.getElementById("population-title").textContent, "People (thousands)", yearLabel);
  } else {
    specs.population = lineSpec(facts.map((item) => item[0]), [
      { name: "Above 15", color: "#0072B2", values: facts.map((item) => item[1].above15) },
      { name: "Below 14", color: "#D55E00", values: facts.map((item) => item[1].below14) }
    ], "Population by age group", "Year", "People (thousands)", false);
  }

  if (income.length <= 1) {
    const row = income[0] || {};
    const yearLabel = row.year ? String(row.year) : "Selected year";
    specs.incomeSeries = horizontalSpec(["Mean income", "Median income"], [row.mean || 0, row.median || 0], ["#009E73", "#E69F00"], document.getElementById("income-title").textContent, "Ringgit (RM)", yearLabel);
  } else {
    specs.incomeSeries = lineSpec(income.map((row) => row.year), [
      { name: "Mean income", color: "#009E73", values: income.map((row) => row.mean) },
      { name: "Median income", color: "#E69F00", values: income.map((row) => row.median) }
    ], "Household income", "Year", "Ringgit (RM)", false);
  }

  drawChart("#category-chart", specs.category);
  drawChart("#fuel-chart", specs.fuel);
  drawChart("#trend-chart", specs.trend);
  drawChart("#population-chart", specs.population);
  drawChart("#income-chart", specs.incomeSeries);
}

function renderTable() {
  const body = document.getElementById("table-body");
  body.innerHTML = "";
  const start = tablePage * PAGE_SIZE;
  tableRows.slice(start, start + PAGE_SIZE).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = row.map((cell) => `<td>${cell}</td>`).join("");
    body.appendChild(tr);
  });
  const pages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  document.getElementById("page-label").textContent = `Page ${Math.min(tablePage + 1, pages)} of ${pages}`;
}

function showTable(kind) {
  const list = filtered();
  tablePage = 0;
  const head = document.getElementById("table-head");
  if (kind === "category") {
    document.getElementById("table-title").textContent = "By vehicle type";
    head.innerHTML = "<tr><th>Vehicle type</th><th>Registrations</th></tr>";
    tableRows = sumBy(list, "category").map(([name, count]) => [name, count.toLocaleString("en-MY")]);
  } else if (kind === "fuel") {
    document.getElementById("table-title").textContent = "By fuel";
    head.innerHTML = "<tr><th>Fuel</th><th>Registrations</th></tr>";
    tableRows = sumBy(list, "fuel").map(([name, count]) => [name, count.toLocaleString("en-MY")]);
  } else if (kind === "population") {
    document.getElementById("table-title").textContent = "Population by age group";
    head.innerHTML = "<tr><th>Year</th><th>Above 15</th><th>Below 14</th></tr>";
    tableRows = yearFacts(list).map(([year, row]) => [year, row.above15.toLocaleString("en-MY"), row.below14.toLocaleString("en-MY")]);
  } else if (kind === "incomeSeries") {
    document.getElementById("table-title").textContent = "Household income";
    head.innerHTML = "<tr><th>Year</th><th>Mean</th><th>Median</th></tr>";
    tableRows = selectedIncome().map((row) => [row.year, row.mean.toLocaleString("en-MY"), row.median.toLocaleString("en-MY")]);
  } else {
    document.getElementById("table-title").textContent = "Registrations over time";
    head.innerHTML = "<tr><th>Year</th><th>Vehicle type</th><th>Registrations</th></tr>";
    const years = [...new Set(list.map((row) => row.year))].sort((a, b) => a - b);
    const categories = [...new Set(list.map((row) => row.category))].sort();
    tableRows = [];
    years.forEach((year) => {
      categories.forEach((category) => {
        const count = list.filter((row) => row.year === year && row.category === category).reduce((sum, row) => sum + row.count, 0);
        tableRows.push([year, category, count.toLocaleString("en-MY")]);
      });
    });
  }
  renderTable();
  document.getElementById("table-dialog").showModal();
}

function enlarge(kind) {
  const spec = specs[kind];
  const dialog = document.getElementById("enlarge");
  if (!spec) return;
  const titles = {
    category: "By vehicle type",
    fuel: "By fuel",
    trend: document.getElementById("trend-title").textContent,
    population: document.getElementById("population-title").textContent,
    incomeSeries: document.getElementById("income-title").textContent
  };
  document.getElementById("enlarge-title").textContent = titles[kind] || "Chart";
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => drawChart("#enlarge-chart", spec));
}

async function loadCleanedRows() {
  try {
    const response = await fetch("historical");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) return { rows: data, source: "GET /historical" };
    }
  } catch (error) {
    // The public page has no Python server, so the cleaned file is used instead.
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("missing");
  return { rows: d3.csvParse(await response.text()), source: DATA_URL };
}

async function init() {
  try {
    const loaded = await loadCleanedRows();
    const seen = new Set();
    loaded.rows.forEach((row) => {
      const year = Number(row.year);
      rows.push({
        year,
        above15: Number(row["above 15"]),
        below14: Number(row["below 14"]),
        category: row.category,
        fuel: row.fuel,
        count: Number(row.count) || 0,
        incomeKey: String(Math.round(Number(row.income_mean)))
      });
      if (seen.has(year)) return;
      seen.add(year);
      incomeRows.push({ year, mean: Number(row.income_mean), median: Number(row.income_median) });
    });
    incomeRows.sort((a, b) => a.year - b.year);
    console.group("Historical cleaned data");
    console.log("Source:", loaded.source);
    console.log("Registration rows:", rows.length);
    console.table(rows);
    console.log("Income by year");
    console.table(incomeRows);
    console.groupEnd();
  } catch (error) {
    const loadError = document.getElementById("load-error");
    loadError.textContent = "The cleaned file could not be loaded.";
    loadError.classList.add("show");
    return;
  }

  fillSelect(yearSelect, unique("year"));
  fillSelect(incomeSelect, unique("incomeKey"), (value) => `RM ${Number(value).toLocaleString("en-MY")}`);
  fillSelect(categorySelect, unique("category"));
  fillSelect(fuelSelect, unique("fuel"));
  draw();
  [yearSelect, incomeSelect, categorySelect, fuelSelect].forEach((select) => select.addEventListener("change", draw));
  document.getElementById("reset").addEventListener("click", () => {
    [yearSelect, incomeSelect, categorySelect, fuelSelect].forEach((select) => { select.value = "all"; });
    draw();
  });
  document.querySelectorAll("[data-table]").forEach((button) => button.addEventListener("click", () => showTable(button.dataset.table)));
  document.querySelectorAll("[data-enlarge]").forEach((button) => button.addEventListener("click", () => enlarge(button.dataset.enlarge)));
  document.getElementById("close-table").addEventListener("click", () => document.getElementById("table-dialog").close());
  document.getElementById("close-enlarge").addEventListener("click", () => document.getElementById("enlarge").close());
  document.getElementById("prev-page").addEventListener("click", () => { tablePage = Math.max(0, tablePage - 1); renderTable(); });
  document.getElementById("next-page").addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
    tablePage = Math.min(pages - 1, tablePage + 1);
    renderTable();
  });
}

init();
// (3) HISTORICAL END
