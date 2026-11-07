const PALETTE = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"];
const SHAPES = ["circle", "rect", "triangle", "rectRot", "star", "cross", "dash", "circle"];
const PAGE_SIZE = 12;

const rows = [];
let categoryChart;
let fuelChart;
let trendChart;
let populationChart;
let incomeChart;
let enlargeChart;
const incomeRows = [];
let tableRows = [];
let tablePage = 0;

const yearSelect = document.getElementById("year");
const incomeSelect = document.getElementById("income");
const categorySelect = document.getElementById("category");
const fuelSelect = document.getElementById("fuel");
const summary = document.getElementById("summary");
const loadError = document.getElementById("load-error");

Chart.defaults.font.family = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = "#1c2430";
Chart.defaults.plugins.legend.position = "bottom";

function unquote(value) {
  const text = String(value ?? "").trim();
  return text.length >= 2 && text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(unquote);
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map(unquote);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index];
    });
    row.count = Number(row.count) || 0;
    row.year = Number(row.year || String(row.date).slice(0, 4));
    row.incomeKey = String(Math.round(Number(row.income_mean)));
    return row;
  });
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

function filtered() {
  return rows.filter((row) => {
    if (yearSelect.value !== "all" && String(row.year) !== yearSelect.value) return false;
    if (incomeSelect.value !== "all" && row.incomeKey !== incomeSelect.value) return false;
    if (categorySelect.value !== "all" && row.category !== categorySelect.value) return false;
    if (fuelSelect.value !== "all" && row.fuel !== fuelSelect.value) return false;
    return true;
  });
}

function sumBy(list, key) {
  const totals = new Map();
  list.forEach((row) => {
    totals.set(row[key], (totals.get(row[key]) || 0) + row.count);
  });
  return [...totals.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function barConfig(labels, data) {
  return {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Registrations",
        data,
        backgroundColor: labels.map((_, index) => PALETTE[index % PALETTE.length]),
        barPercentage: 0.8,
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  };
}

const barValueLabels = {
  id: "barValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      chart.getDatasetMeta(datasetIndex).data.forEach((bar, index) => {
        const value = Number(dataset.data[index]) || 0;
        ctx.save();
        ctx.fillStyle = "#2a2420";
        ctx.font = "12px Segoe UI";
        ctx.textBaseline = "middle";
        if (horizontal) {
          const digits = Number.isInteger(value) ? 0 : 1;
          ctx.textAlign = "left";
          ctx.fillText(value.toLocaleString("en-MY", { maximumFractionDigits: digits }), bar.x + 6, bar.y);
        }
        ctx.restore();
      });
    });
  }
};

function trendConfig(list) {
  const years = [...new Set(list.map((row) => row.year))].sort((a, b) => a - b);
  if (years.length <= 1) {
    const pairs = sumBy(list, "category").sort((a, b) => b[1] - a[1]);
    const yearLabel = years[0] ? String(years[0]) : "Selected year";
    return {
      type: "bar",
      data: {
        labels: pairs.map((item) => item[0]),
        datasets: [{
          label: yearLabel,
          data: pairs.map((item) => item[1]),
          backgroundColor: pairs.map((_, index) => PALETTE[index % PALETTE.length]),
          barPercentage: 0.72
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 72 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: "Registrations" } },
          y: { title: { display: true, text: yearLabel } }
        }
      },
      plugins: [barValueLabels]
    };
  }
  const categories = [...new Set(list.map((row) => row.category))].sort();
  return {
    type: "line",
    data: {
      labels: years,
      datasets: categories.map((category, index) => ({
        label: category,
        data: years.map((year) => list.filter((row) => row.year === year && row.category === category).reduce((sum, row) => sum + row.count, 0)),
        borderColor: PALETTE[index % PALETTE.length],
        backgroundColor: PALETTE[index % PALETTE.length],
        pointStyle: SHAPES[index % SHAPES.length],
        pointRadius: 4,
        tension: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Registrations" } },
        x: { title: { display: true, text: "Year" } }
      }
    }
  };
}

function yearFacts(list) {
  const byYear = new Map();
  list.forEach((row) => {
    if (!byYear.has(row.year)) byYear.set(row.year, row);
  });
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]);
}

function lineConfig(labels, datasets, xTitle, yTitle) {
  return {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: xTitle } },
        y: { beginAtZero: true, title: { display: true, text: yTitle } }
      }
    }
  };
}

function pairBarConfig(labels, values, colors, valueTitle, groupTitle) {
  return {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: groupTitle,
        data: values,
        backgroundColor: colors,
        barPercentage: 0.72
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 96 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: valueTitle } },
        y: { title: { display: true, text: groupTitle } }
      }
    },
    plugins: [barValueLabels]
  };
}

