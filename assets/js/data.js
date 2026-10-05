/* data.js — loads and prepares the Australian TV energy-rating data.
 *
 * It re-creates, in the browser, the steps of the KNIME workflow
 * ("Demonstration 1"):
 *   CSV Reader -> String Cleaner (Brand_Reg, SoldIn, Availability Status)
 *   -> String Replacer ("Samsung Electronics" -> "Samsung")
 *   -> Row Filter (Availability Status = Available)
 *   -> Row Filter (SoldIn = Australia)
 *   -> Expression (screensize_inch = screensize / 2.54)
 *   -> Expression (Small < 43", Medium 43–65", Large > 65")
 *
 * Exposes a global:  TVData.load().then(function (data) { ... })
 */
(function (global) {
  'use strict';

  var CONFIG = {
    csvPath: 'assets/data/tv_2026_09_28.csv',
    storageKey: 'tvCsvText',
    availableValue: 'available',   // Availability Status must equal this (case-insensitive)
    soldInValue: 'australia',      // SoldIn must equal this (KNIME filter used exactly "Australia")
    soldInMatch: 'contains',       // 'contains' keeps every model whose SoldIn list includes Australia
                                   // (e.g. "Australia,New Zealand"); 'exact' keeps only the
                                   // "Australia" rows, which is what the KNIME Row Filter did (365 rows)
    highStar: 5,                   // "high star rating" threshold used in the story text
    smallBelowInch: 43,            // Small  : < 43"
    largeAboveInch: 65,            // Large  : > 65"   (Medium is 43"–65" inclusive)
    cols: {
      brand: 'Brand_Reg', soldIn: 'SoldIn', status: 'Availability Status',
      size: 'screensize', tech: 'Screen_Tech', star: 'Star2',
      kwh: 'Labelled energy consumption (kWh/year)', model: 'Model_No'
    }
  };

  // ---------- CSV parser (RFC 4180: quotes, commas and newlines in fields) ----------
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
    var rows = [], row = [], field = '', inQuotes = false, i = 0, c;
    while (i < text.length) {
      c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function clean(s) { return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim(); }
  function num(s) {
    var n = parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : NaN;
  }

  // Tidy display name: short names (LG, JVC, TCL) stay upper case, others get a capital letter
  function displayBrand(key) {
    return key.split(' ').map(function (w) {
      return w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function sizeCategory(inch) {
    if (inch < CONFIG.smallBelowInch) return 'Small';
    if (inch <= CONFIG.largeAboveInch) return 'Medium';
    return 'Large';
  }

  // ---------- Turn raw CSV text into cleaned, filtered records ----------
  function prepare(text) {
    var table = parseCSV(text);
    if (table.length < 2) throw new Error('The file has no data rows.');

    var header = table[0].map(clean);
    var idx = {}, missing = [];
    Object.keys(CONFIG.cols).forEach(function (k) {
      var at = header.indexOf(CONFIG.cols[k]);
      if (at === -1 && k !== 'model') missing.push(CONFIG.cols[k]);
      idx[k] = at;
    });
    if (missing.length) {
      throw new Error('These expected columns were not found: ' + missing.join(', ') + '.');
    }

    var stats = { rowsRead: table.length - 1, afterAvailable: 0, afterAustralia: 0, usable: 0, dropped: 0 };
    var brandCase = {};   // case-insensitive brand lookup keeps the first spelling seen
    var records = [];

    for (var r = 1; r < table.length; r++) {
      var row = table[r];
      if (row.length < 2) continue;

      var status = clean(row[idx.status]);
      if (status.toLowerCase() !== CONFIG.availableValue) continue;
      stats.afterAvailable++;

      var soldIn = clean(row[idx.soldIn]).toLowerCase();
      var inAus = CONFIG.soldInMatch === 'exact'
        ? soldIn === CONFIG.soldInValue
        : soldIn.indexOf(CONFIG.soldInValue) !== -1;
      if (!inAus) continue;
      stats.afterAustralia++;

      // merge spelling variants regardless of case ("SAMSUNG ELECTRONICS" = "Samsung" = "SAMSUNG")
      var key = clean(row[idx.brand]).toLowerCase().replace(/^samsung electronics$/, 'samsung');
      if (!brandCase[key]) brandCase[key] = displayBrand(key);
      var brand = brandCase[key];

      var cm = num(row[idx.size]);
      var kwh = num(row[idx.kwh]);
      var tech = clean(row[idx.tech]);
      if (!isFinite(cm) || cm <= 0 || !isFinite(kwh) || kwh <= 0 || !tech || !brand) {
        stats.dropped++;               // missing / unusable values
        continue;
      }
      var inch = cm / 2.54;
      records.push({
        brand: brand,
        tech: tech,
        inch: inch,
        category: sizeCategory(inch),
        star: num(row[idx.star]),
        kwh: kwh,
        model: idx.model > -1 ? clean(row[idx.model]) : ''
      });
    }
    stats.usable = records.length;
    if (!records.length) {
      throw new Error('No rows matched the filters (Available + sold in Australia).');
    }
    return { records: records, stats: stats, config: CONFIG };
  }

  // ---------- Loading: server file -> remembered upload -> manual picker ----------
  function fromStorage() {
    try { return global.sessionStorage.getItem(CONFIG.storageKey); } catch (e) { return null; }
  }
  function toStorage(text) {
    try { global.sessionStorage.setItem(CONFIG.storageKey, text); } catch (e) { /* too big or blocked: fine */ }
  }

  function load() {
    return fetch(CONFIG.csvPath, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(prepare)
      .catch(function (err) {
        var saved = fromStorage();
        if (saved) { try { return prepare(saved); } catch (e) { /* fall through */ } }
        err.needsFile = true;
        throw err;
      });
  }

  function loadFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.onload = function () {
        try {
          var data = prepare(String(reader.result));
          toStorage(String(reader.result));
          resolve(data);
        } catch (e) { reject(e); }
      };
      reader.readAsText(file);
    });
  }

  // ---------- Small statistics helpers ----------
  function mean(arr) {
    if (!arr.length) return NaN;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function median(arr) {
    if (!arr.length) return NaN;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  global.TVData = {
    CONFIG: CONFIG, load: load, loadFromFile: loadFromFile, parseCSV: parseCSV,
    prepare: prepare, mean: mean, median: median
  };
})(window);
