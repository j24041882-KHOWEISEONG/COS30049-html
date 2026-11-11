import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography
} from '@mui/material';
import { loadHistoricalRows, sumCount, uniqueSorted } from './historicalData';
import { BarChart, LineChart } from './d3charts';

const filters = [
  ['year', 'Year'],
  ['state', 'State'],
  ['incomeMean', 'Average income'],
  ['category', 'Vehicle type'],
  ['fuel', 'Fuel']
];

export default function HistoricalDashboard({ focus }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState({ year: 'all', state: 'all', incomeMean: 'all', category: 'all', fuel: 'all' });
  const [table, setTable] = useState(null);
  const [enlarged, setEnlarged] = useState(null);

  useEffect(() => {
    loadHistoricalRows()
      .then(setRows)
      .catch(() => setError('The historical file could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!focus) return;
    setChoice({
      year: focus.year ? String(focus.year) : 'all',
      state: 'all',
      incomeMean: 'all',
      category: focus.category ? String(focus.category) : 'all',
      fuel: 'all'
    });
  }, [focus]);

  const options = {
    year: uniqueSorted(rows, 'year'),
    state: uniqueSorted(rows, 'state'),
    incomeMean: uniqueSorted(rows, 'incomeMean'),
    category: uniqueSorted(rows, 'category'),
    fuel: uniqueSorted(rows, 'fuel')
  };

  const filtered = useMemo(() => rows.filter((row) => (
    filters.every(([key]) => choice[key] === 'all' || String(row[key]) === String(choice[key]))
  )), [rows, choice]);

  const years = uniqueSorted(filtered, 'year');
  const categories = uniqueSorted(filtered, 'category');
  const fuels = uniqueSorted(filtered, 'fuel')
    .map((fuel) => [String(fuel).replaceAll('_', ' '), sumCount(filtered.filter((row) => row.fuel === fuel))])
    .sort((a, b) => b[1] - a[1]);
  const types = categories
    .map((category) => [category, sumCount(filtered.filter((row) => row.category === category))])
    .sort((a, b) => b[1] - a[1]);
  const trend = types.map(([name]) => ({
    name,
    points: years.map((year) => ({
      x: String(year),
      y: sumCount(filtered.filter((row) => row.year === year && row.category === name))
    }))
  }));
  const facts = years.map((year) => {
    const matches = filtered.filter((row) => row.year === year);
    const seen = new Set();
    const sample = matches.find((row) => {
      const key = row.state;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return sample ? { year, above15: sample.above15, below14: sample.below14, incomeMean: sample.incomeMean, incomeMedian: sample.incomeMedian } : null;
  }).filter(Boolean);

  const charts = {
    type: <BarChart labels={types.map((item) => item[0])} values={types.map((item) => item[1])} height={320} />,
    trend: <LineChart series={trend} height={300} />,
    fuel: <BarChart labels={fuels.map((item) => item[0])} values={fuels.map((item) => item[1])} height={300} />,
    population: <LineChart series={[
      { name: 'Above 15', points: facts.map((row) => ({ x: String(row.year), y: row.above15 })) },
      { name: 'Below 14', color: '#56B4E9', points: facts.map((row) => ({ x: String(row.year), y: row.below14 })) }
    ]} height={260} />,
    income: <LineChart series={[
      { name: 'Mean', points: facts.map((row) => ({ x: String(row.year), y: row.incomeMean })) },
      { name: 'Median', color: '#009E73', points: facts.map((row) => ({ x: String(row.year), y: row.incomeMedian })) }
    ]} height={260} />
  };

  const total = sumCount(filtered);
  const ready = rows.length > 0;
  const typeShare = ready && types[0] && total ? Math.round((types[0][1] / total) * 100) : 0;
  const fuelShare = ready && fuels[0] && total ? Math.round((fuels[0][1] / total) * 100) : 0;
  const allYears = uniqueSorted(rows, 'year');
  const yearShare = ready && allYears.length ? Math.round((years.length / allYears.length) * 100) : 0;
  const filterNote = filters
    .filter(([key]) => choice[key] !== 'all')
    .map(([key, label]) => `${label} ${key === 'incomeMean' ? `RM ${Number(choice[key]).toLocaleString('en-MY')}` : choice[key]}`)
    .join(' · ') || 'All years, states, and fuels';
  const summary = [
    {
      label: 'Matching registrations',
      value: ready ? total.toLocaleString('en-MY') : '—',
      note: filterNote,
      share: ready ? 100 : 0,
      lead: true
    },
    {
      label: 'Largest type',
      value: ready && types[0] ? types[0][0] : '—',
      note: ready && types[0] ? `${types[0][1].toLocaleString('en-MY')} · ${typeShare}%` : 'No rows in this filter',
      share: typeShare
    },
    {
      label: 'Largest fuel',
      value: ready && fuels[0] ? fuels[0][0] : '—',
      note: ready && fuels[0] ? `${fuels[0][1].toLocaleString('en-MY')} · ${fuelShare}%` : 'No rows in this filter',
      share: fuelShare
    },
    {
      label: 'Years in view',
      value: ready && years.length ? `${years[0]}${years.length > 1 ? `–${years[years.length - 1]}` : ''}` : '—',
      note: ready ? `${years.length} of ${allYears.length} years` : 'Waiting for the file',
      share: yearShare,
      wide: true
    }
  ];

  const tables = {
    type: ['Vehicle type', 'Registrations', types.map(([name, count]) => [name, count.toLocaleString('en-MY')])],
    fuel: ['Fuel', 'Registrations', fuels.map(([name, count]) => [name, count.toLocaleString('en-MY')])],
    trend: ['Year', 'Vehicle type', years.flatMap((year) => categories.map((category) => [
      year, category, sumCount(filtered.filter((row) => row.year === year && row.category === category)).toLocaleString('en-MY')
    ]))],
    population: ['Year', 'Above 15 / Below 14', facts.map((row) => [row.year, `${row.above15.toLocaleString('en-MY')} / ${row.below14.toLocaleString('en-MY')}`])],
    income: ['Year', 'Mean / Median', facts.map((row) => [row.year, `${row.incomeMean.toLocaleString('en-MY')} / ${row.incomeMedian.toLocaleString('en-MY')}`])]
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="overline" color="primary">Historical data</Typography>
        <Typography variant="h5" fontWeight="bold">How registrations changed</Typography>
        <Typography color="text.secondary">
          The page asks the server for the historical file, then uses the saved file if the server is off. Filter by year, state, income, vehicle type, or fuel. Axes start at zero.
        </Typography>
      </Box>
      <Paper elevation={0} sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr) auto' }, gap: 1.2, alignItems: 'end', bgcolor: '#fff', border: '1px solid #e6dfd2', borderRadius: 2 }}>
        {filters.map(([key, label]) => (
          <TextField
            key={key}
            select
            size="small"
            label={label}
            value={choice[key]}
            onChange={(event) => setChoice((current) => ({ ...current, [key]: event.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            {options[key].map((value) => (
              <MenuItem key={value} value={String(value)}>
                {key === 'incomeMean' ? `RM ${Number(value).toLocaleString('en-MY')}` : value}
              </MenuItem>
            ))}
          </TextField>
        ))}
        <Button variant="outlined" onClick={() => setChoice({ year: 'all', state: 'all', incomeMean: 'all', category: 'all', fuel: 'all' })}>Reset view</Button>
      </Paper>
      <SummaryBand items={summary} />
      {error && <Typography color="error">{error}</Typography>}
      {rows.length > 0 && (
        <>
          <ChartCard title="By vehicle type" caption="The longest bar is the largest group." onTable={() => setTable('type')} onEnlarge={() => setEnlarged('type')}>
            {charts.type}
          </ChartCard>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <ChartCard title="Registrations over time" caption="One line for every vehicle type in the current filter." onTable={() => setTable('trend')} onEnlarge={() => setEnlarged('trend')}>{charts.trend}</ChartCard>
            <ChartCard title="By fuel" caption="The original fuel names, including hybrid petrol and natural gas." onTable={() => setTable('fuel')} onEnlarge={() => setEnlarged('fuel')}>{charts.fuel}</ChartCard>
            <ChartCard title="Population by age group" onTable={() => setTable('population')} onEnlarge={() => setEnlarged('population')}>{charts.population}</ChartCard>
            <ChartCard title="Household income" onTable={() => setTable('income')} onEnlarge={() => setEnlarged('income')}>{charts.income}</ChartCard>
          </Box>
        </>
      )}
      <Typography variant="body2" color="text.secondary">Each row is one state and one fuel. Choosing All states adds those rows together for Malaysia.</Typography>
      <Dialog open={Boolean(table)} onClose={() => setTable(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{table ? tables[table][0] : ''}</DialogTitle>
        <DialogContent>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { textAlign: 'left', p: 1, borderBottom: '1px solid #e6dfd2' } }}>
            <thead><tr><th>{table ? tables[table][0] : ''}</th><th>{table ? tables[table][1] : ''}</th></tr></thead>
            <tbody>
              {(table ? tables[table][2] : []).slice(0, 40).map((row) => (
                <tr key={row.join('-')}><td>{row[0]}</td><td>{row[1]}</td>{row[2] ? <td>{row[2]}</td> : null}</tr>
              ))}
            </tbody>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(enlarged)} onClose={() => setEnlarged(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Larger chart</DialogTitle>
        <DialogContent>{enlarged ? charts[enlarged] : null}</DialogContent>
      </Dialog>
    </Stack>
  );
}

function SummaryBand({ items }) {
  return (
    <Paper elevation={0} sx={{ overflow: 'hidden', bgcolor: '#fff', border: '1px solid #e6dfd2', borderRadius: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.45fr 1fr 1fr 1fr' } }}>
        {items.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              p: { xs: 2, md: 2.5 },
              minWidth: 0,
              bgcolor: item.lead ? '#fffcf6' : '#fff',
              gridColumn: { sm: item.lead || item.wide ? '1 / -1' : 'auto', md: 'auto' },
              borderTop: { xs: index ? '1px solid #e6dfd2' : 'none', md: 'none' },
              borderLeft: {
                xs: 'none',
                sm: item.lead || item.wide || index % 2 !== 0 ? 'none' : '1px solid #e6dfd2',
                md: index ? '1px solid #e6dfd2' : 'none'
              }
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a5a08' }}>{item.label}</Typography>
            <Typography sx={{ mt: 0.75, minHeight: { md: item.lead ? 58 : 46 }, fontFamily: 'Fraunces, Georgia, serif', fontSize: item.lead ? { xs: '2rem', md: '2.35rem' } : { xs: '1.45rem', md: '1.7rem' }, fontWeight: 560, letterSpacing: '-0.03em', color: '#121a28', lineHeight: 1.1, textTransform: 'capitalize', overflowWrap: 'anywhere' }}>{item.value}</Typography>
            <Box sx={{ mt: 1.5, height: 5, borderRadius: 99, bgcolor: '#f3ead2' }}>
              <Box sx={{ width: `${item.share}%`, height: '100%', borderRadius: 99, bgcolor: item.lead ? '#c8960f' : '#121a28' }} />
            </Box>
            <Typography sx={{ mt: 1, minHeight: 34, fontSize: '0.8rem', color: '#5d6b7a' }}>{item.note}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function ChartCard({ title, caption, onTable, onEnlarge, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, minWidth: 0, bgcolor: '#fff', border: '1px solid #e6dfd2', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Box>
          <Typography fontWeight="bold">{title}</Typography>
          {caption && <Typography variant="caption" color="text.secondary">{caption}</Typography>}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={onTable}>Table</Button>
          <Button size="small" variant="outlined" onClick={onEnlarge}>Enlarge</Button>
        </Stack>
      </Box>
      {children}
    </Paper>
  );
}
