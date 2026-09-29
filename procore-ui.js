/* ═══════════════════════════════════════════════════════════════════
   procore-ui.js — window.PC : shared Procore-style UI helpers
   (icons, menus, modals, toasts, pills, formatters, header/tabs,
   estimate version strip, embed protocol, saveField).
   Vanilla JS, no deps. Uses window.supabaseClient / window.nwEstTotals /
   window.BidActions only inside the functions that need them.
   OWNERSHIP: this is the merged canonical version (bid-board base + bid-project
   additions + review fixes). Diff against it before republishing.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PC = {};

  /* ─── HTML escape ─────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  PC.esc = esc;

  /* ─── Icons (Material Design paths, 24x24) ────────────────────────── */
  var ICONS = {
    more_vert: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    more_horiz: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    schedule: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    remove: 'M19 13H5v-2h14v2z',
    bar_chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    visibility: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    visibility_off: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    layers: 'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
    pan_tool: 'M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z',
    near_me: 'M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z',
    select_all: 'M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z',
    straighten: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z',
    text_fields: 'M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z',
    approval: 'M12 2C9.24 2 7 4.24 7 7v3h10V7c0-2.76-2.24-5-5-5zM4 20h16v2H4v-2zm4-8h8l2 5H6l2-5z',
    cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    lock_open: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    check_circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    chevron_down: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
    expand_more: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
    chevron_up: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
    expand_less: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
    chevron_left: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    chevron_right: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    filter_list: 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
    sort: 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z',
    swap_vert: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    folder_open: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
    create_new_folder: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    content_copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    drag_indicator: 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    swap_horiz: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
    fit_screen: 'M17 4h3c1.1 0 2 .9 2 2v2h-2V6h-3V4zM4 8V6h3V4H4c-1.1 0-2 .9-2 2v2h2zm16 8v2h-3v2h3c1.1 0 2-.9 2-2v-2h-2zM7 18H4v-2H2v2c0 1.1.9 2 2 2h3v-2zM18 8H6v8h12V8z',
    grid_on: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
    tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    open_in_new: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    auto_awesome: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
    find_replace: 'M11 6c1.38 0 2.63.56 3.54 1.46L12 10h6V4l-2.05 2.05C14.68 4.78 12.93 4 11 4c-3.53 0-6.43 2.61-6.92 6H6.1c.46-2.28 2.48-4 4.9-4zm5.64 9.14c.66-.9 1.12-1.97 1.28-3.14H15.9c-.46 2.28-2.48 4-4.9 4-1.38 0-2.63-.56-3.54-1.46L10 12H4v6l2.05-2.05C7.32 17.22 9.07 18 11 18c1.55 0 2.98-.51 4.14-1.36L20 21.49 21.49 20l-4.85-4.86z',
    call_split: 'M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z',
    picture_in_picture: 'M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z',
    description: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    content_paste: 'M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    arrow_downward: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
    arrow_upward: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
    fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    view_column: 'M14.67 5v14H9.33V5h5.34zm1 14H21V5h-5.33v14zm-7.34 0V5H3v14h5.33z',
    list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    history: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    save: 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
    table_chart: 'M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10H3v9z'
  };
  PC.ICONS = ICONS;
  PC.icon = function (name, size) {
    size = size || 18;
    var d = ICONS[name] || 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z';
    return '<svg class="pc-ic pc-ic-' + esc(name) + '" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" style="width:' + size + 'px;height:' + size + 'px" aria-hidden="true"><path d="' + d + '"/></svg>';
  };

  /* ─── Constants ────────────────────────────────────────────────────── */
  PC.STAGES = [
    { key: 'invitation',    label: 'Invitations' },
    { key: 'to_do',         label: 'To Do' },
    { key: 'estimating',    label: 'Estimating' },
    { key: 'bid_submitted', label: 'Bid Submitted' },
    { key: 'accepted',      label: 'Accepted' },
    { key: 'in_progress',   label: 'In Progress' },
    { key: 'complete',      label: 'Complete' },
    { key: 'delayed',       label: 'Delayed' },
    { key: 'lost',          label: 'Lost' },
    { key: 'archived',      label: 'Archived' }
  ];
  PC.STAGE_LABEL = {};
  PC.STAGES.forEach(function (s) { PC.STAGE_LABEL[s.key] = s.label; });
  PC.STAGE_PICKABLE = PC.STAGES.filter(function (s) { return s.key !== 'invitation' && s.key !== 'archived'; });
  PC.INTENTS = [
    { key: 'undecided', label: 'Undecided' },
    { key: 'will_bid',  label: 'Will Bid' },
    { key: 'no_bid',    label: 'No Bid' }
  ];
  PC.CATEGORIES = [
    ['disconnects', 'Disconnects'], ['equipment', 'Equipment'], ['ductwork', 'Ductwork'], ['pipework', 'Pipework'],
    ['equipment_install', 'Equipment Install'], ['air_outlets', 'Air Outlets Install'], ['services', 'Services']
  ];
  PC.MGMT_ROLES = ['admin', 'manager', 'lead_pm', 'project_manager', 'apm', 'estimator'];
  PC.canEdit = function (profile) {
    return !!(profile && PC.MGMT_ROLES.indexOf(profile.role) >= 0);
  };

  /* ─── Floating menus ───────────────────────────────────────────────── */
  var openRoot = null;   // { el, close }

  function positionFloating(el, anchorRect, opts) {
    opts = opts || {};
    var vw = window.innerWidth, vh = window.innerHeight;
    el.style.visibility = 'hidden';
    el.style.left = '0px'; el.style.top = '0px';
    document.body.appendChild(el);
    var w = el.offsetWidth, h = el.offsetHeight;
    var left, top;
    if (opts.side === 'right') {
      left = anchorRect.right - 2; top = anchorRect.top - 4;
      if (left + w > vw - 8) left = anchorRect.left - w + 2;
    } else {
      left = opts.align === 'right' ? anchorRect.right - w : anchorRect.left;
      top = anchorRect.bottom + 4;
      if (left + w > vw - 8) left = Math.max(8, vw - 8 - w);
      if (top + h > vh - 8) top = Math.max(8, anchorRect.top - 4 - h);
    }
    if (left < 8) left = 8;
    if (top + h > vh - 8) top = Math.max(8, vh - 8 - h);
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    el.style.visibility = '';
  }

  // Remove a row's submenu and, recursively, every submenu nested inside it.
  function removeSub(row) {
    var sub = row && row._sub;
    if (!sub) return;
    row._sub = null;
    sub.querySelectorAll('.pc-menu-item.has-sub').forEach(removeSub);
    sub.remove();
  }

  // subs: array shared by the whole menu tree — every submenu element ever created under the
  // root is pushed here so close() can remove them all, whatever their nesting level.
  function buildMenu(items, closeAll, level, subs) {
    subs = subs || [];
    var el = document.createElement('div');
    el.className = 'pc-menu';
    el.setAttribute('data-level', level || 0);
    (items || []).forEach(function (it) {
      if (!it) return;
      if (it.sep) { var s = document.createElement('div'); s.className = 'pc-menu-sep'; el.appendChild(s); return; }
      if (it.head) { var h = document.createElement('div'); h.className = 'pc-menu-head'; h.textContent = it.label || ''; el.appendChild(h); return; }
      var row = document.createElement('div');
      row.className = 'pc-menu-item' + (it.danger ? ' danger' : '') + (it.sub ? ' has-sub' : '') + (it.checked ? ' checked' : '') + (it.cls ? ' ' + it.cls : '');
      if (it.disabled) row.setAttribute('disabled', 'disabled');
      if (it.title) row.title = it.title;
      if (!it.html && String(it.label || '').length > 36) row.style.whiteSpace = 'normal';   // long labels wrap instead of scrolling (.pc-menu max-width)
      // it.html = pre-escaped rich label (e.g. a pill); it.hint = grey right-aligned text
      row.innerHTML = (it.icon ? PC.icon(it.icon) : '') + '<span class="pc-mi-lbl">' + (it.html ? it.html : esc(it.label || '')) + '</span>' +
        (it.hint ? '<span class="hint">' + esc(it.hint) + '</span>' : '') +
        (it.checked ? '<span class="check pc-menu-check">' + PC.icon('check', 16) + '</span>' : '');
      if (it.sub && it.sub.length) {
        var subEl = null;
        row.addEventListener('mouseenter', function () {
          el.querySelectorAll('.pc-menu-item.has-sub').forEach(function (r) { if (r !== row) removeSub(r); });
          if (subEl && subEl.parentNode) return;
          subEl = buildMenu(it.sub, closeAll, (level || 0) + 1, subs);
          row._sub = subEl;
          subs.push(subEl);
          positionFloating(subEl, row.getBoundingClientRect(), { side: 'right' });
        });
        row.addEventListener('click', function (ev) { ev.stopPropagation(); });
      } else {
        row.addEventListener('mouseenter', function () {
          el.querySelectorAll('.pc-menu-item.has-sub').forEach(removeSub);
        });
        row.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (it.disabled) return;
          closeAll();
          if (typeof it.onClick === 'function') it.onClick(ev);
        });
      }
      el.appendChild(row);
    });
    el.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    return el;
  }

  PC.closeMenus = function () { if (openRoot) openRoot.close(); };

  // Clicking the anchor of an open menu closes it (mousedown) — remember it briefly so the
  // click that follows does not immediately re-open the same menu (true toggle behaviour).
  var suppressAnchor = null, suppressUntil = 0;

  PC.menu = function (anchorEl, items, opts) {
    opts = opts || {};
    if (typeof items === 'function') items = items(anchorEl);
    if (anchorEl && anchorEl === suppressAnchor && Date.now() < suppressUntil) { suppressAnchor = null; return function () {}; }
    PC.closeMenus();
    var rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() :
      { left: (opts.x || 0), right: (opts.x || 0), top: (opts.y || 0), bottom: (opts.y || 0) };
    var closed = false;
    var el, subs = [];
    function close() {
      if (closed) return;
      closed = true;
      if (el) {
        el.querySelectorAll('.pc-menu-item.has-sub').forEach(removeSub);
        subs.forEach(function (s) { if (s && s.parentNode) s.remove(); });   // every nesting level
        subs.length = 0;
        el.remove();
      }
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      if (openRoot && openRoot.close === close) openRoot = null;
      if (typeof opts.onClose === 'function') opts.onClose();
    }
    function onDoc(ev) {
      if (el && (el.contains(ev.target) || ev.target.closest('.pc-menu'))) return;
      if (anchorEl && anchorEl.contains && anchorEl.contains(ev.target)) { suppressAnchor = anchorEl; suppressUntil = Date.now() + 400; close(); return; }
      close();
    }
    function onKey(ev) { if (ev.key === 'Escape') { close(); ev.stopPropagation(); } }
    function onScroll(ev) { if (el && ev.target && ev.target.nodeType === 1 && ev.target.closest && ev.target.closest('.pc-menu')) return; close(); }
    el = buildMenu(items, close, 0, subs);
    if (opts.className) el.className += ' ' + opts.className;
    if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';
    positionFloating(el, rect, { align: opts.align || 'right' });
    setTimeout(function () {
      if (closed) return;
      document.addEventListener('mousedown', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', close);
    }, 0);
    openRoot = { el: el, close: close };
    return close;
  };

  /* Popover: arbitrary HTML (or element) in a floating .pc-menu box */
  PC.popover = function (anchorEl, content, opts) {
    opts = opts || {};
    PC.closeMenus();
    var el = document.createElement('div');
    el.className = 'pc-menu pc-popover' + (opts.className ? ' ' + opts.className : '');
    if (typeof content === 'string') el.innerHTML = content; else if (content) el.appendChild(content);
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      el.remove();
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      if (openRoot && openRoot.close === close) openRoot = null;
      if (typeof opts.onClose === 'function') opts.onClose();
    }
    function onDoc(ev) { if (el.contains(ev.target)) return; close(); }
    function onKey(ev) { if (ev.key === 'Escape') { close(); ev.stopPropagation(); } }
    el.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    positionFloating(el, anchorEl.getBoundingClientRect(), { align: opts.align || 'left' });
    setTimeout(function () {
      if (closed) return;
      document.addEventListener('mousedown', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', close);
    }, 0);
    openRoot = { el: el, close: close };
    return { el: el, close: close };
  };

  /* Kebab button HTML; wire with PC.bindKebabs(container, resolver) or inline */
  var kebabRegistry = {};   // id -> { items, t }
  var kebabSeq = 0, kebabPruneTimer = null;
  var KEBAB_MIN_AGE = 3000;  // ms: give callers time to insert the returned HTML before an entry may be pruned
  // Drop registry entries whose button is no longer in the document (pages re-render row lists
  // with PC.kebab on every refresh, so the map would otherwise grow for the life of the page).
  function pruneKebabs() {
    kebabPruneTimer = null;
    var live = {};
    document.querySelectorAll('[data-pc-kebab]').forEach(function (b) { live[b.getAttribute('data-pc-kebab')] = 1; });
    var now = Date.now();
    Object.keys(kebabRegistry).forEach(function (id) {
      if (!live[id] && now - kebabRegistry[id].t > KEBAB_MIN_AGE) delete kebabRegistry[id];
    });
  }
  function scheduleKebabPrune() {
    if (kebabPruneTimer) return;
    kebabPruneTimer = setTimeout(pruneKebabs, KEBAB_MIN_AGE + 500);
  }
  PC.pruneKebabs = pruneKebabs;
  PC.kebab = function (items, opts) {
    opts = opts || {};
    var id = 'pck' + (++kebabSeq);
    kebabRegistry[id] = { items: items, t: Date.now() };
    scheduleKebabPrune();
    return '<button type="button" class="pc-btn pc-btn-ghost pc-btn-icon pc-kebab' + (opts.cls ? ' ' + opts.cls : '') +
      '" data-pc-kebab="' + id + '" title="' + esc(opts.title || 'More') + '" aria-label="More">' + PC.icon('more_vert', opts.size || 20) + '</button>';
  };
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-pc-kebab]');
    if (!btn) return;
    ev.preventDefault(); ev.stopPropagation();
    var entry = kebabRegistry[btn.getAttribute('data-pc-kebab')];
    var items = entry ? entry.items : null;
    if (typeof items === 'function') items = items(btn);
    if (items) PC.menu(btn, items, { align: 'right' });
    scheduleKebabPrune();
  }, true);

  /* ─── Modals ───────────────────────────────────────────────────────── */
  PC.modal = function (opts) {
    opts = opts || {};
    var backdrop = document.createElement('div');
    backdrop.className = 'pc-backdrop';
    var modal = document.createElement('div');
    modal.className = 'pc-modal' + (opts.size && opts.size !== 'md' ? ' ' + opts.size : '') + (opts.className ? ' ' + opts.className : '');
    var head = document.createElement('div');
    head.className = 'pc-modal-h';
    head.innerHTML = '<span class="pc-modal-title" style="flex:1;min-width:0">' + esc(opts.title || '') + '</span>' +
      '<button type="button" class="pc-btn pc-btn-ghost pc-btn-icon pc-modal-x close" aria-label="Close">' + PC.icon('close', 20) + '</button>';
    var body = document.createElement('div');
    body.className = 'pc-modal-b';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    var foot = document.createElement('div');
    foot.className = 'pc-modal-f';
    modal.appendChild(head); modal.appendChild(body);
    var ctx = { el: modal, body: body, backdrop: backdrop, close: close, buttons: {}, q: function (sel) { return modal.querySelector(sel); } };
    var closed = false;
    function close(result) {
      if (closed) return; closed = true;
      backdrop.remove();
      document.removeEventListener('keydown', onKey, true);
      if (typeof opts.onClose === 'function') opts.onClose(result);
    }
    function isTopmost() {
      var all = document.querySelectorAll('.pc-backdrop, .pc-drawer-backdrop');
      return all.length === 0 || all[all.length - 1] === backdrop;
    }
    function onKey(ev) {
      if (!isTopmost()) return;   // stacked dialogs: Esc closes only the top one
      if (ev.key === 'Escape' && !opts.noEsc) { ev.stopPropagation(); close('esc'); }
      if (ev.key === 'Enter' && opts.enterSubmits && !(ev.target && ev.target.tagName === 'TEXTAREA')) {
        var pb = foot.querySelector('.pc-btn-primary'); if (pb) pb.click();
      }
    }
    (opts.buttons || []).forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      // danger = solid red (.pc-btn-danger), primary = orange, else grey secondary
      btn.className = 'pc-btn ' + (b.danger ? 'pc-btn-danger' : (b.primary ? 'pc-btn-primary' : 'pc-btn-secondary')) + (b.cls ? ' ' + b.cls : '');
      btn.innerHTML = (b.icon ? PC.icon(b.icon) : '') + esc(b.label || 'OK');
      if (b.disabled) btn.disabled = true;
      if (b.id) btn.id = b.id;
      btn.addEventListener('click', function () {
        if (typeof b.onClick === 'function') {
          var r = b.onClick(ctx);
          if (r === false) return;
          if (r && typeof r.then === 'function') {
            btn.disabled = true;
            r.then(function (v) { btn.disabled = false; if (v !== false && b.closeOnDone !== false) close(b.label); },
                   function () { btn.disabled = false; });
            return;
          }
          if (b.close !== false) close(b.label);
        } else close(b.label);
      });
      ctx.buttons[b.id || i] = btn;
      foot.appendChild(btn);
    });
    if (opts.buttons && opts.buttons.length) modal.appendChild(foot);
    ctx.foot = foot;
    head.querySelector('.pc-modal-x').addEventListener('click', function () { close('x'); });
    backdrop.addEventListener('mousedown', function (ev) { if (ev.target === backdrop && !opts.noBackdropClose) close('backdrop'); });
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey, true);
    setTimeout(function () {
      var f = body.querySelector('input:not([type=hidden]):not([disabled]),select,textarea');
      if (f && !opts.noAutofocus) { try { f.focus(); if (f.select && f.type === 'text') f.select(); } catch (e) {} }
    }, 30);
    return ctx;
  };

  PC.confirm = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      PC.modal({
        title: opts.title || 'Confirm', size: 'sm',
        body: '<div style="white-space:pre-wrap">' + (opts.html ? opts.html : esc(opts.message || '')) + '</div>',
        buttons: [
          { label: opts.cancelLabel || 'Cancel', onClick: function () { done = true; resolve(false); } },
          { label: opts.okLabel || 'Confirm', primary: true, danger: !!opts.danger, onClick: function () { done = true; resolve(true); } }
        ],
        onClose: function () { if (!done) resolve(false); }
      });
    });
  };

  PC.prompt = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = false;
      var m = PC.modal({
        title: opts.title || 'Enter a value', size: 'sm', enterSubmits: true,
        body: '<div class="pc-field"><label class="pc-label">' + esc(opts.label || '') + '</label>' +
          (opts.multiline
            ? '<textarea class="pc-textarea" id="pcPromptInput" placeholder="' + esc(opts.placeholder || '') + '">' + esc(opts.value || '') + '</textarea>'
            : '<input class="pc-input" id="pcPromptInput" type="text" value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '">') +
          (opts.hint ? '<div class="pc-hint">' + esc(opts.hint) + '</div>' : '') + '</div>',
        buttons: [
          { label: 'Cancel', onClick: function () { done = true; resolve(null); } },
          { label: opts.okLabel || 'Save', primary: true, onClick: function (ctx) {
              var v = ctx.body.querySelector('#pcPromptInput').value;
              if (opts.required !== false && !String(v).trim()) { PC.toast(opts.requiredMsg || 'Please enter a value', 'error'); return false; }
              done = true; resolve(v);
            } }
        ],
        onClose: function () { if (!done) resolve(null); }
      });
      return m;
    });
  };

  PC.drawer = function (opts) {
    opts = opts || {};
    var bd = document.createElement('div'); bd.className = 'pc-drawer-backdrop';
    var dr = document.createElement('div'); dr.className = 'pc-drawer' + (opts.className ? ' ' + opts.className : '');
    if (opts.width) dr.style.width = opts.width + 'px';
    var head = document.createElement('div'); head.className = 'pc-modal-h';
    head.innerHTML = '<span class="pc-modal-title" style="flex:1;min-width:0">' + esc(opts.title || '') + '</span><button type="button" class="pc-btn pc-btn-ghost pc-btn-icon pc-modal-x close" aria-label="Close">' + PC.icon('close', 20) + '</button>';
    var body = document.createElement('div'); body.className = 'pc-modal-b';
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    var foot = document.createElement('div'); foot.className = 'pc-modal-f';
    dr.appendChild(head); dr.appendChild(body);
    var closed = false;
    var ctx = { el: dr, body: body, backdrop: bd, close: close, buttons: {}, q: function (sel) { return dr.querySelector(sel); } };
    function close(r) {
      if (closed) return; closed = true;
      bd.remove(); dr.remove();
      document.removeEventListener('keydown', onKey, true);
      if (typeof opts.onClose === 'function') opts.onClose(r);
    }
    function onKey(ev) {
      var all = document.querySelectorAll('.pc-backdrop, .pc-drawer-backdrop');
      if (all.length && all[all.length - 1] !== bd) return;   // a modal is stacked above the drawer
      if (ev.key === 'Escape') { ev.stopPropagation(); close('esc'); }
    }
    (opts.buttons || []).forEach(function (b, i) {
      var btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'pc-btn ' + (b.danger ? 'pc-btn-danger' : (b.primary ? 'pc-btn-primary' : 'pc-btn-secondary')) + (b.cls ? ' ' + b.cls : '');
      if (b.id) btn.id = b.id;
      btn.innerHTML = (b.icon ? PC.icon(b.icon) : '') + esc(b.label || 'OK');
      btn.addEventListener('click', function () {
        if (typeof b.onClick === 'function') { var r = b.onClick(ctx); if (r === false) return; }
        if (b.close !== false) close(b.label);
      });
      ctx.buttons[b.id || i] = btn;
      foot.appendChild(btn);
    });
    if (opts.buttons && opts.buttons.length) dr.appendChild(foot);
    head.querySelector('.pc-modal-x').addEventListener('click', function () { close('x'); });
    bd.addEventListener('mousedown', function () { close('backdrop'); });
    document.body.appendChild(bd); document.body.appendChild(dr);
    document.addEventListener('keydown', onKey, true);
    return ctx;
  };

  /* ─── Toast ────────────────────────────────────────────────────────── */
  var toastEl = null, toastTimer = null;
  PC.toast = function (msg, type, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'pc-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = 'pc-toast show' + (type && type !== 'info' ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 3200);
  };

  /* ─── Pill dropdown ────────────────────────────────────────────────── */
  PC.pillHtml = function (key, label, cls) {
    return '<span class="pc-pill ' + (cls || ('pc-pill-' + esc(key))) + '">' + esc(label) + '</span>';
  };
  PC.pillDropdown = function (opts) {
    opts = opts || {};
    var options = opts.options || [];
    var value = opts.value;
    var el = document.createElement('span');
    el.className = 'pc-pill-dd' + (opts.readOnly ? ' readonly' : '');
    function labelFor(k) { var o = options.filter(function (x) { return x.key === k; })[0]; return o ? o.label : (k || '--'); }
    function render() {
      var cls = typeof opts.cls === 'function' ? opts.cls(value) : (opts.cls || ('pc-pill-' + value));
      el.innerHTML = '<span class="pc-pill ' + esc(cls) + '">' + esc(labelFor(value)) + '</span>' +
        (opts.readOnly ? '' : PC.icon('expand_more', 16));
    }
    render();
    if (!opts.readOnly) {
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.addEventListener('click', function (ev) {
        ev.stopPropagation(); ev.preventDefault();
        PC.menu(el, options.map(function (o) {
          return { label: o.label, checked: o.key === value, onClick: function () {
            if (o.key === value) return;
            var prev = value; value = o.key; render();
            if (typeof opts.onChange === 'function') {
              // onChange may return false (or a promise resolving to false / rejecting) to revert
              var r = opts.onChange(o.key, prev);
              if (r === false) { value = prev; render(); }
              else if (r && typeof r.then === 'function') r.then(function (ok) { if (ok === false) { value = prev; render(); } }, function () { value = prev; render(); });
            }
          } };
        }), { align: 'left', minWidth: 160 });
      });
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); } });
    }
    el.setValue = function (v) { value = v; render(); };
    el.getValue = function () { return value; };
    return el;
  };

  /* ─── Avatars ──────────────────────────────────────────────────────── */
  var AVATAR_COLORS = ['#1a66e0', '#0e7490', '#15803d', '#b45309', '#7c3aed', '#be185d', '#c2410c', '#4338ca', '#0f766e', '#6b7280'];
  PC.avatarColor = function (name) {
    var s = String(name || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };
  PC.initials = function (name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '--';
    return parts.slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  };
  PC.avatar = function (name, size) {
    size = size || 28;
    var ini = PC.initials(name);
    var bg = name ? PC.avatarColor(name) : '#9ca3af';
    return '<span class="pc-avatar" style="width:' + size + 'px;height:' + size + 'px;background:' + bg + ';font-size:' + Math.round(size * 0.43) + 'px" title="' + esc(name || '') + '">' + esc(ini) + '</span>';
  };

  /* ─── Formatters ───────────────────────────────────────────────────── */
  function num(n) { n = Number(n); return isFinite(n) ? n : 0; }
  PC.money = function (n, decimals) {
    if (decimals == null) decimals = 2;
    n = num(n);
    var neg = n < 0; n = Math.abs(n);
    var s = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return (neg ? '-$' : '$') + s;
  };
  PC.money0 = function (n) { return PC.money(Math.round(num(n)), 0); };
  PC.compact = function (n) {
    n = num(n);
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 1000000) return sign + '$' + (a / 1000000).toFixed(2) + 'M';
    if (a >= 1000) return sign + '$' + Math.round(a / 1000) + 'k';
    return sign + '$' + Math.round(a);
  };
  PC.pct = function (n, decimals) {
    if (decimals == null) decimals = 2;
    return num(n).toFixed(decimals) + ' %';
  };
  PC.uom = function (u) {
    var s = String(u || '').trim().toLowerCase();
    if (!s || s === 'none') return '';
    if (s === 'ft' || s === 'lf' || s === 'feet' || s === 'foot') return 'ft';
    if (s === 'ea' || s === 'each') return 'ea';
    if (s === 'sq ft' || s === 'sqft' || s === 'sf' || s === 'sq. ft.' || s === 'sq.ft' || s === 'square feet') return 'sq ft';
    if (s === 'hours' || s === 'hrs' || s === 'hr' || s === 'hour') return 'hrs';
    if (s === 'ls' || s === 'lump sum' || s === 'lump') return 'ls';
    return s;
  };
  PC.qty = function (n, unit) {
    var u = PC.uom(unit);
    n = num(n);
    var dec = (u === 'ft' || u === 'sq ft' || u === 'lf' || u === 'sf') ? 2 : (u === 'hrs' ? 2 : 0);
    if (dec === 0 && Math.abs(n - Math.round(n)) > 0.0001) dec = 2;
    var s = n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return u ? s + ' ' + u : s;
  };
  PC.parseLocalDate = function (iso) {
    if (!iso) return null;
    if (iso instanceof Date) return isNaN(iso) ? null : iso;
    var s = String(iso);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var d = new Date(s);
    return isNaN(d) ? null : d;
  };
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // 'Tue. Jul 21 2026' (Procore); optional fallback text for empty dates ('To be determined')
  PC.date = function (iso, fallback) {
    var d = PC.parseLocalDate(iso);
    if (!d) return fallback || '';
    return DOW[d.getDay()] + '. ' + MON[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear();
  };
  PC.dateShort = function (iso, fallback) {   // 9/28/2026
    var d = PC.parseLocalDate(iso);
    if (!d) return fallback || '';
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  };
  /** plain number with thousands separators: PC.num(13987.37) → '13,987.37' */
  PC.num = function (n, decimals) {
    if (decimals == null) decimals = 2;
    n = num(n);
    return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  PC.dateTime = function (iso) {
    var d = PC.parseLocalDate(iso);
    if (!d) return '';
    return PC.date(d) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  PC.dueInfo = function (iso) {
    var d = PC.parseLocalDate(iso);
    if (!d) return { label: null, cls: '' };
    var today = new Date(); today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    var days = Math.round((d - today) / 86400000);
    if (days < 0) return { label: 'Past Due', cls: 'past', days: days };
    if (days <= 3) return { label: days === 0 ? 'Due today' : 'Due in ' + days + ' day' + (days === 1 ? '' : 's'), cls: 'soon', days: days };
    return { label: null, cls: '', days: days };
  };
  PC.todayIso = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  PC.isoDate = function (d) {   // local YYYY-MM-DD for any Date (default today)
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  PC.stageLabel = function (key) { return PC.STAGE_LABEL[key] || (key || ''); };
  PC.intentLabel = function (key) {
    var s = PC.INTENTS.filter(function (x) { return x.key === key; })[0];
    return s ? s.label : (key || '');
  };
  PC.categoryLabel = function (key) {
    var c = PC.CATEGORIES.filter(function (x) { return x[0] === key; })[0];
    return c ? c[1] : (key || '');
  };
  /** element from an HTML string */
  PC.el = function (html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };

  /* ─── Header helpers ───────────────────────────────────────────────── */
  var NAV_LINKS = [
    ['Home', 'index.html'],
    ['Bid Board', 'bid-board.html'],
    ['Estimating', 'estimating.html'],
    ['Cost Catalog', 'assembly-library.html'],
    ['Knowledge', 'est-knowledge.html'],
    ['AI Estimator', 'ai-estimator.html']
  ];
  /*
   * PC.nwHeaderHtml() — the NW logo <header class="dash-header"> block from index.html
   * (logo-header.png linking to index.html, nav dropdown, AI Support icon, profile circle + dropdown
   * with the #profileCircle / #profileName / #profileRole / #profileEmail ids that auth.js fills).
   * Pages insert it as the FIRST child of <body> — or call PC.mountHeader() — and then call initAuthUI().
   * Styling: procore-ui.css (.pc-page .dash-header …); index.html keeps its own inline copy.
   */
  PC.nwHeaderHtml = function () {
    var dd = NAV_LINKS.map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join('');
    return '<header class="dash-header">' +
      '<div class="header-top">' +
        '<a class="dash-header-left" href="index.html">' +
          '<img class="dash-header-logo" src="logo-header.png?v=258" alt="Northern Wolves Air Conditioning">' +
          '<div class="dash-header-wordmark">Northern Wolves <span>Field</span></div>' +
        '</a>' +
        '<ul class="nav-menu" id="navMenu">' +
          '<li><a href="bid-board.html">Estimating</a><div class="nav-dd"><small>Estimating</small>' + dd + '</div></li>' +
        '</ul>' +
        '<a class="nav-ic" href="support.html" title="AI Support" aria-label="AI Support"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9c0 1.6.4 3.1 1.2 4.4L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg></a>' +
        '<div style="position:relative">' +
          '<div class="profile-circle" id="profileCircle" title="Profile" onclick="document.getElementById(\'profileDropdown\').classList.toggle(\'show\')">?</div>' +
          '<div class="profile-dropdown" id="profileDropdown">' +
            '<div class="profile-dd-name" id="profileName">Loading...</div>' +
            '<div class="profile-dd-role" id="profileRole">tech</div>' +
            '<div class="profile-dd-email" id="profileEmail"></div>' +
            '<div class="profile-dd-divider"></div>' +
            '<button class="profile-dd-logout" onclick="logout()">Log Out</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tline" aria-hidden="true"></div>' +
    '</header>';
  };
  /* Insert the header as the first child of body (idempotent) and init auth UI */
  PC.mountHeader = function () {
    if (document.querySelector('header.dash-header')) return;
    document.body.insertAdjacentHTML('afterbegin', PC.nwHeaderHtml());
    if (typeof window.initAuthUI === 'function') { try { window.initAuthUI(); } catch (e) {} }
    document.addEventListener('click', function (ev) {
      var dd = document.getElementById('profileDropdown');
      if (dd && dd.classList.contains('show') && !ev.target.closest('#profileCircle') && !dd.contains(ev.target)) dd.classList.remove('show');
    });
  };

  /*
   * PC.renderTitleRow(container, {
   *   crumb:{label:'Bid Board', href:'bid-board.html', text}, title, sub ('Q#10012'), icon,
   *   editable:true + onRename(newName)          (H1 becomes inline-editable; Enter/blur commits, Esc reverts)
   *   stage:{value, onChange(key, prev), readOnly, options}   (default PC.STAGE_PICKABLE; the current value is always shown)
   *   intent:{value, onChange, readOnly}          (Invitations: Bid Intent pill instead of / next to the stage)
   *   avatarName, actions:[{id, label, icon, primary, disabled, title, menu:[items]|fn | onClick(ev)}], kebab:[items]|fn, kebabId
   * }) → container, with container.setTitle(t) / setSub(t) / setStage(key) / setIntent(key) helpers.
   */
  PC.renderTitleRow = function (container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.classList.add('pc-head-block');
    var html = '<div class="pc-wrap">';
    if (opts.crumb) {
      html += '<div class="pc-crumb"><a href="' + esc(opts.crumb.href || 'bid-board.html') + '">' + esc(opts.crumb.label || 'Bid Board') + '</a>' +
        '<span class="sep"></span>' + (opts.crumb.text ? '<span>' + esc(opts.crumb.text) + '</span>' : '') + '</div>';   // .sep::before draws '>' (procore-ui.css)
    }
    html += '<div class="pc-title-row">' +
      (opts.icon ? '<span class="pc-title-ic">' + PC.icon(opts.icon, 24) + '</span>' : '') +
      '<div style="min-width:0"><h1 class="pc-h1" id="pcTitle">' + esc(opts.title || '') + '</h1><div class="pc-h1-sub" id="pcTitleSub"' + (opts.sub ? '' : ' style="display:none"') + '>' + esc(opts.sub || '') + '</div></div>' +
      '<span id="pcStageSlot"></span>' +
      '<div class="pc-title-actions" id="pcTitleActions"></div>' +
    '</div></div>';
    container.innerHTML = html;
    var h1 = container.querySelector('#pcTitle');
    if (opts.editable && typeof opts.onRename === 'function') {
      // 'plaintext-only' is unknown to Firefox < 136 (invalid value => not editable at all),
      // so fall back to "true" there and strip any rich content ourselves.
      var plainOnly = false;
      try { var t = document.createElement('div'); t.contentEditable = 'plaintext-only'; plainOnly = t.contentEditable === 'plaintext-only'; } catch (e) { plainOnly = false; }
      h1.setAttribute('contenteditable', plainOnly ? 'plaintext-only' : 'true');
      if (!plainOnly) {
        h1.addEventListener('paste', function (ev) {
          ev.preventDefault();
          var cd = ev.clipboardData || window.clipboardData;
          var txt = (cd ? cd.getData('text/plain') : '').replace(/[\r\n]+/g, ' ');
          var sel = window.getSelection();
          if (sel && sel.rangeCount) { var rg = sel.getRangeAt(0); rg.deleteContents(); rg.insertNode(document.createTextNode(txt)); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg); }
          else h1.textContent += txt;
        });
        h1.addEventListener('input', function () { if (h1.children.length) h1.textContent = h1.textContent; });
      }
      h1.setAttribute('spellcheck', 'false');
      h1.title = 'Click to rename';
      h1.style.outline = 'none';
      h1.style.cursor = 'text';
      var original = opts.title || '';
      h1.addEventListener('focus', function () { original = h1.textContent; });
      h1.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); h1.blur(); }
        if (ev.key === 'Escape') { h1.textContent = original; h1.blur(); }
      });
      h1.addEventListener('blur', function () {
        var v = h1.textContent.trim();
        if (!v) { h1.textContent = original; return; }
        if (v !== original) { original = v; opts.onRename(v); }
      });
    }
    var stageDd = null, intentDd = null;
    if (opts.stage) {
      var opt = opts.stage.options || PC.STAGE_PICKABLE.concat(
        // keep the current stage visible/selected even when it is not pickable (Invitations / Archived)
        PC.STAGES.filter(function (s) { return s.key === opts.stage.value && PC.STAGE_PICKABLE.indexOf(s) < 0; })
      );
      stageDd = PC.pillDropdown({ value: opts.stage.value, options: opt, readOnly: !!opts.stage.readOnly, onChange: opts.stage.onChange });
      stageDd.classList.add('pc-title-stage');
      container.querySelector('#pcStageSlot').appendChild(stageDd);
    }
    if (opts.intent) {
      intentDd = PC.pillDropdown({ value: opts.intent.value || 'undecided', options: PC.INTENTS, readOnly: !!opts.intent.readOnly, onChange: opts.intent.onChange });
      intentDd.classList.add('pc-title-intent');
      container.querySelector('#pcStageSlot').appendChild(intentDd);
    }
    var acts = container.querySelector('#pcTitleActions');
    if (opts.avatarName) acts.insertAdjacentHTML('beforeend', PC.avatar(opts.avatarName, 32));
    if (opts.actionsHtml) acts.insertAdjacentHTML('beforeend', opts.actionsHtml);
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pc-btn ' + (a.primary ? 'pc-btn-primary' : (a.outline ? 'pc-btn-outline' : 'pc-btn-secondary')) + (a.cls ? ' ' + a.cls : '');
      if (a.id) b.id = a.id;
      b.setAttribute('data-pc-action', a.key || a.id || a.label || '');
      b.innerHTML = (a.icon ? PC.icon(a.icon) : '') + esc(a.label || '') + (a.menu ? PC.icon('expand_more', 16) : '');
      if (a.title) b.title = a.title;
      if (a.disabled) b.disabled = true;
      b.addEventListener('click', function (ev) {
        if (b.disabled) return;
        if (a.menu) { var items = typeof a.menu === 'function' ? a.menu() : a.menu; PC.menu(b, items, { align: 'right' }); }
        else if (typeof a.onClick === 'function') a.onClick(ev, b);
      });
      acts.appendChild(b);
    });
    if (opts.kebab) {
      var kb = document.createElement('button');
      kb.type = 'button'; kb.className = 'pc-btn pc-btn-ghost pc-btn-icon pc-kebab'; kb.id = opts.kebabId || 'pcHeaderKebab';
      kb.setAttribute('aria-label', 'More'); kb.title = 'More actions'; kb.innerHTML = PC.icon('more_vert', 22);
      kb.addEventListener('click', function () { var items = typeof opts.kebab === 'function' ? opts.kebab() : opts.kebab; PC.menu(kb, items, { align: 'right' }); });
      acts.appendChild(kb);
    }
    container.setTitle = function (t) { h1.textContent = t || ''; };
    container.setSub = function (t) { var s = container.querySelector('#pcTitleSub'); s.textContent = t || ''; s.style.display = t ? '' : 'none'; };
    container.setStage = function (k) { if (stageDd) stageDd.setValue(k); };
    container.setIntent = function (k) { if (intentDd) intentDd.setValue(k); };
    container.button = function (key) { return acts.querySelector('[data-pc-action="' + key + '"]'); };
    return container;
  };

  PC.TABS = [['overview', 'Overview'], ['documents', 'Documents'], ['takeoff', 'Takeoff'], ['estimating', 'Estimating'], ['proposal', 'Proposal']];
  /*
   * PC.renderTabs(container, {active, hrefs:{overview,…}, rootId, estId, onClick(key, ev)}) → container (+ container.setActive(key))
   * Five tabs: Overview · Documents · Takeoff · Estimating · Proposal. Anchors use hrefs (default PC.tabHrefs(rootId, estId));
   * with onClick the handler runs first and may return false to cancel the navigation (in-shell switching).
   */
  PC.renderTabs = function (container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.classList.add('pc-tabs');
    container.setAttribute('role', 'tablist');
    var hrefs = opts.hrefs || (opts.rootId ? PC.tabHrefs(opts.rootId, opts.estId) : {});
    container.innerHTML = PC.TABS.map(function (t) {
      var href = hrefs[t[0]] || ('#' + t[0]);
      return '<a class="pc-tab' + (opts.active === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '" href="' + esc(href) + '">' + t[1] + '</a>';
    }).join('');
    container.querySelectorAll('.pc-tab').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        if (typeof opts.onClick === 'function') {
          var r = opts.onClick(a.getAttribute('data-tab'), ev);
          if (r === false) ev.preventDefault();
        }
      });
    });
    container.setActive = function (key) {
      container.querySelectorAll('.pc-tab').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-tab') === key); });
    };
    return container;
  };

  /* ─── Estimate version strip ───────────────────────────────────────── */
  /*
   * PC.estStrip(container, {rootId, currentId, canEdit, onSwitch(versionId)}) → container (.pc-est-strip)
   *   Loads every version (id = rootId OR parent_estimate_id = rootId) + all their line items (two queries),
   *   total per version = nwEstTotals(lines, est).total. Always rendered, even with one version.
   *   Without onSwitch (standalone estimating.html / takeoff.html) switching rewrites ?est= and reloads.
   * PC.estStrip.refresh() → Promise — recompute totals (call after edits / on 'nw-event totals').
   * PC.estStrip.setCurrent(id), PC.estStrip.versions(), PC.estStrip.state()
   */
  var stripState = null;
  PC.estStrip = function (container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || container === document.body) {
      container = document.createElement('div');
      document.body.appendChild(container);
    }
    container.className = 'pc-est-strip';
    container.id = container.id || 'pcEstStrip';
    document.body.classList.add('has-est-strip');
    stripState = { container: container, opts: opts, versions: [], totals: {}, error: null };
    PC.estStrip.refresh();
    return container;
  };
  function stripLabel(v) {
    return v.version_label || (v.parent_estimate_id ? ('Alt ' + (v.version_number || '')) : 'Original Estimate');
  }
  function stripTab() {
    var h = (location.hash || '').replace('#', '');
    return PC.TABS.some(function (t) { return t[0] === h; }) ? h : 'estimating';
  }
  function stripSwitch(id) {
    var st = stripState; if (!st) return;
    var o = st.opts;
    st.opts.currentId = id;
    if (typeof o.onSwitch === 'function') { o.onSwitch(id); return; }
    // standalone page (estimating.html?est= / takeoff.html?est=): swap the version in the URL
    var u = new URL(location.href);
    u.searchParams.set('est', id);
    location.href = u.toString();
  }
  function stripAddAlternate(copyFrom) {
    var st = stripState; if (!st) return;
    if (!window.BidActions || typeof window.BidActions.addAlternate !== 'function') {
      PC.toast('Add alternate is not available on this page (bid-actions.js not loaded)', 'error');
      return;
    }
    var p = window.BidActions.addAlternate(st.opts.rootId, copyFrom ? { copyFrom: copyFrom } : {});
    Promise.resolve(p).then(function (id) {
      if (!id) return;
      return PC.estStrip.refresh().then(function () { stripSwitch(id); });
    }).catch(function (e) { console.error(e); PC.toast('Could not add estimate: ' + (e && e.message || e), 'error'); });
  }
  // Set as primary — no transaction: (1) new root first, (2) siblings, (3) old root, (4) re-key the
  // rootId-scoped tables (estimate_drawings / project_files / bid_project_notes / bid_project_tasks),
  // then reload the page on the new root so every rootId-derived state is rebuilt.
  function stripSetPrimary(v) {
    var st = stripState; if (!st) return;
    var sb = window.supabaseClient, oldRoot = st.opts.rootId, newRoot = v.id;
    PC.confirm({
      title: 'Set as primary estimate',
      message: '"' + stripLabel(v) + '" becomes the primary estimate of this project; the current primary becomes an alternate. The Bid Board, proposal and documents follow the primary. Continue?',
      okLabel: 'Set as primary'
    }).then(function (ok) {
      if (!ok) return;
      return sb.from('estimates').update({ parent_estimate_id: null }).eq('id', newRoot).then(function (r1) {
        if (r1.error) throw new Error('Step 1 (new primary): ' + r1.error.message);
        return sb.from('estimates').update({ parent_estimate_id: newRoot }).eq('parent_estimate_id', oldRoot).neq('id', newRoot);
      }).then(function (r2) {
        if (r2.error) throw new Error('Step 2 (alternates): ' + r2.error.message);
        return sb.from('estimates').update({ parent_estimate_id: newRoot }).eq('id', oldRoot);
      }).then(function (r3) {
        if (r3.error) throw new Error('Step 3 (old primary): ' + r3.error.message);
        var tables = ['estimate_drawings', 'project_files', 'bid_project_notes', 'bid_project_tasks'];
        return tables.reduce(function (chain, t) {
          return chain.then(function () {
            return sb.from(t).update({ estimate_id: newRoot }).eq('estimate_id', oldRoot).then(function (rr) {
              if (rr.error) console.warn('[estStrip] re-key ' + t + ':', rr.error.message);
            }, function (e) { console.warn('[estStrip] re-key ' + t + ':', e); });
          });
        }, Promise.resolve());
      }).then(function () {
        PC.toast('Primary estimate updated', 'success');
        var target = 'bid-project.html?id=' + encodeURIComponent(newRoot) + '&est=' + encodeURIComponent(newRoot) + '#' + stripTab();
        setTimeout(function () {
          if (PC.isEmbed) PC.emit('navigate', { tab: stripTab(), hash: '#' + stripTab(), rootId: newRoot, estimateId: newRoot, href: target });
          else location.href = target;
        }, 400);
      });
    }).catch(function (e) { PC.toast(e && e.message || String(e), 'error'); });
  }
  function stripKebabItems(v) {
    var st = stripState, sb = window.supabaseClient;
    var isPrimary = !v.parent_estimate_id;
    return [
      { label: 'Rename', icon: 'edit', onClick: function () {
          PC.prompt({ title: 'Rename estimate', label: 'Estimate name', value: stripLabel(v), okLabel: 'Rename' }).then(function (name) {
            if (!name) return;
            sb.from('estimates').update({ version_label: name.trim() }).eq('id', v.id).then(function (r) {
              if (r.error) { PC.toast(r.error.message, 'error'); return; }
              PC.toast('Renamed', 'success');
              PC.emit('title', { estimateId: v.id, versionLabel: name.trim() });
              PC.estStrip.refresh();
            });
          });
        } },
      { label: 'Set as primary', icon: 'check_circle', disabled: isPrimary, title: isPrimary ? 'Already the primary estimate' : '', onClick: function () { stripSetPrimary(v); } },
      { label: 'Copy', icon: 'content_copy', onClick: function () { stripAddAlternate(v.id); } },
      { sep: true },
      { label: 'Delete', icon: 'delete', danger: true, disabled: isPrimary, title: isPrimary ? 'The primary estimate cannot be deleted' : '', onClick: function () {
          PC.confirm({ title: 'Delete estimate', message: 'Delete "' + stripLabel(v) + '" and all of its line items, takeoff layers and measurements? This cannot be undone.', okLabel: 'Delete', danger: true }).then(function (ok) {
            if (!ok) return;
            sb.from('estimates').delete().eq('id', v.id).then(function (r) {
              if (r.error) { PC.toast(r.error.message, 'error'); return; }
              PC.toast('Estimate deleted', 'success');
              var cur = st.opts.currentId || st.opts.rootId;
              if (v.id === cur) stripSwitch(st.opts.rootId); else PC.estStrip.refresh();
            });
          });
        } }
    ];
  }
  function stripRender() {
    var st = stripState; if (!st) return;
    var c = st.container, o = st.opts, rootId = o.rootId;
    var versions = st.versions.slice().sort(function (a, b) {
      var pa = a.parent_estimate_id ? 1 : 0, pb = b.parent_estimate_id ? 1 : 0;
      return pa - pb || (Number(a.version_number) || 0) - (Number(b.version_number) || 0);
    });
    var cur = o.currentId || rootId;
    c.innerHTML = '';

    // "E N ▾" badge → every version + 'Change orders 0' head
    var badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'pc-btn pc-btn-ghost pc-est-badge-btn';
    badge.style.padding = '0 4px';
    badge.title = 'Estimates';
    badge.innerHTML = '<span class="pc-est-badge">E ' + versions.length + '</span>' + PC.icon('expand_more', 18);
    badge.addEventListener('click', function () {
      var items = [{ head: true, label: 'Estimates (' + versions.length + ')' }].concat(versions.map(function (v) {
        return { label: stripLabel(v), hint: PC.money(st.totals[v.id] || 0) + (v.parent_estimate_id ? '' : ' · primary'), checked: v.id === cur,
          onClick: function () { if (v.id !== cur) stripSwitch(v.id); } };
      }), [
        { sep: true },
        { head: true, label: 'Change orders 0' },
        { label: 'No change order created yet.', disabled: true }
      ]);
      PC.menu(badge, items, { align: 'left', minWidth: 260 });
    });
    c.appendChild(badge);

    var tabs = document.createElement('div');
    tabs.className = 'pc-est-tabs';
    tabs.style.cssText = 'display:flex;gap:6px;align-items:center;overflow-x:auto;flex:1;min-width:0';
    if (st.error) {
      var err = document.createElement('span'); err.className = 'pc-muted'; err.style.fontSize = '12px'; err.textContent = st.error; tabs.appendChild(err);
    }
    versions.forEach(function (v) {
      var isPrimary = !v.parent_estimate_id;
      var tab = document.createElement('div');
      tab.className = 'pc-est-tab' + (v.id === cur ? ' active' : '');
      tab.setAttribute('data-est', v.id);
      tab.setAttribute('role', 'tab');
      tab.tabIndex = 0;
      tab.innerHTML = '<span style="min-width:0"><div class="lbl" style="white-space:nowrap">' + esc(stripLabel(v)) + '</div>' +
        '<div class="amt"><span class="e">E</span><span class="pc-mono">' + PC.money(st.totals[v.id] || 0) + '</span>' +
        (isPrimary ? '<span class="check" title="Primary estimate">' + PC.icon('check_circle', 14) + '</span>' : '') + '</div></span>';
      tab.addEventListener('click', function (ev) {
        if (ev.target.closest('.pc-kebab')) return;
        if (v.id !== cur) stripSwitch(v.id);
      });
      tab.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && v.id !== cur) stripSwitch(v.id); });
      if (o.canEdit) {
        var kb = document.createElement('button');
        kb.type = 'button'; kb.className = 'pc-btn pc-btn-ghost pc-btn-icon pc-kebab'; kb.title = 'Estimate actions';
        kb.setAttribute('aria-label', 'Estimate actions');
        kb.innerHTML = PC.icon('more_vert', 18);
        kb.addEventListener('click', function (ev) {
          ev.stopPropagation();
          PC.menu(kb, stripKebabItems(v), { align: 'left' });
        });
        tab.appendChild(kb);
      }
      tabs.appendChild(tab);
    });
    c.appendChild(tabs);

    if (o.canEdit) {
      var add = document.createElement('button');
      add.type = 'button'; add.className = 'pc-btn pc-btn-ghost pc-btn-icon pc-est-add'; add.title = 'Add alternate estimate';
      add.setAttribute('aria-label', 'Add alternate estimate');
      add.innerHTML = PC.icon('add', 20);
      add.addEventListener('click', function () { stripAddAlternate(null); });
      c.appendChild(add);
    }
    document.body.classList.add('has-est-strip');
  }
  PC.estStrip.refresh = function () {
    var st = stripState;
    if (!st || !window.supabaseClient) return Promise.resolve();
    var o = st.opts, rootId = o.rootId;
    var sb = window.supabaseClient;
    var cols = 'id,name,version_label,version_number,parent_estimate_id,labor_rate,overhead_pct,miscellaneous_pct,tax_rate,is_ofci,settings,square_footage';
    function load(colList) {
      return sb.from('estimates').select(colList).or('id.eq.' + rootId + ',parent_estimate_id.eq.' + rootId).order('version_number');
    }
    return load(cols).then(function (r) {
      if (r.error && /settings|square_footage/i.test(r.error.message || '')) {
        // procore-ui-schema.sql not run yet: degrade to the legacy column list
        return load('id,name,version_label,version_number,parent_estimate_id,labor_rate,overhead_pct,miscellaneous_pct,tax_rate,is_ofci');
      }
      return r;
    }).then(function (r) {
      if (r.error) { console.warn('[estStrip]', r.error); st.error = r.error.message; stripRender(); return; }
      st.error = null;
      st.versions = r.data || [];
      var ids = st.versions.map(function (v) { return v.id; });
      if (!ids.length) { stripRender(); return; }
      var lineCols = 'estimate_id,category,quantity,unit_material_cost,unit_labor_hours,labor_crew_type,is_wet_tap,is_optional,waste_pct,markup_pct,labor_markup_pct,labor_factor,is_taxable,group_name,labor_rate';
      return sb.from('estimate_line_items').select(lineCols).in('estimate_id', ids).then(function (li) {
        if (li.error) return sb.from('estimate_line_items').select('estimate_id,category,quantity,unit_material_cost,unit_labor_hours,labor_crew_type,is_wet_tap,is_optional').in('estimate_id', ids);
        return li;
      }).then(function (li) {
        var by = {};
        (li.data || []).forEach(function (l) { (by[l.estimate_id] = by[l.estimate_id] || []).push(l); });
        st.totals = {};
        st.versions.forEach(function (v) {
          var t;
          try { t = window.nwEstTotals ? window.nwEstTotals(by[v.id] || [], v) : { total: 0 }; }
          catch (e) { console.warn('[estStrip] totals', e); t = { total: 0 }; }
          st.totals[v.id] = (t.total != null ? t.total : t.bidPrice) || 0;
        });
        stripRender();
      });
    });
  };
  PC.estStrip.setCurrent = function (id) { if (stripState) { stripState.opts.currentId = id; stripRender(); } };
  PC.estStrip.versions = function () { return stripState ? stripState.versions : []; };
  PC.estStrip.totals = function () { return stripState ? stripState.totals : {}; };
  PC.estStrip.state = function () { return stripState; };

  /* ─── Embed protocol ───────────────────────────────────────────────── */
  PC.isEmbed = /[?&]embed=1/.test(location.search);
  if (PC.isEmbed) {
    (function addEmbed() {
      if (document.body) document.body.classList.add('pc-embed');
      else document.addEventListener('DOMContentLoaded', function () { document.body.classList.add('pc-embed'); });
    })();
  }
  /*
   * parent → child : PC.sendCmd(iframe, cmd, payload)  → {type:'nw-cmd', cmd, payload}
   *                  cmds: newLayer, openPlan {drawingId,page}, actions, import, export, showEstimate, refresh
   * child  → parent: PC.emit(event, payload)           → {type:'nw-event', event, payload}
   *                  events: ready {estimateId}, totals {estimateId,total}, navigate {tab,hash}, title {name}
   * PC.onCmd(handler) (child) / PC.onEvent(handler) (parent) → unsubscribe()
   */
  PC.onCmd = function (handler) {
    function listener(ev) {
      var d = ev.data;
      if (!d || typeof d !== 'object' || d.type !== 'nw-cmd') return;
      try { handler(d.cmd, d.payload || {}, ev); } catch (e) { console.warn('[PC.onCmd]', e); }
    }
    window.addEventListener('message', listener);
    return function () { window.removeEventListener('message', listener); };
  };
  PC.emit = function (event, payload) {
    if (!window.parent || window.parent === window) return false;
    try { window.parent.postMessage({ type: 'nw-event', event: event, payload: payload || {} }, '*'); return true; }
    catch (e) { console.warn('[PC.emit]', e); return false; }
  };
  PC.sendCmd = function (iframe, cmd, payload) {
    var w = iframe && iframe.contentWindow ? iframe.contentWindow : iframe;   // accepts <iframe> or a Window
    if (!w || typeof w.postMessage !== 'function') return false;
    try { w.postMessage({ type: 'nw-cmd', cmd: cmd, payload: payload || {} }, '*'); return true; }
    catch (e) { console.warn('[PC.sendCmd]', e); return false; }
  };
  PC.onEvent = function (handler) {
    function listener(ev) {
      var d = ev.data;
      if (!d || typeof d !== 'object' || d.type !== 'nw-event') return;
      try { handler(d.event, d.payload || {}, ev); } catch (e) { console.warn('[PC.onEvent]', e); }
    }
    window.addEventListener('message', listener);
    return function () { window.removeEventListener('message', listener); };
  };

  /* ─── Data helpers ─────────────────────────────────────────────────── */
  PC.saveField = function (table, id, patch, opts) {
    opts = opts || {};
    if (!window.supabaseClient) return Promise.reject(new Error('supabaseClient missing'));
    return window.supabaseClient.from(table).update(patch).eq('id', id).then(function (r) {
      if (r.error) { PC.toast('Save failed: ' + r.error.message, 'error'); throw r.error; }
      if (!opts.silent) PC.toast(opts.msg || 'Saved', 'success', 1600);
      return r;
    });
  };
  PC.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  };
  /* Load an external script once (CDN libs on demand) */
  var loaded = {};
  PC.loadScript = function (src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete loaded[src]; reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  };
  /* Is a Supabase error "column/table missing" (schema not yet run)? */
  PC.isSchemaError = function (err) {
    if (!err) return false;
    var m = (err.message || '') + ' ' + (err.code || '');
    return /42703|42P01|does not exist|could not find|schema cache/i.test(m);
  };
  /* Banner for pages that must degrade when procore-ui-schema.sql has not been run yet */
  PC.schemaBanner = function (container, text) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return null;
    var b = document.createElement('div');
    b.className = 'pc-banner-info pc-schema-banner';
    b.innerHTML = PC.icon('info', 16) + '<span>' + esc(text || 'Some estimating columns are missing: ask Russ to run procore-ui-schema.sql. The page runs in compatibility mode until then.') + '</span>';
    container.insertBefore(b, container.firstChild);
    return b;
  };
  /* Shallow-merge a patch into estimates.settings (JSONB): PC.mergeSettings(est, {pricing_locked:true}) → new object */
  PC.mergeSettings = function (est, patch) {
    var s = (est && est.settings && typeof est.settings === 'object') ? est.settings : {};
    return Object.assign({}, s, patch || {});
  };
  /* Default hrefs for the five project tabs: bid-project.html?id=<root>&est=<version>#tab */
  PC.tabHrefs = function (rootId, estId) {
    var q = 'bid-project.html?id=' + encodeURIComponent(rootId || '') + (estId && estId !== rootId ? '&est=' + encodeURIComponent(estId) : '');
    var h = {};
    PC.TABS.forEach(function (t) { h[t[0]] = q + '#' + t[0]; });
    return h;
  };

  window.PC = PC;
})();
