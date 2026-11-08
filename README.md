# 🖥 Windows XPortfolio - A Windows XP Inspired Portfolio Website

#### 🔗 Live Demo ➡ [Windows XPortfolio](https://windows-xportfolio.vercel.app/)


![Demo](./Assets/Demo/demo.gif)

I’m excited to share a personal project I’ve been working on: a **portfolio website designed as a replica of the Windows XP experience**. </br> This project was built entirely using **HTML, CSS, and JavaScript** — no frameworks, just pure frontend technologies.

**Main features** included in the Website :
- Boot screen with loading animation 
- Logon screen with user selection 
- Fully Interactive Windows XP-style desktop environment
- Fully functional Start Menu 
- Classic Windows XP applications (Paint, Notepad, Minesweeper...)  
- Windows sounds, tooltips, and retro icons

While this version is already functional and nostalgic, there are still a few elements missing:
* Some **tooltips on the logon screen**
* Iconic **logon warnings**, like antivirus alerts or system popups
* Some Windows XP applications

I plan to build a couple of dedicated websites inside the Internet Explorer application to showcase the **professional projects I've contributed to throughout my career**, similar to how I integrated my LinkedIn page. For now, I’m publishing this as an initial version to serve as my portfolio, even if it’s not yet fully complete.

This project was a nostalgic deep dive into one of the most iconic operating systems ever made, combining design, frontend development, and a touch of creativity to bring a familiar environment to life on the web.

# 👤 Как заполнить окно «Обо мне»

- Весь текст окна лежит в одном файле: [`Open_Windows/About Me/about-me-data.js`](Open_Windows/About%20Me/about-me-data.js). Замените все заглушки `[заполните]` своими данными, разметку трогать не нужно:
  - `social` — карточка «Соцсети» (ссылки), `stack` — «Стек технологий» (языки), `frameworks` — «Фреймворки». Иконка строки: `icon` (имя иконки XP без `.png`) или `iconSrc` (путь к своей картинке).
  - `about` — абзацы «Обо мне»; у абзаца может быть картинка `image`.
  - `experience`, `education` — разделы ниже на странице; `projects` — страница «Мои проекты».
- Резюме: кнопка «Моё резюме» и пункт «Пуск → Резюме» открывают окно «Моё резюме». Как заменить файл, см. ниже.
- После правок `about-me-data.js` или `about-me.js` увеличьте номер версии `?v=` в `Bureau/Bureau.html`, чтобы посетители не получили старую версию из кэша.
- Локальный просмотр: `npx http-server . -p 3000 -c-1`, затем откройте http://localhost:3000 (не используйте `npx serve`: он ломает Paint).
- Окно «GitHub» (открывается свёрнутым при старте) берёт профиль и репозитории из GitHub API при открытии и кэширует их в браузере на час. Логин задаётся константой `GITHUB_LOGIN` в [`Open_Windows/GitHub/github.js`](Open_Windows/GitHub/github.js); форки и репозиторий с README профиля не показываются.
- Тесты: `npm install`, затем `npm test` (нужен Google Chrome; путь можно задать переменной `CHROME_PATH`).

# 📄 Как заменить резюме

1. Положите новый PDF в `Assets/Docs/resume.pdf`.
2. Выполните `npm run resume`: страницы PDF превратятся в картинки `Assets/Images/Resume/page-N.webp` и список `pages.json`.
3. Закоммитьте `Assets/Docs` и `Assets/Images/Resume`.

# 💬 Acknowledgements

### SPECIAL THANKS TO THE FOLLOWING

I would like to extend my heartfelt thanks to all the creators and developers whose work inspired and supported the creation of my portfolio website. Your tutorials, designs, code, and creative ideas have been invaluable throughout this project.

