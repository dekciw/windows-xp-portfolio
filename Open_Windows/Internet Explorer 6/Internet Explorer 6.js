// Браузер Internet Explorer 6 - простая функциональность
(function() {
  const addressInput = document.getElementById('ie-address-input');
  const browserFrame = document.getElementById('ie-browser-frame');
  const goButton = document.getElementById('ie-go-button');
  const refreshButton = document.getElementById('ie-refresh-button');
  const homeButton = document.getElementById('ie-home-button');
  const statusText = document.getElementById('ie-status-text');

  const homePage = 'https://ru.wikipedia.org';

  // Загрузка страницы
  function navigateTo(url) {
    if (!url) return;

    // Проверка валидности URL
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      url = 'https://' + url;
    }

    statusText.textContent = 'Загрузка...';

    try {
      browserFrame.src = url;
      addressInput.value = url;
    } catch (error) {
      statusText.textContent = 'Ошибка загрузки';
      console.error('Navigation error:', error);
    }
  }

  // Кнопка "Переход"
  if (goButton) {
    goButton.addEventListener('click', function() {
      navigateTo(addressInput.value);
    });
  }

  // Enter в адресной строке
  if (addressInput) {
    addressInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        navigateTo(addressInput.value);
      }
    });
  }

  // Кнопка "Обновить"
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      browserFrame.src = browserFrame.src;
      statusText.textContent = 'Обновление...';
    });
  }

  // Кнопка "Домой"
  if (homeButton) {
    homeButton.addEventListener('click', function() {
      navigateTo(homePage);
    });
  }

  // Кнопка "Избранное" - отключена
  // (favorites.html удалён, функционал через меню "Избранное")

  // Отслеживание загрузки iframe
  if (browserFrame) {
    browserFrame.addEventListener('load', function() {
      statusText.textContent = 'Готово';
    });

    browserFrame.addEventListener('error', function() {
      statusText.textContent = 'Не удалось загрузить страницу';
    });
  }

  console.log('✅ IE6 Browser готов к работе!');
})();
