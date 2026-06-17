/**
 * Desktop Icon Selection System
 * Vanilla JavaScript implementation of Windows XP selection box
 */

class DesktopSelection {
  constructor() {
    this.isSelecting = false;
    this.startPos = null;
    this.currentPos = null;
    this.selectionBox = null;
    this.desktop = null;
    this.icons = [];
    this.selectedIcons = new Set();
    this.clickTimeout = null; // Таймер для различения одиночного/двойного клика
    this.wasSelecting = false; // Флаг что было выделение рамкой

    this.init();
  }

  init() {
    this.desktop = document.getElementById('desktop');
    this.mainContent = document.getElementById('main-content');

    if (!this.desktop || !this.mainContent) {
      console.error('Desktop or main-content element not found');
      return;
    }

    // Создаем элемент для рамки выделения
    this.createSelectionBox();

    // Собираем все иконки
    this.updateIconsList();

    // Привязываем обработчики
    this.attachEventListeners();
  }

  createSelectionBox() {
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'selection-box';
    this.selectionBox.style.display = 'none';
    document.body.appendChild(this.selectionBox);
  }

  updateIconsList() {
    this.icons = Array.from(this.desktop.querySelectorAll('.icon')).map(iconEl => {
      return {
        element: iconEl,
        rect: null // Будет вычислено при начале выделения
      };
    });
  }

  attachEventListeners() {
    this.mainContent.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Обработчик клика на иконки для выделения
    this.desktop.addEventListener('click', this.handleIconClick.bind(this));

    // Обработчик клика на пустое место для снятия выделения
    this.mainContent.addEventListener('click', this.handleDesktopClick.bind(this));

    // Обработчик двойного клика - снимаем выделение при открытии окна
    this.desktop.addEventListener('dblclick', this.handleIconDoubleClick.bind(this));
  }

  handleMouseDown(e) {
    // Игнорируем если клик на footer или кнопки
    if (e.target.closest('.footer_original, .footer, button, a')) return;

    // Игнорируем если клик на иконку (перетаскивание обрабатывается отдельно)
    if (e.target.closest('.icon')) return;

    // Разрешаем выделение только при клике на пустое место
    const isEmptySpace = e.target === this.mainContent || e.target === this.desktop;
    if (!isEmptySpace) return;

    this.isSelecting = true;
    this.startPos = {
      x: e.pageX,
      y: e.pageY
    };
    this.currentPos = { ...this.startPos };

    // Снимаем выделение со всех иконок
    this.clearSelection();

    // Обновляем координаты иконок
    this.updateIconsRect();

    // Показываем рамку
    this.updateSelectionBox();
  }

  handleMouseMove(e) {
    if (!this.isSelecting) return;

    this.currentPos = {
      x: e.pageX,
      y: e.pageY
    };

    this.updateSelectionBox();
    this.checkIntersections();
  }

