// «Загрузка страницы»: поле адреса плавно заливается голубым слева направо, а содержимое
// под адресной строкой всё это время пустое. Когда полоска дошла до конца - она гаснет,
// а содержимое резко появляется. Простые окна грузятся быстро, «сайты» (мои проекты,
// GitHub) - подольше.
// Вызывается из openWindow (Bureau.js) при открытии окна и из окон при переходе
// на другую страницу (смене адреса): playAddressLoading(app, win, { navigation: true, page }).
(function () {
  // По окнам, мс: fill - заливка слева направо, show - проявление содержимого
  // (0 - появляется резко), barFade - исчезновение полоски.
  const TIMING = {
    "My Computer": { fill: 300, show: 0, barFade: 150 },
    "About Me": { fill: 300, show: 0, barFade: 150 },
    "My Projects": { fill: 2000, show: 0, barFade: 350 },
    GitHub: { fill: 2200, show: 0, barFade: 350, status: "Opening page" },
    "Internet Explorer 6": { fill: 2000, show: 0, barFade: 350, status: "Открытие страницы" },
  };
  // Переход внутри уже открытого окна: сайт «в кэше» - грузится быстрее первого открытия.
  const NAVIGATION = {
    "My Projects": { fill: 1200 },
  };
  const FIELD = ".address_bar_content, .IE_address_bar_IE_content";
  // Содержимое окна под адресной строкой (.content, .am-body, .mp-page; у IE-окон - .IE_content,
  // в Internet Explorer между ними ещё скрытая панель поиска).
  const PAGE = ".address_bar + *, .IE_address_bar ~ .IE_content";
  const STATUS = ".IE_footer_status_text"; // строка состояния IE (есть у GitHub)
  // Одна непрерывная кривая без остановок: уверенный старт, долгое мягкое дотягивание
  // к правому краю - как у загружающейся вкладки.
  const EASING = "cubic-bezier(0.35, 0.1, 0.25, 1)";

  // options.navigation - переход внутри окна (свои тайминги из NAVIGATION);
  // options.page - что скрыть на время загрузки (по умолчанию всё под адресной строкой).
  function playAddressLoading(appName, windowElement, options = {}) {
    if (!TIMING[appName] || window.__noAddressLoading) return; // __noAddressLoading - выключатель для тестов
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const field = windowElement.querySelector(FIELD);
    if (!field) return;
    const timing = Object.assign({}, TIMING[appName], options.navigation ? NAVIGATION[appName] : null);

    // Новый переход во время загрузки - начинаем загрузку заново.
    if (field._addrStop) field._addrStop();

    const page = options.page || windowElement.querySelector(PAGE);
    const status = timing.status && windowElement.querySelector(STATUS);
    const statusDone = status && status.textContent;
    if (page) page.classList.add("addr-page-hidden");
    if (status) {
      const urlEl = field.querySelector("input, .IE_address_bar_IE_content_text");
      const url = urlEl ? (urlEl.value || urlEl.textContent).trim() : "";
      status.textContent = `${timing.status} ${url}...`;
    }

    const bar = document.createElement("div");
    bar.className = "addr-progress";
    field.classList.add("addr-loading");
    field.prepend(bar);

    // Показать страницу и вернуть строку состояния (конец загрузки или прерывание).
    const reveal = () => {
      if (status) status.textContent = statusDone;
      if (page) page.classList.remove("addr-page-hidden");
    };
    const cleanup = () => {
      bar.remove();
      field.classList.remove("addr-loading");
      if (field._addrStop === stop) field._addrStop = null;
    };
    let stopped = false;
    function stop() {
      stopped = true;
      reveal();
      cleanup();
    }
    field._addrStop = stop;

    // transform (scaleX) идёт на GPU, без рывков.
    const fill = bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: timing.fill,
      easing: EASING,
      fill: "forwards",
    });

    fill.finished
      .then(() => {
        if (stopped) return;
        reveal();
        if (page && timing.show) {
          for (const el of page.children) {
            el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: timing.show, easing: "ease-out" });
          }
        }
        return bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: timing.barFade, easing: "ease-out", fill: "forwards" })
          .finished;
      })
      .catch(() => {})
      .then(() => {
        if (!stopped) cleanup();
      });
  }

  window.playAddressLoading = playAddressLoading;
})();
