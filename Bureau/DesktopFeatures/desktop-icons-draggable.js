// ============================================
// Перетаскивание иконок на рабочем столе (как в Windows XP)
// С сеткой и автоматическим выравниванием
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('desktop');
  if (!desktop) {
    console.error('Desktop not found!');
    return;
  }

  const icons = desktop.querySelectorAll('.icon');
  console.log('Found icons:', icons.length);

  // Размер ячейки сетки (как в Windows XP)
  const GRID_SIZE = 80;

  let draggedIcon = null;
  let selectedIcons = []; // Все выделенные иконки для группового перетаскивания
  let iconOffsets = []; // Относительные позиции выделенных иконок
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  const DRAG_THRESHOLD = 5; // Минимальное смещение для начала перетаскивания

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
      // Все иконки сразу делаем absolute чтобы они не двигались при перетаскивании других
      const gridX = 0;
      const gridY = index;

      icon.style.position = 'absolute';
      icon.style.left = (gridX * GRID_SIZE + 10) + 'px'; // +10px для padding
      icon.style.top = (gridY * GRID_SIZE + 10) + 'px';  // +10px для padding
      icon.setAttribute('data-grid-x', gridX);
      icon.setAttribute('data-grid-y', gridY);
    });
  }

  // Инициализация drag для каждой иконки
  icons.forEach(icon => {
    icon.style.cursor = 'default';

    icon.addEventListener('mousedown', (e) => {
      console.log('Icon mousedown:', icon);

      // Игнорировать двойной клик (он открывает приложение)
      if (e.detail === 2) {
        console.log('Double click - ignoring');
        return;
      }

      // Начать перетаскивание только при зажатой левой кнопке мыши
      if (e.button !== 0) {
        console.log('Not left button - ignoring');
        return;
      }

      console.log('Starting drag preparation');
      draggedIcon = icon;
      startX = e.clientX;
      startY = e.clientY;

      // Сохраняем offset
      const rect = icon.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Проверяем есть ли выделенные иконки
      selectedIcons = Array.from(desktop.querySelectorAll('.icon.selected'));

      // Если кликнутая иконка выделена - перетаскиваем всю группу
      if (selectedIcons.length > 0 && selectedIcons.includes(icon)) {
        console.log('Dragging group of', selectedIcons.length, 'icons');

        // Сохраняем относительные позиции всех выделенных иконок
        const draggedLeft = parseInt(draggedIcon.style.left) || 0;
        const draggedTop = parseInt(draggedIcon.style.top) || 0;

        iconOffsets = selectedIcons.map(selectedIcon => ({
          icon: selectedIcon,
          offsetLeft: (parseInt(selectedIcon.style.left) || 0) - draggedLeft,
          offsetTop: (parseInt(selectedIcon.style.top) || 0) - draggedTop
        }));
      } else {
        // Перетаскиваем только одну иконку
        selectedIcons = [];
        iconOffsets = [];
      }

      // НЕ устанавливаем isDragging сразу - ждем movement threshold
      e.preventDefault();
    });
  });

  // Перемещение иконки
  document.addEventListener('mousemove', (e) => {
    if (!draggedIcon) return;

    // Проверяем превышен ли threshold для начала перетаскивания
    if (!isDragging) {
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        console.log('Threshold exceeded - starting drag');
        isDragging = true;

        // Начинаем визуальное перетаскивание
        if (selectedIcons.length > 0) {
          // Групповое перетаскивание - НЕ меняем opacity чтобы сохранить синий фон выделения
          selectedIcons.forEach(icon => {
            icon.style.zIndex = '9999';
            icon.style.pointerEvents = 'none';
          });
        } else {
          // Одиночная иконка - делаем полупрозрачной
          draggedIcon.style.zIndex = '9999';
          draggedIcon.style.opacity = '0.7';
          draggedIcon.style.pointerEvents = 'none';
        }
      } else {
        return; // Еще не достигли threshold
      }
    }

    const desktopRect = desktop.getBoundingClientRect();

    let newLeft = e.clientX - desktopRect.left - offsetX;
    let newTop = e.clientY - desktopRect.top - offsetY;

    // Ограничения чтобы иконка не выходила за пределы рабочего стола
    const minLeft = 10; // Минимальный отступ слева
    const minTop = 10;  // Минимальный отступ сверху
    const maxLeft = desktopRect.width - 105; // Оптимальный баланс: иконка 80px + 25px для текста
    const maxTop = desktopRect.height - 50;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));

    // Двигаем основную иконку
    draggedIcon.style.left = newLeft + 'px';
    draggedIcon.style.top = newTop + 'px';

    // Двигаем все выделенные иконки с сохранением относительных позиций
    if (iconOffsets.length > 0) {
      iconOffsets.forEach(({ icon, offsetLeft, offsetTop }) => {
        if (icon === draggedIcon) return; // Основную уже подвинули

        const iconLeft = newLeft + offsetLeft;
        const iconTop = newTop + offsetTop;

        icon.style.left = Math.max(0, Math.min(iconLeft, maxLeft)) + 'px';
        icon.style.top = Math.max(0, Math.min(iconTop, maxTop)) + 'px';
      });
    }
  });

  // Завершение перетаскивания
  document.addEventListener('mouseup', () => {
    if (!draggedIcon) return;

    if (isDragging) {
      if (iconOffsets.length > 0) {
        // Групповое перетаскивание - привязываем все иконки к сетке
        iconOffsets.forEach(({ icon }) => {
          const currentLeft = parseInt(icon.style.left) || 0;
          const currentTop = parseInt(icon.style.top) || 0;

          const targetGridX = Math.round((currentLeft - 10) / GRID_SIZE);
          const targetGridY = Math.round((currentTop - 10) / GRID_SIZE);

          // Найти ближайшую свободную ячейку
          const { gridX, gridY } = findNearestFreeCell(Math.max(0, targetGridX), Math.max(0, targetGridY), icon);

          // Установить позицию на сетке с учетом минимальных отступов
          const snappedLeft = Math.max(10, gridX * GRID_SIZE + 10);
          const snappedTop = Math.max(10, gridY * GRID_SIZE + 10);

          icon.style.left = snappedLeft + 'px';
          icon.style.top = snappedTop + 'px';
          icon.setAttribute('data-grid-x', gridX);
          icon.setAttribute('data-grid-y', gridY);

          icon.style.zIndex = '';
          icon.style.pointerEvents = '';
          // Не сбрасываем opacity - его не меняли при групповом перетаскивании
        });
      } else {
        // Одиночное перетаскивание
        const currentLeft = parseInt(draggedIcon.style.left) || 0;
        const currentTop = parseInt(draggedIcon.style.top) || 0;

        const targetGridX = Math.round((currentLeft - 10) / GRID_SIZE);
        const targetGridY = Math.round((currentTop - 10) / GRID_SIZE);

        const { gridX, gridY } = findNearestFreeCell(Math.max(0, targetGridX), Math.max(0, targetGridY), draggedIcon);

        // Установить позицию на сетке с учетом минимальных отступов
        const snappedLeft = Math.max(10, gridX * GRID_SIZE + 10);
        const snappedTop = Math.max(10, gridY * GRID_SIZE + 10);

        draggedIcon.style.left = snappedLeft + 'px';
        draggedIcon.style.top = snappedTop + 'px';
        draggedIcon.setAttribute('data-grid-x', gridX);
        draggedIcon.setAttribute('data-grid-y', gridY);

        draggedIcon.style.zIndex = '';
        draggedIcon.style.opacity = '1';
        draggedIcon.style.pointerEvents = '';
      }
    }

    isDragging = false;
    draggedIcon = null;
    selectedIcons = [];
    iconOffsets = [];
  });

  // Установить начальные позиции при загрузке страницы
  setInitialIconPositions();

  console.log('✅ Desktop icons draggable with grid snap loaded');
});
