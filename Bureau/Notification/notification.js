/**
 * Windows XP Style Notification Balloon
 * Vanilla JavaScript implementation
 */

class XPNotification {
  constructor(options = {}) {
    // Настройки по умолчанию
    this.options = {
      title: options.title || 'Notification',
      message: options.message || '',
      actionText: options.actionText || '',
      iconUrl: options.iconUrl || '',
      soundUrl: options.soundUrl || '',
      startAfter: options.startAfter !== undefined ? options.startAfter : 3000,
      duration: options.duration !== undefined ? options.duration : 15000,
      container: options.container || document.body,
      onClose: options.onClose || null,
      onClick: options.onClick || null,
      position: options.position || { bottom: '40px', right: '30px' }
    };

    this.element = null;
    this.isShowing = false;
    this.audio = null;
    this.timers = {
      start: null,
      fade: null,
      remove: null
    };

    // Предзагрузка звука
    if (this.options.soundUrl) {
      this.audio = new Audio(this.options.soundUrl);
      this.audio.preload = 'auto';
      this.audio.load();
    }

    this._createNotification();
  }

  /**
   * Создает DOM элемент уведомления
   * @private
   */
  _createNotification() {
    // Создаем главный контейнер
    const notification = document.createElement('div');
    notification.className = 'xp-notification';

    // Применяем кастомную позицию если указана
    if (this.options.position) {
      Object.keys(this.options.position).forEach(key => {
        notification.style[key] = this.options.position[key];
      });
    }

    // Создаем внутренний контейнер
    const container = document.createElement('div');
    container.className = 'xp-notification__container';

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.className = 'xp-notification__close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Заголовок
    const header = document.createElement('div');
    header.className = 'xp-notification__header';

    // Иконка (если указана)
    if (this.options.iconUrl) {
      const icon = document.createElement('img');
      icon.className = 'xp-notification__header-img';
      icon.src = this.options.iconUrl;
      icon.alt = 'notification icon';
      header.appendChild(icon);
    }

    // Текст заголовка
    const headerText = document.createElement('span');
    headerText.className = 'xp-notification__header-text';
    headerText.textContent = this.options.title;
    header.appendChild(headerText);

    // Основное сообщение
    const messageFirst = document.createElement('p');
    messageFirst.className = 'xp-notification__text-first';
    messageFirst.textContent = this.options.message;

    // Текст действия (если указан)
    const messageSecond = document.createElement('p');
    messageSecond.className = 'xp-notification__text-second';
    messageSecond.innerHTML = this.options.actionText;

    // Собираем все вместе
    container.appendChild(closeBtn);
    container.appendChild(header);
    container.appendChild(messageFirst);

    if (this.options.actionText) {
      container.appendChild(messageSecond);
    }

    notification.appendChild(container);

    // Обработчик клика по уведомлению
    notification.addEventListener('click', () => {
      if (this.options.onClick && typeof this.options.onClick === 'function') {
        this.options.onClick();
      }
    });

    this.element = notification;
  }

  /**
   * Показывает уведомление
   * @public
   */
  show() {
    if (this.isShowing) return;

    // Добавляем элемент в DOM
    this.options.container.appendChild(this.element);
    this.isShowing = true;

    // Таймер для начала показа
    this.timers.start = setTimeout(() => {
      // Воспроизведение звука одновременно с появлением
      if (this.audio) {
        this.audio.currentTime = 0; // Сброс к началу
        this.audio.play().catch((error) => {
          console.error('Notification sound error:', error);
          console.log('Sound file:', this.options.soundUrl);
        });
      }

      this.element.classList.add('show');
    }, this.options.startAfter);

    // Таймер для начала скрытия
    this.timers.fade = setTimeout(() => {
      this._hide();
    }, this.options.startAfter + this.options.duration);

    // Таймер для удаления из DOM
    this.timers.remove = setTimeout(() => {
      this._remove();
    }, this.options.startAfter + this.options.duration + 1000);
  }

  /**
   * Скрывает уведомление с анимацией
   * @private
   */
  _hide() {
    if (!this.isShowing) return;

    this.element.classList.remove('show');
    this.element.classList.add('hide');
  }

  /**
   * Удаляет уведомление из DOM
   * @private
   */
  _remove() {
    if (!this.isShowing) return;

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.isShowing = false;
    this._clearTimers();
  }

  /**
   * Закрывает уведомление (вызывается при клике на крестик)
   * @public
   */
  close() {
    this._clearTimers();
    this._hide();

    // Удаляем через 1 секунду после начала анимации скрытия
    setTimeout(() => {
      this._remove();

      if (this.options.onClose && typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
    }, 1000);
  }

  /**
   * Очищает все таймеры
   * @private
   */
  _clearTimers() {
    Object.values(this.timers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });

    this.timers = {
      start: null,
      fade: null,
      remove: null
    };
  }

  /**
   * Полностью уничтожает уведомление
   * @public
   */
  destroy() {
    this._clearTimers();
    this._remove();
  }
}

// Экспорт для использования как ES модуль (опционально)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XPNotification;
}
