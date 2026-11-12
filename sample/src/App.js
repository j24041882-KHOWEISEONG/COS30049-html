import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import HistoricalDashboard from './HistoricalDashboard';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  OutlinedInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const API_URL = 'http://localhost:8000';

const OKABE_ITO_PALETTE = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#D55E00',
  '#CC79A7',
  '#56B4E9',
  '#F0E442',
  '#333333'
];

const theme = createTheme({
  palette: {
    primary: { main: '#0072B2' },
    secondary: { main: '#D55E00' }
  }
});

const TableSvgIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="9" x2="9" y2="21" />
    <line x1="15" y1="9" x2="15" y2="21" />
  </svg>
);

const EnlargeSvgIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const ChartCardHeader = ({ title, subtitle, onOpenTable, onEnlarge }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 1.5,
      mb: 1.5,
      flexWrap: 'nowrap'
    }}
  >
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        variant="subtitle1"
        fontWeight="bold"
        sx={{
          fontSize: { xs: '0.92rem', sm: '1.05rem' },
          lineHeight: 1.3,
          color: '#1e293b',
          wordBreak: 'break-word'
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    <Stack direction="row" spacing={0.8} sx={{ flexShrink: 0 }}>
      {onOpenTable && (
        <Button
          size="small"
          variant="outlined"
          onClick={onOpenTable}
          startIcon={<TableSvgIcon />}
          sx={{
            minWidth: 'auto',
            px: { xs: 1, sm: 1.4 },
            py: 0.4,
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            textTransform: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          Table
        </Button>
      )}
      {onEnlarge && (
        <Button
          size="small"
          variant="outlined"
          onClick={onEnlarge}
          startIcon={<EnlargeSvgIcon />}
          sx={{
            minWidth: 'auto',
            px: { xs: 1, sm: 1.4 },
            py: 0.4,
            fontSize: { xs: '0.72rem', sm: '0.78rem' },
            textTransform: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          Enlarge
        </Button>
      )}
    </Stack>
  </Box>
);

const getCssPatternStyle = (baseColor, idx) => {
  const patType = idx % 7;
  const stroke = 'rgba(0, 0, 0, 0.38)';
  const base = {
    width: 14,
    height: 14,
    borderRadius: '3px',
    border: '1px solid #333',
    backgroundColor: baseColor,
    flexShrink: 0
  };
  if (patType === 0) {
    return {
      ...base,
      backgroundImage: `linear-gradient(to right, ${stroke} 1px, transparent 1px), linear-gradient(to bottom, ${stroke} 1px, transparent 1px)`,
      backgroundSize: '6px 6px'
    };
  }
  if (patType === 1) {
    return {
      ...base,
      backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 4px)`
    };
  }
  if (patType === 2) {
    return {
      ...base,
      backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 4px)`
    };
  }
  if (patType === 3) {
    return {
      ...base,
      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 4px)`
    };
  }
  if (patType === 4) {
    return {
      ...base,
      backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 4px)`
    };
  }
  if (patType === 5) {
    return {
      ...base,
      backgroundImage: `radial-gradient(${stroke} 1.5px, transparent 1.5px)`,
      backgroundSize: '5px 5px'
    };
  }
  return {
    ...base,
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 3.5px), repeating-linear-gradient(-45deg, transparent, transparent 2px, ${stroke} 2px, ${stroke} 3.5px)`
  };
};

const useContainerWidth = (ref, defaultWidth = 700) => {
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => {
    if (!ref.current) return;
    const updateWidth = () => {
      if (ref.current && ref.current.clientWidth > 0) {
        setWidth(ref.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(ref.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [ref]);
  return width;
};

const createCategoryPatterns = (defs, categories, colorScale, uidPrefix) => {
  categories.forEach((cat, idx) => {
    const safeKey = String(cat).replace(/[^a-zA-Z0-9]/g, '_');
    const patternId = `${uidPrefix}-pat-${safeKey}`;
    const baseColor = colorScale(cat);
    const strokeColor = 'rgba(0, 0, 0, 0.38)';
    const patType = idx % 7;

    const pattern = defs
      .append('pattern')
      .attr('id', patternId)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8);

    pattern
      .append('rect')
      .attr('width', 8)
      .attr('height', 8)
      .attr('fill', baseColor);

    if (patType === 0) {
      pattern.append('path')
        .attr('d', 'M 8 0 L 0 0 0 8')
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.3);
    } else if (patType === 1) {
      pattern.append('line')
        .attr('x1', 4).attr('y1', 0)
        .attr('x2', 4).attr('y2', 8)
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.6);
    } else if (patType === 2) {
      pattern.append('line')
        .attr('x1', 0).attr('y1', 4)
        .attr('x2', 8).attr('y2', 4)
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.6);
    } else if (patType === 3) {
      pattern.append('path')
        .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.5);
    } else if (patType === 4) {
      pattern.append('path')
        .attr('d', 'M6,-2 l4,4 M0,0 l8,8 M-2,6 l4,4')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.5);
    } else if (patType === 5) {
      pattern.append('circle')
        .attr('cx', 4)
        .attr('cy', 4)
        .attr('r', 1.8)
        .attr('fill', strokeColor);
    } else {
      pattern.append('path')
        .attr('d', 'M0,0 L8,8 M8,0 L0,8')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.2);
    }
  });
};

const CheckboxMultiSelect = ({ label, options, selected, onChange }) => {
  const isAllSelected = options.length > 0 && selected.length === options.length;

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
        renderValue={(sel) => {
          if (sel.length === 0) return 'None selected';
          if (sel.length === options.length) return `All ${label}`;
          return `${sel.length} selected (${sel.slice(0, 2).join(', ')}${sel.length > 2 ? '...' : ''})`;
        }}
        sx={{ bgcolor: '#fff' }}
        MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
      >
        <MenuItem value="__ALL__">
          <Checkbox checked={isAllSelected} indeterminate={selected.length > 0 && !isAllSelected} size="small" />
          <ListItemText primary="ALL" primaryTypographyProps={{ fontWeight: 'bold', fontSize: '13px' }} />
        </MenuItem>
        <Divider />
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            <Checkbox checked={selected.indexOf(opt) > -1} size="small" />
            <ListItemText
              primary={String(opt).toUpperCase()}
              primaryTypographyProps={{ fontSize: '13px' }}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const D3StackedBarChart = ({ data, height = 430 }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const containerWidth = useContainerWidth(containerRef, 760);
  const isMobile = containerWidth < 560;

  const types = useMemo(() => [...new Set((data || []).map(d => d.type))], [data]);

  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) return;

    const uidPrefix = `stack-${Math.random().toString(36).substring(2, 7)}`;
    const margin = {
      top: 20,
      right: 20,
      bottom: isMobile ? 95 : 85,
      left: isMobile ? 65 : 85
    };
    const width = Math.max(containerWidth - margin.left - margin.right, 220);
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', 'rgba(42, 48, 60, 0.96)')
      .style('color', '#fff')
      .style('padding', '12px 16px')
      .style('border-radius', '6px')
      .style('font-size', '12.5px')
      .style('line-height', '1.55')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 6px 18px rgba(0,0,0,0.32)')
      .style('z-index', 9999);

    const fuels = [...new Set(data.map(d => d.fuel))];

    const color = d3.scaleOrdinal()
      .domain(types)
      .range(OKABE_ITO_PALETTE);

    const defs = svg.append('defs');
    createCategoryPatterns(defs, types, color, uidPrefix);

    const getPatternFill = (cat) => {
      const safeKey = String(cat).replace(/[^a-zA-Z0-9]/g, '_');
      return `url(#${uidPrefix}-pat-${safeKey})`;
    };

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const groupedData = fuels.map(fuel => {
      const row = { fuel, _total: 0 };
      types.forEach(type => {
        const match = data.filter(d => d.fuel === fuel && d.type === type);
        const val = d3.sum(match, m => Number(m.number || 0));
        row[type] = val;
        row._total += val;
      });
      return row;
    });

    const stackGenerator = d3.stack().keys(types);
    const layers = stackGenerator(groupedData);

    const x = d3.scaleBand()
      .domain(fuels)
      .range([0, width])
      .padding(0.28);

    const maxVal = d3.max(groupedData, d => d._total) || 10;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .nice()
      .range([chartHeight, 0]);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-40)')
      .attr('dx', '-0.6em')
      .attr('dy', '0.25em')
      .style('text-anchor', 'end')
      .style('font-size', isMobile ? '10px' : '11.5px')
      .style('font-weight', '500');

    g.append('g')
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(',.0f')))
      .style('font-size', isMobile ? '10px' : '11.5px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12.5px')
      .style('font-weight', 'bold')
      .style('fill', '#222')
      .text('Fuel Type');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', isMobile ? -50 : -68)
      .attr('text-anchor', 'middle')
      .style('font-size', '12.5px')
      .style('font-weight', 'bold')
      .style('fill', '#222')
      .text('Predicted Vehicle Count');

    g.selectAll('.layer')
      .data(layers)
      .join('g')
      .attr('class', 'layer')
      .attr('fill', d => getPatternFill(d.key))
      .selectAll('rect')
      .data(d => d.map(item => ({ ...item, key: d.key })))
      .join('rect')
      .attr('x', d => x(d.data.fuel))
      .attr('y', d => y(d[1]))
      .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
      .attr('width', x.bandwidth())
      .attr('stroke', '#333')
      .attr('stroke-width', 0.4);

    g.selectAll('.col-hover-overlay')
      .data(groupedData)
      .join('rect')
      .attr('class', 'col-hover-overlay')
      .attr('x', d => x(d.fuel))
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', 'rgba(0, 114, 178, 0.08)');
        const breakdownHtml = types
          .map(t => `<div>&bull; <span style="text-transform:capitalize">${t}</span>: <strong>${Number(d[t] || 0).toLocaleString()}</strong></div>`)
          .join('');

        tooltip
          .style('visibility', 'visible')
          .html(
            `<div style="border-bottom:1px solid rgba(255,255,255,0.25);padding-bottom:6px;margin-bottom:6px;font-size:13.5px;font-weight:bold;">` +
              `Fuel: ${d.fuel}` +
            `</div>` +
            `<div style="margin-bottom:4px;"><strong>Total Predicted: ${d._total.toLocaleString()}</strong></div>` +
            breakdownHtml
          );
      })
      .on('mousemove', function (event) {
        const tooltipWidth = 230;
        const leftPos = event.clientX + tooltipWidth + 30 > window.innerWidth
          ? event.clientX - tooltipWidth - 15
          : event.clientX + 16;
        tooltip
          .style('top', `${Math.max(15, event.clientY - 70)}px`)
          .style('left', `${leftPos}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', 'transparent');
        tooltip.style('visibility', 'hidden');
      });
  }, [data, height, containerWidth, isMobile, types]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', position: 'relative' }}>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
      </Box>
      {/* Responsive HTML Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1.2, sm: 2.2 },
          mt: 1,
          pt: 1,
          borderTop: '1px solid #f1f5f9'
        }}
      >
        <Typography variant="caption" fontWeight="bold" sx={{ color: '#334155' }}>
          Vehicle Type:
        </Typography>
        {types.map((type, idx) => (
          <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <Box sx={getCssPatternStyle(OKABE_ITO_PALETTE[idx % OKABE_ITO_PALETTE.length], idx)} />
            <Typography variant="caption" sx={{ textTransform: 'capitalize', color: '#1e293b', fontWeight: 500 }}>
              {type}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const D3CategoryBarChart = ({ data, height = 350 }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const containerWidth = useContainerWidth(containerRef, 460);
  const isMobile = containerWidth < 480;

  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) return;

    const margin = {
      top: 52,
      right: 18,
      bottom: 65,
      left: isMobile ? 64 : 82
    };
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', 'rgba(42, 48, 60, 0.96)')
      .style('color', '#fff')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('font-size', '12.5px')
      .style('line-height', '1.5')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 6px 18px rgba(0,0,0,0.32)')
      .style('z-index', 9999);

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.28);

    const maxVal = d3.max(data, d => d.value) || 10;
    const totalAll = d3.sum(data, d => d.value) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.18])
      .nice()
      .range([chartHeight, 0]);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(OKABE_ITO_PALETTE);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end')
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(',.0f')))
      .style('font-size', '11px');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', chartHeight + margin.bottom - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Vehicle Category');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', isMobile ? -50 : -64)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Vehicle Count');

    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', d => `bar bar-item-${String(d.label).replace(/[^a-zA-Z0-9]/g, '_')}`)
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.max(0, chartHeight - y(d.value)))
      .attr('fill', d => color(d.label));

    g.selectAll('.bar-val-label')
      .data(data)
      .join('text')
      .attr('class', 'bar-val-label')
      .attr('transform', d => {
        const cx = x(d.label) + x.bandwidth() / 2 + 4;
        const cy = Math.max(4, y(d.value) - 6);
        return `translate(${cx}, ${cy}) rotate(-90)`;
      })
      .style('text-anchor', 'start')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#1e293b')
      .style('pointer-events', 'none')
      .text(d => d.value.toLocaleString());

    g.selectAll('.bar-col-hover-overlay')
      .data(data)
      .join('rect')
      .attr('class', 'bar-col-hover-overlay')
      .attr('x', d => x(d.label))
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', 'rgba(0, 114, 178, 0.08)');
        const safeKey = String(d.label).replace(/[^a-zA-Z0-9]/g, '_');
        g.select(`.bar-item-${safeKey}`).attr('opacity', 0.8).attr('stroke', '#111').attr('stroke-width', 1.5);
        const pct = ((d.value / totalAll) * 100).toFixed(1);

        tooltip
          .style('visibility', 'visible')
          .html(
            `<div style="border-bottom:1px solid rgba(255,255,255,0.25);padding-bottom:5px;margin-bottom:5px;font-size:13px;font-weight:bold;text-transform:capitalize;">` +
              `Category: ${d.label}` +
            `</div>` +
            `<div>&bull; Count: <strong>${d.value.toLocaleString()}</strong></div>` +
            `<div>&bull; Share: <strong>${pct}%</strong></div>`
          );
      })
      .on('mousemove', function (event) {
        const tooltipWidth = 200;
        const leftPos = event.clientX + tooltipWidth + 30 > window.innerWidth
          ? event.clientX - tooltipWidth - 15
          : event.clientX + 16;
        tooltip
          .style('top', `${Math.max(15, event.clientY - 55)}px`)
          .style('left', `${leftPos}px`);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('fill', 'transparent');
        const safeKey = String(d.label).replace(/[^a-zA-Z0-9]/g, '_');
        g.select(`.bar-item-${safeKey}`).attr('opacity', 1).attr('stroke', 'none');
        tooltip.style('visibility', 'hidden');
      });
  }, [data, height, containerWidth, isMobile]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
    </Box>
  );
};

const D3DonutChart = ({
  data,
  height = 300,
  isPie = false
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const containerWidth = useContainerWidth(containerRef, 460);

  const total = useMemo(() => d3.sum(data || [], d => d.value) || 1, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) return;

    const uidPrefix = `pie-${Math.random().toString(36).substring(2, 7)}`;
    const width = Math.max(containerWidth, 240);
    const svgHeight = height - 45;
    const radius = Math.max(55, Math.min(width - 30, svgHeight - 20) / 2);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', 'rgba(42, 48, 60, 0.96)')
      .style('color', '#fff')
      .style('padding', '12px 16px')
      .style('border-radius', '6px')
      .style('font-size', '12.5px')
      .style('line-height', '1.55')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 6px 18px rgba(0,0,0,0.32)')
      .style('z-index', 9999);

    const labels = data.map(d => d.label);
    const color = d3.scaleOrdinal()
      .domain(labels)
      .range(OKABE_ITO_PALETTE);

    const defs = svg.append('defs');
    createCategoryPatterns(defs, labels, color, uidPrefix);

    const getPatternFill = (lbl) => {
      const safeKey = String(lbl).replace(/[^a-zA-Z0-9]/g, '_');
      return `url(#${uidPrefix}-pat-${safeKey})`;
    };

    const g = svg
      .attr('width', width)
      .attr('height', svgHeight)
      .append('g')
      .attr('transform', `translate(${width / 2},${svgHeight / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(isPie ? 0 : radius * 0.52)
      .outerRadius(radius);

    g.selectAll('path')
      .data(pie(data))
      .join('path')
      .attr('d', arc)
      .attr('fill', d => getPatternFill(d.data.label))
      .attr('stroke', '#fff')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, hoveredSlice) {
        d3.select(this).attr('opacity', 0.82).attr('stroke', '#111').attr('stroke-width', '2.5px');

        const allBreakdownHtml = data
          .map(item => {
            const pct = ((item.value / total) * 100).toFixed(2);
            const isHovered = item.label === hoveredSlice.data.label;
            return (
              `<div style="${isHovered ? 'font-weight:bold;color:#56B4E9;' : ''}">` +
                `&bull; ${item.label}: <strong>${item.value.toLocaleString()} (${pct}%)</strong>` +
              `</div>`
            );
          })
          .join('');

        tooltip
          .style('visibility', 'visible')
          .html(
            `<div style="border-bottom:1px solid rgba(255,255,255,0.25);padding-bottom:6px;margin-bottom:6px;font-size:13px;font-weight:bold;">` +
              `Total Vehicles: ${total.toLocaleString()}` +
            `</div>` +
            allBreakdownHtml
          );
      })
      .on('mousemove', function (event) {
        const tooltipWidth = 260;
        const leftPos = event.clientX + tooltipWidth + 30 > window.innerWidth
          ? event.clientX - tooltipWidth - 15
          : event.clientX + 16;
        tooltip
          .style('top', `${Math.max(15, event.clientY - 60)}px`)
          .style('left', `${leftPos}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', '2px');
        tooltip.style('visibility', 'hidden');
      });
  }, [data, height, containerWidth, isPie, total]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
      {/* Responsive HTML Flexbox Legend with Pattern Swatches */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1.2, sm: 2 },
          mt: 0.5,
          pt: 1,
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {(data || []).map((d, idx) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <Box sx={getCssPatternStyle(OKABE_ITO_PALETTE[idx % OKABE_ITO_PALETTE.length], idx)} />
              <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 500 }}>
                {d.label} ({pct}%)
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const D3EnergyTreemap = ({ data, height = 350 }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const containerWidth = useContainerWidth(containerRef, 720);

  const tierColors = useMemo(() => ({
    'Conventional Fossil (Petrol & Diesel)': '#E69F00',
    'Low-Emission (Hybrid, Bio & Natural Gas)': '#56B4E9',
    'Zero-Emission (EV & Hydrogen)': '#009E73',
    'Other Propulsion': '#CC79A7'
  }), []);

  useEffect(() => {
    if (!data || data.length === 0 || !containerRef.current) return;

    const margin = { top: 6, right: 6, bottom: 10, left: 6 };
    const width = Math.max(containerWidth - margin.left - margin.right, 240);
    const svgHeight = height - 45;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', 'rgba(42, 48, 60, 0.95)')
      .style('color', '#fff')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', 9999);

    const total = d3.sum(data, d => d.value) || 1;

    const root = d3.hierarchy({ name: 'Energy Tiers', children: data })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, chartHeight])
      .paddingInner(4)
      .paddingOuter(2)
      .round(true)(root);

    const color = d3.scaleOrdinal()
      .domain(Object.keys(tierColors))
      .range(Object.values(tierColors));

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', svgHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const nodes = g.selectAll('g.node')
      .data(root.leaves())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    nodes.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 4)
      .attr('fill', d => color(d.data.tier))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.82).attr('stroke', '#111').attr('stroke-width', 2);
        const pct = ((d.data.value / total) * 100).toFixed(2);
        tooltip
          .style('visibility', 'visible')
          .html(
            `<strong>Energy Tier:</strong> ${d.data.tier}<br/>` +
            `<strong>Segment:</strong> ${d.data.name}<br/>` +
            `<strong>Predicted Count:</strong> ${d.data.value.toLocaleString()} (${pct}%)`
          );
      })
      .on('mousemove', function (event) {
        const tooltipWidth = 250;
        const leftPos = event.clientX + tooltipWidth + 30 > window.innerWidth
          ? event.clientX - tooltipWidth - 15
          : event.clientX + 15;
        tooltip
          .style('top', `${Math.max(15, event.clientY - 50)}px`)
          .style('left', `${leftPos}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5);
        tooltip.style('visibility', 'hidden');
      });

    nodes.each(function (d) {
      const boxW = d.x1 - d.x0;
      const boxH = d.y1 - d.y0;
      if (boxW > 70 && boxH > 32) {
        const nodeG = d3.select(this);
        nodeG.append('text')
          .attr('x', 8)
          .attr('y', 18)
          .style('font-size', '11.5px')
          .style('font-weight', 'bold')
          .style('fill', '#fff')
          .style('pointer-events', 'none')
          .text(d.data.name);

        if (boxH > 46) {
          nodeG.append('text')
            .attr('x', 8)
            .attr('y', 34)
            .style('font-size', '11px')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .text(d.data.value.toLocaleString());
        }
      }
    });
  }, [data, height, containerWidth, tierColors]);

  return (
    <Box ref={containerRef} sx={{ width: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
      {/* Responsive HTML Legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1.2, sm: 2.2 },
          mt: 0.5,
          pt: 1,
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {Object.entries(tierColors).map(([tier, hex]) => (
          <Box key={tier} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <Box
              sx={{
                width: 13,
                height: 13,
                borderRadius: '3px',
                bgcolor: hex,
                flexShrink: 0
              }}
            />
            <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 500 }}>
              {tier}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Error logging hook
const useErrorLog = () => {
  return useCallback((error, info) => {
    console.error('Error occurred:', error, info);
  }, []);
};

export default function App() {
  const errorLog = useErrorLog();
  const [currentTab, setCurrentTab] = useState('home');
  const [openPredTableModal, setOpenPredTableModal] = useState(false);
  const [enlargedChart, setEnlargedChart] = useState(null);
  const [population, setPopulation] = useState('');
  const [income, setIncome] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedFuels, setSelectedFuels] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchPredictionHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const response = await axios.get(`${API_URL}/predictions`);
      setHistory(response.data.history || []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.detail || 'Unable to retrieve prediction history.'
      );
      errorLog(err, 'Error retrieving prediction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionHistory();
  }, []);

  const vehicleTypes = useMemo(() => {
    return [...new Set(predictions.map(item => item.type))];
  }, [predictions]);

  const fuelTypes = useMemo(() => {
    return [...new Set(predictions.map(item => item.fuel))];
  }, [predictions]);

  useEffect(() => {
    if (predictions.length > 0) {
      setSelectedTypes([...new Set(predictions.map(item => item.type))]);
      setSelectedFuels([...new Set(predictions.map(item => item.fuel))]);
    }
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    return predictions.filter(item => {
      const typeMatch = selectedTypes.includes(item.type);
      const fuelMatch = selectedFuels.includes(item.fuel);
      return typeMatch && fuelMatch;
    });
  }, [predictions, selectedTypes, selectedFuels]);

  const d3PredCategoryBarData = useMemo(() => {
    const typeMap = {};
    filteredPredictions.forEach(item => {
      const t = item.type || 'Unknown';
      if (!typeMap[t]) typeMap[t] = 0;
      typeMap[t] += Number(item.number || 0);
    });
    return Object.entries(typeMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPredictions]);

  const d3PredHybridPieData = useMemo(() => {
    let hybridCount = 0;
    let nonHybridCount = 0;
    filteredPredictions.forEach(item => {
      const fuelName = String(item.fuel || '');
      const count = Number(item.number || 0);
      if (fuelName.includes('_')) {
        hybridCount += count;
      } else {
        nonHybridCount += count;
      }
    });
    return [
      { label: 'Non-Hybrid (Single Fuel)', value: nonHybridCount },
      { label: 'Hybrid / Dual-Fuel (_)', value: hybridCount }
    ].filter(d => d.value > 0);
  }, [filteredPredictions]);

  const d3PredEnergyTreemapData = useMemo(() => {
    const classifyTier = (fuel) => {
      if (['electric', 'hydrogen'].includes(fuel)) {
        return 'Zero-Emission (EV & Hydrogen)';
      }
      if (
        fuel.includes('hybrid') ||
        fuel.includes('greendiesel') ||
        fuel.includes('ng') ||
        fuel.includes('lng')
      ) {
        return 'Low-Emission (Hybrid, Bio & Natural Gas)';
      }
      if (['petrol', 'diesel'].includes(fuel)) {
        return 'Conventional Fossil (Petrol & Diesel)';
      }
      return 'Other Propulsion';
    };

    const segmentMap = {};
    filteredPredictions.forEach(item => {
      const count = Number(item.number || 0);
      if (count <= 0) return;
      const tier = classifyTier(String(item.fuel || ''));
      const key = `${tier}__${item.type} (${item.fuel})`;
      if (!segmentMap[key]) {
        segmentMap[key] = {
          name: `${item.type} - ${item.fuel}`,
          tier,
          value: 0
        };
      }
      segmentMap[key].value += count;
    });

    return Object.values(segmentMap);
  }, [filteredPredictions]);

  const handleResetFilters = () => {
    setSelectedTypes(vehicleTypes);
    setSelectedFuels(fuelTypes);
  };

  const handleExportPredictionsCSV = () => {
    if (!filteredPredictions.length) return;
    const headers = ['Vehicle Type,Fuel Type,Predicted Count'];
    const rows = filteredPredictions.map(item => `${item.type},${item.fuel},${item.number}`);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `malaysia_vehicle_predictions_${population}_${income}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPredictions([]);
    setSelectedHistoryId(null);

    if (
      !Number.isInteger(Number(population)) ||
      Number(population) <= 1 ||
      !Number.isInteger(Number(income)) ||
      Number(income) < 1
    ) {
      setError(
        'Validation Error: Population (above 15) must be an integer greater than 1, and Mean Income must be an integer greater than or equal to 1.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        population: Number(population),
        income: Number(income)
      });

      const results = response.data.Predictions;

      if (!Array.isArray(results)) {
        throw new Error('Invalid prediction data received from backend.');
      }

      setPredictions(results);
      setSelectedHistoryId(response.data.id);
      await fetchPredictionHistory();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Error predicting vehicles. Please ensure the FastAPI backend is running on port 8000.'
      );
      errorLog(err, 'Error predicting vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = async (historyId) => {
    try {
      setError('');
      const response = await axios.get(`${API_URL}/predictions/${historyId}`);
      const selected = response.data;

      setPopulation(String(selected.population));
      setIncome(String(selected.income));
      setPredictions(selected.predictions || []);
      setSelectedHistoryId(selected.id);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Unable to load selected prediction.'
      );
      errorLog(err, 'Error loading historical prediction');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}>

        {/* Site Name & Navigation Menu */}
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.45rem', sm: '1.85rem', md: '2.125rem' } }}
        >
          Malaysia Vehicle Registration Platform
        </Typography>

        <Box sx={{ borderBottom: 2, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, val) => setCurrentTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Home" value="home" sx={{ fontWeight: currentTab === 'home' ? 'bold' : 'normal' }} />
            <Tab label="Historical Data" value="historical" sx={{ fontWeight: currentTab === 'historical' ? 'bold' : 'normal' }} />
            <Tab label="Prediction" value="prediction" sx={{ fontWeight: currentTab === 'prediction' ? 'bold' : 'normal' }} />
          </Tabs>
        </Box>

        {currentTab === 'home' && (
          <Paper elevation={3} sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Welcome to the Malaysian Vehicle Registration Analysis & Prediction Platform
            </Typography>
            <Typography variant="body1" paragraph>
              This platform helps automotive dealers, importers, manufacturers, and transport policymakers explore 25 years of official Malaysian vehicle registration records (2000–2025) and generate machine-learning volume forecasts.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              How to Navigate This Platform:
            </Typography>
            <Typography variant="body1" component="div" sx={{ mb: 2 }}>
              <ul>
                <li>
                  <strong>Historical Data Dashboard:</strong> Filter official JPJ registration records using multi-select checkbox dropdowns for Year, Vehicle Category, and Fuel Type. Interact with D3.js visualizations, enlarge charts for detailed inspection, or view the underlying data table in a modal pop-up.
                </li>
                <li>
                  <strong>Prediction Page:</strong> Enter projected Population (Aged 15+, in thousands) and Mean Household Income (RM) to run our optimized <strong>Random Forest Regressor</strong> (R² = 0.9965) and forecast registration volumes across all vehicle categories and fuel types.
                </li>
              </ul>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Data Sources:</strong> Official Open Data Portal of Malaysia (data.gov.my) — Vehicle Registration Transactions, State Population Tables, and Household Income Surveys (CC-BY 4.0).
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={() => setCurrentTab('historical')}>
                Explore Historical Data
              </Button>
              <Button variant="outlined" onClick={() => setCurrentTab('prediction')}>
                Go to ML Prediction Tool
              </Button>
            </Stack>
          </Paper>
        )}

        {currentTab === 'prediction' && (
          <Box>
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f5f9ff', borderLeft: '4px solid #0072B2' }}>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                <strong>Instructions:</strong> Enter projected population aged 15+ (e.g., <code>28500</code> for 28.5 million) and mean monthly household income in RM (e.g., <code>9500</code>). Click <strong>Predict</strong> to generate D3.js charts, use the checkbox dropdowns to filter categories/fuels, or hover over any column for a complete category breakdown.
              </Typography>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' },
                gap: 3,
                alignItems: 'start'
              }}
            >
              <Box>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Prediction Criteria
                  </Typography>
                  <form onSubmit={handleSubmit}>
                    <Stack spacing={2.5} sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Population (Above 15, in '000s)"
                        placeholder="e.g., 28500"
                        variant="outlined"
                        value={population}
                        onChange={(e) => setPopulation(e.target.value)}
                        inputProps={{ min: 2, step: 1 }}
                        helperText="Enter integer > 1 (e.g., 26813 for 2025)"
                        required
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Average Household Income (RM)"
                        placeholder="e.g., 9500"
                        variant="outlined"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Enter integer >= 1 (e.g., 9380 for 2025)"
                        required
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                        size="large"
                      >
                        {loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          'Predict'
                        )}
                      </Button>
                    </Stack>
                  </form>
                </Paper>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="h6" fontWeight="bold">Prediction History</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={fetchPredictionHistory}
                      disabled={historyLoading}
                    >
                      Refresh
                    </Button>
                  </Box>

                  {historyError && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {historyError}
                    </Alert>
                  )}

                  {historyLoading ? (
                    <Box textAlign="center" sx={{ py: 2 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : history.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      No prediction history yet. Submit a prediction above.
                    </Typography>
                  ) : (
                    <List sx={{ maxHeight: 280, overflowY: 'auto' }}>
                      {history.map((item) => (
                        <React.Fragment key={item.id}>
                          <ListItem disablePadding>
                            <ListItemButton
                              selected={selectedHistoryId === item.id}
                              onClick={() => handleSelectHistory(item.id)}
                              sx={{ borderRadius: 1 }}
                            >
                              <ListItemText
                                primary={`Prediction #${item.id}`}
                                secondary={`Pop: ${Number(item.population).toLocaleString()} | Income: RM ${Number(item.income).toLocaleString()}`}
                              />
                              {selectedHistoryId === item.id && (
                                <Chip label="Active" color="primary" size="small" />
                              )}
                            </ListItemButton>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Box>

              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3.5 }, mb: 3, width: '100%', boxSizing: 'border-box' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      mb: 2
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Prediction Visualizations Dashboard
                      </Typography>
                      {predictions.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Active Parameters — Population (15+): <strong>{Number(population).toLocaleString()}</strong> | Mean Income: <strong>RM {Number(income).toLocaleString()}</strong>
                        </Typography>
                      )}
                    </Box>

                    {predictions.length > 0 && (
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        onClick={handleExportPredictionsCSV}
                      >
                        Export CSV
                      </Button>
                    )}
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {predictions.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        Enter Population and Mean Income on the left and click &quot;Predict&quot; to generate interactive D3.js visualizations.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
                          gap: 2,
                          alignItems: 'center',
                          bgcolor: '#f8fafc',
                          p: 2,
                          borderRadius: 1.5,
                          border: '1px solid #e2e8f0',
                          mb: 2.5
                        }}
                      >
                        <CheckboxMultiSelect
                          label="Vehicle Categories"
                          options={vehicleTypes}
                          selected={selectedTypes}
                          onChange={setSelectedTypes}
                        />

                        <CheckboxMultiSelect
                          label="Fuel Types"
                          options={fuelTypes}
                          selected={selectedFuels}
                          onChange={setSelectedFuels}
                        />

                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={handleResetFilters}
                          sx={{ height: 40, px: 2.5 }}
                        >
                          Reset View
                        </Button>
                      </Box>

                      <ChartCardHeader
                        title="Predicted Registrations by Fuel & Vehicle Type"
                        subtitle={`Showing ${filteredPredictions.length} of ${predictions.length} combinations — Hover over any column to view additional details.`}
                        onOpenTable={() => setOpenPredTableModal(true)}
                        onEnlarge={() => setEnlargedChart('predStack')}
                      />

                      {filteredPredictions.length > 0 ? (
                        <D3StackedBarChart
                          data={filteredPredictions}
                          height={430}
                        />
                      ) : (
                        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                          No predictions match the checked filters. Select at least one Category and Fuel Type.
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>

                {predictions.length > 0 && filteredPredictions.length > 0 && (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 3,
                        mb: 3
                      }}
                    >
                      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
                        <ChartCardHeader
                          title="Predicted Registrations by Vehicle Category"
                          onOpenTable={() => setOpenPredTableModal(true)}
                          onEnlarge={() => setEnlargedChart('predCatBar')}
                        />
                        <D3CategoryBarChart
                          data={d3PredCategoryBarData}
                          height={350}
                        />
                      </Paper>

                      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
                        <ChartCardHeader
                          title="Hybrid / Dual-Fuel (_) vs Non-Hybrid Share"
                          onOpenTable={() => setOpenPredTableModal(true)}
                          onEnlarge={() => setEnlargedChart('predHybridPie')}
                        />
                        <D3DonutChart
                          data={d3PredHybridPieData}
                          height={320}
                          isPie={true}
                        />
                      </Paper>
                    </Box>

                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
                      <ChartCardHeader
                        title="Predicted Volume by Energy & Emission Transition Tier (Treemap)"
                        subtitle="Groups predictions into Zero-Emission (EV/Hydrogen), Low-Emission (Hybrid/Bio/Gas), and Conventional Fossil tiers"
                        onOpenTable={() => setOpenPredTableModal(true)}
                        onEnlarge={() => setEnlargedChart('predEnergyTreemap')}
                      />
                      <D3EnergyTreemap
                        data={d3PredEnergyTreemapData}
                        height={350}
                      />
                    </Paper>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {currentTab === 'historical' && <HistoricalDashboard />}

        <Dialog
          open={openPredTableModal}
          onClose={() => setOpenPredTableModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Prediction Data Table (Pop: {Number(population).toLocaleString()}, Income: RM {Number(income).toLocaleString()})</span>
            <Button onClick={() => setOpenPredTableModal(false)} color="inherit">X Close</Button>
          </DialogTitle>
          <DialogContent dividers>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Vehicle Category</strong></TableCell>
                    <TableCell><strong>Fuel Type</strong></TableCell>
                    <TableCell align="right"><strong>Predicted Registrations</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPredictions.map((item, index) => (
                    <TableRow key={`${item.type}-${item.fuel}-${index}`} hover>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.fuel}</TableCell>
                      <TableCell align="right">{Number(item.number).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleExportPredictionsCSV} variant="contained" color="secondary">
              Export CSV
            </Button>
            <Button onClick={() => setOpenPredTableModal(false)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(enlargedChart)}
          onClose={() => setEnlargedChart(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {enlargedChart === 'predStack' && 'Predicted Registrations by Fuel & Vehicle Type'}
              {enlargedChart === 'predCatBar' && 'Predicted Registrations by Vehicle Category'}
              {enlargedChart === 'predHybridPie' && 'Hybrid / Dual-Fuel (_) vs Non-Hybrid Share'}
              {enlargedChart === 'predEnergyTreemap' && 'Predicted Volume by Energy & Emission Transition Tier (Treemap)'}
            </span>
            <Button onClick={() => setEnlargedChart(null)} color="inherit">X Close</Button>
          </DialogTitle>
          <DialogContent dividers>
            {enlargedChart === 'predStack' && (
              <D3StackedBarChart
                data={filteredPredictions}
                height={500}
              />
            )}
            {enlargedChart === 'predCatBar' && (
              <D3CategoryBarChart
                data={d3PredCategoryBarData}
                height={480}
              />
            )}
            {enlargedChart === 'predHybridPie' && (
              <D3DonutChart
                data={d3PredHybridPieData}
                height={460}
                isPie={true}
              />
            )}
            {enlargedChart === 'predEnergyTreemap' && (
              <D3EnergyTreemap
                data={d3PredEnergyTreemapData}
                height={480}
              />
            )}
          </DialogContent>
        </Dialog>

      </Container>
    </ThemeProvider>
  );
}