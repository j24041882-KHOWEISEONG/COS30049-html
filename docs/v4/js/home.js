// (2) HOMEPAGE START
const DATA_URL = "data/historical_dataset.csv";

function sum(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

async function loadCleanedRows() {
  try {
    const response = await fetch("historical");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (error) {
    // The public page has no Python server, so the cleaned file is used instead.
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("missing");
  return d3.csvParse(await response.text());
}

async function drawHome() {
  let records;
  try {
    records = await loadCleanedRows();
  } catch (error) {
    document.getElementById("home-note").textContent = "The historical file could not be loaded.";
    return;
  }
  const rows = records.map((row) => ({
    year: Number(row.year || row.date),
    above15: Number(row["above 15"]),
    below14: Number(row["below 14"]),
    category: row.category,
    fuel: row.fuel,
    count: Number(row.count) || 0,
    income_mean: Number(row.income_mean),
    income_median: Number(row.income_median)
  }));
  const latest = d3.max(rows, (row) => row.year);
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const categories = [...new Set(rows.map((row) => row.category))].sort();
  const focus = ["car", "motorcycle", "lorry"].filter((name) => categories.includes(name));
  const total = sum(rows);
  const latestTotal = sum(rows.filter((row) => row.year === latest));
  const carTotal = sum(rows.filter((row) => row.category === "car"));
  const motorTotal = sum(rows.filter((row) => row.category === "motorcycle"));
  const lorryTotal = sum(rows.filter((row) => row.category === "lorry"));

  document.getElementById("stat-total").textContent = total.toLocaleString("en-MY");
  document.getElementById("stat-year-label").textContent = `Registrations in ${latest}`;
  document.getElementById("stat-year").textContent = latestTotal.toLocaleString("en-MY");
  document.getElementById("stat-car").textContent = carTotal.toLocaleString("en-MY");
  document.getElementById("stat-motor").textContent = motorTotal.toLocaleString("en-MY");
  document.getElementById("picture-car").textContent = carTotal.toLocaleString("en-MY");
  document.getElementById("picture-motor").textContent = motorTotal.toLocaleString("en-MY");
  document.getElementById("picture-lorry").textContent = lorryTotal.toLocaleString("en-MY");

  const byCategory = categories.map((category) => ({
    category,
    registrations: sum(rows.filter((row) => row.category === category))
  })).sort((a, b) => b.registrations - a.registrations);
  const byYear = years.map((year) => ({
    year,
    registrations: sum(rows.filter((row) => row.year === year))
  }));
  console.group("Cleaned registration data");
  console.log("Source: data/historical_dataset.csv");
  console.log("Rows:", rows.length, "Years:", `${years[0]}–${years[years.length - 1]}`);
  console.log("All registrations:", total);
  console.log(`Registrations in ${latest}:`, latestTotal);
  console.log("By vehicle type");
  console.table(byCategory);
  console.log("By year");
  console.table(byYear);
  console.log("Every row");
  console.table(rows);
  console.groupEnd();

  drawChart("#home-trend", {
    type: "line",
    label: "Registrations over time for car, motorcycle, and lorry",
    labels: years,
    xTitle: "Year",
    yTitle: "Registrations",
    series: focus.map((category, index) => ({
      name: category,
      color: PALETTE[index],
      values: years.map((year) => sum(rows.filter((row) => row.year === year && row.category === category)))
    }))
  });

  const totals = categories.map((category) => [category, sum(rows.filter((row) => row.category === category))]).sort((a, b) => b[1] - a[1]);
  drawChart("#home-types", {
    type: "bar",
    label: "Registrations by vehicle type",
    labels: totals.map((item) => item[0]),
    yTitle: "Registrations",
    series: [{
      name: "Registrations",
      values: totals.map((item) => item[1]),
      colors: totals.map((_, index) => PALETTE[index % PALETTE.length])
    }]
  });
  document.getElementById("home-note").textContent = "Counts on this page add every state row in the historical file.";
}

drawHome();
// (2) HOMEPAGE END
