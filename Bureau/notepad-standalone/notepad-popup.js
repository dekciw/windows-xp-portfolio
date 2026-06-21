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

// Обработчики кнопок окна
document.querySelector('.header-button--close').addEventListener('click', () => {
  if (confirm('Закрыть калькулятор?')) {
    window.close();
  }
});

document.querySelector('.header-button--minimize').addEventListener('click', () => {
  windowEl.style.display = 'none';
});

// ======================
// КАЛЬКУЛЯТОР
// ======================

let displayValue = '0';
let firstOperand = null;
let operator = null;
let waitingForSecondOperand = false;
let memory = 0;

const displayEl = document.querySelector('.calculator-display');

function updateDisplay() {
  displayEl.value = displayValue;
}

function inputDigit(digit) {
  if (waitingForSecondOperand) {
    displayValue = digit;
    waitingForSecondOperand = false;
  } else {
    if (displayValue === '' || displayValue === '0') {
      displayValue = digit;
    } else {
      displayValue += digit;
    }
  }
  updateDisplay();
}

function inputDecimal() {
  if (waitingForSecondOperand) {
    displayValue = '0.';
    waitingForSecondOperand = false;
  } else {
    if (displayValue === '') {
      displayValue = '0.';
    } else if (!displayValue.includes('.')) {
      displayValue += '.';
    }
  }
  updateDisplay();
}

function handleOperator(nextOperator) {
  const inputValue = parseFloat(displayValue || '0');

  if (firstOperand === null && !isNaN(inputValue)) {
    firstOperand = inputValue;
  } else if (operator) {
    const result = calculate(firstOperand, inputValue, operator);
    displayValue = String(parseFloat(result.toFixed(7)));
    firstOperand = result;
  }

  waitingForSecondOperand = true;
  operator = nextOperator;
  updateDisplay();
}

function calculate(first, second, op) {
  switch (op) {
    case '+':
      return first + second;
    case '-':
      return first - second;
    case '*':
      return first * second;
    case '/':
      return second === 0 ? 0 : first / second;
    default:
      return second;
  }
}

function clearAll() {
  displayValue = '0';
  firstOperand = null;
  operator = null;
  waitingForSecondOperand = false;
  updateDisplay();
}

function clearEntry() {
  displayValue = '0';
  updateDisplay();
}

function backspace() {
  if (displayValue.length > 1) {
    displayValue = displayValue.slice(0, -1);
  } else {
    displayValue = '0';
  }
  updateDisplay();
}

function squareRoot() {
  const value = parseFloat(displayValue || '0');
  if (value < 0) {
    displayValue = '0';
  } else {
    displayValue = String(Math.sqrt(value));
  }
  updateDisplay();
}

function percent() {
  const value = parseFloat(displayValue || '0');
  if (firstOperand !== null) {
    displayValue = String((firstOperand * value) / 100);
  } else {
    displayValue = String(value / 100);
  }
  updateDisplay();
}

function reciprocal() {
  const value = parseFloat(displayValue || '0');
  if (value === 0) {
    displayValue = '0';
  } else {
    displayValue = String(1 / value);
  }
  updateDisplay();
}

function negate() {
  const value = parseFloat(displayValue || '0');
  displayValue = String(-value);
  updateDisplay();
}

function memoryClear() {
  memory = 0;
}

function memoryRecall() {
  displayValue = String(memory);
  updateDisplay();
}

function memoryStore() {
  memory = parseFloat(displayValue || '0');
}

function memoryAdd() {
  memory += parseFloat(displayValue || '0');
}

