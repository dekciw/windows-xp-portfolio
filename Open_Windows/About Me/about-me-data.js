// Контент окна «Обо мне». Правьте текст здесь — разметку трогать не нужно.
// Всё, что помечено [заполните], — заглушки: замените своими данными.
//
// Карточки слева, сверху вниз: social — «Соцсети», stack — «Стек технологий» (языки),
// frameworks — «Фреймворки» (фреймворки и инструменты). Строка карточки:
//   { label: "Текст", icon: "Имя иконки XP без .png" }        — иконка из пакета XP
//   { label: "Текст", iconSrc: "/путь/к/картинке.png" }        — своя картинка
//   href: "https://…" — необязательно: строка станет ссылкой (mailto: открывается без новой вкладки)
//
//
// Абзац «Обо мне»: { text: "…", image: "/путь/к/картинке.png" } — image необязательна.
// Запись (опыт, образование, проекты): { title, subtitle, period, text, href } — всё, кроме title, необязательно.
window.ABOUT_ME_DATA = {
  social: [
    { label: "Telegram", iconSrc: "/Assets/Images/Logos/telegram-logo.svg", href: "https://t.me/atanov_roman" },
    { label: "GitHub", iconSrc: "/Assets/Images/Logos/github-logo.svg", href: "https://github.com/dekciw" },
    { label: "Instagram", iconSrc: "/Assets/Images/Logos/instagram-logo.svg", href: "https://www.instagram.com/666kaine" },
  ],

  stack: [
    { label: "Python", iconSrc: "/Assets/Images/Stack/python.svg" },
    { label: "JavaScript", iconSrc: "/Assets/Images/Stack/javascript.svg" },
    { label: "TypeScript", iconSrc: "/Assets/Images/Stack/typescript-icon.svg" },
    { label: "Go", iconSrc: "/Assets/Images/Stack/go.svg" },
    { label: "HTML5", iconSrc: "/Assets/Images/Stack/html-5.svg" },
    { label: "CSS", iconSrc: "/Assets/Images/Stack/css.svg" },
  ],

  frameworks: [
    { label: "React", iconSrc: "/Assets/Images/Stack/react.svg" },
    { label: "Angular", iconSrc: "/Assets/Images/Stack/angular-icon.svg" },
    { label: "Git", iconSrc: "/Assets/Images/Stack/git-icon.svg" },
    { label: "PostgreSQL", iconSrc: "/Assets/Images/Stack/postgresql.svg" },
    { label: "Figma", iconSrc: "/Assets/Images/Stack/figma.svg" },
    { label: "Google Cloud", iconSrc: "/Assets/Images/Stack/google-cloud.svg" },
    { label: "AWS", iconSrc: "/Assets/Images/Stack/aws.svg" },
    { label: "Docker", iconSrc: "/Assets/Images/Stack/docker-icon.svg" },
    { label: "Kubernetes", iconSrc: "/Assets/Images/Stack/kubernetes.svg" },
    { label: "Redis", iconSrc: "/Assets/Images/Stack/redis.svg" },
    { label: "Kafka", iconSrc: "/Assets/Images/Stack/kafka-icon.svg" },
    { label: "Nginx", iconSrc: "/Assets/Images/Stack/nginx.svg" },
    { label: "Node.js", iconSrc: "/Assets/Images/Stack/nodejs-icon.svg" },
    { label: "Next.js", iconSrc: "/Assets/Images/Stack/nextjs-icon.svg" },
    { label: "FastAPI", iconSrc: "/Assets/Images/Stack/fastapi-icon.svg" },
  ],

  about: [
    {
      image: "/Assets/Images/About/about-1.jpg",
      text:
        "Меня зовут Роман, я fullstack-разработчик с инженерным образованием. В программирование я пришёл после университета: смотрел видео на YouTube, читал статьи и пробовал писать код. Постепенно обычный интерес перерос в желание заниматься этим всерьёз. В течение года я самостоятельно изучал frontend-разработку, а затем начал применять знания на практике в собственном стартапе Logiways, сервисе для международной логистики, набираясь опыта на реальных задачах. Сейчас я развиваюсь в серверной разработке, уделяя основное внимание Python и Go.",
    },
    {
      image: "/Assets/Images/About/about-2.jpg",
      text:
        "Больше всего в разработке мне нравится возможность делать сложные вещи проще. Особенно это касается автоматизации: когда процесс, который раньше требовал времени и множества ручных действий, превращается в понятный и удобный инструмент. Мне важно видеть, что моя работа не просто технически интересна, а действительно помогает людям быстрее справляться с задачами. В собственных проектах я пробую новые подходы и технологии, а в инструментах для автоматизации ищу способы сократить рутину. Мне интересно пройти весь путь от понимания проблемы до работающего решения.",
    },
    {
      image: "/Assets/Images/About/about-3.jpg",
      text:
        "В свободное время я много путешествую и смотрю NBA - я большой поклонник баскетбола. Изучение новых технологий тоже остаётся частью моей жизни за пределами рабочих задач: часто я берусь за небольшой личный проект просто потому, что хочется разобраться в чём-то новом. Так когда-то началось моё знакомство с программированием, и этот интерес по-прежнему помогает мне двигаться дальше.",
    },
  ],

  // «Опыт работы» и «Образование» под текстом: пустой список — раздел не показывается.
  // Пример записи: { title: "Должность", subtitle: "Компания", period: "2024 — сейчас", text: "…" }
  experience: [],
  education: [],

  projects: [
    {
      title: "Windows XP Portfolio",
      subtitle: "HTML, CSS, JavaScript",
      text: "Это портфолио: рабочий стол Windows XP в браузере.",
      href: "https://github.com/dekciw/windows-xp-portfolio",
    },
  ],

};
