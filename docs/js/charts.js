// (1) SHARED START: chart helpers used by homepage, historical, and prediction
const PALETTE = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"];
const SYMBOLS = [d3.symbolCircle, d3.symbolTriangle, d3.symbolSquare, d3.symbolDiamond, d3.symbolStar, d3.symbolCross, d3.symbolWye, d3.symbolCircle];

function formatCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${(n / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(/\.0$/, "")}m`;
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return d3.format(",.0f")(n);
}

function formatFull(value) {
  const n = Number(value) || 0;
  const digits = Number.isInteger(n) ? 0 : 1;
  return n.toLocaleString("en-MY", { maximumFractionDigits: digits });
}

function chartTip() {
  let tip = document.getElementById("chart-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "chart-tip";
    tip.className = "chart-tip";
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
}

function showTip(text, event) {
  const tip = chartTip();
  tip.hidden = false;
  tip.textContent = text;
  const pointX = event.clientX ?? 16;
  const pointY = event.clientY ?? 16;
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, pointX + 12))}px`;
  tip.style.top = `${Math.max(8, Math.min(window.innerHeight - 48, pointY + 14))}px`;
}

function hideTip() {
  const tip = document.getElementById("chart-tip");
  if (tip) tip.hidden = true;
}

function drawChart(target, spec) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  el.__spec = spec;
  paintChart(el);
  if (!el.__watch) {
    el.__watch = new ResizeObserver(() => paintChart(el));
    el.__watch.observe(el);
  }
}

