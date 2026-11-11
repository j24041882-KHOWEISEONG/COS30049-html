import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography
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

const chartTitles = {
  type: 'By vehicle type',
  trend: 'Registrations over time',
  fuel: 'By fuel',
  population: 'Population by age group',
  income: 'Household income'
};

function formatValue(key, value) {
  if (key === 'incomeMean') return `RM ${Number(value).toLocaleString('en-MY')}`;
  if (key === 'fuel') return String(value).replaceAll('_', ' ');
  return String(value);
}

function everyOption(rows) {
  return {
    year: uniqueSorted(rows, 'year').map(String),
    state: uniqueSorted(rows, 'state').map(String),
    incomeMean: uniqueSorted(rows, 'incomeMean').map(String),
    category: uniqueSorted(rows, 'category').map(String),
    fuel: uniqueSorted(rows, 'fuel').map(String)
  };
}

function selectionFrom(rows, focus) {
  const next = everyOption(rows);
  if (focus?.year && focus.year !== 'all') next.year = [String(focus.year)];
  if (focus?.category && focus.category !== 'all') next.category = [String(focus.category)];
  return next;
}

export default function HistoricalDashboard({ focus }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [table, setTable] = useState(null);
  const [enlarged, setEnlarged] = useState(null);

  useEffect(() => {
    loadHistoricalRows()
      .then(setRows)
      .catch(() => setError('The historical file could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!rows.length) return;
    setSelected(selectionFrom(rows, focus));
  }, [rows, focus]);

  const options = useMemo(() => everyOption(rows), [rows]);

  const filtered = useMemo(() => {
    if (!selected) return [];
    return rows.filter((row) => (
      filters.every(([key]) => selected[key].includes(String(row[key])))
    ));
  }, [rows, selected]);

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

  const chartFor = (key, large) => {
    if (key === 'type') return <BarChart labels={types.map((item) => item[0])} values={types.map((item) => item[1])} height={large ? 480 : 320} />;
    if (key === 'trend') return <LineChart series={trend} height={large ? 460 : 300} xLabel="Year" totalLabel="Total registrations" />;
    if (key === 'fuel') return <BarChart labels={fuels.map((item) => item[0])} values={fuels.map((item) => item[1])} height={large ? 460 : 300} />;
    if (key === 'population') {
      return (
        <LineChart
          series={[
            { name: 'Above 15', points: facts.map((row) => ({ x: String(row.year), y: row.above15 })) },
            { name: 'Below 14', color: '#56B4E9', points: facts.map((row) => ({ x: String(row.year), y: row.below14 })) }
          ]}
          height={large ? 420 : 260}
          xLabel="Year"
          totalLabel="Total population"
        />
      );
    }
    return (
      <LineChart
        series={[
          { name: 'Mean', points: facts.map((row) => ({ x: String(row.year), y: row.incomeMean })) },
          { name: 'Median', color: '#009E73', points: facts.map((row) => ({ x: String(row.year), y: row.incomeMedian })) }
        ]}
        height={large ? 420 : 260}
        xLabel="Year"
      />
    );
  };

  const total = sumCount(filtered);
  const ready = rows.length > 0 && selected;
  const typeShare = ready && types[0] && total ? Math.round((types[0][1] / total) * 100) : 0;
  const fuelShare = ready && fuels[0] && total ? Math.round((fuels[0][1] / total) * 100) : 0;
  const allYears = uniqueSorted(rows, 'year');
  const yearShare = ready && allYears.length ? Math.round((years.length / allYears.length) * 100) : 0;
  const filterNote = !selected ? 'Waiting for the file' : filters
    .map(([key, label]) => {
      const picked = selected[key];
      if (picked.length === options[key].length) return '';
      if (!picked.length) return `${label}: none`;
      const text = picked.slice(0, 2).map((value) => formatValue(key, value)).join(', ');
      return `${label} ${text}${picked.length > 2 ? ` +${picked.length - 2}` : ''}`;
    })
    .filter(Boolean)
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
    type: {
      title: chartTitles.type,
      columns: ['Vehicle type', 'Registrations'],
      rows: types.map(([name, count]) => [name, count.toLocaleString('en-MY')])
    },
    fuel: {
      title: chartTitles.fuel,
      columns: ['Fuel', 'Registrations'],
      rows: fuels.map(([name, count]) => [name, count.toLocaleString('en-MY')])
    },
    trend: {
      title: chartTitles.trend,
      columns: ['Year', 'Vehicle type', 'Registrations'],
      rows: years.flatMap((year) => categories.map((category) => [
        year,
        category,
        sumCount(filtered.filter((row) => row.year === year && row.category === category)).toLocaleString('en-MY')
      ]))
    },
    population: {
      title: chartTitles.population,
      columns: ['Year', 'Above 15', 'Below 14'],
      rows: facts.map((row) => [row.year, row.above15.toLocaleString('en-MY'), row.below14.toLocaleString('en-MY')])
    },
    income: {
      title: chartTitles.income,
      columns: ['Year', 'Mean', 'Median'],
      rows: facts.map((row) => [row.year, row.incomeMean.toLocaleString('en-MY'), row.incomeMedian.toLocaleString('en-MY')])
    }
  };
  const openTable = table ? tables[table] : null;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="overline" color="primary">Historical data</Typography>
        <Typography variant="h5" fontWeight="bold">How registrations changed</Typography>
        <Typography color="text.secondary">
          Tick any year, state, income, vehicle type, or fuel. On the line chart, move or tap a year and the tip lists every vehicle type. Axes start at zero.
        </Typography>
      </Box>
      {selected && (
        <Paper elevation={0} sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.2, alignItems: 'end', bgcolor: '#fffcf6', border: '1px solid #e6dfd2', borderRadius: 2 }}>
          {filters.map(([key, label]) => (
            <CheckboxMultiSelect
              key={key}
              label={label}
              options={options[key]}
              selected={selected[key]}
              formatOption={(value) => formatValue(key, value)}
              onChange={(values) => setSelected((current) => ({ ...current, [key]: values }))}
            />
          ))}
          <Button variant="outlined" sx={{ height: 40 }} onClick={() => setSelected(everyOption(rows))}>Reset view</Button>
        </Paper>
      )}
      <SummaryBand items={summary} />
      {error && <Typography color="error">{error}</Typography>}
      {rows.length > 0 && (
        <>
          <ChartCard title={chartTitles.trend} caption="Move or tap a year. The tip lists every vehicle type at that year." onTable={() => setTable('trend')} onEnlarge={() => setEnlarged('trend')}>
            {chartFor('trend', false)}
          </ChartCard>
          <ChartCard title={chartTitles.type} caption="The longest bar is the largest group." onTable={() => setTable('type')} onEnlarge={() => setEnlarged('type')}>
            {chartFor('type', false)}
          </ChartCard>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <ChartCard title={chartTitles.fuel} caption="The original fuel names, including hybrid petrol and natural gas." onTable={() => setTable('fuel')} onEnlarge={() => setEnlarged('fuel')}>{chartFor('fuel', false)}</ChartCard>
            <ChartCard title={chartTitles.population} caption="Hover a year to see both age groups." onTable={() => setTable('population')} onEnlarge={() => setEnlarged('population')}>{chartFor('population', false)}</ChartCard>
            <ChartCard title={chartTitles.income} caption="Hover a year to see mean and median." onTable={() => setTable('income')} onEnlarge={() => setEnlarged('income')}>{chartFor('income', false)}</ChartCard>
          </Box>
        </>
      )}
      <Typography variant="body2" color="text.secondary">Each row is one state and one fuel. Ticking every state adds those rows together for Malaysia.</Typography>
      <Dialog open={Boolean(openTable)} onClose={() => setTable(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{openTable ? openTable.title : ''}</span>
          <Button onClick={() => setTable(null)} color="inherit">X Close</Button>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer sx={{ maxHeight: 450 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {(openTable ? openTable.columns : []).map((column) => (
                    <TableCell key={column}><strong>{column}</strong></TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(openTable ? openTable.rows : []).map((row, index) => (
                  <TableRow key={`${row.join('-')}-${index}`} hover>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} align={cellIndex === row.length - 1 ? 'right' : 'left'} sx={{ textTransform: 'capitalize' }}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {openTable && openTable.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={openTable.columns.length}>No rows for this filter.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTable(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(enlarged)} onClose={() => setEnlarged(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{enlarged ? chartTitles[enlarged] : ''}</span>
          <Button onClick={() => setEnlarged(null)} color="inherit">X Close</Button>
        </DialogTitle>
        <DialogContent dividers>
          {enlarged ? chartFor(enlarged, true) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function CheckboxMultiSelect({ label, options, selected, onChange, formatOption }) {
  const isAllSelected = options.length > 0 && selected.length === options.length;
  const labelOf = (value) => (formatOption ? formatOption(value) : String(value));

  const handleChange = (event) => {
    const value = event.target.value;
    if (value.includes('__ALL__')) {
      onChange(isAllSelected ? [] : [...options]);
      return;
    }
    onChange(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selected}
        onChange={handleChange}
        input={<OutlinedInput label={label} />}
        renderValue={(picked) => {
          if (picked.length === 0) return 'None selected';
          if (picked.length === options.length) return `All ${label}`;
          return `${picked.length} selected (${picked.slice(0, 2).map(labelOf).join(', ')}${picked.length > 2 ? '...' : ''})`;
        }}
        sx={{ bgcolor: '#fff' }}
        MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
      >
        <MenuItem value="__ALL__">
          <Checkbox checked={isAllSelected} indeterminate={selected.length > 0 && !isAllSelected} size="small" />
          <ListItemText primary="ALL" primaryTypographyProps={{ fontWeight: 'bold', fontSize: '13px' }} />
        </MenuItem>
        <Divider />
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <Checkbox checked={selected.indexOf(option) > -1} size="small" />
            <ListItemText primary={labelOf(option)} primaryTypographyProps={{ fontSize: '13px', textTransform: 'capitalize' }} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
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

function TableSvgIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
      <line x1="15" y1="9" x2="15" y2="21" />
    </svg>
  );
}

function EnlargeSvgIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function ChartCard({ title, caption, onTable, onEnlarge, children }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, minWidth: 0, bgcolor: '#fff', border: '1px solid #e6dfd2', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5, flexWrap: 'nowrap' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '0.92rem', sm: '1.05rem' }, lineHeight: 1.3, color: '#2a3544', wordBreak: 'break-word' }}>{title}</Typography>
          {caption && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>{caption}</Typography>}
        </Box>
        <Stack direction="row" spacing={0.8} sx={{ flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={onTable} startIcon={<TableSvgIcon />} sx={{ minWidth: 'auto', px: { xs: 1, sm: 1.4 }, py: 0.4, fontSize: { xs: '0.72rem', sm: '0.78rem' }, textTransform: 'none', whiteSpace: 'nowrap' }}>Table</Button>
          <Button size="small" variant="outlined" onClick={onEnlarge} startIcon={<EnlargeSvgIcon />} sx={{ minWidth: 'auto', px: { xs: 1, sm: 1.4 }, py: 0.4, fontSize: { xs: '0.72rem', sm: '0.78rem' }, textTransform: 'none', whiteSpace: 'nowrap' }}>Enlarge</Button>
        </Stack>
      </Box>
      {children}
    </Paper>
  );
}