function selectedIncome() {
  const selected = yearSelect.value;
  return incomeRows.filter((row) => selected === "all" || String(row.year) === selected);
}

function populationConfig(list) {
  const facts = yearFacts(list);
  if (facts.length <= 1) {
    const row = facts[0] ? facts[0][1] : {};
    const yearLabel = facts[0] ? String(facts[0][0]) : "Selected year";
    return pairBarConfig(
      ["Above 15", "Below 14"],
      [Number(row["above 15"]) || 0, Number(row["below 14"]) || 0],
      ["#0072B2", "#D55E00"],
      "People (thousands)",
      yearLabel
    );
  }
  return lineConfig(facts.map((item) => item[0]), [
    { label: "Above 15", data: facts.map((item) => Number(item[1]["above 15"])), borderColor: "#0072B2", backgroundColor: "#0072B2", pointStyle: "circle", pointRadius: 4, tension: 0 },
    { label: "Below 14", data: facts.map((item) => Number(item[1]["below 14"])), borderColor: "#D55E00", backgroundColor: "#D55E00", pointStyle: "triangle", pointRadius: 4, tension: 0 }
  ], "Year", "People (thousands)");
}

function incomeConfig() {
  const series = selectedIncome();
  if (series.length <= 1) {
    const row = series[0] || {};
    const yearLabel = row.year ? String(row.year) : "Selected year";
    return pairBarConfig(
      ["Mean income", "Median income"],
      [Number(row.mean) || 0, Number(row.median) || 0],
      ["#009E73", "#E69F00"],
      "Ringgit (RM)",
      yearLabel
    );
  }
  return lineConfig(series.map((row) => row.year), [
    { label: "Mean income", data: series.map((row) => row.mean), borderColor: "#009E73", backgroundColor: "#009E73", pointStyle: "circle", pointRadius: 4, tension: 0 },
    { label: "Median income", data: series.map((row) => row.median), borderColor: "#E69F00", backgroundColor: "#E69F00", pointStyle: "triangle", pointRadius: 4, tension: 0 }
  ], "Year", "Ringgit (RM)");
}

function setYearMode(title, wrap, single, singleText, multiText) {
  title.textContent = single ? singleText : multiText;
  wrap.classList.toggle("short", !single);
  wrap.classList.toggle("single-year", single);
}

function draw() {
  const list = filtered();
  const total = list.reduce((sum, row) => sum + row.count, 0);
  summary.textContent = `${total.toLocaleString("en-MY")} registrations match the current filters. Population and income use every numeric column in the spreadsheets.`;
  const categories = sumBy(list, "category").sort((a, b) => b[1] - a[1]);
  const fuels = sumBy(list, "fuel");
  const years = [...new Set(list.map((row) => row.year))];
  const trendTitle = document.getElementById("trend-title");
  const trendWrap = document.getElementById("trend-wrap");
  const populationFacts = yearFacts(list);
  const incomeSeries = selectedIncome();
  setYearMode(
    trendTitle,
    trendWrap,
    years.length === 1,
    `Registrations in ${years[0]}`,
    "Registrations over time"
  );
  setYearMode(
    document.getElementById("population-title"),
    document.getElementById("population-wrap"),
    populationFacts.length === 1,
    `Population in ${populationFacts[0] ? populationFacts[0][0] : ""}`,
    "Population by age group"
  );
  setYearMode(
    document.getElementById("income-title"),
    document.getElementById("income-wrap"),
    incomeSeries.length === 1,
    `Household income in ${incomeSeries[0] ? incomeSeries[0].year : ""}`,
    "Household income"
  );
  categoryChart.data = barConfig(categories.map((item) => item[0]), categories.map((item) => item[1])).data;
  fuelChart.data = barConfig(fuels.map((item) => item[0]), fuels.map((item) => item[1])).data;
  if (trendChart) trendChart.destroy();
  if (populationChart) populationChart.destroy();
  if (incomeChart) incomeChart.destroy();
  trendChart = new Chart(document.getElementById("trendChart"), trendConfig(list));
  populationChart = new Chart(document.getElementById("populationChart"), populationConfig(list));
  incomeChart = new Chart(document.getElementById("incomeChart"), incomeConfig());
  categoryChart.update();
  fuelChart.update();
}

