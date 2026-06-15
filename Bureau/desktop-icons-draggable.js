// ============================================
// Перетаскивание иконок на рабочем столе (как в Windows XP)
// С сеткой и автоматическим выравниванием
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('desktop');
  if (!desktop) return;

  const icons = desktop.querySelectorAll('.icon');

  // Размер ячейки сетки (как в Windows XP)
  const GRID_SIZE = 80;

  let draggedIcon = null;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  // Привязка к сетке
  function snapToGrid(value) {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  // Проверить занята ли ячейка другой иконкой
  function isCellOccupied(gridX, gridY, excludeIcon) {
    for (let icon of icons) {
      if (icon === excludeIcon) continue;
      if (icon.style.position !== 'absolute') continue;

      const iconGridX = parseInt(icon.getAttribute('data-grid-x') || '0');
      const iconGridY = parseInt(icon.getAttribute('data-grid-y') || '0');

      if (iconGridX === gridX && iconGridY === gridY) {
        return true;
      }
    }
    return false;
  }

  // Найти ближайшую свободную ячейку
  function findNearestFreeCell(targetGridX, targetGridY, excludeIcon) {
    // Сначала проверяем целевую ячейку
    if (!isCellOccupied(targetGridX, targetGridY, excludeIcon)) {
      return { gridX: targetGridX, gridY: targetGridY };
    }

    // Ищем по спирали от целевой точки
    const maxDistance = 20;
    for (let dist = 1; dist <= maxDistance; dist++) {
      // Проверяем ячейки вокруг
      for (let dx = -dist; dx <= dist; dx++) {
        for (let dy = -dist; dy <= dist; dy++) {
          if (Math.abs(dx) === dist || Math.abs(dy) === dist) {
            const gridX = targetGridX + dx;
            const gridY = targetGridY + dy;

            if (gridX >= 0 && gridY >= 0 && !isCellOccupied(gridX, gridY, excludeIcon)) {
              return { gridX, gridY };
            }
          }
        }
      }
    }

    // Если не нашли, вернуть целевую ячейку (на крайний случай)
    return { gridX: targetGridX, gridY: targetGridY };
  }

  // Установить начальные позиции иконок
  function setInitialIconPositions() {
    icons.forEach((icon, index) => {
      // Задать начальную позицию в сетке (вертикально слева)
      const gridX = 0;
      const gridY = index;

      icon.style.position = 'absolute';
      icon.style.left = (gridX * GRID_SIZE) + 'px';
      icon.style.top = (gridY * GRID_SIZE) + 'px';
      icon.setAttribute('data-grid-x', gridX);
      icon.setAttribute('data-grid-y', gridY);
    });
  }

  // Инициализация drag для каждой иконки
  icons.forEach(icon => {
    icon.style.cursor = 'default';

    icon.addEventListener('mousedown', (e) => {
      // Игнорировать двойной клик (он открывает приложение)
      if (e.detail === 2) return;

      // Начать перетаскивание только при зажатой левой кнопке мыши
      if (e.button !== 0) return;

      isDragging = true;
      draggedIcon = icon;

      // Сделать иконку абсолютно позиционированной
      const rect = icon.getBoundingClientRect();
      const desktopRect = desktop.getBoundingClientRect();

      if (icon.style.position !== 'absolute') {
        icon.style.position = 'absolute';
        icon.style.left = (rect.left - desktopRect.left) + 'px';
        icon.style.top = (rect.top - desktopRect.top) + 'px';
      }

      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      icon.style.zIndex = '9999';
      icon.style.opacity = '0.7';
      icon.style.pointerEvents = 'none'; // Чтобы не мешала при перетаскивании

      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Перемещение иконки
  document.addEventListener('mousemove', (e) => {
    if (!draggedIcon || !isDragging) return;

    const desktopRect = desktop.getBoundingClientRect();

    let newLeft = e.clientX - desktopRect.left - offsetX;
    let newTop = e.clientY - desktopRect.top - offsetY;

    // Ограничения чтобы иконка не выходила за пределы рабочего стола
    // Учитываем padding: 20px со всех сторон
    newLeft = Math.max(0, Math.min(newLeft, desktopRect.width - 80 - 20));
    newTop = Math.max(0, Math.min(newTop, desktopRect.height - 80 - 20));

    draggedIcon.style.left = newLeft + 'px';
    draggedIcon.style.top = newTop + 'px';
  });

  // Завершение перетаскивания
  document.addEventListener('mouseup', () => {
    if (draggedIcon && isDragging) {
      isDragging = false;

      // Привязать к сетке
      const currentLeft = parseInt(draggedIcon.style.left) || 0;
      const currentTop = parseInt(draggedIcon.style.top) || 0;

      const targetGridX = Math.round(currentLeft / GRID_SIZE);
      const targetGridY = Math.round(currentTop / GRID_SIZE);

      // Найти ближайшую свободную ячейку
      const { gridX, gridY } = findNearestFreeCell(targetGridX, targetGridY, draggedIcon);

      // Установить позицию на сетке
      const snappedLeft = gridX * GRID_SIZE;
      const snappedTop = gridY * GRID_SIZE;

      draggedIcon.style.left = snappedLeft + 'px';
      draggedIcon.style.top = snappedTop + 'px';
      draggedIcon.setAttribute('data-grid-x', gridX);
      draggedIcon.setAttribute('data-grid-y', gridY);

      draggedIcon.style.zIndex = '';
      draggedIcon.style.opacity = '1';
      draggedIcon.style.pointerEvents = '';

      draggedIcon = null;
    }
  });

  // Установить начальные позиции при загрузке страницы
  setInitialIconPositions();

  console.log('✅ Desktop icons draggable with grid snap loaded');
});