  handleMouseUp(e) {
    if (!this.isSelecting) return;

    this.wasSelecting = true; // Отмечаем что было выделение рамкой
    this.isSelecting = false;
    this.selectionBox.style.display = 'none';
    this.startPos = null;
    this.currentPos = null;

    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      this.wasSelecting = false;
    }, 50);
  }

  handleIconClick(e) {
    const icon = e.target.closest('.icon');
    if (!icon) return;

    // Игнорируем двойной клик (открытие приложения)
    if (e.detail === 2) return;

    // Отменяем предыдущий таймер если был
    clearTimeout(this.clickTimeout);

    // Задержка перед выделением - даем время на двойной клик
    this.clickTimeout = setTimeout(() => {
      if (!e.ctrlKey && !e.metaKey) {
        // Одиночный клик без Ctrl - выделить только эту иконку
        this.clearSelection();
        this.selectIcon(icon);
      } else {
        // Клик с Ctrl - переключить выделение
        if (this.selectedIcons.has(icon)) {
          this.deselectIcon(icon);
        } else {
          this.selectIcon(icon);
        }
      }
    }, 15); // 15ms задержка для двойного клика

    e.stopPropagation();
  }

  handleDesktopClick(e) {
    // Игнорируем если только что было выделение рамкой
    if (this.wasSelecting) return;

    // Игнорируем если клик был на footer или кнопки
    if (e.target.closest('.footer_original, .footer, button, a')) return;

    // Игнорируем если клик был на иконку
    if (e.target.closest('.icon')) return;

    // Клик на пустое место - снять выделение
    const isEmptySpace = e.target === this.mainContent || e.target === this.desktop;
    if (isEmptySpace) {
      this.clearSelection();
    }
  }

  handleIconDoubleClick(e) {
    const icon = e.target.closest('.icon');
    if (!icon) return;

    // Отменяем одиночный клик если был
    clearTimeout(this.clickTimeout);

    // При двойном клике (открытие окна) снимаем выделение со всех иконок
    this.clearSelection();
  }

  updateSelectionBox() {
    if (!this.startPos || !this.currentPos) return;

    const x = Math.min(this.startPos.x, this.currentPos.x);
    const y = Math.min(this.startPos.y, this.currentPos.y);
    const width = Math.abs(this.startPos.x - this.currentPos.x);
    const height = Math.abs(this.startPos.y - this.currentPos.y);

    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${x}px`;
    this.selectionBox.style.top = `${y}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  updateIconsRect() {
    this.icons.forEach(icon => {
      const rect = icon.element.getBoundingClientRect();
      icon.rect = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      };
    });
  }

  checkIntersections() {
    if (!this.startPos || !this.currentPos) return;

    // Координаты рамки выделения
    const sx = Math.min(this.startPos.x, this.currentPos.x);
    const sy = Math.min(this.startPos.y, this.currentPos.y);
    const sw = Math.abs(this.startPos.x - this.currentPos.x);
    const sh = Math.abs(this.startPos.y - this.currentPos.y);

    // Проверяем пересечение с каждой иконкой
    this.icons.forEach(icon => {
      if (!icon.rect) return;

      const { x, y, width, height } = icon.rect;

      // Алгоритм пересечения прямоугольников
      const isIntersecting =
        x - sx < sw &&
        sx - x < width &&
        y - sy < sh &&
        sy - y < height;

      if (isIntersecting) {
        this.selectIcon(icon.element);
      } else {
        this.deselectIcon(icon.element);
      }
    });
  }

  selectIcon(iconElement) {
    if (!this.selectedIcons.has(iconElement)) {
      iconElement.classList.add('selected');

      // Оборачиваем текст в inline элемент для точного фона
      const span = iconElement.querySelector('span');
      if (span && !span.querySelector('.selection-text')) {
        const text = span.textContent;
        span.innerHTML = `<span class="selection-text">${text}</span>`;
      }

      this.selectedIcons.add(iconElement);
    }
  }

  deselectIcon(iconElement) {
    if (this.selectedIcons.has(iconElement)) {
      iconElement.classList.remove('selected');

      // Возвращаем оригинальный текст
      const span = iconElement.querySelector('span');
      const innerSpan = span?.querySelector('.selection-text');
      if (innerSpan) {
        span.textContent = innerSpan.textContent;
      }

      this.selectedIcons.delete(iconElement);
    }
  }

  clearSelection() {
    this.selectedIcons.forEach(icon => {
      icon.classList.remove('selected');

      // Возвращаем оригинальный текст
      const span = icon.querySelector('span');
      const innerSpan = span?.querySelector('.selection-text');
      if (innerSpan) {
        span.textContent = innerSpan.textContent;
      }
    });
    this.selectedIcons.clear();
  }

  destroy() {
    if (this.selectionBox && this.selectionBox.parentNode) {
      this.selectionBox.parentNode.removeChild(this.selectionBox);
    }
  }
}

// Инициализация при загрузке страницы
let desktopSelection;

console.log('✅ Selection.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('📦 DOMContentLoaded - initializing DesktopSelection');
  // Небольшая задержка чтобы убедиться что desktop готов
  setTimeout(() => {
    desktopSelection = new DesktopSelection();
    console.log('✅ DesktopSelection initialized');
  }, 100);
});
