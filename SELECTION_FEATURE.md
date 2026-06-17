# Функциональность выделения иконок (Selection Box)

Эта функциональность позволяет выделять иконки на рабочем столе рамкой, как в Windows XP.

## Компоненты

### 1. DashedBox Component
**Файл:** `src/components/DashedBox/index.js`

```javascript
import React from 'react';

function DashedBox({ mouse, startPos }) {
  function getRect() {
    return {
      x: Math.min(startPos.x, mouse.docX),
      y: Math.min(startPos.y, mouse.docY),
      w: Math.abs(startPos.x - mouse.docX),
      h: Math.abs(startPos.y - mouse.docY),
    };
  }
  
  if (startPos) {
    const { x, y, w, h } = getRect();
    return (
      <div
        style={{
          transform: `translate(${x}px,${y}px)`,
          width: w,
          height: h,
          position: 'absolute',
          border: `1px dotted gray`,
        }}
      />
    );
  }
  return null;
}

export default DashedBox;
```

**Описание:**
- Рисует пунктирную рамку выделения
- Принимает позицию мыши (`mouse`) и начальную точку (`startPos`)
- Вычисляет координаты и размеры прямоугольника выделения

---

### 2. Логика выделения в главном компоненте

**Файл:** `src/WinXP/index.js` (выдержки)

#### State управление:

```javascript
const initState = {
  // ... другие поля
  selecting: false, // координаты начальной точки выделения или false
};
```

#### Actions:

```javascript
const START_SELECT = 'START_SELECT';
const END_SELECT = 'END_SELECT';
const SELECT_ICONS = 'SELECT_ICONS';
const FOCUS_DESKTOP = 'FOCUS_DESKTOP';
```

#### Reducer:

```javascript
case START_SELECT:
  return {
    ...state,
    focusing: FOCUSING.DESKTOP,
    icons: state.icons.map(icon => ({
      ...icon,
      isFocus: false,
    })),
    selecting: action.payload, // { x: mouse.docX, y: mouse.docY }
  };

case END_SELECT:
  return {
    ...state,
    selecting: null,
  };

case SELECT_ICONS: {
  const icons = state.icons.map(icon => ({
    ...icon,
    isFocus: action.payload.includes(icon.id),
  }));
  return {
    ...state,
    icons,
    focusing: FOCUSING.ICON,
  };
}

case FOCUS_DESKTOP:
  return {
    ...state,
    focusing: FOCUSING.DESKTOP,
    icons: state.icons.map(icon => ({
      ...icon,
      isFocus: false,
    })),
  };
```

#### Event handlers:

```javascript
// Начало выделения при клике на рабочий стол
function onMouseDownDesktop(e) {
  if (e.target === e.currentTarget)
    dispatch({
      type: START_SELECT,
      payload: { x: mouse.docX, y: mouse.docY },
    });
}

// Завершение выделения
function onMouseUpDesktop(e) {
  dispatch({ type: END_SELECT });
}

// Callback для установки выделенных иконок
const onIconsSelected = useCallback(
  iconIds => {
    dispatch({ type: SELECT_ICONS, payload: iconIds });
  },
  [dispatch],
);
```

#### JSX:

```javascript
// Нужен хук useMouse из react-use
import useMouse from 'react-use/lib/useMouse';

function WinXP() {
  const ref = useRef(null);
  const mouse = useMouse(ref);
  
  return (
    <Container
      ref={ref}
      onMouseUp={onMouseUpDesktop}
      onMouseDown={onMouseDownDesktop}
    >
      <Icons
        icons={state.icons}
        mouse={mouse}
        selecting={state.selecting}
        setSelectedIcons={onIconsSelected}
        // ... другие пропсы
      />
      <DashedBox startPos={state.selecting} mouse={mouse} />
    </Container>
  );
}
```

---

### 3. Логика определения пересечений в Icons Component

**Файл:** `src/WinXP/Icons/index.js` (выдержки)

