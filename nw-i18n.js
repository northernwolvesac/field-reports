// NW Field — interface language. English is the base language of the app and of everything that goes to the office
// (requests, orders, reports). A user may read the app in Russian, Ukrainian or Spanish: the choice is stored per device
// (localStorage nw_lang), the page text is swapped from the dictionary below as it renders (static markup and anything the
// scripts add later), and the AI helpers answer in that language while writing the office-facing lines in English.
// Strings that are not in the dictionary stay English — add them here as pages get covered.
(function () {
  var LANGS = { en: 'English', ru: 'Русский', uk: 'Українська', es: 'Español' };
  var D = {};
  function add(en, ru, uk, es) { D[en] = { ru: ru, uk: uk, es: es }; }

  // ── common ──
  add('Cancel', 'Отмена', 'Скасувати', 'Cancelar');
  add('Close', 'Закрыть', 'Закрити', 'Cerrar');
  add('Delete', 'Удалить', 'Видалити', 'Eliminar');
  add('Save', 'Сохранить', 'Зберегти', 'Guardar');
  add('Save changes', 'Сохранить изменения', 'Зберегти зміни', 'Guardar cambios');
  add('Saving…', 'Сохранение…', 'Збереження…', 'Guardando…');
  add('Loading…', 'Загрузка…', 'Завантаження…', 'Cargando…');
  add('Loading...', 'Загрузка...', 'Завантаження...', 'Cargando...');
  add('Updated', 'Обновлено', 'Оновлено', 'Actualizado');
  add('Deleted', 'Удалено', 'Видалено', 'Eliminado');
  add('Status', 'Статус', 'Статус', 'Estado');
  add('Priority', 'Приоритет', 'Пріоритет', 'Prioridad');
  add('Normal', 'Обычный', 'Звичайний', 'Normal');
  add('Low', 'Низкий', 'Низький', 'Baja');
  add('🚨 Urgent', '🚨 Срочно', '🚨 Терміново', '🚨 Urgente');
  add('Urgent', 'Срочно', 'Терміново', 'Urgente');
  add('Yes', 'Да', 'Так', 'Sí');
  add('No', 'Нет', 'Ні', 'No');
  add('Error: ', 'Ошибка: ', 'Помилка: ', 'Error: ');
  add('Failed: ', 'Не удалось: ', 'Не вдалося: ', 'Fallo: ');
  add('Save failed: ', 'Не удалось сохранить: ', 'Не вдалося зберегти: ', 'No se pudo guardar: ');
  add('Delete failed: ', 'Не удалось удалить: ', 'Не вдалося видалити: ', 'No se pudo eliminar: ');
  add('Log Out', 'Выйти', 'Вийти', 'Cerrar sesión');
  add('Profile', 'Профиль', 'Профіль', 'Perfil');
  add('Language', 'Язык', 'Мова', 'Idioma');

  // ── home (index.html) ──
  add('Good morning', 'Доброе утро', 'Доброго ранку', 'Buenos días');
  add('Good afternoon', 'Добрый день', 'Добрий день', 'Buenas tardes');
  add('Good evening', 'Добрый вечер', 'Добрий вечір', 'Buenas noches');
  add('My Jobs', 'Мои работы', 'Мої роботи', 'Mis trabajos');
  add('View All →', 'Все →', 'Усі →', 'Ver todo →');
  add('Projects', 'Проекты', 'Проєкти', 'Proyectos');
  add('Docs, drawings, contracts, billing', 'Документы, чертежи, контракты, счета', 'Документи, креслення, контракти, рахунки', 'Documentos, planos, contratos, facturación');
  add('All Projects', 'Все проекты', 'Усі проєкти', 'Todos los proyectos');
  add('Bid Board', 'Доска тендеров', 'Дошка тендерів', 'Tablero de licitaciones');
  add('Prime Contracts', 'Основные контракты', 'Основні контракти', 'Contratos principales');
  add('WIP Report', 'Отчёт WIP', 'Звіт WIP', 'Informe WIP');
  add('Change Orders', 'Изменения (CO)', 'Зміни (CO)', 'Órdenes de cambio');
  add('Purchase Orders', 'Заказы поставщикам (PO)', 'Замовлення постачальникам (PO)', 'Órdenes de compra');
  add('Reports', 'Отчёты', 'Звіти', 'Informes');
  add('Field reports from the job', 'Полевые отчёты с объекта', 'Польові звіти з об’єкта', 'Informes de campo de la obra');
  add('Service Call', 'Сервисный вызов', 'Сервісний виклик', 'Llamada de servicio');
  add('Start-Up', 'Пусконаладка', 'Пусконалагодження', 'Puesta en marcha');
  add('Site Survey', 'Осмотр объекта', 'Огляд об’єкта', 'Inspección del sitio');
  add('Maintenance', 'Обслуживание', 'Обслуговування', 'Mantenimiento');
  add('Work Order', 'Наряд на работу', 'Наряд на роботу', 'Orden de trabajo');
  add('Tools', 'Инструменты', 'Інструменти', 'Herramientas');
  add('Crews, materials, deliveries', 'Бригады, материалы, доставки', 'Бригади, матеріали, доставки', 'Cuadrillas, materiales, entregas');
  add('Schedule', 'График', 'Графік', 'Calendario');
  add('Field Orders', 'Заявки на материалы', 'Заявки на матеріали', 'Pedidos de campo');
  add('Delivery Schedule', 'График доставок', 'Графік доставок', 'Calendario de entregas');
  add('Dispatch', 'Диспетчер', 'Диспетчер', 'Despacho');
  add('Office', 'Офис', 'Офіс', 'Oficina');
  add('Customers, planning, oversight', 'Клиенты, планирование, контроль', 'Клієнти, планування, контроль', 'Clientes, planificación, supervisión');
  add('Customers', 'Клиенты', 'Клієнти', 'Clientes');
  add('Equipment', 'Оборудование', 'Обладнання', 'Equipos');
  add('Workload Planner', 'Планировщик загрузки', 'Планувальник навантаження', 'Planificador de carga');
  add('Management', 'Управление', 'Управління', 'Administración');
  add('Activity', 'Активность', 'Активність', 'Actividad');
  add('AI Support', 'AI-поддержка', 'AI-підтримка', 'Soporte IA');
  add('Install Northern Wolves Field', 'Установить Northern Wolves Field', 'Встановити Northern Wolves Field', 'Instalar Northern Wolves Field');
  add('Quick access from your home screen', 'Быстрый доступ с домашнего экрана', 'Швидкий доступ з домашнього екрана', 'Acceso rápido desde la pantalla de inicio');
  add('Install', 'Установить', 'Встановити', 'Instalar');
  add('How to Install', 'Как установить', 'Як встановити', 'Cómo instalar');

  // ── login ──
  add('Log In', 'Войти', 'Увійти', 'Iniciar sesión');
  add('Sign Up', 'Регистрация', 'Реєстрація', 'Registrarse');
  add('Email', 'Эл. почта', 'Ел. пошта', 'Correo');
  add('Password', 'Пароль', 'Пароль', 'Contraseña');
  add('Enter password', 'Введите пароль', 'Введіть пароль', 'Ingrese la contraseña');
  add('Show', 'Показать', 'Показати', 'Mostrar');
  add('Forgot password?', 'Забыли пароль?', 'Забули пароль?', '¿Olvidó la contraseña?');
  add('Full Name', 'Полное имя', 'Повне ім’я', 'Nombre completo');
  add('Phone', 'Телефон', 'Телефон', 'Teléfono');
  add('Confirm Password', 'Подтвердите пароль', 'Підтвердіть пароль', 'Confirmar contraseña');
  add('Confirm password', 'Подтвердите пароль', 'Підтвердіть пароль', 'Confirmar contraseña');
  add('Confirm new password', 'Подтвердите новый пароль', 'Підтвердіть новий пароль', 'Confirmar nueva contraseña');
  add('Type it again', 'Повторите ввод', 'Повторіть введення', 'Escríbala de nuevo');
  add('Min 6 characters', 'Минимум 6 символов', 'Мінімум 6 символів', 'Mínimo 6 caracteres');
  add('Create Account', 'Создать аккаунт', 'Створити акаунт', 'Crear cuenta');
  add('Back to Log In', 'Назад ко входу', 'Назад до входу', 'Volver a iniciar sesión');
  add('Send Reset Link', 'Отправить ссылку для сброса', 'Надіслати посилання для скидання', 'Enviar enlace de restablecimiento');
  add("Enter your email and we'll send a password reset link.", 'Введите эл. почту — мы пришлём ссылку для сброса пароля.', 'Введіть ел. пошту — ми надішлемо посилання для скидання пароля.', 'Ingrese su correo y le enviaremos un enlace para restablecer la contraseña.');
  add('Set a new password', 'Задайте новый пароль', 'Задайте новий пароль', 'Establecer una nueva contraseña');
  add('Choose a new password for your account.', 'Выберите новый пароль для аккаунта.', 'Оберіть новий пароль для акаунта.', 'Elija una nueva contraseña para su cuenta.');
  add('New password', 'Новый пароль', 'Новий пароль', 'Nueva contraseña');
  add('Save new password', 'Сохранить новый пароль', 'Зберегти новий пароль', 'Guardar nueva contraseña');
  add('Field Reporting System', 'Система полевых отчётов', 'Система польових звітів', 'Sistema de informes de campo');
  add('✨ Need help? Chat with AI Support', '✨ Нужна помощь? Чат с AI-поддержкой', '✨ Потрібна допомога? Чат з AI-підтримкою', '✨ ¿Necesita ayuda? Chatee con el soporte IA');

  // ── field orders ──
  add('Field Orders — Northern Wolves AC', 'Заявки на материалы — Northern Wolves AC', 'Заявки на матеріали — Northern Wolves AC', 'Pedidos de campo — Northern Wolves AC');
  add('+ Request Materials', '+ Заказать материалы', '+ Замовити матеріали', '+ Pedir materiales');
  add('Request Materials', 'Заказать материалы', 'Замовити матеріали', 'Pedir materiales');
  add('📋 My Orders', '📋 Мои заявки', '📋 Мої заявки', '📋 Mis pedidos');
  add('📦 All Orders', '📦 Все заявки', '📦 Усі заявки', '📦 Todos los pedidos');
  add('Submit before 10 AM', 'Отправляйте до 10:00', 'Надсилайте до 10:00', 'Envíe antes de las 10 AM');
  add('for delivery in', 'для доставки через', 'для доставки за', 'para entrega en');
  add('2–3 days', '2–3 дня', '2–3 дні', '2–3 días');
  add('. After 10 AM: delivery shifts by one day.', '. После 10:00 доставка сдвигается на день.', '. Після 10:00 доставка зсувається на день.', '. Después de las 10 AM la entrega se corre un día.');
  add('All projects', 'Все проекты', 'Усі проєкти', 'Todos los proyectos');
  add('All statuses', 'Все статусы', 'Усі статуси', 'Todos los estados');
  add('All priorities', 'Все приоритеты', 'Усі пріоритети', 'Todas las prioridades');
  add('Requested', 'Запрошено', 'Запитано', 'Solicitado');
  add('In Progress', 'В работе', 'В роботі', 'En proceso');
  add('Delivered', 'Доставлено', 'Доставлено', 'Entregado');
  add('Cancelled', 'Отменено', 'Скасовано', 'Cancelado');
  add('Project *', 'Проект *', 'Проєкт *', 'Proyecto *');
  add('Select project…', 'Выберите проект…', 'Оберіть проєкт…', 'Seleccione el proyecto…');
  add('What do you need? *', 'Что нужно? *', 'Що потрібно? *', '¿Qué necesita? *');
  add('e.g.\n- 2 boxes of 1/2" copper pipe\n- 4 elbows, 90°\n- 10 ft flex duct\n- 1 York thermostat', 'например:\n- 2 коробки медной трубы 1/2"\n- 4 уголка 90°\n- 10 ft гибкого воздуховода\n- 1 термостат York', 'наприклад:\n- 2 коробки мідної труби 1/2"\n- 4 кутники 90°\n- 10 ft гнучкого повітроводу\n- 1 термостат York', 'p. ej.\n- 2 cajas de tubería de cobre 1/2"\n- 4 codos de 90°\n- 10 ft de ducto flexible\n- 1 termostato York');
  add('List each item with quantity. Before it goes out, the AI helper checks the list against the HVAC catalog and asks what is not clear (copper type, size, hard / soft, insulation …).', 'Перечислите каждую позицию с количеством. Перед отправкой AI-помощник сверит список с каталогом HVAC и уточнит непонятное (тип меди, размер, жёсткая / мягкая, изоляция …). Можно писать на своём языке — в офис уйдёт английский.', 'Перелічіть кожну позицію з кількістю. Перед відправкою AI-помічник звірить список з каталогом HVAC і уточнить незрозуміле (тип міді, розмір, жорстка / м’яка, ізоляція …). Можна писати своєю мовою — в офіс піде англійська.', 'Enumere cada artículo con la cantidad. Antes de enviarse, el asistente IA revisa la lista contra el catálogo HVAC y pregunta lo que no esté claro (tipo de cobre, medida, rígido / flexible, aislamiento …). Puede escribir en su idioma: a la oficina llega en inglés.');
  add('📚 Catalog', '📚 Каталог', '📚 Каталог', '📚 Catálogo');
  add('✨ Check with AI', '✨ Проверить с AI', '✨ Перевірити з AI', '✨ Revisar con IA');
  add('✨ AI helper', '✨ AI-помощник', '✨ AI-помічник', '✨ Asistente IA');
  add('HVAC materials catalog', 'Каталог материалов HVAC', 'Каталог матеріалів HVAC', 'Catálogo de materiales HVAC');
  add('Search: copper, elbow, flex duct, armaflex, tapcon…', 'Поиск: copper, elbow, flex duct, armaflex, tapcon…', 'Пошук: copper, elbow, flex duct, armaflex, tapcon…', 'Buscar: copper, elbow, flex duct, armaflex, tapcon…');
  add('qty', 'кол-во', 'к-сть', 'cant.');
  add('＋ Add to request', '＋ Добавить в заявку', '＋ Додати до заявки', '＋ Añadir al pedido');
  add('Added to the request', 'Добавлено в заявку', 'Додано до заявки', 'Añadido al pedido');
  add('Nothing found — type what you need and the AI helper will sort it out', 'Ничего не найдено — напишите, что нужно, AI-помощник разберётся', 'Нічого не знайдено — напишіть, що потрібно, AI-помічник розбереться', 'No se encontró nada: escriba lo que necesita y el asistente IA lo resolverá');
  add('Catalog not loaded', 'Каталог не загружен', 'Каталог не завантажено', 'Catálogo no cargado');
  add('📷 Photos (optional)', '📷 Фото (необязательно)', '📷 Фото (необов’язково)', '📷 Fotos (opcional)');
  add("Tap to attach photos of the part / nameplate / what's missing", 'Нажмите, чтобы приложить фото детали / шильдика / того, чего не хватает', 'Натисніть, щоб додати фото деталі / шильдика / того, чого бракує', 'Toque para adjuntar fotos de la pieza / placa / lo que falta');
  add('Needed By', 'Нужно к', 'Потрібно до', 'Necesario para');
  add('Notes (optional)', 'Примечания (необязательно)', 'Примітки (необов’язково)', 'Notas (opcional)');
  add('Extra context — preferred brand, vendor, where to leave on site, etc.', 'Доп. контекст — бренд, поставщик, где оставить на объекте и т.д.', 'Дод. контекст — бренд, постачальник, де залишити на об’єкті тощо.', 'Contexto adicional: marca preferida, proveedor, dónde dejarlo en obra, etc.');
  add('Submit Request', 'Отправить заявку', 'Надіслати заявку', 'Enviar pedido');
  add('Submitting…', 'Отправка…', 'Надсилання…', 'Enviando…');
  add('Uploading photos…', 'Загрузка фото…', 'Завантаження фото…', 'Subiendo fotos…');
  add('Project and items are required', 'Укажите проект и позиции', 'Вкажіть проєкт і позиції', 'El proyecto y los artículos son obligatorios');
  add('Type what you need first', 'Сначала напишите, что нужно', 'Спочатку напишіть, що потрібно', 'Primero escriba lo que necesita');
  add('✅ Order submitted — notifications sent to PM, Jonathan, Andrei', '✅ Заявка отправлена — уведомления ушли PM, Jonathan, Andrei', '✅ Заявку надіслано — сповіщення пішли PM, Jonathan, Andrei', '✅ Pedido enviado: avisos a PM, Jonathan, Andrei');
  add('Failed to submit: ', 'Не удалось отправить: ', 'Не вдалося надіслати: ', 'No se pudo enviar: ');
  add('Checking the request against the catalog…', 'Сверяю заявку с каталогом…', 'Звіряю заявку з каталогом…', 'Revisando el pedido contra el catálogo…');
  add('The AI helper is not available right now (', 'AI-помощник сейчас недоступен (', 'AI-помічник зараз недоступний (', 'El asistente IA no está disponible ahora (');
  add('Send the request as written', 'Отправить заявку как есть', 'Надіслати заявку як є', 'Enviar el pedido tal como está');
  add('or type the answer', 'или напишите ответ', 'або напишіть відповідь', 'o escriba la respuesta');
  add('Answer', 'Ответить', 'Відповісти', 'Responder');
  add('Skip, send as written', 'Пропустить, отправить как есть', 'Пропустити, надіслати як є', 'Omitir, enviar tal como está');
  add('Order as it will go to the office:', 'Заявка в том виде, в каком уйдёт в офис:', 'Заявка в тому вигляді, в якому піде в офіс:', 'Pedido tal como llegará a la oficina:');
  add('Submit this order', 'Отправить эту заявку', 'Надіслати цю заявку', 'Enviar este pedido');
  add('Use this list', 'Использовать этот список', 'Використати цей список', 'Usar esta lista');
  add('Edit the text', 'Изменить текст', 'Змінити текст', 'Editar el texto');
  add('List updated', 'Список обновлён', 'Список оновлено', 'Lista actualizada');
  add('Note: ', 'Примечание: ', 'Примітка: ', 'Nota: ');
  add('Order Details', 'Детали заявки', 'Деталі заявки', 'Detalles del pedido');
  add('Fulfillment', 'Выполнение', 'Виконання', 'Cumplimiento');
  add('Driver / Vendor', 'Водитель / поставщик', 'Водій / постачальник', 'Conductor / proveedor');
  add('— Not assigned yet —', '— Ещё не назначен —', '— Ще не призначено —', '— Sin asignar —');
  add('Other (NW staff)', 'Другой (сотрудник NW)', 'Інший (співробітник NW)', 'Otro (personal NW)');
  add('Other vendor', 'Другой поставщик', 'Інший постачальник', 'Otro proveedor');
  add('Delivery Date', 'Дата доставки', 'Дата доставки', 'Fecha de entrega');
  add('Start Time', 'Начало', 'Початок', 'Hora de inicio');
  add('End Time', 'Конец', 'Кінець', 'Hora de fin');
  add('Delivery / Status Notes', 'Примечания по доставке / статусу', 'Примітки щодо доставки / статусу', 'Notas de entrega / estado');
  add('e.g. Left with foreman, supplier ETA, vendor PO #...', 'напр.: оставлено бригадиру, срок от поставщика, № PO поставщика…', 'напр.: залишено бригадиру, термін від постачальника, № PO постачальника…', 'p. ej.: dejado al capataz, ETA del proveedor, PO del proveedor…');
  add('Order cancelled', 'Заявка отменена', 'Заявку скасовано', 'Pedido cancelado');
  add('Order not found', 'Заявка не найдена', 'Заявку не знайдено', 'Pedido no encontrado');
  add('No orders yet. Tap + Request Materials to create your first.', 'Заявок пока нет. Нажмите «+ Заказать материалы», чтобы создать первую.', 'Заявок ще немає. Натисніть «+ Замовити матеріали», щоб створити першу.', 'Aún no hay pedidos. Toque «+ Pedir materiales» para crear el primero.');
  add('Original request: ', 'Исходная заявка: ', 'Початкова заявка: ', 'Pedido original: ');

  var lang = 'en';
  try { lang = localStorage.getItem('nw_lang') || 'en'; } catch (e) {}
  if (!LANGS[lang]) lang = 'en';
  var busy = false;

  function tr(s) {
    if (lang === 'en' || !s) return null;
    var e = D[s]; if (e && e[lang]) return e[lang];
    // "Good morning, Ruslan" / "Error: details" — translate a known head when the tail starts with , : ( or —
    var m = /^(.*?)([,:(—].*)$/.exec(s);
    if (m && D[m[1]] && D[m[1]][lang]) return D[m[1]][lang] + m[2];
    var m2 = /^(.*?[:(] )(.*)$/.exec(s);
    if (m2 && D[m2[1]] && D[m2[1]][lang]) return D[m2[1]][lang] + m2[2];
    return null;
  }
  function textNode(n) {
    var p = n.parentNode; if (!p) return;
    var tag = p.nodeName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return;
    if (p.closest && p.closest('[data-no-i18n], [translate="no"]')) return;
    var raw = n.nodeValue, en = n.__nwEn != null ? n.__nwEn : raw, s = en.trim();
    if (!s) return;
    var t = tr(s); if (t === null) return;
    var lead = en.match(/^\s*/)[0], tail = en.match(/\s*$/)[0];
    n.__nwEn = en; n.nodeValue = lead + t + tail;
  }
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function attrs(el) {
    if (!el.getAttribute) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a); if (!v) return;
      var key = '__nwEn_' + a, en = el[key] != null ? el[key] : v, t = tr(en.trim());
      if (t === null) return; el[key] = en; el.setAttribute(a, t);
    });
    if (el.tagName === 'INPUT' && /^(button|submit)$/i.test(el.type) && el.value) { var t2 = tr(el.value.trim()); if (t2 !== null) { el.__nwEn_value = el.value; el.value = t2; } }
  }
  function apply(root) {
    if (lang === 'en' || !root) return;
    busy = true;
    try {
      if (root.nodeType === 3) { textNode(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1) attrs(root);
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
      var n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
    } finally { busy = false; }
  }
  function mountSwitcher() {
    if (document.getElementById('nwLangPill')) return;
    var host = document.querySelector('[data-nw-lang]');
    var sel = document.createElement('select'); sel.id = 'nwLangPill'; sel.setAttribute('data-no-i18n', '1'); sel.title = 'Language / Язык / Мова / Idioma';
    Object.keys(LANGS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = (host ? LANGS[k] : k.toUpperCase()); if (k === lang) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () { try { localStorage.setItem('nw_lang', sel.value); } catch (e) {} location.reload(); });
    if (host) { host.appendChild(sel); return; }
    sel.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;font:600 11px/1 system-ui,sans-serif;color:#64748b;background:rgba(255,255,255,.92);border:1px solid #d1d5db;border-radius:999px;padding:5px 8px;opacity:.85;cursor:pointer';
    document.body.appendChild(sel);
  }
  function start() {
    document.documentElement.lang = lang;
    apply(document.body);
    mountSwitcher();
    if (lang !== 'en' && window.MutationObserver) {
      var pending = false;
      new MutationObserver(function (muts) {
        if (busy || pending) return;
        pending = true;
        setTimeout(function () {
          pending = false; busy = true;
          try { muts.forEach(function (m) { if (m.type === 'characterData') { delete m.target.__nwEn; textNode(m.target); } else m.addedNodes.forEach(function (n) { apply(n); }); }); } finally { busy = false; }
        }, 0);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  window.NWI18N = { lang: lang, langs: LANGS, t: function (s) { return tr(s) || s; }, apply: apply, dict: D,
    langName: { en: 'English', ru: 'Russian', uk: 'Ukrainian', es: 'Spanish' }[lang] };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
