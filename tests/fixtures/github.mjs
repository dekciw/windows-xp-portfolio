// Фикстура ответов GitHub API для тестов (форма как у api.github.com).
export const GH_USER = {
  login: "dekciw",
  name: null,
  avatar_url: "/Assets/Images/About/about-1.png", // локальная картинка — тест не ходит в сеть
  html_url: "https://github.com/dekciw",
  bio: "Фронтенд это место, где логика встречается с эстетикой",
  location: "Moscow",
  followers: 3,
  following: 5,
  public_repos: 4,
};

export const GH_REPOS = [
  {
    name: "windows-xp-portfolio",
    html_url: "https://github.com/dekciw/windows-xp-portfolio",
    description: "Интерактивное веб-портфолио в стиле Windows XP",
    language: "JavaScript",
    stargazers_count: 2,
    fork: false,
    updated_at: "2026-11-08T10:00:00Z",
  },
  {
    name: "dekciw",
    html_url: "https://github.com/dekciw/dekciw",
    description: "README профиля",
    language: null,
    stargazers_count: 0,
    fork: false,
    updated_at: "2026-11-07T10:00:00Z",
  },
  {
    name: "some-fork",
    html_url: "https://github.com/dekciw/some-fork",
    description: "Форк",
    language: "Go",
    stargazers_count: 0,
    fork: true,
    updated_at: "2026-11-06T10:00:00Z",
  },
  {
    name: "morningbot",
    html_url: "https://github.com/dekciw/morningbot",
    description: null,
    language: null,
    stargazers_count: 0,
    fork: false,
    updated_at: "2026-06-23T10:00:00Z",
  },
];

// README профиля в том виде, как его отдаёт GitHub (Accept: application/vnd.github.html),
// плюс «опасные» куски, которые карточка обязана вычистить.
export const GH_README = `<div id="readme"><article class="markdown-body">
<h1>Привет! 👋 Я Роман</h1>
<p>Fullstack-разработчик. <a href="readme.en.md">Eng version</a> · <a href="https://logiways.ru/">Logiways</a></p>
<img src="/Assets/Images/About/about-2.png" onerror="window.__xss = 1" alt="pic">
<script>window.__xss = 2</script>
<a href="javascript:window.__xss = 3">bad link</a>
<iframe src="https://example.com"></iframe>
</article></div>`;

// 365 дней активности, последний день — 2026-11-08 (форма ответа github-contributions-api.jogruber.de)
export const GH_CONTRIB = (() => {
  const days = [];
  const end = Date.UTC(2026, 10, 8);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end - i * 86400000).toISOString().slice(0, 10);
    const count = i % 7 === 0 ? 0 : (i % 5) + 1;
    days.push({ date: d, count, level: count === 0 ? 0 : Math.min(4, Math.ceil(count / 1.5)) });
  }
  return { total: { lastYear: days.reduce((s, x) => s + x.count, 0) }, contributions: days };
})();
