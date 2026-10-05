/* calculator.js — Interactive Appliance Energy Calculator (vanilla JavaScript).
 *
 * Reads the form values from the DOM, validates them, calculates daily /
 * monthly / yearly energy (kWh) and cost, then updates the results panel
 * in place (existing elements are updated, never duplicated).
 * No external libraries are used.
 */
(function () {
  'use strict';

  var form = document.getElementById('calc-form');
  if (!form) return;

  var DAYS_PER_YEAR = 365;
  var DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

  // Example appliances with a known wattage (illustrative values — replace with the
  // wattage printed on your own TV's label or manual).
  var PRESETS = {
    small:  { watts: 60,  label: 'Example small TV (about 32")' },
    medium: { watts: 100, label: 'Example medium TV (about 55")' },
    large:  { watts: 160, label: 'Example large TV (about 75")' }
  };

  var inputs = {
    preset: form.elements['preset'],
    watts:  form.elements['watts'],
    hours:  form.elements['hours'],
    price:  form.elements['price']
  };
  var out = {
    panel:   document.getElementById('calc-results'),
    status:  document.getElementById('calc-status'),
    list:    document.getElementById('calc-list'),
    daily:   document.getElementById('res-daily'),
    monthly: document.getElementById('res-monthly'),
    yearly:  document.getElementById('res-yearly'),
    costM:   document.getElementById('res-cost-month'),
    costY:   document.getElementById('res-cost-year')
  };

  // ----- validation -------------------------------------------------------
  var RULES = {
    watts: { min: 1,   max: 5000, name: 'Power usage',      unit: 'W' },
    hours: { min: 0,   max: 24,   name: 'Hours per day',    unit: 'hours' },
    price: { min: 0,   max: 200,  name: 'Electricity price', unit: 'c/kWh' }
  };

  function setError(key, message) {
    var field = inputs[key].closest('.field');
    var box = document.getElementById('err-' + key);
    field.classList.toggle('invalid', Boolean(message));
    inputs[key].setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) box.textContent = message || '';
  }

  function readNumber(key) {
    var raw = String(inputs[key].value).trim();
    var rule = RULES[key];
    if (raw === '') { setError(key, rule.name + ' is required.'); return null; }
    var n = Number(raw);
    if (!isFinite(n)) { setError(key, rule.name + ' must be a number.'); return null; }
    if (n < rule.min || n > rule.max) {
      setError(key, rule.name + ' must be between ' + rule.min + ' and ' + rule.max + ' ' + rule.unit + '.');
      return null;
    }
    setError(key, '');
    return n;
  }

  // ----- calculation ------------------------------------------------------
  function calculate(watts, hours, centsPerKwh) {
    var daily = (watts * hours) / 1000;          // kWh per day
    var yearly = daily * DAYS_PER_YEAR;           // kWh per year
    var monthly = yearly / 12;                    // kWh per month
    return {
      daily: daily, monthly: monthly, yearly: yearly,
      costMonth: (monthly * centsPerKwh) / 100,   // dollars
      costYear: (yearly * centsPerKwh) / 100
    };
  }

  function kwh(n) { return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dollars(n) { return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }); }

  function showResults(r) {
    out.daily.textContent = kwh(r.daily);
    out.monthly.textContent = kwh(r.monthly);
    out.yearly.textContent = kwh(r.yearly);
    out.costM.textContent = dollars(r.costMonth);
    out.costY.textContent = dollars(r.costYear);
    out.list.hidden = false;
    out.status.textContent = 'Results updated.';
    out.status.classList.remove('form-error');
  }

  function showInvalid() {
    out.list.hidden = true;
    out.status.textContent = 'Please fix the highlighted fields to see your results.';
    out.status.classList.add('form-error');
  }

  function update() {
    var watts = readNumber('watts');
    var hours = readNumber('hours');
    var price = readNumber('price');
    if (watts === null || hours === null || price === null) { showInvalid(); return; }
    showResults(calculate(watts, hours, price));
  }

  // ----- events -----------------------------------------------------------
  inputs.preset.addEventListener('change', function () {
    var p = PRESETS[inputs.preset.value];
    if (p) { inputs.watts.value = p.watts; }
    update();
  });
  ['watts', 'hours', 'price'].forEach(function (key) {
    inputs[key].addEventListener('input', function () {
      // typing a custom wattage means the preset no longer applies
      if (key === 'watts') inputs.preset.value = 'custom';
      update();
    });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
  form.addEventListener('reset', function () {
    // let the browser restore the defaults first, then recalculate
    setTimeout(update, 0);
  });

  update(); // show results for the default values on first load / refresh
})();
