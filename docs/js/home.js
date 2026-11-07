const DATA_URL = "data/merged_pop_vehicle_income_cleaned.csv";

function sum(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

async function drawHome() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    document.getElementById("home-note").textContent = "The cleaned file could not be loaded.";
    return;
  }
  const rows = d3.csvParse(await response.text()).map((row) => ({
    year: Number(row.year),
    category: row.category,
    count: Number(row.count) || 0
  }));
  const latest = d3.max(rows, (row) => row.year);
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const categories = [...new Set(rows.map((row) => row.category))].sort();
  const focus = ["car", "motorcycle", "lorry"].filter((name) => categories.includes(name));

  document.getElementById("stat-total").textContent = sum(rows).toLocaleString("en-MY");
  document.getElementById("stat-year-label").textContent = `Registrations in ${latest}`;
  document.getElementById("stat-year").textContent = sum(rows.filter((row) => row.year === latest)).toLocaleString("en-MY");
  document.getElementById("stat-car").textContent = sum(rows.filter((row) => row.category === "car")).toLocaleString("en-MY");
  document.getElementById("stat-motor").textContent = sum(rows.filter((row) => row.category === "motorcycle")).toLocaleString("en-MY");

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
  document.getElementById("home-note").textContent = "Counts come from the cleaned national file. Filters, population, and income are on Historical. The model chart is on Forecast.";
}

drawHome();
