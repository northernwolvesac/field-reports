// nw-compliance-reminders.js — COI / insurance expiry reminders (Russ 2026-10-21).
// Runs on the home page for office users, at most once a day per browser. Finds the current certificate of every active company
// (compliance_docs, latest received/approved per company and document type) that expires within settings.lead_days (30) or has
// expired, claims each one in compliance_reminders (unique doc_id + kind + for_date, so only ONE browser of the whole office ever
// sends a given notice) and e-mails one digest to settings.notify_emails (Karen). If the e-mail fails the claims are removed and the
// next app open tries again. Also puts the count of expiring/expired COIs on the home page "Compliance" link.
(function() {
  'use strict';
  var OFFICE_ROLES = ['admin', 'manager', 'lead_pm', 'project_manager', 'apm'];
  var TRACKED = ['coi', 'workers_comp', 'disability', 'license'];
  var LABEL = { coi: 'Certificate of insurance', workers_comp: "Workers' comp certificate", disability: 'Disability / PFL certificate', license: 'License' };
  var APP = 'https://app.northernwolvesac.com/';

  function iso(dt) { return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); }
  function fmt(d) { var p = String(d).slice(0, 10).split('-'); return p[1] + '/' + p[2] + '/' + p[0]; }
  function load(src) { return new Promise(function(ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function() { bad(new Error('could not load ' + src)); }; document.head.appendChild(s); }); }

  function badge(n) {
    var a = document.querySelector('a[data-page="compliance.html"]'); if (!a) return;
    var old = a.querySelector('.n, .ar'); if (!n) return;
    var s = document.createElement('span'); s.className = 'n amb'; s.textContent = n; s.title = n + ' insurance certificate(s) expiring or expired';
    if (old) old.replaceWith(s); else a.appendChild(s);
  }

  async function run() {
    if (typeof supabaseClient === 'undefined' || typeof getAuthProfile !== 'function') return;
    var profile = null; try { profile = await getAuthProfile(); } catch (e) {}
    if (!profile || OFFICE_ROLES.indexOf(profile.role) < 0) return;
    var today = iso(new Date());

    var r = await Promise.all([
      supabaseClient.from('compliance_settings').select('notify_emails,lead_days').eq('id', 1).maybeSingle(),
      supabaseClient.from('compliance_parties').select('id,name,email,coi_required,is_active').eq('is_active', true),
      supabaseClient.from('compliance_docs').select('id,party_id,doc_type,status,expiration_date').in('status', ['received', 'approved']).in('doc_type', TRACKED).not('expiration_date', 'is', null)
    ]);
    if (r[1].error || r[2].error) return;   // tables not there yet
    var st = r[0].data || {}, leadDays = st.lead_days || 30, notify = st.notify_emails || 'karen@northernwolvesac.com';
    var limit = new Date(); limit.setDate(limit.getDate() + leadDays); limit = iso(limit);
    var parties = {}; (r[1].data || []).forEach(function(p) { parties[p.id] = p; });
    // current document per company + type = the one with the latest expiry
    var cur = {};
    (r[2].data || []).forEach(function(d) {
      var p = parties[d.party_id]; if (!p) return;
      if (d.doc_type === 'coi' && !p.coi_required) return;
      var k = d.party_id + '|' + d.doc_type;
      if (!cur[k] || d.expiration_date > cur[k].expiration_date) cur[k] = d;
    });
    var due = Object.keys(cur).map(function(k) { return cur[k]; }).filter(function(d) { return d.expiration_date <= limit; });
    badge(due.filter(function(d) { return d.doc_type === 'coi'; }).length);
    if (!due.length) return;

    var key = 'nw_compliance_check';
    try { if (localStorage.getItem(key) === today) return; } catch (e) {}

    // claim: only rows this browser inserts come back (ignoreDuplicates) — those are the notices nobody sent yet
    var rows = due.map(function(d) { return { doc_id: d.id, party_id: d.party_id, kind: d.expiration_date < today ? 'expired' : 'expiring', for_date: d.expiration_date, sent_to: notify, sent_by: profile.id, sent_by_name: 'App reminder' }; });
    var c = await supabaseClient.from('compliance_reminders').upsert(rows, { onConflict: 'doc_id,kind,for_date', ignoreDuplicates: true }).select('id,doc_id,kind,for_date');
    if (c.error) { console.warn('[compliance] claim', c.error.message); return; }
    var claimed = c.data || [];
    if (!claimed.length) { try { localStorage.setItem(key, today); } catch (e) {} return; }

    var byDoc = {}; due.forEach(function(d) { byDoc[d.id] = d; });
    var expired = [], expiring = [];
    claimed.forEach(function(x) {
      var d = byDoc[x.doc_id], p = parties[d.party_id];
      var days = Math.round((new Date(d.expiration_date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000);
      var line = '- ' + p.name + ' — ' + LABEL[d.doc_type] + (x.kind === 'expired' ? ' EXPIRED on ' + fmt(d.expiration_date) : ' expires ' + fmt(d.expiration_date) + ' (in ' + days + ' day' + (days === 1 ? '' : 's') + ')') + (p.email ? '' : ' — no e-mail on file');
      (x.kind === 'expired' ? expired : expiring).push(line);
    });
    var subject = 'Insurance reminders: ' + [expiring.length ? expiring.length + ' expiring within ' + leadDays + ' days' : '', expired.length ? expired.length + ' expired' : ''].filter(Boolean).join(', ');
    var body = 'Hello,\n\nThese subcontractor / vendor certificates need renewal:\n\n' +
      (expired.length ? 'EXPIRED\n' + expired.join('\n') + '\n\n' : '') + (expiring.length ? 'EXPIRING\n' + expiring.join('\n') + '\n\n' : '') +
      'Open Subs & Vendors in the app and press "Request" on each company — the e-mail to the company is prepared for you with our insurance requirements.\n\nNorthern Wolves app';
    try {
      if (typeof nwSendBrandedEmail !== 'function') {
        if (!window.emailjs) await load('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js');
        if (!window.NWEmail) await load('nw-email.js');
        await load('email-utils.js');
      }
      await nwSendBrandedEmail({ to: notify, subject: subject, bodyText: body, reportType: 'Insurance reminders', title: 'Insurance reminders', subtitle: today,
        files: [{ label: 'Open Subs & Vendors', plain: 'Open Subs & Vendors', url: APP + 'compliance.html?f=attention', primary: true }] });
      try { localStorage.setItem(key, today); } catch (e) {}
      console.log('[compliance] reminder digest sent:', claimed.length);
    } catch (e) {
      console.warn('[compliance] send failed — releasing the claims', e);
      await supabaseClient.from('compliance_reminders').delete().in('id', claimed.map(function(x) { return x.id; }));
    }
  }

  function start() { setTimeout(function() { run().catch(function(e) { console.warn('[compliance]', e); }); }, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
