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

  // Живой список: ярлыки можно добавлять и удалять (DesktopIcons.add / remove).
  const icons = Array.from(desktop.querySelectorAll('.icon'));
  const defaultIcons = icons.slice();
  console.log('Found icons:', icons.length);

  // Размер ячейки сетки (как в Windows XP)
  // Шаг сетки: рамка подсветки иконки 80x80 + зазор 10px, чтобы рамки не наползали друг на друга.
  const GRID_SIZE = 90;

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

  // Расставить иконки по сетке в заданном порядке (по столбцам, сверху вниз).
  function layoutIcons(order) {
    // Сколько иконок помещается в столбец; не поместившиеся переходят в следующий столбец (как в XP).
    // 70px — высота иконки с подписью.
    const rows = Math.max(1, Math.floor((desktop.clientHeight - 10 - 70) / GRID_SIZE) + 1);
    order.forEach((icon, index) => {
      // Все иконки сразу делаем absolute чтобы они не двигались при перетаскивании других
      const gridX = Math.floor(index / rows);
      const gridY = index % rows;

      icon.style.position = 'absolute';
      icon.style.left = (gridX * GRID_SIZE + 10) + 'px'; // +10px для padding
      icon.style.top = (gridY * GRID_SIZE + 10) + 'px';  // +10px для padding
      icon.setAttribute('data-grid-x', gridX);
      icon.setAttribute('data-grid-y', gridY);
    });
  }

  // Инициализация drag для каждой иконки
  function attachDrag(icon) {
    icon.style.cursor = 'default';

    icon.addEventListener('mousedown', (e) => {
      console.log('Icon mousedown:', icon);

      // Закреплённый значок («Закрепить» в его меню) не перетаскивается.
      if (icon.dataset.locked === 'true') return;

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
      selectedIcons = Array.from(desktop.querySelectorAll('.icon.selected')).filter(i => i.dataset.locked !== 'true');

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
  }
  icons.forEach(attachDrag);

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
  layoutIcons(Array.from(icons));

  // Для контекстного меню рабочего стола: «Упорядочить значки» и «Сбросить рабочий стол».
  function placeAt(icon, gridX, gridY) {
    icon.style.position = 'absolute';
    icon.style.left = (gridX * GRID_SIZE + 10) + 'px';
    icon.style.top = (gridY * GRID_SIZE + 10) + 'px';
    icon.setAttribute('data-grid-x', gridX);
    icon.setAttribute('data-grid-y', gridY);
  }

  // Ближайшая свободная ячейка к точке экрана; без точки - первая свободная по столбцам.
  function freeCell(clientX, clientY, excludeIcon) {
    if (clientX !== undefined) {
      const r = desktop.getBoundingClientRect();
      const gx = Math.max(0, Math.round((clientX - r.left - 10 - 40) / GRID_SIZE));
      const gy = Math.max(0, Math.round((clientY - r.top - 10 - 35) / GRID_SIZE));
      return findNearestFreeCell(gx, gy, excludeIcon);
    }
    const rows = Math.max(1, Math.floor((desktop.clientHeight - 10 - 70) / GRID_SIZE) + 1);
    for (let i = 0; i < 400; i++) {
      const gridX = Math.floor(i / rows);
      const gridY = i % rows;
      if (!isCellOccupied(gridX, gridY, excludeIcon)) return { gridX, gridY };
    }
    return { gridX: 0, gridY: 0 };
  }

  window.DesktopIcons = {
    list: () => icons.slice(),
    arrange(compare) {
      layoutIcons(icons.slice().sort(compare));
    },
    // Исходный рабочий стол: только встроенные значки, в исходном порядке.
    reset() {
      icons.filter((i) => !defaultIcons.includes(i)).forEach((i) => window.DesktopIcons.remove(i));
      icons.forEach((i) => delete i.dataset.locked);
      layoutIcons(icons.slice());
    },
    // Добавить значок (ярлык) в ближайшую к точке свободную ячейку.
    add(icon, clientX, clientY) {
      desktop.appendChild(icon);
      icons.push(icon);
      attachDrag(icon);
      const { gridX, gridY } = freeCell(clientX, clientY, icon);
      placeAt(icon, gridX, gridY);
      return icon;
    },
    remove(icon) {
      const i = icons.indexOf(icon);
      if (i >= 0) icons.splice(i, 1);
      icon.remove();
    },
    isDefault: (icon) => defaultIcons.includes(icon),
  };
  document.dispatchEvent(new Event('desktop-icons-ready'));

  console.log('✅ Desktop icons draggable with grid snap loaded');
});
