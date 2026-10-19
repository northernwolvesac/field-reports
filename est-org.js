// est-org.js — the estimating product's organisation context (roadmap item 8, multi-tenant).
// A user belongs to one or more orgs (est_org_members); every product row carries org_id and RLS keeps orgs apart.
// NWOrg.load() resolves the current org (remembered choice, else NWAC, else the first membership); pages set org_id on
// inserts and filter their lists by NWOrg.id(); NWOrg.switcher() renders a <select> when the user has more than one org.
(function () {
  'use strict';
  var cur = null, list = [], loaded = false, user = null;
  function sb() { return window.supabaseClient; }
  async function load() {
    if (loaded) return cur;
    loaded = true;
    try {
      var u = await sb().auth.getUser(); user = u && u.data ? u.data.user : null; if (!user) return null;
      try { await sb().rpc('est_claim_invites'); } catch (e) {}   // an invite by e-mail becomes a membership on the first visit
      var m = await sb().from('est_org_members').select('role, org:est_orgs(id, slug, name, settings)').eq('user_id', user.id);
      list = (m.data || []).filter(function (x) { return x.org; }).map(function (x) { return { id: x.org.id, slug: x.org.slug, name: x.org.name, role: x.role, settings: x.org.settings || {} }; });
      list.sort(function (a, b) { return (a.slug === 'nwac' ? 0 : 1) - (b.slug === 'nwac' ? 0 : 1) || a.name.localeCompare(b.name); });
      var want = null; try { want = localStorage.getItem('nw_org'); } catch (e) {}
      cur = list.find(function (o) { return o.id === want; }) || list.find(function (o) { return o.slug === 'nwac'; }) || list[0] || null;
      document.dispatchEvent(new CustomEvent('nw-org', { detail: cur }));
    } catch (e) { console.warn('[NWOrg]', e); }
    return cur;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  return window.NWOrg = {
    load: load,
    current: function () { return cur; },
    id: function () { return cur ? cur.id : null; },
    role: function () { return cur ? cur.role : null; },
    all: function () { return list.slice(); },
    isAdmin: function () { return !!(cur && (cur.role === 'owner' || cur.role === 'admin')); },
    set: function (id) { try { localStorage.setItem('nw_org', id); } catch (e) {} location.reload(); },
    // a <select> when the user belongs to several orgs; a plain chip otherwise (empty when no org at all)
    switcher: function (cls) {
      if (!cur) return '';
      if (list.length < 2) return '<span class="' + (cls || 'muted') + '" title="Organisation">' + esc(cur.name) + '</span>';
      return '<select class="' + (cls || '') + '" title="Organisation" onchange="NWOrg.set(this.value)">' + list.map(function (o) { return '<option value="' + o.id + '"' + (o.id === cur.id ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('') + '</select>';
    },
    // the row an insert should carry
    stamp: function (row) { if (cur) row.org_id = cur.id; return row; }
  };
})();
