/**
 * Northern Wolves AC — professional HTML for every email the app sends to people outside the company
 * (change orders, RFIs, field reports through EmailJS; submittals, POs, warranties through the Drive proxy).
 *
 *   NWEmail.build({ reportType, title, subtitle, bodyText, files, senderName, intro, preheader })  ->  { html, text }
 *
 * The person still writes / edits PLAIN text in the preview box. This turns it into a branded layout:
 *   - the greeting line, paragraphs, "Label: value" blocks (shown as a details table) and "Total: $x" (highlighted)
 *   - the closing ("Best regards," + name / company / phone / email lines) becomes a signature block with the logo
 *   - files: [{ label, url, primary }] become buttons (Download PDF / View online)
 * Table layout + inline CSS only (Gmail, Outlook and phones strip anything else). The logo is a public https image on
 * app.northernwolvesac.com (email-logo.png) — mail apps never see files that only live inside the PWA.
 */
(function (root) {
  var BRAND = {
    name: 'Northern Wolves Air Conditioning',
    addr: '55 9th Street, Unit 55A-2, Brooklyn, NY 11215',
    phone: '(347) 463-9248',
    email: 'hello@northernwolvesac.com',
    web: 'northernwolvesac.com',
    tag: 'Fully Licensed & Insured  ·  Serving NYC Since 2017',
    logo: 'https://app.northernwolvesac.com/email-logo.png'
  };
  var C = { ink: '#1f2933', mute: '#52606d', soft: '#7b8794', line: '#e4e7eb', panel: '#f5f7fa', page: '#eceff3', accent: '#2584c4', dark: '#1f2933' };
  var FONT = "Arial,'Helvetica Neue',Helvetica,sans-serif";

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // escaped text with clickable links (the trailing . , ; ) of a sentence stay outside the link)
  function rich(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      var clean = u.replace(/[.,:)]+$/, '');
      return '<a href="' + clean + '" style="color:' + C.accent + ';text-decoration:underline">' + clean + '</a>' + u.slice(clean.length);
    }).replace(/\n/g, '<br>');
  }

  var KV = /^([A-Za-z][A-Za-z0-9 #\/&.'()\-]{0,38}):\s+(\S.*)$/;
  var LABEL_ONLY = /^([A-Za-z][A-Za-z0-9 #\/&.'()\-]{0,38}):$/;
  var CLOSING = /^(best regards|kind regards|warm regards|regards|best|sincerely|yours truly|thank you|thanks|many thanks|thanks again),?$/i;
  var GREETING = /^(dear|hello|hi|good (morning|afternoon|evening))\b[^\n]{0,80},?$/i;
  var COMPANY_LINE = /^northern wolves\b/i;
  var EMAIL_LINE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHONE_LINE = /^[+()\d][\d\s().\-+ext]{6,}$/i;

  function parse(text, reportType) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    // the closing line and what follows it is the signature (name, title, company, phone, email)
    var ci = -1;
    for (var i = lines.length - 1; i >= 1; i--) { if (CLOSING.test(lines[i].trim())) { ci = i; break; } if (lines.length - i > 9) break; }
    var sig = null;
    if (ci >= 0) {
      var tail = lines.slice(ci + 1).map(function (l) { return l.trim(); }).filter(Boolean), s = { closing: lines[ci].trim().replace(/,?$/, ','), name: '', title: [], company: '', phone: '', email: '' };
      tail.forEach(function (l) {
        if (COMPANY_LINE.test(l)) { s.company = l; return; }
        if (EMAIL_LINE.test(l)) { s.email = l; return; }
        if (PHONE_LINE.test(l)) { s.phone = l; return; }
        if (!s.name) s.name = l; else s.title.push(l);
      });
      if (COMPANY_LINE.test(s.name)) { s.company = s.company || s.name; s.name = ''; }
      sig = s; lines = lines.slice(0, ci);
    }
    var greeting = '';
    if (lines.length && GREETING.test(lines[0].trim()) && lines[0].trim().length < 90) { greeting = lines.shift().trim().replace(/\s+,/g, ','); }   // "Dear John ," -> "Dear John,"
    var blocks = [], cur = [];
    lines.forEach(function (l) { if (l.trim()) cur.push(l.trim()); else if (cur.length) { blocks.push(cur); cur = []; } });
    if (cur.length) blocks.push(cur);
    // the plain-text body often starts with the report name ("Service Call Report") — the layout already shows it
    if (blocks.length && blocks[0].length === 1 && reportType && blocks[0][0].toLowerCase() === String(reportType).toLowerCase()) blocks.shift();
    return { greeting: greeting, blocks: blocks, sig: sig };
  }

  function kvRows(lines) {
    return lines.map(function (l, i) {
      var m = KV.exec(l);
      return '<tr><td valign="top" style="padding:12px 14px 9px 0;' + (i ?'border-top:1px solid ' + C.line + ';' : '') + 'font:600 12px ' + FONT + ';color:' + C.soft + ';text-transform:uppercase;letter-spacing:.6px;width:34%">' + esc(m[1]) + '</td>' +
        '<td valign="top" style="padding:9px 0;' + (i ? 'border-top:1px solid ' + C.line + ';' : '') + 'font:14px/1.5 ' + FONT + ';color:' + C.ink + '">' + rich(m[2]) + '</td></tr>';
    }).join('');
  }
  function para(text) { return '<p style="margin:0 0 14px;font:14px/1.65 ' + FONT + ';color:' + C.ink + '">' + rich(text) + '</p>'; }
  function blockHtml(b) {
    // a single "Total: $5,849.00" line is the amount the client is approving — give it a banner
    if (b.length === 1 && /^(grand total|total|amount|contract total|change order total)\b/i.test(b[0]) && KV.test(b[0])) {
      var m = KV.exec(b[0]), amount = m[2];
      var n = /^\$?\s*(\d+(?:\.\d+)?)$/.exec(amount.trim());   // $5849.00 -> $5,849.00
      if (n) amount = '$' + Number(n[1]).toLocaleString('en-US', { minimumFractionDigits: n[1].indexOf('.') >= 0 ? 2 : 0, maximumFractionDigits: 2 });
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:' + C.panel + ';border-left:4px solid ' + C.accent + ';padding:14px 18px">' +
        '<span style="font:600 12px ' + FONT + ';color:' + C.soft + ';text-transform:uppercase;letter-spacing:.8px">' + esc(m[1]) + '</span><br>' +
        '<span style="font:700 24px/1.3 ' + FONT + ';color:' + C.ink + '">' + esc(amount) + '</span></td></tr></table>';
    }
    var allKv = b.every(function (l) { return KV.test(l); });
    if (allKv) return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-top:1px solid ' + C.line + ';border-bottom:1px solid ' + C.line + '">' + kvRows(b) + '</table>';
    if (b.length > 1 && !KV.test(b[0]) && !LABEL_ONLY.test(b[0]) && b.slice(1).every(function (l) { return KV.test(l); }))
      return '<p style="margin:0 0 4px;font:700 15px ' + FONT + ';color:' + C.ink + '">' + esc(b[0]) + '</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-top:1px solid ' + C.line + ';border-bottom:1px solid ' + C.line + '">' + kvRows(b.slice(1)) + '</table>';
    if (b.length > 1 && LABEL_ONLY.test(b[0]))
      return '<p style="margin:4px 0 4px;font:600 12px ' + FONT + ';color:' + C.soft + ';text-transform:uppercase;letter-spacing:.8px">' + esc(LABEL_ONLY.exec(b[0])[1]) + '</p>' + para(b.slice(1).join('\n'));
    return para(b.join('\n'));
  }

  function button(f) {
    var primary = f.primary !== false;
    return '<td style="padding:0 10px 10px 0"><a href="' + esc(f.url) + '" target="_blank" style="display:inline-block;padding:12px 22px;border-radius:4px;font:700 14px ' + FONT + ';text-decoration:none;' +
      (primary ? 'background:' + C.accent + ';color:#ffffff;border:1px solid ' + C.accent : 'background:#ffffff;color:' + C.accent + ';border:1px solid ' + C.accent) + '">' + esc(f.label) + '</a></td>';
  }

  function signatureHtml(sig, senderName) {
    var name = (sig && sig.name) || senderName || '';
    var lines = '';
    if (name) lines += '<div style="font:700 15px ' + FONT + ';color:' + C.ink + '">' + esc(name) + '</div>';
    ((sig && sig.title) || []).forEach(function (t) { lines += '<div style="font:13px/1.5 ' + FONT + ';color:' + C.mute + '">' + esc(t) + '</div>'; });
    lines += '<div style="font:600 13px/1.6 ' + FONT + ';color:' + C.ink + '">' + esc((sig && sig.company) || BRAND.name) + '</div>';
    var phone = (sig && sig.phone) || BRAND.phone, mail = (sig && sig.email) || BRAND.email;
    lines += '<div style="font:13px/1.6 ' + FONT + ';color:' + C.mute + '">T&nbsp;' + esc(phone) + '&nbsp;&nbsp;|&nbsp;&nbsp;<a href="mailto:' + esc(mail) + '" style="color:' + C.accent + ';text-decoration:none">' + esc(mail) + '</a></div>';
    lines += '<div style="font:13px/1.6 ' + FONT + ';color:' + C.mute + '"><a href="https://' + BRAND.web + '" style="color:' + C.accent + ';text-decoration:none">' + BRAND.web + '</a></div>';
    return '<p style="margin:0 0 14px;font:14px/1.6 ' + FONT + ';color:' + C.ink + '">' + esc((sig && sig.closing) || 'Best regards,') + '</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td valign="middle" style="padding:0 20px 0 0;border-right:2px solid ' + C.accent + '"><img src="' + BRAND.logo + '" width="150" alt="' + esc(BRAND.name) + '" style="display:block;border:0;width:150px;height:auto"></td>' +
      '<td valign="middle" style="padding:0 0 0 20px">' + lines + '</td></tr></table>';
  }

  function build(o) {
    o = o || {};
    var p = parse(o.bodyText, o.reportType), files = (o.files || []).filter(function (f) { return f && f.url; });
    var title = o.title || o.reportType || 'Message', body = '';
    if (p.greeting) body += para(p.greeting); else if (o.intro) body += para(o.intro);
    p.blocks.forEach(function (b) { body += blockHtml(b); });
    if (files.length) body += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px"><tr>' + files.map(button).join('') + '</tr></table>';
    var pre = o.preheader || (o.subtitle ? title + ' — ' + o.subtitle : title);
    var html =
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:' + C.page + '">' + esc(pre) + '</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + C.page + '" style="background:' + C.page + '"><tr><td align="center" style="padding:24px 12px">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dde1e6;border-radius:8px">' +
      '<tr><td bgcolor="' + C.dark + '" style="background:' + C.dark + ';padding:18px 28px;border-radius:8px 8px 0 0"><span style="font:700 15px ' + FONT + ';letter-spacing:2.5px;color:#ffffff">NORTHERN WOLVES</span> <span style="font:400 12px ' + FONT + ';letter-spacing:2.5px;color:#9fb3c8">&nbsp;AIR CONDITIONING</span></td></tr>' +
      '<tr><td height="3" bgcolor="' + C.accent + '" style="height:3px;line-height:3px;font-size:0;background:' + C.accent + '">&nbsp;</td></tr>' +
      '<tr><td style="padding:28px 28px 6px">' +
        '<div style="font:700 11px ' + FONT + ';letter-spacing:1.6px;color:' + C.accent + ';text-transform:uppercase">' + esc(o.reportType || '') + '</div>' +
        '<div style="font:700 24px/1.3 ' + FONT + ';color:' + C.ink + ';margin:6px 0 4px">' + esc(title) + '</div>' +
        (o.subtitle ? '<div style="font:15px/1.5 ' + FONT + ';color:' + C.mute + '">' + esc(o.subtitle) + '</div>' : '') +
        '<div style="height:1px;line-height:1px;font-size:0;background:' + C.line + ';margin:18px 0 20px">&nbsp;</div>' +
      '</td></tr>' +
      '<tr><td style="padding:0 28px 6px">' + body + '</td></tr>' +
      '<tr><td style="padding:8px 28px 30px">' + signatureHtml(p.sig, o.senderName) + '</td></tr>' +
      '<tr><td bgcolor="' + C.panel + '" style="background:' + C.panel + ';padding:16px 28px;border-top:1px solid ' + C.line + ';border-radius:0 0 8px 8px">' +
        '<div style="font:12px/1.6 ' + FONT + ';color:' + C.soft + '">' + esc(BRAND.name) + '&nbsp;&nbsp;·&nbsp;&nbsp;' + esc(BRAND.addr) + '</div>' +
        '<div style="font:12px/1.6 ' + FONT + ';color:' + C.soft + '">' + esc(BRAND.tag).replace(/ {2}/g, '&nbsp;&nbsp;') + '</div>' +
      '</td></tr></table></td></tr></table>';
    var text = String(o.bodyText || '').trim() + (files.length ? '\n\n' + files.map(function (f) { return f.label + ': ' + f.url; }).join('\n') : '') + '\n\n--\n' + BRAND.name + '\n' + BRAND.phone + ' | ' + BRAND.email;
    return { html: html, text: text };
  }

  root.NWEmail = { build: build, parse: parse, BRAND: BRAND };
})(typeof window !== 'undefined' ? window : this);
