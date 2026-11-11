import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Typography } from '@mui/material';

const PALETTE = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'];

function seriesColor(color, index) {
  const value = color || PALETTE[index % PALETTE.length];
  return String(value).toLowerCase() === '#f0e442' ? '#c8960f' : value;
}

function useWidth(ref) {
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const next = Math.max(280, Math.round(node.clientWidth || 640));
      setWidth((current) => (Math.abs(current - next) > 2 ? next : current));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function BarChart({ labels, values, height = 280 }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const horizontal = labels.length > 6;
  const drawnHeight = horizontal ? Math.max(height, labels.length * 28 + 36) : height;

  useEffect(() => {
    const node = ref.current;
    if (!node || !labels.length) return undefined;
    const margin = horizontal
      ? { top: 8, right: 92, bottom: 28, left: 118 }
      : { top: 12, right: 12, bottom: 78, left: 58 };
    const innerW = Math.max(80, width - margin.left - margin.right);
    const innerH = drawnHeight - margin.top - margin.bottom;
    const svg = d3.select(node).select('svg');
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${drawnHeight}`).attr('height', drawnHeight);
    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const max = d3.max(values) || 1;
    const tip = d3.select(node).selectAll('.d3-tooltip').data([null]).join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'fixed')
      .style('visibility', 'hidden')
      .style('background', 'rgba(18, 26, 40, 0.96)')
      .style('color', '#fff')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('z-index', 9999);
    const showTip = (event, label, value) => {
      tip.style('visibility', 'visible')
        .html(`<strong>${label}</strong><br>${d3.format(',')(value)}`)
        .style('left', `${Math.min(event.clientX + 14, window.innerWidth - 160)}px`)
        .style('top', `${Math.max(8, event.clientY - 48)}px`);
    };
    const watch = (selection, band) => selection
      .style('cursor', 'pointer')
      .on('mousemove', (event, label) => {
        const index = labels.indexOf(label);
        showTip(event, label, values[index] || 0);
        d3.select(band(label)).attr('opacity', 0.75);
      })
      .on('mouseleave', (event, label) => {
        tip.style('visibility', 'hidden');
        d3.select(band(label)).attr('opacity', 1);
      });

    if (horizontal) {
      const y = d3.scaleBand().domain(labels).range([0, innerH]).padding(0.22);
      const x = d3.scaleLinear().domain([0, max]).nice().range([0, innerW]);
      root.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('~s')));
      root.append('g').call(d3.axisLeft(y));
      const bars = root.selectAll('rect.bar').data(labels).join('rect')
        .attr('class', (_, index) => `bar bar-${index}`)
        .attr('y', (label) => y(label))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('width', (_, index) => Math.max(x(values[index] || 0), 2))
        .attr('fill', (_, index) => seriesColor(null, index));
      watch(root.selectAll('rect.hit').data(labels).join('rect')
        .attr('class', 'hit')
        .attr('fill', 'transparent')
        .attr('y', (label) => y(label))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('width', innerW), (label) => bars.nodes()[labels.indexOf(label)]);
      root.selectAll('text.value').data(labels).join('text')
        .attr('pointer-events', 'none')
        .attr('x', (_, index) => x(values[index] || 0) + 6)
        .attr('y', (label) => y(label) + y.bandwidth() / 2)
        .attr('dy', '0.32em')
        .attr('font-size', 12)
        .attr('fill', '#2a3544')
        .text((_, index) => d3.format(',')(values[index] || 0));
    } else {
      const x = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.25);
      const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);
      root.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x))
        .selectAll('text').attr('transform', 'rotate(-32)').style('text-anchor', 'end');
      root.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));
      const bars = root.selectAll('rect.bar').data(labels).join('rect')
        .attr('class', (_, index) => `bar bar-${index}`)
        .attr('x', (label) => x(label))
        .attr('y', (_, index) => y(values[index] || 0))
        .attr('width', x.bandwidth())
        .attr('height', (_, index) => Math.max(innerH - y(values[index] || 0), 2))
        .attr('fill', (_, index) => seriesColor(null, index));
      watch(root.selectAll('rect.hit').data(labels).join('rect')
        .attr('class', 'hit')
        .attr('fill', 'transparent')
        .attr('x', (label) => x(label))
        .attr('y', 0)
        .attr('width', x.bandwidth())
        .attr('height', innerH), (label) => bars.nodes()[labels.indexOf(label)]);
      root.selectAll('text.value').data(labels).join('text')
        .attr('pointer-events', 'none')
        .attr('text-anchor', 'middle')
        .attr('x', (label) => x(label) + x.bandwidth() / 2)
        .attr('y', (_, index) => Math.max(12, y(values[index] || 0) - 6))
        .attr('font-size', 11)
        .attr('fill', '#2a3544')
        .text((_, index) => d3.format(',')(values[index] || 0));
    }
    return () => { tip.remove(); };
  }, [labels, values, width, drawnHeight, horizontal]);

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      {labels.length ? <svg role="img" style={{ width: '100%', height: drawnHeight }} /> : <Typography variant="body2" color="text.secondary">No rows for this filter.</Typography>}
    </Box>
  );
}

function escapeTip(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

export function LineChart({ series, height = 280, xLabel = 'Year', totalLabel = '' }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const drawn = series.filter((item) => item.points && item.points.length);
  const signature = JSON.stringify(drawn.map((item) => ({
    name: item.name,
    color: item.color || '',
    points: item.points
  })));

  useEffect(() => {
    const node = ref.current;
    const plotted = JSON.parse(signature);
    if (!node || !plotted.length) return undefined;
    const margin = { top: 16, right: 16, bottom: 36, left: 58 };
    const innerW = Math.max(80, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;
    const labels = plotted[0].points.map((point) => point.x);
    const svg = d3.select(node).select('svg');
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scalePoint().domain(labels).range([0, innerW]);
    const yMax = d3.max(plotted.flatMap((item) => item.points.map((point) => point.y))) || 1;
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);
    const line = d3.line().defined((point) => Number.isFinite(point.y)).x((point) => x(point.x)).y((point) => y(point.y));
    root.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(labels.filter((_, index) => index % Math.ceil(labels.length / 8) === 0)));
    root.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));
    const pointRadius = labels.length > 12 ? 2.4 : 3.4;
    plotted.forEach((item, index) => {
      const color = seriesColor(item.color, index);
      root.append('path').datum(item.points).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.4).attr('d', line).attr('pointer-events', 'none');
      root.append('g').selectAll('circle')
        .data(item.points.filter((point) => Number.isFinite(point.y)))
        .join('circle')
        .attr('class', 'series-point')
        .attr('cx', (point) => x(point.x))
        .attr('cy', (point) => y(point.y))
        .attr('r', pointRadius)
        .attr('fill', color)
        .attr('pointer-events', 'none');
    });

    const bandWidth = Math.max(8, Math.min(28, innerW / Math.max(labels.length, 1)));
    const band = root.append('rect')
      .attr('class', 'hover-band')
      .attr('y', 0)
      .attr('width', bandWidth)
      .attr('height', innerH)
      .attr('fill', 'rgba(200, 150, 15, 0.16)')
      .attr('pointer-events', 'none')
      .style('opacity', 0);
    const guide = root.append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#c8960f')
      .attr('stroke-width', 1.4)
      .attr('pointer-events', 'none')
      .style('opacity', 0);
    const tip = d3.select(node).selectAll('.d3-tooltip').data([null]).join('div')
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
      .style('z-index', 9999)
      .style('max-width', '280px');

    const nearest = (mouseX) => labels.reduce((best, label) => {
      const distance = Math.abs(x(label) - mouseX);
      return distance < best.distance ? { label, distance } : best;
    }, { label: labels[0], distance: Infinity }).label;

    root.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mouseX] = d3.pointer(event);
        const label = nearest(mouseX);
        const at = x(label);
        band.attr('x', at - bandWidth / 2).style('opacity', 1);
        guide.attr('x1', at).attr('x2', at).style('opacity', 1);
        root.selectAll('.series-point')
          .attr('r', (point) => (point.x === label ? 5.5 : pointRadius))
          .attr('stroke', (point) => (point.x === label ? '#121a28' : 'none'))
          .attr('stroke-width', 1.5);
        const rows = plotted.map((item, index) => {
          const point = item.points.find((entry) => entry.x === label);
          const value = point && Number.isFinite(point.y) ? point.y : 0;
          return { name: item.name, value, color: seriesColor(item.color, index) };
        });
        const breakdown = rows.map((row) => (
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:2px;">` +
            `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${row.color};margin-right:6px;"></span>` +
            `<span style="text-transform:capitalize">${escapeTip(row.name)}</span></span>` +
            `<strong>${Number(row.value).toLocaleString('en-MY')}</strong>` +
          `</div>`
        )).join('');
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        const totalHtml = totalLabel
          ? `<div style="margin-bottom:4px;"><strong>${escapeTip(totalLabel)}: ${total.toLocaleString('en-MY')}</strong></div>`
          : '';
        const tooltipWidth = 260;
        const left = event.clientX + tooltipWidth + 30 > window.innerWidth
          ? event.clientX - tooltipWidth - 15
          : event.clientX + 16;
        tip.style('visibility', 'visible')
          .html(
            `<div style="border-bottom:1px solid rgba(255,255,255,0.25);padding-bottom:6px;margin-bottom:6px;font-size:13.5px;font-weight:bold;">` +
              `${escapeTip(xLabel)}: ${escapeTip(label)}` +
            `</div>${totalHtml}${breakdown}`
          )
          .style('top', `${Math.max(15, event.clientY - 70)}px`)
          .style('left', `${left}px`);
      })
      .on('mouseleave', () => {
        band.style('opacity', 0);
        guide.style('opacity', 0);
        root.selectAll('.series-point').attr('r', pointRadius).attr('stroke', 'none');
        tip.style('visibility', 'hidden');
      });

    return () => { tip.remove(); };
  }, [signature, width, height, xLabel, totalLabel]);

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      {drawn.length ? <svg role="img" style={{ width: '100%', height }} /> : <Typography variant="body2" color="text.secondary">No rows for this filter.</Typography>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mt: 1 }}>
        {drawn.map((item, index) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box sx={{ width: 12, height: 8, bgcolor: seriesColor(item.color, index), borderRadius: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#2a3544' }}>{item.name}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