function renderTable() {
  const start = tablePage * PAGE_SIZE;
  const body = document.getElementById("table-body");
  body.innerHTML = "";
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
    tableRows = yearFacts(list).map(([year, row]) => [year, Number(row["above 15"]).toLocaleString("en-MY"), Number(row["below 14"]).toLocaleString("en-MY")]);
  } else if (kind === "incomeSeries") {
    document.getElementById("table-title").textContent = "Household income";
    head.innerHTML = "<tr><th>Year</th><th>Mean</th><th>Median</th></tr>";
    const selected = yearSelect.value;
    tableRows = incomeRows
      .filter((row) => selected === "all" || String(row.year) === selected)
      .map((row) => [row.year, row.mean.toLocaleString("en-MY"), row.median.toLocaleString("en-MY")]);
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

function copyChartData(source) {
  return {
    labels: [...(source.data.labels || [])],
    datasets: source.data.datasets.map((dataset) => ({
      label: dataset.label,
      data: [...dataset.data],
      backgroundColor: dataset.backgroundColor,
      borderColor: dataset.borderColor,
      pointStyle: dataset.pointStyle,
      pointRadius: dataset.pointRadius,
      tension: dataset.tension,
      barPercentage: dataset.barPercentage,
      categoryPercentage: dataset.categoryPercentage
    }))
  };
}

function enlarge(kind) {
  const source = { category: categoryChart, fuel: fuelChart, trend: trendChart, population: populationChart, incomeSeries: incomeChart }[kind];
  const titles = {
    category: "By vehicle type",
    fuel: "By fuel",
    trend: document.getElementById("trend-title").textContent,
    population: document.getElementById("population-title").textContent,
    incomeSeries: document.getElementById("income-title").textContent
  };
  const dialog = document.getElementById("enlarge");
  if (!source) return;
  document.getElementById("enlarge-title").textContent = titles[kind] || "Chart";
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => {
    if (enlargeChart) enlargeChart.destroy();
    const horizontal = source.options.indexAxis === "y";
    enlargeChart = new Chart(document.getElementById("enlargeChart"), {
      type: source.config.type,
      data: copyChartData(source),
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        layout: horizontal ? { padding: { right: 96 } } : undefined,
        plugins: { legend: { display: source.config.type === "line" || source.data.datasets.length > 1 } },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: source.options.scales?.x?.title?.text || (horizontal ? "Registrations" : "") } },
          y: { beginAtZero: !horizontal, title: { display: true, text: source.options.scales?.y?.title?.text || (horizontal ? "" : "Value") } }
        }
      },
      plugins: horizontal ? [barValueLabels] : []
    });
    enlargeChart.resize();
  });
}

async function init() {
  try {
    const response = await fetch("backend_v2/merged_pop_vehicle_income_cleaned.csv");
    if (!response.ok) throw new Error("Could not load the historical dataset.");
    rows.push(...parseCsv(await response.text()));
    const seenYears = new Set();
    rows.forEach((row) => {
      if (seenYears.has(row.year)) return;
      seenYears.add(row.year);
      incomeRows.push({ year: row.year, mean: Number(row.income_mean), median: Number(row.income_median) });
    });
    incomeRows.sort((a, b) => a.year - b.year);
  } catch (error) {
    loadError.textContent = "The historical file could not be loaded. Open http://localhost:3000/historical.html";
    loadError.classList.add("show");
    return;
  }

  fillSelect(yearSelect, unique("year"));
  fillSelect(incomeSelect, unique("incomeKey"), (value) => `RM ${Number(value).toLocaleString("en-MY")}`);
  fillSelect(categorySelect, unique("category"));
  fillSelect(fuelSelect, unique("fuel"));

  categoryChart = new Chart(document.getElementById("categoryChart"), barConfig([], []));
  fuelChart = new Chart(document.getElementById("fuelChart"), barConfig([], []));
  trendChart = new Chart(document.getElementById("trendChart"), trendConfig([]));
  populationChart = new Chart(document.getElementById("populationChart"), populationConfig([]));
  incomeChart = new Chart(document.getElementById("incomeChart"), incomeConfig());
  draw();

  [yearSelect, incomeSelect, categorySelect, fuelSelect].forEach((select) => {
    select.addEventListener("change", draw);
  });
  document.getElementById("reset").addEventListener("click", () => {
    [yearSelect, incomeSelect, categorySelect, fuelSelect].forEach((select) => {
      select.value = "all";
    });
    draw();
  });
  document.querySelectorAll("[data-table]").forEach((button) => {
    button.addEventListener("click", () => showTable(button.dataset.table));
  });
  document.querySelectorAll("[data-enlarge]").forEach((button) => {
    button.addEventListener("click", () => enlarge(button.dataset.enlarge));
  });
  document.getElementById("close-table").addEventListener("click", () => document.getElementById("table-dialog").close());
  document.getElementById("close-enlarge").addEventListener("click", () => document.getElementById("enlarge").close());
  document.getElementById("prev-page").addEventListener("click", () => {
    tablePage = Math.max(0, tablePage - 1);
    renderTable();
  });
  document.getElementById("next-page").addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
    tablePage = Math.min(pages - 1, tablePage + 1);
    renderTable();
  });
}

init();
