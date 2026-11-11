import { useEffect, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { loadHistoricalRows, sumCount, uniqueSorted } from './historicalData';
import { BarChart, LineChart } from './d3charts';

export default function HomeDashboard({ onOpenHistorical, onOpenPrediction }) {
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState('Loading the historical file…');

  useEffect(() => {
    loadHistoricalRows()
      .then((loaded) => {
        setRows(loaded);
        setNote('Counts on this page add every state row in the historical file.');
      })
      .catch(() => setNote('The historical file could not be loaded.'));
  }, []);

  const years = uniqueSorted(rows, 'year');
  const latest = years[years.length - 1];
  const latestRows = rows.filter((row) => row.year === latest);
  const focus = ['car', 'motorcycle', 'lorry'];
  const categories = uniqueSorted(rows, 'category');
  const totals = categories
    .map((category) => [category, sumCount(rows.filter((row) => row.category === category))])
    .sort((a, b) => b[1] - a[1]);
  const series = focus.map((name) => ({
    name,
    points: years.map((year) => ({
      x: String(year),
      y: sumCount(rows.filter((row) => row.year === year && row.category === name))
    }))
  }));

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, bgcolor: '#fff', border: '1px solid #e6dfd2', borderRadius: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 2.5, alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" sx={{ color: '#7a5a08', letterSpacing: '0.14em' }}>Dashboard</Typography>
          <Typography variant="h5" gutterBottom>See the records, then the forecast</Typography>
          <Typography sx={{ color: '#5d6b7a', maxWidth: 720 }}>
            Registrations by state, year, vehicle type, and fuel. Population and mean income feed the forecast.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.5 }}>
            <Button variant="contained" onClick={onOpenHistorical}>Open historical charts</Button>
            <Button variant="outlined" onClick={onOpenPrediction}>Open forecast</Button>
          </Stack>
          <Typography variant="body2" sx={{ mt: 2, color: '#5d6b7a' }}>
            1. Open the charts. 2. Filter a year, a state, or a fuel. 3. Try a forecast.
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#5d6b7a' }}>
            Sources: data.gov.my — Vehicle Registration Transactions, Population Table: States, and Household Income.
          </Typography>
        </Box>
        <Box component="img" src="images/hero-fleet.jpg" alt="Illustrated street with a car, a motorcycle, a lorry, and a van" sx={{ width: '100%', height: { xs: 200, md: 280 }, objectFit: 'cover', objectPosition: '72% center', borderRadius: 2, display: 'block', bgcolor: '#f6f1e6' }} />
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {[
          { key: 'all', band: 'All years', label: 'Registrations', count: sumCount(rows), caption: 'Every state in the file', focus: { year: 'all', category: 'all' } },
          { key: 'year', band: latest ? String(latest) : 'Latest', label: 'Latest year', count: sumCount(latestRows), caption: 'The newest year in the file', focus: { year: latest ? String(latest) : 'all', category: 'all' } }
        ].map((card) => <SummaryCard key={card.key} card={card} ready={rows.length > 0} onOpen={() => onOpenHistorical(card.focus)} />)}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {[
          { key: 'car', src: 'images/vehicle-car.jpg', label: 'Cars', count: sumCount(rows.filter((row) => row.category === 'car')), caption: 'Every car row in the file', focus: { year: 'all', category: 'car' } },
          { key: 'motorcycle', src: 'images/vehicle-motorcycle.jpg', label: 'Motorcycles', count: sumCount(rows.filter((row) => row.category === 'motorcycle')), caption: 'Every motorcycle row in the file', focus: { year: 'all', category: 'motorcycle' } },
          { key: 'lorry', src: 'images/vehicle-lorry.jpg', label: 'Lorries', count: sumCount(rows.filter((row) => row.category === 'lorry')), caption: 'Every lorry row in the file', focus: { year: 'all', category: 'lorry' } }
        ].map((card) => <SummaryCard key={card.key} card={card} ready={rows.length > 0} onOpen={() => onOpenHistorical(card.focus)} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography fontWeight="bold" gutterBottom>Registrations over time</Typography>
          {rows.length > 0 && <LineChart series={series} height={300} />}
        </Paper>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography fontWeight="bold" gutterBottom>By vehicle type</Typography>
          {rows.length > 0 && (
            <BarChart
              labels={totals.map((item) => item[0])}
              values={totals.map((item) => item[1])}
              height={300}
            />
          )}
        </Paper>
      </Box>
      <Typography variant="body2" color="text.secondary">{note}</Typography>
    </Stack>
  );
}

function SummaryCard({ card, ready, onOpen }) {
  return (
    <Paper component="button" type="button" onClick={onOpen} elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', p: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', bgcolor: '#fff', border: '1px solid #e6dfd2', borderTop: '3px solid #c8960f', borderRadius: 2, overflow: 'hidden', '&:hover': { borderColor: '#c8960f' } }}>
      {card.src ? (
        <Box component="img" src={card.src} alt="" sx={{ width: '100%', aspectRatio: '5 / 3', objectFit: 'cover', objectPosition: 'center 40%', display: 'block', bgcolor: '#f6f1e6', borderBottom: '1px solid #e6dfd2' }} />
      ) : (
        <Box sx={{ height: 132, display: 'grid', placeItems: 'center', bgcolor: '#fffcf6', borderBottom: '1px solid #e6dfd2' }}>
          <Typography sx={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '1.45rem', fontWeight: 560, color: '#7a5a08' }}>{card.band}</Typography>
        </Box>
      )}
      <Box sx={{ p: 1.75 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a5a08' }}>{card.label}</Typography>
        <Typography sx={{ mt: 0.75, fontFamily: 'Fraunces, Georgia, serif', fontSize: { xs: '1.25rem', lg: '1.45rem' }, fontWeight: 560, letterSpacing: '-0.03em', color: '#121a28', lineHeight: 1.1 }}>{ready ? card.count.toLocaleString('en-MY') : '—'}</Typography>
        <Typography sx={{ mt: 0.75, minHeight: 36, fontSize: '0.8rem', color: '#5d6b7a' }}>{card.caption}</Typography>
      </Box>
    </Paper>
  );
}
