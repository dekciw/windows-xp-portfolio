// Контент окна «Мои проекты». Правьте здесь — разметку и скрипт трогать не нужно.
//
// categories — пункты левого меню (пункт «Все» добавляется сам).
//   id — латиница, по нему проекты попадают в категорию; label — подпись;
//   icon — значок меню: "media", "builds", "personal", "client" (или "all").
//
// projects — карточки. При открытии окна и по «дому» («Домой», логотип, «Все») они
//   перемешиваются случайно; порядок здесь — исходный, из него и тасуется.
//   title     — название (обязательно)
//   category  — id категории из списка выше
//   views     — число просмотров: 2300 → «2,3 тыс. просмотров»
//   date      — дата публикации "ГГГГ-ММ-ДД": показывается как «3 недели назад»
//               (считается от сегодняшнего дня, со временем обновляется сама)
//   meta      — своя серая строка вместо «просмотры • дата», если views и date не указаны
//   thumb     — картинка превью 16:9, например "/Assets/Images/Projects/shop.webp";
//               пусто — цветная заглушка (цвет из color)
//   video     — видео-превью 16:9 (mp4), например "/Assets/Projects/previews/shop.mp4":
//               при наведении на карточку играет вместо thumb (обложки) с красной дорожкой
//   color     — цвет заглушки, пока нет картинки
//   href      — ссылка на проект (GitHub, сайт, файл); пусто — карточка «скоро»
//
//   Страница проекта (щелчок по карточке открывает её в этом же окне, как видео на YouTube):
//   slug      — адрес страницы латиницей: "burger-cheddar" → https://www.myprojects.com/burger-cheddar;
//               без slug карточка ведёт себя по-старому (href или «Проект скоро появится»)
//   media     — слайды плеера по порядку (точки под плеером — по их числу):
//               { type: "video", src: "…/presentation.mp4", poster: "…/presentation-poster.jpg" }
//               { type: "image", src: "…/hero.jpg", alt: "что на картинке" }
//   site      — ссылка «Открыть сайт» в плеере (открывается в новой вкладке)
//   brief     — строка «Задача:» в описании
//   role      — строка «Роль:» в описании
//   desc      — строка «Описание:» (свёрнута до 3 строк, кнопка «Ещё»)
//   comments  — комментарии: [{ user: "@имя", date: "ГГГГ-ММ-ДД", text, likes, dislikes }];
//               реплики зрителей о том, что видно на сайте (без рекомендаций от «заказчиков»)
//
// avatar — круглое фото 36×36 в каждой карточке. Положите своё фото, например,
//   в "/Assets/Images/My Projects/avatar.jpg" и укажите путь здесь.
//
// social — значки справа в шапке. Если не указать, берутся соцсети из «Обо мне».
window.MY_PROJECTS_DATA = {
  avatar: "/Assets/Images/My Projects/avatar.jpg",

  categories: [
    { id: "media", label: "Лендинги", icon: "media" },
    { id: "builds", label: "Фреймворки", icon: "builds" },
    { id: "personal", label: "Личные", icon: "personal" },
    { id: "client", label: "Клиенты", icon: "client" },
  ],

  // Просмотры и даты — демо-значения.
  projects: [
    {
      title: "Промет: конфигуратор локеров",
      category: "client",
      views: 18400,
      date: "2026-09-14",
      thumb: "/Assets/Projects/covers/PrometConfigurator.jpg",
      video: "/Assets/Projects/previews/PrometConfigurator.mp4",
      href: "",
      slug: "promet-configurator",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/promet-configurator/presentation.mp4",
          poster: "/Assets/Projects/media/promet-configurator/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/promet-configurator/series.jpg", alt: "Шаг 1: выбор серии шкафа" },
        { type: "image", src: "/Assets/Projects/media/promet-configurator/model.jpg", alt: "Шаг 2: выбор модели" },
        { type: "image", src: "/Assets/Projects/media/promet-configurator/params.jpg", alt: "Шаг 3: параметры - металл, замок, цвет по RAL и цена" },
        { type: "image", src: "/Assets/Projects/media/promet-configurator/kp.jpg", alt: "Коммерческое предложение в PDF с итоговой конфигурацией" },
      ],
      site: "https://dekciw.github.io/PrometConfigurator/",
      brief:
        "Дать менеджерам отдела продаж НПО «Промет» инструмент, где шкаф-локер собирается за пару минут, " +
        "цена считается сразу, а КП и наряд-заказ получаются готовыми PDF без ручной вёрстки",
      role: "Дизайн и разработка",
      desc:
        "Внутренний конфигуратор металлических шкафов-локеров: серия, модель, толщина металла, габариты, замок, " +
        "вентиляция и цвет по RAL. Цена с НДС и без пересчитывается на каждом шаге, готовую конфигурацию можно " +
        "скачать как КП или наряд-заказ на фирменном бланке.\n" +
        "React 19 и React Router - интерфейс, анимации на Motion, стили на CSS Modules без UI-библиотек.\n" +
        "Firebase - вход по приглашению, роли пользователей, каталог и коэффициенты наценки в Firestore " +
        "(каталог кешируется в localStorage на сутки).\n" +
        "pdf-lib и fontkit - заполнение PDF-шаблонов КП и наряд-заказа, история конфигураций с повторным скачиванием.\n" +
        "Админка - каталог и фото моделей, сортировка перетаскиванием (dnd-kit), блокировка доступа.\n" +
        "Сборка на Vite, тесты на Vitest и Testing Library, макет всех экранов в Figma.",
      comments: [
        {
          user: "@sergey_pm",
          date: "2026-09-20",
          text: "Вот это уже не учебный лендинг, а настоящий рабочий инструмент. КП в PDF прямо из браузера - очень удобно.",
          likes: 24,
          dislikes: 0,
        },
        {
          user: "@lena.ux",
          date: "2026-10-02",
          text: "Понравилось, что цена меняется сразу при выборе замка и толщины металла, не надо жать никакое «Рассчитать».",
          likes: 11,
          dislikes: 0,
        },
        {
          user: "@kirill_dev",
          date: "2026-10-15",
          text: "А коэффициенты наценки где хранятся? Если в Firestore, то правильно, менять без релиза - то что надо.",
          likes: 6,
          dislikes: 0,
        },
        {
          user: "@nastya_design",
          date: "2026-11-04",
          text: "Цвета по RAL кружочками - мелочь, а смотрится аккуратно. Хотелось бы ещё превью шкафа в выбранном цвете)",
          likes: 9,
          dislikes: 1,
        },
      ],
    },
    {
      title: "Burger Cheddar",
      category: "media",
      views: 2300,
      date: "2026-10-08",
      thumb: "/Assets/Projects/covers/BurgerCheddar.jpg",
      video: "/Assets/Projects/previews/BurgerCheddar.mp4",
      href: "",
      slug: "burger-cheddar",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/burger-cheddar/presentation.mp4",
          poster: "/Assets/Projects/media/burger-cheddar/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/burger-cheddar/hero.jpg", alt: "Главный экран: бургер чеддер на тёмном фоне с огнём" },
        { type: "image", src: "/Assets/Projects/media/burger-cheddar/menu.jpg", alt: "Меню: бургеры с составом, весом и ценой" },
        { type: "image", src: "/Assets/Projects/media/burger-cheddar/order.jpg", alt: "Форма оформления заказа" },
        { type: "image", src: "/Assets/Projects/media/burger-cheddar/why.jpg", alt: "Раздел «Почему нас выбирают?»" },
      ],
      site: "https://dekciw.github.io/BurgerCheddar/",
      // Учебный проект.
      brief: "Сделать лендинг бургерной, где гость быстро выбирает бургер, видит цену в своей валюте и оформляет заказ",
      role: "Дизайн и разработка",
      // Переносы строк (\n) в описании сохраняются на странице.
      desc:
        "Лендинг бургерной «Бургер чеддер»: тёмный первый экран с огнём, меню из 12 бургеров с составом, весом " +
        "и ценой, смена валюты в шапке ($, ₽, BYN, € и ¥) и форма заказа с проверкой полей.\n" +
        "HTML5 - одна страница с семантической разметкой (header, nav, section), без сборщика и шаблонизаторов.\n" +
        "CSS3 - один файл стилей: раскладка на Flexbox и CSS Grid, свои шрифты Gilroy и Merriweather через " +
        "@font-face, графика в SVG и PNG.\n" +
        "JavaScript (ES6) без фреймворков и библиотек: плавная прокрутка к разделам через scrollIntoView, " +
        "пересчёт цен по data-атрибутам с базовой ценой при смене валюты, проверка полей формы с подсветкой пустых.\n" +
        "Хостинг - GitHub Pages.",
      // Комментарии, опубликованные на странице всегда (свои посетитель добавляет у себя в браузере).
      comments: [
        {
          user: "@marina.k",
          date: "2026-11-12",
          text: "Залипла на переключении валют - цены пересчитываются мгновенно. Огонь на первом экране смотрится круто.",
          likes: 13,
          dislikes: 0,
        },
        {
          user: "@dmitry_v",
          date: "2026-11-09",
          text: "Аккуратная вёрстка и ничего лишнего: состав, вес и цена видны сразу. Пока листал меню, захотелось бургер.",
          likes: 7,
          dislikes: 0,
        },
        {
          user: "@alex.dev",
          date: "2026-11-03",
          text: "Приятно, что форма заказа подсвечивает пустые поля - мелочь, а без неё такие формы бесят.",
          likes: 4,
          dislikes: 0,
        },
      ],
    },
    {
      title: "CoffeSun",
      category: "builds",
      views: 5600,
      date: "2026-08-22",
      thumb: "/Assets/Projects/covers/CoffeSun.jpg",
      video: "/Assets/Projects/previews/CoffeSun.mp4",
      href: "",
      slug: "coffe-sun",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/coffe-sun/presentation.mp4",
          poster: "/Assets/Projects/media/coffe-sun/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/coffe-sun/hero.jpg", alt: "Первый экран кофейни с чашкой кофе" },
        { type: "image", src: "/Assets/Projects/media/coffe-sun/catalog.jpg", alt: "Каталог: 6 сортов кофе в зёрнах с весом и ценой" },
        { type: "image", src: "/Assets/Projects/media/coffe-sun/advantages.jpg", alt: "Блок преимуществ кофейни" },
        { type: "image", src: "/Assets/Projects/media/coffe-sun/order.jpg", alt: "Форма заказа с выбранным кофе" },
      ],
      site: "https://dekciw.github.io/CoffeSun/",
      brief: "Сделать лендинг кофейни на React, где гость выбирает кофе в зёрнах и сразу попадает в форму заказа с этим сортом",
      role: "Вёрстка и разработка",
      desc:
        "Тёмный лендинг кофейни CoffeSUN: каталог из 6 сортов кофе в зёрнах, у каждой карточки цвет под упаковку, " +
        "блок преимуществ и форма заказа.\n" +
        "React 19 - страница из компонентов, данные каталога в JSON.\n" +
        "Vite 7 - сборка и dev-сервер, ESLint для проверки кода.\n" +
        "SCSS - у каждого компонента свой файл стилей.\n" +
        "Интерактив: кнопка «Заказать» подставляет кофе в форму и плавно прокручивает к ней, картинка следует " +
        "за мышью, анимация чашки и зёрен по бокам.",
      comments: [
        {
          user: "@coffee_addict",
          date: "2026-08-25",
          text: "Карточки в цвет упаковки - прям отличная идея, каталог сразу выглядит живым.",
          likes: 15,
          dislikes: 0,
        },
        {
          user: "@max.front",
          date: "2026-09-10",
          text: "Зёрна по бокам формы залипательные) Но на слабом ноуте анимация чуть подтормаживает.",
          likes: 5,
          dislikes: 1,
        },
        {
          user: "@yulia_p",
          date: "2026-10-01",
          text: "Нажала «Заказать» - кофе сам появился в форме. Вроде мелочь, а приятно.",
          likes: 8,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Super Cars",
      category: "builds",
      views: 9100,
      date: "2026-07-30",
      thumb: "/Assets/Projects/covers/SuperCars.jpg",
      video: "/Assets/Projects/previews/SuperCars.mp4",
      href: "",
      slug: "super-cars",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/super-cars/presentation.mp4",
          poster: "/Assets/Projects/media/super-cars/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/super-cars/hero.jpg", alt: "Первый экран автосалона со спорткаром" },
        { type: "image", src: "/Assets/Projects/media/super-cars/catalog.jpg", alt: "Каталог автомобилей с фильтром по маркам" },
        { type: "image", src: "/Assets/Projects/media/super-cars/order.jpg", alt: "Форма бронирования автомобиля" },
      ],
      site: "https://dekciw.github.io/SuperCars/",
      brief: "Сделать лендинг проката спорткаров на Angular: каталог с фильтром по маркам и бронирование без перезагрузки страницы",
      role: "Вёрстка и разработка",
      desc:
        "Тёмный лендинг автосалона Super Cars: фильтр по 8 маркам, карточки машин с фото, описанием и ценой " +
        "за 1, 1-3 и 3+ суток, форма бронирования.\n" +
        "Angular 19 и TypeScript - standalone-компонент, данные через HttpClient с учебного API.\n" +
        "Reactive Forms - заявка уходит на тестовый сервер, ответ показывается в сообщении, форма очищается сама.\n" +
        "Анимации: главная машина едет при прокрутке, машина у формы следует за курсором.\n" +
        "Адаптив до телефона, сайт на GitHub Pages.",
      comments: [
        {
          user: "@drift_king",
          date: "2026-08-02",
          text: "Машина, которая едет при прокрутке - топ. Минут пять просто крутил колесо мыши туда-сюда.",
          likes: 19,
          dislikes: 0,
        },
        {
          user: "@anya.codes",
          date: "2026-08-19",
          text: "Фильтр по маркам работает быстро. Не хватает сортировки по цене, но для лендинга и так норм.",
          likes: 7,
          dislikes: 0,
        },
        {
          user: "@pavel_ng",
          date: "2026-09-06",
          text: "Reactive Forms на лендинге - уважаю. Ответ сервера прямо в сообщении, без перезагрузки, всё как надо.",
          likes: 10,
          dislikes: 0,
        },
        {
          user: "@den4ik",
          date: "2026-10-27",
          text: "Ламба на первом экране смотрится очень сочно",
          likes: 3,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Trendy Cookies",
      category: "builds",
      views: 4700,
      date: "2026-10-21",
      thumb: "/Assets/Projects/covers/TrendyCookies.jpg",
      video: "/Assets/Projects/previews/TrendyCookies.mp4",
      href: "",
      slug: "trendy-cookies",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/trendy-cookies/presentation.mp4",
          poster: "/Assets/Projects/media/trendy-cookies/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/trendy-cookies/hero.jpg", alt: "Первый экран магазина печенья в фиолетовых тонах" },
        { type: "image", src: "/Assets/Projects/media/trendy-cookies/products.jpg", alt: "Каталог печенья с переключателем «Без сахара»" },
        { type: "image", src: "/Assets/Projects/media/trendy-cookies/about.jpg", alt: "Блок «Пекарня с любовью»" },
        { type: "image", src: "/Assets/Projects/media/trendy-cookies/order.jpg", alt: "Форма заказа печенья" },
      ],
      site: "https://dekciw.github.io/TrendyCookies/",
      brief: "Сделать лендинг магазина печенья на Angular с каталогом с сервера, фильтром «Без сахара» и заказом",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг магазина Trendy cookies в фиолетовой теме: каталог печенья с ценой и весом, переключатель " +
        "«Без сахара», смена валюты ($, ₽, BYN, € и ¥) и форма заказа.\n" +
        "Angular - каталог приходит запросом с учебного сервера, фильтр «Без сахара» добавляет параметр к запросу.\n" +
        "Цены пересчитываются от базовой цены в долларах при каждом нажатии на кнопку валюты.\n" +
        "Форма заказа: все поля обязательны, отправка на тестовый сервер, пока ждём ответ - анимация Lottie.\n" +
        "Собственные шрифты Steppe, меню с якорями, адаптив до телефона.",
      comments: [
        {
          user: "@sweet_tooth",
          date: "2026-10-23",
          text: "Переключатель «Без сахара» - для меня самое важное на таких сайтах, спасибо что он есть)",
          likes: 12,
          dislikes: 0,
        },
        {
          user: "@igor.web",
          date: "2026-10-30",
          text: "Анимация загрузки на Lottie при отправке формы - приятный штрих. Фиолетовый, правда, на любителя.",
          likes: 4,
          dislikes: 2,
        },
        {
          user: "@marina.k",
          date: "2026-11-08",
          text: "Опять валюты! После бургеров уже узнаю фирменную фишку)",
          likes: 6,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Strong Club Barbershop",
      category: "builds",
      views: 12800,
      date: "2026-06-18",
      thumb: "/Assets/Projects/covers/StrongClubBarbershop.jpg",
      video: "/Assets/Projects/previews/StrongClubBarbershop.mp4",
      href: "",
      slug: "strong-club",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/strong-club/presentation.mp4",
          poster: "/Assets/Projects/media/strong-club/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/strong-club/hero.jpg", alt: "Первый экран барбершопа Strong Club" },
        { type: "image", src: "/Assets/Projects/media/strong-club/about.jpg", alt: "Раздел о барбершопе" },
        { type: "image", src: "/Assets/Projects/media/strong-club/masters.jpg", alt: "Слайдер мастеров" },
        { type: "image", src: "/Assets/Projects/media/strong-club/price.jpg", alt: "Прайс на услуги" },
      ],
      site: "https://dekciw.github.io/StrongClubBarbershop/",
      brief: "Сделать лендинг барбершопа с прайсом, мастерами и онлайн-записью на удобные дату и время",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг барбершопа Strong Club: о барбершопе, прайс на 14 услуг, скидка 15% новым гостям, слайдер мастеров, " +
        "карта и форма записи.\n" +
        "HTML и Sass (SCSS) - стили собираются Gulp в один минифицированный файл.\n" +
        "jQuery - слайдер мастеров на Slick, календарь Air Datepicker, маска телефона, анимации при прокрутке " +
        "на WOW.js и Animate.css.\n" +
        "Форма записи: услуга, мастер, дата и время, ошибка под каждым незаполненным полем, отправка на тестовый сервер.\n" +
        "Адаптив до 320 px и мобильное меню.",
      comments: [
        {
          user: "@borodach",
          date: "2026-06-21",
          text: "Записался бы прямо сейчас, если б барбершоп был настоящий. Календарь с выбором времени удобный.",
          likes: 21,
          dislikes: 0,
        },
        {
          user: "@vika_frontend",
          date: "2026-07-15",
          text: "Ошибки под каждым полем, а не один алерт на всю форму - вот так и надо делать.",
          likes: 13,
          dislikes: 0,
        },
        {
          user: "@oleg_s",
          date: "2026-08-30",
          text: "Анимации при прокрутке немного навязчивые, но в целом стильно.",
          likes: 2,
          dislikes: 3,
        },
        {
          user: "@timur.design",
          date: "2026-10-11",
          text: "Цветовая гамма прям барбершоповская, чёрный с золотом. Слайдер мастеров листается плавно.",
          likes: 7,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Fashion Store",
      category: "builds",
      views: 3900,
      date: "2026-09-03",
      thumb: "/Assets/Projects/covers/FashionStore.jpg",
      video: "/Assets/Projects/previews/FashionStore.mp4",
      href: "",
      slug: "fashion-store",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/fashion-store/presentation.mp4",
          poster: "/Assets/Projects/media/fashion-store/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/fashion-store/hero.jpg", alt: "Промо-экран магазина одежды с кнопкой Shop Now" },
        { type: "image", src: "/Assets/Projects/media/fashion-store/arrivals.jpg", alt: "Новинки по категориям" },
        { type: "image", src: "/Assets/Projects/media/fashion-store/sale.jpg", alt: "Распродажа Payday Sale" },
        { type: "image", src: "/Assets/Projects/media/fashion-store/app.jpg", alt: "Блок мобильного приложения с кнопками App Store и Google Play" },
      ],
      site: "https://dekciw.github.io/FashionStore/",
      brief: "Собрать лендинг магазина одежды на React из переиспользуемых компонентов",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг магазина одежды: промо с кнопкой Shop Now, логотипы брендов, новинки по категориям, подборки " +
        "Young’s Favourite, распродажа Payday Sale, блок мобильного приложения и подписка на промокоды.\n" +
        "React 19 на Create React App - 10 компонентов, общая карточка Card для всех подборок.\n" +
        "Обычный CSS - у каждого компонента свой файл стилей, шрифт Poppins.\n" +
        "Эффекты при наведении на карточки и кнопки, поле email в подписке.\n" +
        "Сайт на GitHub Pages.",
      comments: [
        {
          user: "@alina_style",
          date: "2026-09-07",
          text: "Выглядит как настоящий магазин, я сначала полезла искать корзину)",
          likes: 9,
          dislikes: 0,
        },
        {
          user: "@react_newbie",
          date: "2026-09-28",
          text: "Одна карточка Card на все подборки - хороший пример, как не копипастить компоненты. Утащил идею.",
          likes: 6,
          dislikes: 0,
        },
        {
          user: "@stas.k",
          date: "2026-10-19",
          text: "Payday Sale бросается в глаза, с акцентами всё ок. На мобилке бы ещё проверить.",
          likes: 1,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Macaroons Shop",
      category: "builds",
      views: 1600,
      date: "2026-07-09",
      thumb: "/Assets/Projects/covers/MacaroonsShop.jpg",
      video: "/Assets/Projects/previews/MacaroonsShop.mp4",
      href: "",
      slug: "macaroons-shop",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/macaroons-shop/presentation.mp4",
          poster: "/Assets/Projects/media/macaroons-shop/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/macaroons-shop/hero.jpg", alt: "Первый экран кондитерской с макарунами" },
        { type: "image", src: "/Assets/Projects/media/macaroons-shop/products.jpg", alt: "Каталог из четырёх наборов макарун" },
        { type: "image", src: "/Assets/Projects/media/macaroons-shop/about.jpg", alt: "Раздел о кондитерской и её преимуществах" },
        { type: "image", src: "/Assets/Projects/media/macaroons-shop/order.jpg", alt: "Форма заказа" },
      ],
      site: "https://dekciw.github.io/MacaroonsShop/",
      brief: "Сверстать лендинг кондитерской с каталогом и формой заказа, попрактиковаться в Less, Gulp и Grunt",
      role: "Вёрстка и разработка",
      desc:
        "Нежный лендинг кондитерской: первый экран, о кондитерской, четыре преимущества, каталог из 4 товаров, " +
        "форма заказа и подвал с контактами.\n" +
        "HTML и Less - стили собираются в CSS через Gulp и Grunt (практика двух сборщиков).\n" +
        "jQuery - кнопка «Заказать» подставляет товар в форму и плавно прокручивает к ней, в телефон вводятся только " +
        "цифры, пустые поля подсвечиваются.\n" +
        "Отправка заказа на тестовый сервер с анимацией загрузки.\n" +
        "Адаптив до 320 px и мобильное меню.",
      comments: [
        {
          user: "@pastel_girl",
          date: "2026-07-12",
          text: "Такая пастельная палитра, хочется прямо съесть экран",
          likes: 8,
          dislikes: 0,
        },
        {
          user: "@gulp_fan",
          date: "2026-08-14",
          text: "Gulp и Grunt в одном проекте - как музей сборщиков) Но для практики полезно, понимаешь, откуда всё пошло.",
          likes: 5,
          dislikes: 0,
        },
        {
          user: "@ksenia.m",
          date: "2026-09-22",
          text: "Форма не даёт ввести буквы в телефон - мелочь, а многие про это забывают.",
          likes: 4,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Pizza Chef",
      category: "media",
      views: 7300,
      date: "2026-06-27",
      thumb: "/Assets/Projects/covers/PizzaChef.jpg",
      video: "/Assets/Projects/previews/PizzaChef.mp4",
      href: "",
      slug: "pizza-chef",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/pizza-chef/presentation.mp4",
          poster: "/Assets/Projects/media/pizza-chef/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/pizza-chef/hero.jpg", alt: "Первый экран пиццерии с обещанием доставки за 30 минут" },
        { type: "image", src: "/Assets/Projects/media/pizza-chef/menu.jpg", alt: "Меню из 8 пицц с составом" },
        { type: "image", src: "/Assets/Projects/media/pizza-chef/order.jpg", alt: "Форма заказа с выбранной пиццей" },
      ],
      site: "https://dekciw.github.io/PizzaChef/",
      brief: "Сделать лендинг пиццерии, где выбранная пицца сама попадает в заказ, а форма не пропускает ошибок",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг пиццерии Pizza Chef: меню из 8 пицц с составом, блок преимуществ, обещание доставки за 30 минут " +
        "и форма заказа.\n" +
        "HTML5 и CSS3 - шесть точек адаптива до 320 px, свой шрифт Muller, мобильное меню.\n" +
        "JavaScript без библиотек: «В корзину» записывает пиццу в форму и плавно прокручивает к ней, маска телефона " +
        "вида +7(927)89-01-234, проверка пустых полей и сообщение об успешном заказе.\n" +
        "Сайт на GitHub Pages.",
      comments: [
        {
          user: "@pepperoni",
          date: "2026-06-29",
          text: "«В корзину» и сразу скролл к форме с моей пиццей - вот бы так работали все сайты доставки.",
          likes: 16,
          dislikes: 0,
        },
        {
          user: "@nikita_js",
          date: "2026-07-21",
          text: "Маску телефона сам писал или библиотекой? Формат прикольный, со скобками.",
          likes: 3,
          dislikes: 0,
        },
        {
          user: "@dmitry_v",
          date: "2026-08-11",
          text: "Шесть точек адаптива - видно, что заморочился. На моём планшете всё ровно.",
          likes: 5,
          dislikes: 0,
        },
        {
          user: "@hungry_student",
          date: "2026-11-01",
          text: "Зашёл посмотреть код, ушёл заказывать пиццу. Спасибо",
          likes: 22,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Explore Norway",
      category: "media",
      views: 2900,
      date: "2026-08-05",
      thumb: "/Assets/Projects/covers/ExploreNorway.jpg",
      video: "/Assets/Projects/previews/ExploreNorway.mp4",
      href: "",
      slug: "explore-norway",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/explore-norway/presentation.mp4",
          poster: "/Assets/Projects/media/explore-norway/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/explore-norway/slide-1.jpg", alt: "Первый слайд: норвежские горы на весь экран" },
        { type: "image", src: "/Assets/Projects/media/explore-norway/slide-2.jpg", alt: "Второй слайд с подсказками маршрутов" },
        { type: "image", src: "/Assets/Projects/media/explore-norway/slide-3.jpg", alt: "Третий слайд" },
        { type: "image", src: "/Assets/Projects/media/explore-norway/slide-5.jpg", alt: "Пятый слайд со счётчиком 05 / 05" },
      ],
      site: "https://dekciw.github.io/ExploreNorway/",
      brief: "Сделать первый экран сайта путешествий по Норвегии с полноэкранным слайдером, который хочется листать",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг путешествий по Норвегии: пять фото на весь экран с автопрокруткой, стрелки, счётчик слайдов " +
        "01 / 05 и подсказки маршрутов.\n" +
        "HTML и CSS - четыре точки адаптива (1670, 1140, 800 и 640 px), шрифт Montserrat.\n" +
        "JavaScript и tiny-slider - стрелки листают слайды, счётчик обновляется по событию смены слайда.\n" +
        "Сайт на GitHub Pages.",
      comments: [
        {
          user: "@fjord_lover",
          date: "2026-08-09",
          text: "Был в Норвегии прошлым летом, фотки прям оттуда вайб передают. Хочу обратно.",
          likes: 11,
          dislikes: 0,
        },
        {
          user: "@lera.ui",
          date: "2026-09-15",
          text: "Счётчик 01 / 05 тонким шрифтом очень аккуратный. Автопрокрутку я бы сделала помедленнее.",
          likes: 4,
          dislikes: 1,
        },
        {
          user: "@artem_travel",
          date: "2026-10-24",
          text: "Простая страница, но выглядит дорого. Фото решают)",
          likes: 6,
          dislikes: 0,
        },
      ],
    },
    {
      title: "2rism",
      category: "media",
      views: 1200,
      date: "2026-10-30",
      thumb: "/Assets/Projects/covers/2rism.jpg",
      video: "/Assets/Projects/previews/2rism.mp4",
      href: "",
      slug: "2rism",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/2rism/presentation.mp4",
          poster: "/Assets/Projects/media/2rism/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/2rism/hero.jpg", alt: "Первый экран с поиском: страна, активность, дата и гости" },
        { type: "image", src: "/Assets/Projects/media/2rism/destinations.jpg", alt: "Популярные направления" },
        { type: "image", src: "/Assets/Projects/media/2rism/hotels.jpg", alt: "Отели и рестораны с рейтингом" },
        { type: "image", src: "/Assets/Projects/media/2rism/activities.jpg", alt: "Активности для путешественников" },
      ],
      site: "https://dekciw.github.io/2rism/",
      brief: "Сделать лендинг туристического сервиса с удобным поиском поездки прямо на первом экране",
      role: "Вёрстка и разработка",
      desc:
        "Лендинг туристического сервиса 2rism: поиск поездки (страна, активность, дата, гости), популярные направления, " +
        "отели и рестораны с рейтингом, советы путешественникам, активности и подписка на рассылку.\n" +
        "HTML, CSS и JavaScript без сборки и фреймворков, адаптив до телефона и мобильное меню.\n" +
        "autoComplete.js - подсказки по списку из 250 стран, custom-select - оформленные выпадающие списки, " +
        "easepick - календарь для даты.\n" +
        "Сайт на GitHub Pages.",
      comments: [
        {
          user: "@backpacker",
          date: "2026-11-01",
          text: "Подсказки стран при вводе работают шустро, даже «Кот-д’Ивуар» нашёлся)",
          likes: 7,
          dislikes: 0,
        },
        {
          user: "@sasha.front",
          date: "2026-11-06",
          text: "Календарь easepick хорошо вписался в дизайн, обычно такие штуки выглядят чужеродно.",
          likes: 3,
          dislikes: 0,
        },
        {
          user: "@olga_trip",
          date: "2026-11-12",
          text: "Кнопка поиска пока никуда не ведёт, да? Но выглядит как настоящий сервис бронирования.",
          likes: 2,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Dynamic Island",
      category: "personal",
      views: 31500,
      date: "2026-06-08",
      thumb: "/Assets/Projects/covers/DynamicIslandCSS.jpg",
      video: "/Assets/Projects/previews/DynamicIslandCSS.mp4",
      href: "",
      slug: "dynamic-island",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/dynamic-island/presentation.mp4",
          poster: "/Assets/Projects/media/dynamic-island/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/dynamic-island/main.jpg", alt: "Телефон с раскрытой Dynamic Island" },
        { type: "image", src: "/Assets/Projects/media/dynamic-island/gold.jpg", alt: "Тема Gold" },
        { type: "image", src: "/Assets/Projects/media/dynamic-island/deep-purple.jpg", alt: "Тема Deep Purple" },
        { type: "image", src: "/Assets/Projects/media/dynamic-island/silver.jpg", alt: "Тема Silver" },
      ],
      site: "https://dekciw.github.io/DynamicIslandCSS/",
      brief: "Повторить «Dynamic Island» с iPhone на чистых HTML и CSS, без единой строчки JavaScript",
      role: "Идея, дизайн и вёрстка",
      desc:
        "Интерактивная «чёлка» Dynamic Island: при наведении плавно растягивается и показывает заголовок, подпись " +
        "и прогресс-бар, а кнопками сверху меняются 4 темы телефона: Deep Purple, Gold, Space Black и Silver.\n" +
        "Без JavaScript: темы переключаются скрытыми radio-кнопками и селектором «~», остров раскрывается " +
        "по :hover и :focus-within (работает и с клавиатуры по Tab).\n" +
        "Текст и время выводятся через content в псевдоэлементах, обои собраны из градиентов и режимов наложения.\n" +
        "Все размеры в em от 1vmin, поэтому телефон масштабируется под любое окно.",
      comments: [
        {
          user: "@css_wizard",
          date: "2026-06-10",
          text: "Без JS?! Радиокнопки и «~» - красиво. Сохранил себе, буду показывать джунам.",
          likes: 48,
          dislikes: 0,
        },
        {
          user: "@iphone_fan",
          date: "2026-06-30",
          text: "Анимация раскрытия почти как на настоящем айфоне, только чуть резче в конце.",
          likes: 14,
          dislikes: 1,
        },
        {
          user: "@a11y_masha",
          date: "2026-07-26",
          text: "Отдельное спасибо за :focus-within, с клавиатуры тоже раскрывается. Мало кто об этом думает.",
          likes: 17,
          dislikes: 0,
        },
        {
          user: "@kirill_dev",
          date: "2026-09-02",
          text: "Space Black самая красивая тема, имхо",
          likes: 5,
          dislikes: 0,
        },
        {
          user: "@vlad.css",
          date: "2026-10-18",
          text: "Размеры в em от 1vmin - хитро. Растянул окно на весь монитор, всё осталось чётким.",
          likes: 9,
          dislikes: 0,
        },
      ],
    },
    {
      title: "Утренний Хрюк (KabanesBot)",
      category: "personal",
      views: 860,
      date: "2026-11-02",
      thumb: "/Assets/Projects/covers/KabanesBot.jpg",
      video: "/Assets/Projects/previews/KabanesBot.mp4",
      href: "",
      slug: "kabanes-bot",
      media: [
        {
          type: "video",
          src: "/Assets/Projects/media/kabanes-bot/presentation.mp4",
          poster: "/Assets/Projects/media/kabanes-bot/presentation-poster.jpg",
        },
        { type: "image", src: "/Assets/Projects/media/kabanes-bot/example.jpg", alt: "Пример утреннего сообщения бота: погода, курсы валют и гифка" },
      ],
      brief: "Сделать Telegram-бота, который каждое утро присылает друзьям погоду, курсы валют и смешную гифку под погоду",
      role: "Идея и разработка",
      desc:
        "Telegram-бот с утренней рассылкой: погода в Москве (температура, «ощущается как», осадки, ветер, восход " +
        "и закат), совет дня вроде «возьми зонт», курсы USD, EUR и CNY с изменением за сутки и гифка под погоду.\n" +
        "Node.js - рассылка по расписанию через node-cron, подписка командами /start и /stop, защита от повторной " +
        "отправки за день.\n" +
        "OpenWeatherMap, CurrencyLayer и Klipy запрашиваются параллельно (Promise.allSettled): если один API " +
        "не ответил, сообщение всё равно уходит, просто без этого блока.\n" +
        "Работает бесплатно в Yandex Cloud Functions по таймеру.",
      comments: [
        {
          user: "@morning_person",
          date: "2026-11-03",
          text: "Хочу такого бота в наш чат! Гифка под погоду с утра - лучший будильник)",
          likes: 12,
          dislikes: 0,
        },
        {
          user: "@backend_ivan",
          date: "2026-11-07",
          text: "allSettled вместо all - правильное решение, иначе одно упавшее API клало бы всю рассылку.",
          likes: 8,
          dislikes: 0,
        },
        {
          user: "@nastya_design",
          date: "2026-11-13",
          text: "Название «Утренний Хрюк» - отдельный вид искусства",
          likes: 15,
          dislikes: 0,
        },
      ],
    },
  ],
};
