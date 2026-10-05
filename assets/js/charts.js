/* charts.js — draws every visualisation as plain SVG (no external library)
 * and fills the data-driven numbers in the story text.
 *
 * Colour encoding is the same on every chart:
 *   Small TVs = light gold, Medium = amber, Large = brown   (the logo colours)
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var CAT_COLORS = { Small: '#F6D77A', Medium: '#EEA944', Large: '#7D6847' };
  var CATS = ['Small', 'Medium', 'Large'];
  var BAR_COLOR = '#EEA944';
  var STROKE = '#3F3320';

  // ---------------------------------------------------------------- helpers
  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, str, attrs) {
    var t = el('text', attrs, parent);
    t.textContent = str;
    return t;
  }
  function fmt(n, d) {
    if (!isFinite(n)) return '—';
    return Number(n).toLocaleString('en-AU', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }
  function ticks(max, count) {
    var out = [], step = max / count;
    for (var i = 0; i <= count; i++) out.push(step * i);
    return out;
  }
  function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function setup(container, height, margin) {
    container.innerHTML = '';
    var w = Math.max(300, container.clientWidth || 600);
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + height, role: 'img', width: w, height: height }, container);
    var m = margin;
    return { svg: svg, w: w, h: height, m: m, iw: w - m.l - m.r, ih: height - m.t - m.b };
  }

  function yAxis(c, max, title, tickCount, digits) {
    var g = el('g', {}, c.svg);
    ticks(max, tickCount || 5).forEach(function (t) {
      var y = c.m.t + c.ih - (t / max) * c.ih;
      el('line', { x1: c.m.l, x2: c.m.l + c.iw, y1: y, y2: y, 'class': 'grid-line' }, g);
      text(g, fmt(t, digits || 0), { x: c.m.l - 8, y: y + 4, 'text-anchor': 'end', 'class': 'tick-text' });
    });
    el('line', { x1: c.m.l, x2: c.m.l, y1: c.m.t, y2: c.m.t + c.ih, 'class': 'axis-line' }, g);
    if (title) {
      text(g, title, { x: 14, y: c.m.t + c.ih / 2, 'class': 'axis-title', 'text-anchor': 'middle',
        transform: 'rotate(-90 14 ' + (c.m.t + c.ih / 2) + ')' });
    }
  }
  function xAxisLine(c) {
    el('line', { x1: c.m.l, x2: c.m.l + c.iw, y1: c.m.t + c.ih, y2: c.m.t + c.ih, 'class': 'axis-line' }, c.svg);
  }
  function describe(c, label) {
    var t = el('title', {}, c.svg); t.textContent = label;
    c.svg.insertBefore(t, c.svg.firstChild);
  }

  // ----------------------------------------------- horizontal bar (brands)
  function hBar(container, items, o) {
    var rowH = 30, m = { t: 8, r: 56, b: 40, l: o.labelWidth || 120 };
    var c = setup(container, m.t + m.b + items.length * rowH, m);
    describe(c, o.label);
    var max = niceMax(Math.max.apply(null, items.map(function (d) { return d.value; })));
    ticks(max, 4).forEach(function (t) {
      var x = c.m.l + (t / max) * c.iw;
      el('line', { x1: x, x2: x, y1: c.m.t, y2: c.m.t + c.ih, 'class': 'grid-line' }, c.svg);
      text(c.svg, fmt(t), { x: x, y: c.m.t + c.ih + 16, 'text-anchor': 'middle', 'class': 'tick-text' });
    });
    el('line', { x1: c.m.l, x2: c.m.l, y1: c.m.t, y2: c.m.t + c.ih, 'class': 'axis-line' }, c.svg);
    items.forEach(function (d, i) {
      var y = c.m.t + i * rowH + 4, w = (d.value / max) * c.iw;
      var r = el('rect', { x: c.m.l, y: y, width: Math.max(w, 1), height: rowH - 9, rx: 3,
        fill: BAR_COLOR, stroke: STROKE, 'stroke-width': 1, 'class': 'bar' }, c.svg);
      el('title', {}, r).textContent = d.label + ': ' + fmt(d.value) + ' ' + (o.unit || '');
      text(c.svg, shorten(d.label, 18), { x: c.m.l - 8, y: y + (rowH - 9) / 2 + 4, 'text-anchor': 'end', 'class': 'tick-text' });
      text(c.svg, fmt(d.value), { x: c.m.l + w + 6, y: y + (rowH - 9) / 2 + 4, 'class': 'val-text' });
    });
    text(c.svg, o.xTitle || '', { x: c.m.l + c.iw / 2, y: c.h - 4, 'text-anchor': 'middle', 'class': 'axis-title' });
  }

  // -------------------------------------------- column chart (histogram)
  function histogram(container, bins, o) {
    var m = { t: 14, r: 12, b: 56, l: 54 };
    var c = setup(container, 300, m);
    describe(c, o.label);
    var max = niceMax(Math.max.apply(null, bins.map(function (b) { return b.value; })));
    yAxis(c, max, o.yTitle, 4);
    var bw = c.iw / bins.length;
    bins.forEach(function (b, i) {
      var h = (b.value / max) * c.ih, x = c.m.l + i * bw;
      var r = el('rect', { x: x + 1, y: c.m.t + c.ih - h, width: Math.max(bw - 2, 1), height: h,
        fill: BAR_COLOR, stroke: STROKE, 'stroke-width': 1, 'class': 'bar' }, c.svg);
      el('title', {}, r).textContent = b.label + ': ' + fmt(b.value) + ' ' + (o.unit || '');
      var every = Math.ceil(bins.length / Math.floor(c.iw / 44));
      if (i % every === 0) text(c.svg, b.label, { x: x + bw / 2, y: c.m.t + c.ih + 16, 'text-anchor': 'middle', 'class': 'tick-text' });
    });
    xAxisLine(c);
    text(c.svg, o.xTitle, { x: c.m.l + c.iw / 2, y: c.h - 8, 'text-anchor': 'middle', 'class': 'axis-title' });
  }

  // ----------------------------------------------------- grouped columns
  // categories: x labels; series: [{name,color,values:[number|null]}]
  function grouped(container, categories, series, o) {
    var m = { t: 24, r: 12, b: 62, l: 58 };
    var c = setup(container, o.height || 330, m);
    describe(c, o.label);
    var all = [];
    series.forEach(function (s) { s.values.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all));
    yAxis(c, max, o.yTitle, 5);
    var gw = c.iw / categories.length, pad = Math.min(14, gw * 0.12);
    var bw = (gw - pad * 2) / series.length;
    var showVals = bw > 30;
    categories.forEach(function (cat, i) {
      var gx = c.m.l + i * gw + pad;
      series.forEach(function (s, j) {
        var v = s.values[i];
        if (v == null || !isFinite(v)) return;
        var h = (v / max) * c.ih, x = gx + j * bw;
        var r = el('rect', { x: x + 1, y: c.m.t + c.ih - h, width: Math.max(bw - 2, 1), height: h,
          fill: s.color, stroke: STROKE, 'stroke-width': 1, 'class': 'bar' }, c.svg);
        var n = s.counts ? ' (n = ' + s.counts[i] + ')' : '';
        el('title', {}, r).textContent = cat + ' · ' + s.name + ': ' + fmt(v) + ' ' + (o.unit || '') + n;
        if (showVals) text(c.svg, fmt(v), { x: x + bw / 2, y: c.m.t + c.ih - h - 5, 'text-anchor': 'middle', 'class': 'val-text' });
      });
      var lab = shorten(String(cat), Math.max(6, Math.floor(gw / 7)));
      text(c.svg, lab, { x: c.m.l + i * gw + gw / 2, y: c.m.t + c.ih + 18, 'text-anchor': 'middle', 'class': 'tick-text' });
    });
    xAxisLine(c);
    text(c.svg, o.xTitle, { x: c.m.l + c.iw / 2, y: c.h - 10, 'text-anchor': 'middle', 'class': 'axis-title' });
  }

  // ---------------------------------------------------------------- scatter
  function scatter(container, series, o) {
    var m = { t: 14, r: 16, b: 56, l: 62 };
    var c = setup(container, 380, m);
    describe(c, o.label);
    var xs = [], ys = [];
    series.forEach(function (s) { s.points.forEach(function (p) { xs.push(p.x); ys.push(p.y); }); });
    var xMax = Math.ceil(Math.max.apply(null, xs) / 20) * 20, yMax = niceMax(Math.max.apply(null, ys));
    yAxis(c, yMax, o.yTitle, 5);
    ticks(xMax, xMax / 20).forEach(function (t) {
      var x = c.m.l + (t / xMax) * c.iw;
      el('line', { x1: x, x2: x, y1: c.m.t, y2: c.m.t + c.ih, 'class': 'grid-line' }, c.svg);
      text(c.svg, fmt(t), { x: x, y: c.m.t + c.ih + 18, 'text-anchor': 'middle', 'class': 'tick-text' });
    });
    xAxisLine(c);
    // draw Large first so smaller categories stay visible on top
    series.slice().reverse().forEach(function (s) {
      var g = el('g', {}, c.svg);
      s.points.forEach(function (p) {
        var d = el('circle', { cx: c.m.l + (p.x / xMax) * c.iw, cy: c.m.t + c.ih - (p.y / yMax) * c.ih, r: 4.2,
          fill: s.color, stroke: STROKE, 'class': 'dot' }, g);
        el('title', {}, d).textContent = s.name + ': ' + fmt(p.x, 1) + '" · ' + fmt(p.y) + ' kWh/year' + (p.tip ? ' · ' + p.tip : '');
      });
    });
    text(c.svg, o.xTitle, { x: c.m.l + c.iw / 2, y: c.h - 8, 'text-anchor': 'middle', 'class': 'axis-title' });
  }

  // ============================================================ analysis
  function analyse(data) {
    var D = window.TVData, recs = data.records, HS = data.config.highStar;
    var a = { recs: recs };
    a.count = recs.length;
    a.brands = {};
    recs.forEach(function (r) { a.brands[r.brand] = (a.brands[r.brand] || 0) + 1; });
    a.brandList = Object.keys(a.brands).map(function (b) { return { label: b, value: a.brands[b] }; })
      .sort(function (x, y) { return y.value - x.value; });
    a.brandCount = a.brandList.length;

    a.medianKwh = D.median(recs.map(function (r) { return r.kwh; }));
    var starred = recs.filter(function (r) { return isFinite(r.star); });
    a.starShare = starred.length ? starred.filter(function (r) { return r.star >= HS; }).length / starred.length : NaN;

    a.catMean = {}; a.catN = {}; a.catMedianInch = {};
    CATS.forEach(function (cat) {
      var rs = recs.filter(function (r) { return r.category === cat; });
      a.catN[cat] = rs.length;
      a.catMean[cat] = D.mean(rs.map(function (r) { return r.kwh; }));
      a.catMedianInch[cat] = D.median(rs.map(function (r) { return r.inch; }));
    });

    // technology x size category (the KNIME Pivot node)
    var techs = {};
    recs.forEach(function (r) { techs[r.tech] = (techs[r.tech] || 0) + 1; });
    a.techs = Object.keys(techs).sort(function (x, y) { return techs[y] - techs[x]; });
    a.techMean = {}; a.techN = {};
    a.techs.forEach(function (t) {
      a.techMean[t] = {}; a.techN[t] = {};
      CATS.forEach(function (cat) {
        var rs = recs.filter(function (r) { return r.tech === t && r.category === cat; });
        a.techN[t][cat] = rs.length;
        a.techMean[t][cat] = rs.length ? D.mean(rs.map(function (r) { return r.kwh; })) : null;
      });
    });

    // star rating: below the threshold vs at/above it, inside each size category
    a.star = {};
    CATS.forEach(function (cat) {
      var rs = recs.filter(function (r) { return r.category === cat && isFinite(r.star); });
      var lo = rs.filter(function (r) { return r.star < HS; }), hi = rs.filter(function (r) { return r.star >= HS; });
      a.star[cat] = {
        lo: lo.length >= 3 ? D.mean(lo.map(function (r) { return r.kwh; })) : null, loN: lo.length,
        hi: hi.length >= 3 ? D.mean(hi.map(function (r) { return r.kwh; })) : null, hiN: hi.length
      };
    });
    // whole-star bands for the chart
    var bandSet = {};
    starred.forEach(function (r) { bandSet[Math.min(10, Math.max(0, Math.floor(r.star)))] = true; });
    a.bands = Object.keys(bandSet).map(Number).sort(function (x, y) { return x - y; });
    a.bandMean = {}; a.bandN = {};
    CATS.forEach(function (cat) {
      a.bandMean[cat] = []; a.bandN[cat] = [];
      a.bands.forEach(function (b) {
        var rs = starred.filter(function (r) {
          return r.category === cat && Math.min(10, Math.max(0, Math.floor(r.star))) === b;
        });
        a.bandN[cat].push(rs.length);
        a.bandMean[cat].push(rs.length >= 2 ? D.mean(rs.map(function (r) { return r.kwh; })) : null);
      });
    });
    // keep only bands where at least one size group has a bar
    var keep = a.bands.map(function (b, i) {
      return CATS.some(function (cat) { return a.bandMean[cat][i] != null; });
    });
    a.bands = a.bands.filter(function (b, i) { return keep[i]; });
    CATS.forEach(function (cat) {
      a.bandMean[cat] = a.bandMean[cat].filter(function (v, i) { return keep[i]; });
      a.bandN[cat] = a.bandN[cat].filter(function (v, i) { return keep[i]; });
    });
    return a;
  }

  // ===================================================== fill text blocks
  function fillStats(a, data) {
    var map = {
      count: fmt(a.count), brands: fmt(a.brandCount), median: fmt(a.medianKwh),
      starShare: isFinite(a.starShare) ? fmt(a.starShare * 100) + '%' : '—',
      meanSmall: fmt(a.catMean.Small), meanMedium: fmt(a.catMean.Medium), meanLarge: fmt(a.catMean.Large),
      nSmall: fmt(a.catN.Small), nMedium: fmt(a.catN.Medium), nLarge: fmt(a.catN.Large),
      ratio: (a.catMean.Small > 0 && a.catMean.Large > 0) ? fmt(a.catMean.Large / a.catMean.Small, 1) + '×' : '—',
      read: fmt(data.stats.rowsRead), available: fmt(data.stats.afterAvailable),
      australia: fmt(data.stats.afterAustralia), usable: fmt(data.stats.usable), dropped: fmt(data.stats.dropped),
      topBrand: a.brandList[0] ? a.brandList[0].label : '—',
      highStar: data.config.highStar,
      topBrandN: a.brandList[0] ? fmt(a.brandList[0].value) : '—'
    };
    document.querySelectorAll('[data-stat]').forEach(function (n) {
      var k = n.getAttribute('data-stat');
      if (map[k] != null) n.textContent = map[k];
    });
    document.querySelectorAll('.is-loading').forEach(function (n) { n.classList.remove('is-loading'); });
  }

  function listInto(id, items) {
    var ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    if (!items.length) { items = ['Not enough models in this slice of the data to compare fairly.']; }
    items.forEach(function (s) { var li = document.createElement('li'); li.innerHTML = s; ul.appendChild(li); });
  }

  // =============================================================== render
  function render(a, data) {
    fillStats(a, data);

    var brandEl = document.getElementById('chart-brands');
    if (brandEl) {
      hBar(brandEl, a.brandList.slice(0, 10), {
        label: 'Bar chart: number of available TV models per brand, top 10',
        xTitle: 'Number of TV models', unit: 'models', labelWidth: 110
      });
    }

    var histEl = document.getElementById('chart-sizes');
    if (histEl) {
      var width = 5, bins = {};
      a.recs.forEach(function (r) {
        var b = Math.round(r.inch / width) * width;   // nearest 5 inches
        bins[b] = (bins[b] || 0) + 1;
      });
      var keys = Object.keys(bins).map(Number);
      var lo = Math.min.apply(null, keys), hi = Math.max.apply(null, keys), arr = [];
      for (var b = lo; b <= hi; b += width) arr.push({ label: b + '"', value: bins[b] || 0 });
      histogram(histEl, arr, { label: 'Histogram of screen sizes in inches', xTitle: 'Screen size (inches, rounded to the nearest 5)', yTitle: 'Number of models', unit: 'models' });
    }

    var scatEl = document.getElementById('chart-scatter');
    if (scatEl) {
      var series = CATS.map(function (cat) {
        return { name: cat, color: CAT_COLORS[cat],
          points: a.recs.filter(function (r) { return r.category === cat; })
            .map(function (r) { return { x: r.inch, y: r.kwh, tip: r.brand + ' · ' + r.tech }; }) };
      });
      scatter(scatEl, series, { label: 'Scatter plot of screen size against labelled energy use, coloured by size group',
        xTitle: 'Screen size (inches)', yTitle: 'Labelled energy use (kWh per year)' });
    }

    var catEl = document.getElementById('chart-category');
    if (catEl) {
      grouped(catEl, CATS.map(function (cat) { return cat + ' (' + fmt(a.catN[cat]) + ' models)'; }),
        [{ name: 'Average kWh/year', color: BAR_COLOR, values: CATS.map(function (c) { return a.catMean[c]; }) }],
        { label: 'Bar chart of average labelled energy use by size group', xTitle: 'Screen size group', yTitle: 'Average kWh per year', unit: 'kWh/year', height: 300 });
      // colour each bar by its size group
      var rects = catEl.querySelectorAll('rect.bar');
      rects.forEach(function (r, i) { if (CATS[i]) r.setAttribute('fill', CAT_COLORS[CATS[i]]); });
    }

    var starEl = document.getElementById('chart-stars');
    if (starEl && a.bands.length) {
      grouped(starEl, a.bands.map(function (b) { return b + '★'; }),
        CATS.map(function (cat) { return { name: cat, color: CAT_COLORS[cat], values: a.bandMean[cat], counts: a.bandN[cat] }; }),
        { label: 'Grouped bar chart of average energy use by star rating band and size group',
          xTitle: 'Star rating band (e.g. 5★ = 5.0 to 5.9 stars)', yTitle: 'Average kWh per year', unit: 'kWh/year' });
    }
    var HS = data.config.highStar;
    var starItems = [];
    CATS.forEach(function (cat) {
      var s = a.star[cat];
      if (s.lo != null && s.hi != null) {
        var diff = (1 - s.hi / s.lo) * 100;
        starItems.push('<strong>' + cat + ':</strong> models rated ' + HS + '★ or more average <strong>' + fmt(s.hi) + ' kWh</strong> vs <strong>' +
          fmt(s.lo) + ' kWh</strong> below ' + HS + '★ (' + (diff >= 0 ? fmt(diff) + '% less' : fmt(-diff) + '% more') + '; n = ' + s.hiN + ' and ' + s.loN + ').');
      }
    });
    listInto('star-insights', starItems);

    var techEl = document.getElementById('chart-tech');
    if (techEl) {
      var techs = a.techs.slice(0, 8);
      grouped(techEl, techs,
        CATS.map(function (cat) { return { name: cat, color: CAT_COLORS[cat],
          values: techs.map(function (t) { return a.techMean[t][cat]; }),
          counts: techs.map(function (t) { return a.techN[t][cat]; }) }; }),
        { label: 'Grouped bar chart of average labelled energy use by screen technology and size group',
          xTitle: 'Screen technology', yTitle: 'Average kWh per year', unit: 'kWh/year', height: 360 });
    }
    var techItems = [];
    CATS.forEach(function (cat) {
      var cand = a.techs.filter(function (t) { return a.techN[t][cat] >= 3; })
        .sort(function (x, y) { return a.techMean[x][cat] - a.techMean[y][cat]; });
      if (cand.length >= 2) {
        var best = cand[0], worst = cand[cand.length - 1];
        techItems.push('<strong>' + cat + ':</strong> <strong>' + best + '</strong> has the lowest average (' + fmt(a.techMean[best][cat]) +
          ' kWh/year), <strong>' + worst + '</strong> the highest (' + fmt(a.techMean[worst][cat]) + ' kWh/year).');
      }
    });
    listInto('tech-insights', techItems);
  }

  // ============================================================= bootstrap
  function init() {
    var needsData = document.querySelector('[data-stat], .chart-box');
    if (!needsData) return;

    var banner = document.getElementById('data-banner');
    var msg = document.getElementById('data-banner-msg');
    var picker = document.getElementById('csv-file');
    var latest = null, timer;

    function show(data) {
      latest = { a: analyse(data), data: data };
      if (banner) banner.hidden = true;
      render(latest.a, data);
    }
    function fail(err) {
      if (!banner) return;
      banner.hidden = false;
      banner.classList.toggle('error', !err.needsFile);
      if (msg) {
        msg.textContent = err.needsFile
          ? 'The data file was not found at assets/data/tv_2026_09_28.csv. Put your CSV there, or choose it below to preview the charts now.'
          : 'Problem reading the data: ' + err.message;
      }
    }

    window.TVData.load().then(show).catch(fail);

    if (picker) {
      picker.addEventListener('change', function () {
        if (!picker.files || !picker.files[0]) return;
        window.TVData.loadFromFile(picker.files[0]).then(show).catch(fail);
      });
    }
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { if (latest) render(latest.a, latest.data); }, 150);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
