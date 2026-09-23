// Northern Wolves labor rates — effective July 29, 2026 (NW_Labor_Rates.pdf).
// Single source for the Change Order form and the Prime Contract CO tab.
(function () {
  var RATES = [
    { role: 'Project Manager', st: 175, ot: 263, dt: 350 },
    { role: 'Foreman',         st: 155, ot: 233, dt: 310, pot: 78, pdt: 155 },
    { role: 'Technician',      st: 150, ot: 225, dt: 300, pot: 75, pdt: 150 },
    { role: 'Welder',          st: 150, ot: 225, dt: 300, pot: 75, pdt: 150 },
    { role: 'Mechanic',        st: 125, ot: 188, dt: 250, pot: 63, pdt: 125 }
  ];
  var EFFECTIVE = 'July 29, 2026';

  // Flat option list for dropdowns: value = rate, label used in CO line text
  function options() {
    var out = [];
    RATES.forEach(function (r) {
      out.push({ key: r.role + '|ST', label: r.role + ' - Straight Time', short: 'ST', role: r.role, rate: r.st });
      out.push({ key: r.role + '|OT', label: r.role + ' - Overtime', short: 'OT', role: r.role, rate: r.ot });
      out.push({ key: r.role + '|DT', label: r.role + ' - Double Time', short: 'DT', role: r.role, rate: r.dt });
    });
    RATES.forEach(function (r) {
      if (r.pot) out.push({ key: r.role + '|POT', label: r.role + ' - Premium OT (add-on)', short: 'Premium OT', role: r.role, rate: r.pot });
      if (r.pdt) out.push({ key: r.role + '|PDT', label: r.role + ' - Premium DT (add-on)', short: 'Premium DT', role: r.role, rate: r.pdt });
    });
    return out;
  }

  function tableHtml() {
    var money = function (n) { return n ? '$' + n.toFixed(2) : '—'; };
    var rows = RATES.map(function (r) {
      return '<tr><td>' + r.role + '</td><td class="num">' + money(r.st) + '</td><td class="num">' + money(r.ot) +
        '</td><td class="num">' + money(r.dt) + '</td><td class="num">' + money(r.pot) + '</td><td class="num">' + money(r.pdt) + '</td></tr>';
    }).join('');
    return '<table class="nw-rates"><thead><tr><th>Labor</th><th class="num">Straight Time</th><th class="num">Overtime</th>' +
      '<th class="num">Double Time</th><th class="num">Premium OT</th><th class="num">Premium DT</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="nw-rates-notes">Effective ' + EFFECTIVE + '. <b>ST</b> = standard hours. <b>OT</b> = outside standard hours (1.5×). ' +
      '<b>DT</b> = Sundays, holidays, or beyond 12 hrs (2×). <b>Premium</b> = add-on when scoped straight-time work must be done in OT/DT.</div>';
  }

  var CSS = '.nw-rates{width:100%;border-collapse:collapse;font-size:12.5px}.nw-rates th,.nw-rates td{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:left}' +
    '.nw-rates th{background:#f8fafc;font-size:11px;color:#334155}.nw-rates .num{text-align:right;font-variant-numeric:tabular-nums}' +
    '.nw-rates-notes{font-size:11px;color:#64748b;margin-top:8px;line-height:1.5}';
  if (typeof document !== 'undefined') {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  }

  window.NW_LABOR_RATES = { rates: RATES, effective: EFFECTIVE, options: options, tableHtml: tableHtml };
})();
