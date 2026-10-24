/* nw-support.js — "⚑ Problem / Suggestion" form (2026-10-24)
   Loaded on demand by the ⚑ button that auth.js puts on every signed-in page. Sends the ticket to the Edge Function
   `support` (which stores it and hands it to the AI support engineer), with the page, device, app version and the last
   console errors (window.__nwErrors, collected by auth.js) attached automatically. Optional screenshot → storage
   bucket support-screenshots/<uid>/... */
(function () {
  'use strict';
  if (window.NWSupport) return;
  var T = {
    en: { title: 'Problem / Suggestion', bug: 'Something is broken', idea: 'Suggestion / upgrade', question: 'Question', what: 'What happened? What did you expect?', subj: 'Short title (optional)', shot: 'Attach a screenshot (optional)', send: 'Send', cancel: 'Cancel', sending: 'Sending…', ok: 'Ticket T{n} sent. You will get an e-mail from app.ai.support@ with updates.', mine: 'My tickets', err: 'Could not send: ', need: 'Please describe the problem' },
    ru: { title: 'Проблема / Предложение', bug: 'Что-то не работает', idea: 'Предложение / улучшение', question: 'Вопрос', what: 'Что случилось? Что вы ожидали?', subj: 'Короткий заголовок (необязательно)', shot: 'Приложить скриншот (необязательно)', send: 'Отправить', cancel: 'Отмена', sending: 'Отправляю…', ok: 'Заявка T{n} отправлена. Ответы придут на почту от app.ai.support@.', mine: 'Мои заявки', err: 'Не удалось отправить: ', need: 'Опишите, пожалуйста, проблему' },
    uk: { title: 'Проблема / Пропозиція', bug: 'Щось не працює', idea: 'Пропозиція / покращення', question: 'Питання', what: 'Що сталося? Що ви очікували?', subj: 'Короткий заголовок (необовʼязково)', shot: 'Додати скріншот (необовʼязково)', send: 'Надіслати', cancel: 'Скасувати', sending: 'Надсилаю…', ok: 'Заявку T{n} надіслано. Відповіді прийдуть на пошту від app.ai.support@.', mine: 'Мої заявки', err: 'Не вдалося надіслати: ', need: 'Опишіть, будь ласка, проблему' },
    es: { title: 'Problema / Sugerencia', bug: 'Algo no funciona', idea: 'Sugerencia / mejora', question: 'Pregunta', what: '¿Qué pasó? ¿Qué esperaba?', subj: 'Título corto (opcional)', shot: 'Adjuntar captura (opcional)', send: 'Enviar', cancel: 'Cancelar', sending: 'Enviando…', ok: 'Ticket T{n} enviado. Recibirá correos de app.ai.support@.', mine: 'Mis tickets', err: 'No se pudo enviar: ', need: 'Describa el problema, por favor' }
  };
  function lang() { var l = ''; try { l = localStorage.getItem('nw_lang') || ''; } catch (e) {} l = (l || document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase(); return T[l] ? l : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var css = '.nws-back{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:2147483000;display:flex;align-items:flex-end;justify-content:center}' +
    '@media(min-width:640px){.nws-back{align-items:center}}' +
    '.nws-box{background:#fff;width:100%;max-width:520px;border-radius:14px 14px 0 0;padding:18px 18px 22px;font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2933;box-shadow:0 10px 40px rgba(0,0,0,.25);max-height:92vh;overflow:auto}' +
    '@media(min-width:640px){.nws-box{border-radius:14px}}' +
    '.nws-box h3{margin:0 0 12px;font-size:17px;font-weight:600}' +
    '.nws-kinds{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
    '.nws-kinds label{flex:1 1 auto;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:13px;text-align:center;white-space:nowrap}' +
    '.nws-kinds input{display:none}.nws-kinds label.on{border-color:#1f2933;background:#1f2933;color:#fff}' +
    '.nws-box input[type=text],.nws-box textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:9px 10px;font:inherit;margin-bottom:10px}' +
    '.nws-box textarea{min-height:120px;resize:vertical}' +
    '.nws-row{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:6px;flex-wrap:wrap}' +
    '.nws-btn{border:0;border-radius:8px;padding:10px 16px;font:600 14px Arial,sans-serif;cursor:pointer;width:auto}' +
    '.nws-send{background:#1f2933;color:#fff}.nws-cancel{background:#eef0f2;color:#1f2933}' +
    '.nws-msg{margin-top:10px;font-size:13px}.nws-msg.err{color:#b91c1c}.nws-msg.ok{color:#047857}' +
    '.nws-file{font-size:12px;color:#4b5563;margin-bottom:6px}.nws-mine{font-size:13px;color:#1a66e0;text-decoration:none}';

  function open() {
    var L = T[lang()];
    if (!document.getElementById('nws-css')) { var s = document.createElement('style'); s.id = 'nws-css'; s.textContent = css; document.head.appendChild(s); }
    var back = document.createElement('div'); back.className = 'nws-back';
    back.innerHTML = '<div class="nws-box" role="dialog" aria-label="' + esc(L.title) + '"><h3>⚑ ' + esc(L.title) + '</h3>' +
      '<div class="nws-kinds">' + ['bug', 'idea', 'question'].map(function (k, i) { return '<label class="' + (i ? '' : 'on') + '"><input type="radio" name="nws-kind" value="' + k + '"' + (i ? '' : ' checked') + '>' + esc(L[k]) + '</label>'; }).join('') + '</div>' +
      '<input type="text" id="nws-title" maxlength="200" placeholder="' + esc(L.subj) + '">' +
      '<textarea id="nws-body" maxlength="8000" placeholder="' + esc(L.what) + '"></textarea>' +
      '<div class="nws-file">' + esc(L.shot) + '<br><input type="file" id="nws-shot" accept="image/*"></div>' +
      '<div class="nws-row"><a class="nws-mine" href="support-tickets.html">' + esc(L.mine) + ' →</a><span><button type="button" class="nws-btn nws-cancel">' + esc(L.cancel) + '</button> <button type="button" class="nws-btn nws-send">' + esc(L.send) + '</button></span></div>' +
      '<div class="nws-msg" id="nws-msg"></div></div>';
    document.body.appendChild(back);
    var box = back.firstChild;
    box.querySelectorAll('.nws-kinds label').forEach(function (lb) { lb.addEventListener('click', function () { box.querySelectorAll('.nws-kinds label').forEach(function (x) { x.classList.remove('on'); }); lb.classList.add('on'); }); });
    function close() { back.remove(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    box.querySelector('.nws-cancel').addEventListener('click', close);
    var sendBtn = box.querySelector('.nws-send'), msg = box.querySelector('#nws-msg');
    setTimeout(function () { box.querySelector('#nws-body').focus(); }, 50);
    sendBtn.addEventListener('click', async function () {
      var body = box.querySelector('#nws-body').value.trim();
      if (body.length < 3) { msg.className = 'nws-msg err'; msg.textContent = L.need; return; }
      sendBtn.disabled = true; sendBtn.textContent = L.sending; msg.textContent = '';
      try {
        var sb = window.supabaseClient; if (!sb) throw new Error('not signed in');
        var ses = await sb.auth.getSession(); var uid = ses && ses.data && ses.data.session && ses.data.session.user && ses.data.session.user.id;
        if (!uid) throw new Error('not signed in');
        var shotPath = null, f = box.querySelector('#nws-shot').files[0];
        if (f && f.size < 12 * 1024 * 1024) {
          var ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'png';
          var p = uid + '/' + Date.now() + '.' + ext;
          var up = await sb.storage.from('support-screenshots').upload(p, f, { contentType: f.type || 'image/png' });
          if (!up.error) shotPath = p;
        }
        var ver = ''; try { var ks = await caches.keys(); ver = (ks.filter(function (k) { return /^nw-field-v\d+/.test(k); })[0] || '').replace('nw-field-', ''); } catch (e) {}
        var kind = (box.querySelector('input[name=nws-kind]:checked') || {}).value || 'bug';
        var r = await sb.functions.invoke('support', { body: {
          action: 'submit', kind: kind, title: box.querySelector('#nws-title').value.trim(), body: body,
          page_url: location.href.slice(0, 500), user_agent: navigator.userAgent + ' · ' + window.innerWidth + 'x' + window.innerHeight,
          app_version: ver, console_errors: (window.__nwErrors || []).slice(-30), screenshot_path: shotPath } });
        var no = r.data && r.data.ok ? r.data.ticket_no : null;
        if (!no) {   // the support service is not reachable → keep the ticket in the database anyway (Support page shows it)
          var ins = await sb.from('support_tickets').insert({ source: 'app', reporter_id: uid, reporter_email: ses.data.session.user.email || null,
            kind: kind, title: box.querySelector('#nws-title').value.trim().slice(0, 200) || null, body: body.slice(0, 8000),
            page_url: location.href.slice(0, 500), user_agent: (navigator.userAgent + ' · ' + window.innerWidth + 'x' + window.innerHeight).slice(0, 400),
            app_version: ver, console_errors: (window.__nwErrors || []).slice(-30), screenshot_path: shotPath, status: 'new' }).select('ticket_no').single();
          if (ins.error) throw new Error(ins.error.message);
          no = ins.data.ticket_no;
        }
        msg.className = 'nws-msg ok'; msg.textContent = L.ok.replace('{n}', no);
        sendBtn.style.display = 'none'; box.querySelector('.nws-cancel').textContent = 'OK';
      } catch (e) {
        msg.className = 'nws-msg err'; msg.textContent = L.err + (e && e.message ? e.message : e);
        sendBtn.disabled = false; sendBtn.textContent = L.send;
      }
    });
  }
  window.NWSupport = { open: open };
})();
