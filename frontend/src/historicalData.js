const API_URL = 'http://localhost:8000';

export function normalizeHistoricalRow(row) {
  return {
    year: Number(row.date ?? row.year),
    category: String(row.category || ''),
    count: Number(row.count) || 0
  };
}

export async function loadHistoricalRows() {
  const response = await fetch(`${API_URL}/historical-data`);
  if (!response.ok) {
    throw new Error('Failed to fetch historical data from backend');
  }

  const body = await response.json();
  const data = Array.isArray(body) ? body : body.data;

  if (!Array.isArray(data) || !data.length) {
    throw new Error('Empty dataset returned from backend');
  }

  return data
    .map(normalizeHistoricalRow)
    .filter((row) => Number.isFinite(row.year));
}

export function sumCount(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

export function uniqueSorted(rows, key) {
  return [...new Set(rows.map((row) => row[key]))].sort((a, b) => (
    typeof a === 'number' ? a - b : String(a).localeCompare(String(b))
  ));
}