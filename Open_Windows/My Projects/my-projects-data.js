// Контент окна «Мои проекты». Правьте здесь — разметку и скрипт трогать не нужно.
//
// categories — пункты левого меню (пункт «Все» добавляется сам).
//   id — латиница, по нему проекты попадают в категорию; label — подпись;
//   icon — значок меню: "media", "builds", "personal", "client" (или "all").
//
// projects — карточки, по порядку слева направо, сверху вниз:
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
//               только настоящие отзывы, пока их нет — []
//
// avatar — круглое фото 36×36 в каждой карточке. Положите своё фото, например,
//   в "/Assets/Images/My Projects/avatar.jpg" и укажите путь здесь.
//
// social — значки справа в шапке. Если не указать, берутся соцсети из «Обо мне».
window.MY_PROJECTS_DATA = {
  avatar: "/Assets/Images/My Projects/avatar.jpg",

  categories: [
    { id: "media", label: "Медиа", icon: "media" },
    { id: "builds", label: "Сборки", icon: "builds" },
    { id: "personal", label: "Личные", icon: "personal" },
    { id: "client", label: "Клиенты", icon: "client" },
  ],

  // Пока одна карточка: доводим её до ума, потом добавим остальные проекты по её образцу.
  // [заполните] Просмотры и дата — пока демо-значения.
  projects: [
    {
      title: "Burger Cheddar",
      category: "personal",
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
  ],
};