#### 🎨 VISUAL 
- [TheHowToGuy123](https://www.youtube.com/watch?v=7NJupnHcxpE&ab_channel=TheHowToGuy123) for the insightful video guide to help me set up a virtual environnment of Windows XP and learn how the OS operates visually.

- [Robert](https://www.youtube.com/watch?v=3Nf3gfkSRtI&ab_channel=Robert) and [Arian M](https://www.youtube.com/watch?v=M_M1ztJ1EkA&ab_channel=ArianM) for showcasing how Windows startup and shutdown operate.

- [Marchmountain](https://www.deviantart.com/marchmountain/art/Windows-XP-High-Resolution-Icon-Pack-916042853) and [WindowsXPGamer2001ft](https://www.deviantart.com/windowsxpgamer2001ft/art/Windows-XP-Start-Button-876432370) for providing all the visual assets you possibly need to build this project.

- [asilaydyingdl - XP Logon for 7](https://www.deviantart.com/asilaydyingdl/art/XP-Logon-for-7-170169105) for the beautiful XP-style logon screen design.

#### 🔊 SOUNDS
- [Nobel Tech](https://www.youtube.com/watch?v=1pd3-FVPjUc&ab_channel=NobelTech) and [Ballyweg - Startup](https://www.youtube.com/watch?v=7nQ2oiVqKHw&ab_channel=Ballyweg), [Ballyweg - Shutdown](https://www.youtube.com/watch?v=Gb2jGy76v0Y&ab_channel=Ballyweg) for nostalgic Windows-inspired sound.

#### 💡 INSPIRATION / UI - UX / MODULES
- The creators of [JSPaint](https://github.com/1j01/jspaint) and [98.css](https://github.com/1j01/98#readme) for their fantastic open-source projects.

- The [Windows XP web replica](https://windows-xp.netlify.app/) of [EddyVinck’s XP repository](https://github.com/EddyVinck/xp/tree/master) for interface design inspiration.

- The team behind [WinXP](https://github.com/ShizukuIchi/winXP?tab=readme-ov-file) for their brilliant re-creation of the Windows XP environment and the Minesweeper assets [WinXP - Minesweeper Assets](https://github.com/ShizukuIchi/winXP/tree/master/src/assets/minesweeper).

- [Captbaritone](https://github.com/captbaritone/webamp) for the amazing Webamp project that brings classic Winamp to the web.

#### ⚙️ TUTORIAL JS
- [Kenny Yip Coding](https://www.youtube.com/watch?v=AfhfAxKFP-s&ab_channel=KennyYipCoding) for the helpful Minesweeper game with Javascript tutorial and his repository [ImKennyYip](https://github.com/ImKennyYip/Minesweeper).

#### ✍️ FONTS
- [FontStruct](https://fontstruct.com/fontstructions/show/1888398/fs-tahoma-8px-9) and [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans) for providing the fonts that perfectly match the aesthetic.

# 🖼️ Asset Links / Image Bibliography

* **[Bliss Wallpaper (4500 x 3000)](https://www.wallpaperhub.app/_next/image?url=https%3A%2F%2Fcdn.wallpaperhub.app%2Fcloudcache%2Fb%2Fd%2F7%2F6%2F4%2Fb%2Fbd764bb25d49a05105060185774ba14cd2c846f7.jpg&w=4500&q=100)**
* **[User Icons Preview](https://ia800902.us.archive.org/22/items/WindowsXPUserAccountPictures/preview.png)**
* **[LinkedIn Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/250px-LinkedIn_logo_initials.png)**
* **[GitHub Logo](https://upload.wikimedia.org/wikipedia/commons/c/c2/GitHub_Invertocat_Logo.svg)**
* **[Telegram Logo](https://commons.wikimedia.org/wiki/File:Telegram_2019_Logo.svg)**
* **[Instagram Logo](https://commons.wikimedia.org/wiki/File:Instagram_logo_2022.svg)**
* **[Tech stack logos — gilbarbara/logos](https://github.com/gilbarbara/logos)** (`Assets/Images/Stack/`)
* **[Winamp Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Winamp-logo.svg/1024px-Winamp-logo.svg.png)**
* **[Windows XP Boot Screen](https://upload.wikimedia.org/wikipedia/commons/a/a8/Windows_XP_SP2_Boot_screen.png)**

# 📄 License

This project is licensed under the [MIT License](/LICENCE). </br> *Includes assets and open-source modules from various authors — credits and links in the acknowledgements section.*

---

### **Thank you all** for your contributions. Your work sparked ideas, guided my learning, and made this project both possible and enjoyable.

*If you notice something strange or encounter a bug while exploring this project, please let me know so I can investigate and hopefully fix it.*
