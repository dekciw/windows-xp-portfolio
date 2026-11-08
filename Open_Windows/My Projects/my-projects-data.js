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
//   items     — число в бейдже на превью («7 элементов»); 0 или пусто — без бейджа
//   thumb     — картинка превью 16:9, например "/Assets/Images/Projects/shop.webp";
//               пусто — цветная заглушка (цвет из color)
//   color     — цвет заглушки, пока нет картинки
//   href      — ссылка на проект (GitHub, сайт, файл); пусто — карточка «скоро»
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

  // [заполните] Демо-данные: названия, просмотры и даты придуманы для примера.
  // Перед публикацией замените своими проектами и настоящими цифрами.
  projects: [
    { title: "Калькулятор локеров", category: "client", views: 2300, date: "2026-10-08", items: 7, color: "#3a6df0", href: "" },
    { title: "Windows XP Portfolio", category: "personal", views: 46000, date: "2025-11-02", items: 3, color: "#1f9d73", href: "https://github.com/dekciw/windows-xp-portfolio" },
    { title: "Telegram-бот заметок", category: "builds", views: 79000, date: "2026-04-05", items: 7, color: "#8e44ad", href: "" },
    { title: "Дашборд логистики", category: "client", views: 12400, date: "2026-07-19", items: 5, color: "#d35400", href: "" },
    { title: "Лендинг кофейни", category: "media", views: 845, date: "2026-10-27", items: 2, color: "#c0392b", href: "" },
    { title: "Трекер привычек", category: "builds", views: 5600, date: "2026-02-14", items: 4, color: "#16758f", href: "" },
  ],
};
