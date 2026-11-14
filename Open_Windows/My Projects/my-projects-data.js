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
    },
  ],
};
