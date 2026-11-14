# Видео-аватар пользователя — дизайн

**Дата:** 2026-11-14 · **Размер:** небольшая правка

## Зачем
Заменить статичное фото пользователя «Атанов Роман» на анимированный мультяшный аватар (видео из Kling, 940×940, 6 с, без водяного знака) — везде, где показывается аватар.

## Цели / не-цели
- Цель: видео играет само, без звука, по кругу, во всех 5 местах; размеры, рамка, скругление и hover-подсветка как раньше.
- Не-цель: менять аватар «Администратора» или вёрстку экранов.
- Анти-цель: пустой/чёрный квадрат, пока видео грузится; потеря жёлтой рамки при наведении.

## Подходы
1. **`<video autoplay muted loop playsinline poster>`** — выбрано: лёгкий файл (1,3 МБ), полное качество.
2. GIF — в разы тяжелее и хуже по цвету.
3. CSS-фон — видео фоном через CSS невозможно.

## Решения
- Видео: `Assets/Images/Profiles/guest-avatar.mp4`; постер из первого кадра: `Assets/Images/Profiles/guest-avatar-poster.jpg`.
- Места: `Loader_Login/Loader_Login.html`, `index.html`, `Start_Menu/Base/Start_Menu.html`, `Start_Menu/Log_Off/Transition/Login.html`, `Start_Menu/Log_Off/Transition/Switch_User.html`.
- CSS: `.user > img` → + `.user > video` (`Login_Screen.css`); `.StartMenuHeader img` → + `.StartMenuHeader video` (`Start_Menu.css`).
- JS: hover-рамка в `Loader_Login.js` ищет `img, video`.
- Старое фото `guest-avatar.jpg` удаляется (решение пользователя).

## Проверка
`npm test` + скриншоты экрана входа и меню «Пуск».
