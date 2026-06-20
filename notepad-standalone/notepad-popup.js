// Функция для перетаскивания окна
const windowEl = document.querySelector('.window');
const header = document.querySelector('.window-header');
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

header.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - windowEl.offsetLeft;
  offsetY = e.clientY - windowEl.offsetTop;
  windowEl.style.cursor = 'move';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    // Ограничения по экрану
    const maxX = window.innerWidth - windowEl.offsetWidth;
    const maxY = window.innerHeight - windowEl.offsetHeight;

    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));

    windowEl.style.position = 'absolute';
    windowEl.style.left = `${newX}px`;
    windowEl.style.top = `${newY}px`;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  windowEl.style.cursor = 'default';
});

// Обработчики кнопок
document.querySelector('.header-button--close').addEventListener('click', () => {
  if (confirm('Закрыть калькулятор?')) {
    window.close();
  }
});

document.querySelector('.header-button--minimize').addEventListener('click', () => {
  windowEl.style.display = 'none';
});