// Привязка кнопок
document.querySelectorAll('.calculator-button').forEach(button => {
  button.addEventListener('click', () => {
    const classes = button.className;

    if (classes.includes('calculator-button-backspace')) {
      backspace();
    } else if (classes.includes('calculator-button-ce')) {
      clearEntry();
    } else if (classes.includes('calculator-button-c')) {
      clearAll();
    } else if (classes.includes('calculator-button-mc')) {
      memoryClear();
    } else if (classes.includes('calculator-button-mr')) {
      memoryRecall();
    } else if (classes.includes('calculator-button-ms')) {
      memoryStore();
    } else if (classes.includes('calculator-button-m-plus')) {
      memoryAdd();
    } else if (classes.includes('calculator-button-equals')) {
      handleOperator('=');
      operator = null;
      firstOperand = null;
    } else if (classes.includes('calculator-button-num')) {
      const allSvgs = button.querySelectorAll('svg');

      // Проверяем все SVG в кнопке
      for (let i = 0; i < allSvgs.length; i++) {
        const svg = allSvgs[i];
        const width = svg.getAttribute('width');
        const height = svg.getAttribute('height');

        // Точка - кнопка 32x25
        if (width === '32' && height === '25') {
          inputDecimal();
          return;
        }
      }

      const svg = button.querySelector('svg');
      if (!svg) return;

      const width = svg.getAttribute('width');
      const svgPath = svg.querySelector('path, rect');
      if (!svgPath) return;

      const d = svgPath.getAttribute('d') || '';
      const rectX = svgPath.getAttribute('x') || '';
      const rectY = svgPath.getAttribute('y') || '';

      // Минус - rect с x="7" y="7"
      if (svgPath.tagName === 'rect' && rectX === '7' && rectY === '7') {
        handleOperator('-');
        return;
      }

      if (d.includes('M6 2H11V3V4H10V3H6V2Z')) inputDigit('7');
      else if (d.includes('M10 2H7V3H6V6H7V7H6V10H7V11H10V10H11V7H10V6H11V3H10V2Z')) inputDigit('8');
      else if (d.includes('M1 0H4V1H1V0ZM1 4H0V1H1V4ZM4 8V5H1V4H4V1H5V8H4Z')) inputDigit('9');
      else if (d.includes('M10 2H9V3H8V5H7V7H6V9H7H9V11H10V9H11V8H10V2Z')) inputDigit('4');
      else if (d.includes('M7 2H6V7H7V6H10V10H7V9H6V10H7V11H10V10H11V6H10V5H7V3H11V2H7Z')) inputDigit('5');
      else if (d.includes('M10 2H7V3H6V10H7V11H10V10H11V7H10V6H7V3H10V4H11V3H10V2Z')) inputDigit('6');
      else if (d.includes('M9 2H8V3H6V4H8V11H9V2Z')) inputDigit('1');
      else if (d.includes('M10 2H7V3H6V4H7V3H10V6H9V7H8V8H7V9H6V11H7H11V10H7V9H8V8H9V7H10V6H11V3H10V2Z')) inputDigit('2');
      else if (d.includes('M10 2H7V3H6V4H7V3H10V6H8V7H10V10H7V9H6V10H7V11H10V10H11V7H10V6H11V3H10V2Z')) inputDigit('3');
      else if (d.includes('M7 2H10V3H7V2ZM7 10V3H6V10H7Z')) inputDigit('0');
      else if (d.includes('M10 2H9V5H8V7H7V9H6V11H7V9H8V7H9V5H10V2Z')) handleOperator('/');
      else if (d.includes('M7 2H8V3H7V2ZM9 3H8V4H7V5H8V4H9V5H10V4H9V3ZM9 3V2H10V3H9Z')) handleOperator('*');
      else if (d.includes('M9 5H8V7H6V8H8V10H9V8H11V7H9V5Z')) handleOperator('+');
      else if (d.includes('M15 3H14V10H15V11H16V10H15V6H16V5H15V3Z')) squareRoot();
      else if (d.includes('M6 2H8V3H6V2ZM6 4H5V3H6V4ZM8 4V5H6V4H8ZM8 4H9V3H8V4ZM11 8V9H9V8H11Z')) percent();
      else if (d.includes('M3 2H4V11H3V4H1V3H3V2Z')) reciprocal();
      else if (d.includes('M12 2H11V5H10V7H9V9H8V11H9V9H10V7H11V5H12V2Z')) negate();
    }
  });
});

// Инициализация
updateDisplay();
