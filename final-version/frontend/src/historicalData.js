const API_URL = 'http://localhost:8000';

export function parseHistoricalCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index];
    });
    return row;
  });
}

export function normalizeHistoricalRow(row) {
  return {
    year: Number(row.year || row.date),
    above15: Number(row['above 15']),
    below14: Number(row['below 14']),
    category: row.category,
    fuel: row.fuel,
    state: row.state || 'Malaysia',
    count: Number(row.count) || 0,
    incomeMean: Number(row.income_mean),
    incomeMedian: Number(row.income_median)
  };
}

export async function loadHistoricalRows() {
  const attempts = [
    async () => {
      const response = await fetch(`${API_URL}/historical-data`);
      if (!response.ok) throw new Error('missing');
      const body = await response.json();
      const data = Array.isArray(body) ? body : body.data;
      if (!Array.isArray(data) || !data.length) throw new Error('empty');
      return data;
    },
    async () => {
      const response = await fetch('historical');
      if (!response.ok) throw new Error('missing');
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error('empty');
      return data;
    },
    async () => {
      const response = await fetch('data/historical_dataset.csv');
      if (!response.ok) throw new Error('missing');
      return parseHistoricalCsv(await response.text());
    }
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const rows = await attempt();
      return rows.map(normalizeHistoricalRow).filter((row) => Number.isFinite(row.year));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function sumCount(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

export function uniqueSorted(rows, key) {
  return [...new Set(rows.map((row) => row[key]))].sort((a, b) => (
    typeof a === 'number' ? a - b : String(a).localeCompare(String(b))
  ));
}