```javascript
function Icons({
  icons,
  mouse,
  selecting,
  setSelectedIcons,
  // ... другие пропсы
}) {
  const [iconsRect, setIconsRect] = useState([]);
  
  // Сохранение координат каждой иконки
  function measure(rect) {
    if (iconsRect.find(r => r.id === rect.id)) return;
    setIconsRect(iconsRect => [...iconsRect, rect]);
  }
  
  // Проверка пересечения рамки выделения с иконками
  useEffect(() => {
    if (!selecting) return;
    
    // Координаты и размеры рамки выделения
    const sx = Math.min(selecting.x, mouse.docX);
    const sy = Math.min(selecting.y, mouse.docY);
    const sw = Math.abs(selecting.x - mouse.docX);
    const sh = Math.abs(selecting.y - mouse.docY);
    
    // Определяем какие иконки попадают в рамку
    const selectedIds = iconsRect
      .filter(rect => {
        const { x, y, w, h } = rect;
        // Проверка пересечения двух прямоугольников
        return x - sx < sw && sx - x < w && y - sy < sh && sy - y < h;
      })
      .map(icon => icon.id);
    
    setSelectedIcons(selectedIds);
  }, [iconsRect, setSelectedIcons, selecting, mouse.docX, mouse.docY]);
  
  return (
    <IconsContainer>
      {icons.map(icon => (
        <StyledIcon
          key={icon.id}
          {...icon}
          measure={measure} // передаем функцию для измерения позиции
        />
      ))}
    </IconsContainer>
  );
}
```

#### Icon Component (измерение позиции):

```javascript
function Icon({ id, measure, ...rest }) {
  const ref = useRef(null);
  
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    
    // Получаем координаты и размеры иконки
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const posX = left + window.scrollX;
    const posY = top + window.scrollY;
    
    // Сохраняем для проверки пересечений
    measure({ id, x: posX, y: posY, w: width, h: height });
  }, [id, measure]);
  
  return (
    <div ref={ref}>
      {/* содержимое иконки */}
    </div>
  );
}
```

---

## Алгоритм работы

1. **Начало выделения:** 
   - Пользователь кликает на рабочий стол (не на иконку)
   - Сохраняются координаты клика в `selecting: { x, y }`
   - Все иконки снимаются с фокуса

2. **Процесс выделения:**
   - Пользователь двигает мышью с зажатой кнопкой
   - `DashedBox` рисует пунктирную рамку от начальной точки до текущей позиции мыши
   - `Icons` компонент в `useEffect` проверяет пересечение рамки с каждой иконкой
   - Алгоритм пересечения прямоугольников:
     ```
     x - sx < sw && sx - x < w && y - sy < sh && sy - y < h
     ```
   - ID пересекающихся иконок передаются через `setSelectedIcons`

3. **Завершение выделения:**
   - Пользователь отпускает кнопку мыши
   - `selecting` устанавливается в `null`
   - Рамка исчезает
   - Иконки остаются выделенными

---

## Визуальная стилизация выделенных иконок

```javascript
const StyledIcon = styled(Icon)`
  &__text {
    background-color: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? '#0b61ff' : 'transparent'};
  }
  
  &__img__container {
    filter: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 'drop-shadow(0 0 blue)' : ''};
  }
  
  &__img {
    opacity: ${({ isFocus, displayFocus }) =>
      isFocus && displayFocus ? 0.5 : 1};
  }
`;
```

---

## Зависимости

```json
{
  "dependencies": {
    "react": "^16.8.6",
    "react-use": "^7.0.1",
    "styled-components": "^4.2.0"
  }
}
```

**Важно:** Для получения координат мыши используется хук `useMouse` из библиотеки `react-use`.

---

## Как интегрировать в свой проект

1. Скопируйте компонент `DashedBox`
2. Добавьте в state:
   - `selecting` (null или { x, y })
   - `icons` массив с полем `isFocus`
3. Установите `react-use`: `npm install react-use`
4. Добавьте обработчики `onMouseDown` и `onMouseUp` на контейнер
5. Используйте хук `useMouse` для отслеживания позиции мыши
6. Реализуйте логику определения пересечений в компоненте с иконками
7. Отрисуйте `<DashedBox startPos={selecting} mouse={mouse} />`

---

## Пример минимальной реализации

```javascript
import React, { useState, useRef } from 'react';
import useMouse from 'react-use/lib/useMouse';
import DashedBox from './DashedBox';

function App() {
  const [selecting, setSelecting] = useState(null);
  const [selectedIcons, setSelectedIcons] = useState([]);
  const ref = useRef(null);
  const mouse = useMouse(ref);

  const handleMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      setSelecting({ x: mouse.docX, y: mouse.docY });
    }
  };

  const handleMouseUp = () => {
    setSelecting(null);
  };

  return (
    <div 
      ref={ref}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
    >
      {/* Ваши иконки */}
      <DashedBox startPos={selecting} mouse={mouse} />
    </div>
  );
}
```