function paintChart(el) {
  const spec = el.__spec;
  if (!spec) return;
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width < 40 || height < 40) return;
  const labels = spec.labels || [];
  const series = spec.series || [];
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", spec.label || "Chart");
  el.replaceChildren();
  if (!labels.length || !series.length) {
    el.textContent = "No records for this filter.";
    return;
  }

  const showLegend = series.length > 1 && spec.type !== "bar";
  const horizontal = spec.horizontal === true;
  const longest = d3.max(labels, (label) => String(label).length) || 1;
  const rotateLabels = !horizontal && (spec.type === "bar" || spec.type === "stacked");
  const margin = {
    top: 12,
    right: horizontal ? 84 : 16,
    bottom: (rotateLabels ? 58 : 28) + (spec.xTitle ? 16 : 0) + (showLegend ? 36 : 0),
    left: horizontal ? Math.min(132, 16 + longest * 7.2) : 48
  };
  const innerW = Math.max(24, width - margin.left - margin.right);
  const innerH = Math.max(24, height - margin.top - margin.bottom);
  const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const tick = spec.compact === false ? (value) => d3.format(",.0f")(value) : formatCompact;

  if (spec.type === "line") paintLine(g, spec, innerW, innerH, tick);
  else if (spec.type === "stacked") paintStacked(g, spec, innerW, innerH, tick);
  else paintBars(g, spec, innerW, innerH, tick, horizontal);

  if (spec.xTitle) {
    g.append("text")
      .attr("class", "axis-title")
      .attr("x", innerW / 2)
      .attr("y", innerH + (rotateLabels ? 52 : 36))
      .attr("text-anchor", "middle")
      .text(spec.xTitle);
  }
  if (spec.yTitle) {
    g.append("text")
      .attr("class", "axis-title")
      .attr("transform", `translate(${horizontal ? -margin.left + 12 : -36},${innerH / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text(spec.yTitle);
  }
  if (showLegend) paintLegend(svg, series, margin.left, height - 22, innerW);
}

function paintLegend(svg, series, x0, y0, innerW) {
  const row = svg.append("g").attr("transform", `translate(${x0},${y0})`);
  let x = 0;
  let y = 0;
  series.forEach((item, index) => {
    const width = String(item.name).length * 6.6 + 20;
    if (x > 0 && x + width > innerW) {
      x = 0;
      y -= 16;
    }
    const g = row.append("g").attr("transform", `translate(${x},${y})`);
    g.append("rect").attr("y", -9).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", item.color || PALETTE[index % PALETTE.length]);
    g.append("text").attr("x", 14).attr("y", 0).text(item.name);
    x += width;
  });
}

function paintBars(g, spec, innerW, innerH, tick, horizontal) {
  const values = spec.series[0].values.map((value) => Number(value) || 0);
  const colors = spec.series[0].colors || spec.labels.map((_, index) => PALETTE[index % PALETTE.length]);
  const max = d3.max(values) || 1;
  const valueScale = d3.scaleLinear().domain([0, max]).nice().range(horizontal ? [0, innerW] : [innerH, 0]);
  const band = d3.scaleBand().domain(spec.labels).range(horizontal ? [0, innerH] : [0, innerW]).padding(0.28);
  const grid = horizontal
    ? d3.axisBottom(valueScale).ticks(4).tickSize(-innerH).tickFormat("")
    : d3.axisLeft(valueScale).ticks(4).tickSize(-innerW).tickFormat("");
  g.append("g").attr("class", "grid").attr("transform", horizontal ? `translate(0,${innerH})` : "").call(grid);
  const bottom = g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(horizontal ? d3.axisBottom(valueScale).ticks(4).tickFormat(tick) : d3.axisBottom(band));
  if (!horizontal) {
    bottom.selectAll("text")
      .attr("transform", "rotate(-32)")
      .style("text-anchor", "end")
      .attr("dx", "-0.3em")
      .attr("dy", "0.4em");
  }
  g.append("g")
    .attr("class", "axis")
    .call(horizontal ? d3.axisLeft(band) : d3.axisLeft(valueScale).ticks(4).tickFormat(tick));

  g.selectAll("rect.bar")
    .data(spec.labels)
    .join("rect")
    .attr("class", "bar")
    .attr("fill", (_, index) => colors[index] || PALETTE[index % PALETTE.length])
    .attr("x", horizontal ? 0 : (label) => band(label))
    .attr("y", horizontal ? (label) => band(label) : (_, index) => valueScale(values[index]))
    .attr("width", horizontal ? (_, index) => valueScale(values[index]) : band.bandwidth())
    .attr("height", horizontal ? band.bandwidth() : (_, index) => innerH - valueScale(values[index]))
    .on("pointermove", (event, label) => {
      const index = spec.labels.indexOf(label);
      showTip(`${label}: ${formatFull(values[index])}`, event);
    })
    .on("pointerleave", hideTip);

  if (horizontal) {
    g.selectAll("text.value")
      .data(spec.labels)
      .join("text")
      .attr("class", "value")
      .attr("x", (_, index) => valueScale(values[index]) + 6)
      .attr("y", (label) => band(label) + band.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .text((_, index) => formatFull(values[index]));
  }
}

function paintLine(g, spec, innerW, innerH, tick) {
  const max = d3.max(spec.series, (item) => d3.max(item.values, (value) => Number(value) || 0)) || 1;
  const x = d3.scalePoint().domain(spec.labels).range([0, innerW]).padding(0.3);
  const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""));
  const step = Math.max(1, Math.ceil(spec.labels.length / 6));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(spec.labels.filter((_, index) => index % step === 0 || index === spec.labels.length - 1)));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(tick));
  const line = d3.line().x((_, index) => x(spec.labels[index])).y((value) => y(Number(value) || 0));
  spec.series.forEach((item, seriesIndex) => {
    const color = item.color || PALETTE[seriesIndex % PALETTE.length];
    g.append("path").attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line(item.values));
    g.selectAll(null)
      .data(item.values.map((value, index) => ({ value, index })))
      .join("path")
      .attr("d", d3.symbol().type(SYMBOLS[seriesIndex % SYMBOLS.length]).size(36))
      .attr("transform", (point) => `translate(${x(spec.labels[point.index])},${y(Number(point.value) || 0)})`)
      .attr("fill", color)
      .on("pointermove", (event, point) => {
        showTip(`${item.name}, ${spec.labels[point.index]}: ${formatFull(point.value)}`, event);
      })
      .on("pointerleave", hideTip);
  });
}

function paintStacked(g, spec, innerW, innerH, tick) {
  const keys = spec.series.map((item) => item.name);
  const rows = spec.labels.map((label, index) => {
    const row = { label };
    spec.series.forEach((item) => {
      row[item.name] = Number(item.values[index]) || 0;
    });
    return row;
  });
  const stacked = d3.stack().keys(keys)(rows);
  const max = d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])) || 1;
  const x = d3.scaleBand().domain(spec.labels).range([0, innerW]).padding(0.28);
  const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""));
  const fuelAxis = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
  fuelAxis.selectAll("text").attr("transform", "rotate(-28)").style("text-anchor", "end").attr("dx", "-0.2em");
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(tick));
  stacked.forEach((layer, seriesIndex) => {
    const color = spec.series[seriesIndex].color || PALETTE[seriesIndex % PALETTE.length];
    g.selectAll(null)
      .data(layer)
      .join("rect")
      .attr("x", (d) => x(d.data.label))
      .attr("y", (d) => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr("fill", color)
      .on("pointermove", (event, d) => {
        showTip(`${spec.series[seriesIndex].name}, ${d.data.label}: ${formatFull(d[1] - d[0])}`, event);
      })
      .on("pointerleave", hideTip);
  });
}

function trimTick(label, slot) {
  const text = String(label);
  const limit = Math.max(3, Math.floor(slot / 7));
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
// (1) SHARED END
