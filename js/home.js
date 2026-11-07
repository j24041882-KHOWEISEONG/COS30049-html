const PALETTE = ["#C65B3E", "#3F6B5A", "#2F6F8F", "#C48A2A", "#7A4E8A", "#5C6B73", "#8C4A32"];

function unquote(value) {
  const text = String(value ?? "").trim();
  return text.length >= 2 && text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text;
}

function parse(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(unquote);
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map(unquote);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index];
    });
    return {
      year: Number(row.year),
      category: row.category,
      count: Number(row.count) || 0
    };
  });
}

function sum(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

async function drawHome() {
  const response = await fetch("backend_v2/merged_pop_vehicle_income_cleaned.csv");
  if (!response.ok) return;
  const rows = parse(await response.text());
  const latest = Math.max(...rows.map((row) => row.year));
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  const categories = [...new Set(rows.map((row) => row.category))].sort();

  document.getElementById("stat-total").textContent = sum(rows).toLocaleString("en-MY");
  document.getElementById("stat-year-label").textContent = `Registrations in ${latest}`;
  document.getElementById("stat-year").textContent = sum(rows.filter((row) => row.year === latest)).toLocaleString("en-MY");
  document.getElementById("stat-car").textContent = sum(rows.filter((row) => row.category === "car")).toLocaleString("en-MY");
  document.getElementById("stat-motor").textContent = sum(rows.filter((row) => row.category === "motorcycle")).toLocaleString("en-MY");

  const focus = ["car", "motorcycle", "lorry"].filter((name) => categories.includes(name));
  new Chart(document.getElementById("homeTrend"), {
    type: "line",
    data: {
      labels: years,
      datasets: focus.map((category, index) => ({
        label: category,
        data: years.map((year) => sum(rows.filter((row) => row.year === year && row.category === category))),
        borderColor: PALETTE[index],
        backgroundColor: PALETTE[index],
        pointRadius: 3,
        tension: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });

  new Chart(document.getElementById("homeTypes"), {
    type: "bar",
    data: {
      labels: categories,
      datasets: [{
        label: "Registrations",
        data: categories.map((category) => sum(rows.filter((row) => row.category === category))),
        backgroundColor: categories.map((_, index) => PALETTE[index % PALETTE.length]),
        barPercentage: 0.75
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

drawHome();
