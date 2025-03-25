// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();

// Проверка авторизации
if (!tg.initDataUnsafe?.user?.id) {
    document.body.innerHTML = '<div class="container"><h1>Пожалуйста, откройте приложение через Telegram</h1></div>';
    throw new Error('Не авторизован');
}

// Состояние игры по умолчанию
const defaultGameState = {
    roxy: 0,
    clicks: 0,
    level: 1,
    experience: 0,
    multiplier: 1.0,
    upgrades: [],
    achievements: [],
    referralCode: null,
    referrals: [],
    referrer: null,
    referralRewardClaimed: false,
    lastSave: Date.now()
};

// Конфигурация игры
const GAME_CONFIG = {
    experiencePerLevel: 100,
    clickReward: 1,
    maxReferrals: 10,
    referralReward: 100,
    friendReward: 50,
    minLevelForReward: 5,
    upgrades: {
        clicker: {
            name: "Улучшенный кликер",
            description: "Увеличивает ROXY за клик на 50%",
            basePrice: 100,
            multiplier: 1.5
        },
        autoClicker: {
            name: "Авто-кликер",
            description: "Автоматически кликает каждые 5 минут",
            basePrice: 500,
            multiplier: 2
        },
        superMultiplier: {
            name: "Супер множитель",
            description: "Увеличивает все множители на 100%",
            basePrice: 1000,
            multiplier: 3
        }
    }
};

// Текущее состояние игры
let gameState = null;

// Загрузка состояния игры
function loadGameState() {
    const userId = tg.initDataUnsafe.user.id;
    const savedState = localStorage.getItem(`gameState_${userId}`);
    if (savedState) {
        gameState = JSON.parse(savedState);
        // Проверяем, не прошло ли слишком много времени с последнего сохранения
        const timeDiff = Date.now() - gameState.lastSave;
        if (timeDiff > 0) {
            // Начисляем офлайн-прогресс
            const offlineReward = Math.floor(timeDiff / (5 * 60 * 1000)) * GAME_CONFIG.clickReward;
            if (offlineReward > 0) {
                gameState.roxy += offlineReward;
                showNotification(`Получено ${offlineReward} ROXY за время отсутствия!`, 'success');
            }
        }
    } else {
        gameState = { ...defaultGameState };
        gameState.referralCode = generateReferralCode();
    }
    gameState.lastSave = Date.now();
    saveGameState();
}

// Сохранение состояния игры
function saveGameState() {
    const userId = tg.initDataUnsafe.user.id;
    localStorage.setItem(`gameState_${userId}`, JSON.stringify(gameState));
}

// Обработка клика
function handleClick() {
    const button = document.getElementById('click-button');
    button.classList.add('click-animation');
    setTimeout(() => button.classList.remove('click-animation'), 100);

    const reward = calculateClickReward();
    gameState.roxy += reward;
    gameState.clicks++;
    gameState.experience += 1;

    checkLevelUp();
    saveGameState();
    updateUI();
}

// Расчет награды за клик
function calculateClickReward() {
    let reward = GAME_CONFIG.clickReward * gameState.multiplier;
    gameState.upgrades.forEach(upgradeId => {
        const upgrade = GAME_CONFIG.upgrades[upgradeId];
        if (upgrade) {
            reward *= upgrade.multiplier;
        }
    });
    return Math.floor(reward);
}

// Проверка повышения уровня
function checkLevelUp() {
    while (gameState.experience >= GAME_CONFIG.experiencePerLevel) {
        gameState.experience -= GAME_CONFIG.experiencePerLevel;
        gameState.level++;
        gameState.multiplier += 0.1;
        showNotification(`Уровень повышен! Текущий уровень: ${gameState.level}`, 'success');
    }
}

// Обновление UI
function updateUI() {
    document.getElementById('roxy-balance').textContent = Math.floor(gameState.roxy);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('experience').textContent = `${gameState.experience}/${GAME_CONFIG.experiencePerLevel}`;
    document.getElementById('clicks').textContent = gameState.clicks;
    document.getElementById('multiplier').textContent = gameState.multiplier.toFixed(1);
}

// Показ модального окна
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'block';
    updateModalContent(modalId);
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';
}

// Обновление содержимого модального окна
function updateModalContent(modalId) {
    switch(modalId) {
        case 'shop-modal':
            updateShopContent();
            break;
        case 'achievements-modal':
            updateAchievementsContent();
            break;
        case 'minigames-modal':
            updateMinigamesContent();
            break;
        case 'profile-modal':
            updateProfileContent();
            break;
        case 'referral-modal':
            updateReferralContent();
            break;
    }
}

// Обновление содержимого магазина
function updateShopContent() {
    const content = document.querySelector('#shop-modal .modal-content');
    let html = '<h2>Магазин улучшений</h2>';
    
    for (const [id, upgrade] of Object.entries(GAME_CONFIG.upgrades)) {
        const owned = gameState.upgrades.includes(id);
        const price = owned ? 'Куплено' : upgrade.basePrice;
        const canAfford = gameState.roxy >= upgrade.basePrice;
        
        html += `
            <div class="upgrade-item">
                <div class="upgrade-header">
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-price">${price}</span>
                </div>
                <p class="upgrade-description">${upgrade.description}</p>
                <button 
                    onclick="buyUpgrade('${id}')" 
                    class="buy-button"
                    ${owned || !canAfford ? 'disabled' : ''}
                >
                    ${owned ? 'Куплено' : 'Купить'}
                </button>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Покупка улучшения
function buyUpgrade(upgradeId) {
    const upgrade = GAME_CONFIG.upgrades[upgradeId];
    if (!upgrade || gameState.upgrades.includes(upgradeId) || gameState.roxy < upgrade.basePrice) {
        return;
    }
    
    gameState.roxy -= upgrade.basePrice;
    gameState.upgrades.push(upgradeId);
    saveGameState();
    updateUI();
    updateShopContent();
    showNotification(`Улучшение "${upgrade.name}" куплено!`, 'success');
}

// Генерация реферального кода
function generateReferralCode() {
    const userId = tg.initDataUnsafe.user.id;
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    return `${userId}-${timestamp}-${randomStr}`;
}

// Показ уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Обновление содержимого достижений
function updateAchievementsContent() {
    const content = document.querySelector('#achievements-modal .modal-content');
    const achievements = [
        { id: 'clicks_100', name: 'Начинающий кликер', description: 'Сделайте 100 кликов', requirement: state => state.clicks >= 100 },
        { id: 'clicks_1000', name: 'Опытный кликер', description: 'Сделайте 1,000 кликов', requirement: state => state.clicks >= 1000 },
        { id: 'level_10', name: 'Первые шаги', description: 'Достигните 10 уровня', requirement: state => state.level >= 10 },
        { id: 'roxy_1000', name: 'Богач', description: 'Накопите 1,000 ROXY', requirement: state => state.roxy >= 1000 },
        { id: 'upgrades_3', name: 'Коллекционер', description: 'Купите 3 разных улучшения', requirement: state => state.upgrades.length >= 3 }
    ];

    let html = '<h2>Достижения</h2>';
    achievements.forEach(achievement => {
        const isCompleted = achievement.requirement(gameState);
        html += `
            <div class="achievement-item ${isCompleted ? 'completed' : ''}">
                <div class="achievement-header">
                    <span class="achievement-name">${achievement.name}</span>
                    <span class="achievement-status">${isCompleted ? '✅' : '❌'}</span>
                </div>
                <p class="achievement-description">${achievement.description}</p>
            </div>
        `;
    });
    
    content.innerHTML = html;
}

// Обновление содержимого мини-игр
function updateMinigamesContent() {
    const content = document.querySelector('#minigames-modal .modal-content');
    content.innerHTML = `
        <h2>Мини-игры</h2>
        <div class="minigame-list">
            <div class="minigame-item">
                <h3>Угадай число</h3>
                <p>Угадайте число от 1 до 100 и получите ROXY!</p>
                <button onclick="startNumberGame()">Играть</button>
            </div>
            <div class="minigame-item">
                <h3>Быстрые клики</h3>
                <p>Кликайте как можно быстрее в течение 10 секунд!</p>
                <button onclick="startSpeedClickGame()">Играть</button>
            </div>
        </div>
    `;
}

// Обновление содержимого профиля
function updateProfileContent() {
    const content = document.querySelector('#profile-modal .modal-content');
    const user = tg.initDataUnsafe.user;
    
    content.innerHTML = `
        <h2>Профиль</h2>
        <div class="profile-info">
            <div class="profile-header">
                <img src="${user.photo_url || 'default-avatar.png'}" alt="Avatar" class="profile-avatar">
                <div class="profile-details">
                    <h3>${user.first_name} ${user.last_name || ''}</h3>
                    <p>@${user.username || 'Нет username'}</p>
                </div>
            </div>
            <div class="profile-stats">
                <div class="profile-stat">
                    <span class="stat-label">Всего ROXY:</span>
                    <span class="stat-value">${Math.floor(gameState.roxy)}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Уровень:</span>
                    <span class="stat-value">${gameState.level}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Всего кликов:</span>
                    <span class="stat-value">${gameState.clicks}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Улучшений куплено:</span>
                    <span class="stat-value">${gameState.upgrades.length}</span>
                </div>
            </div>
        </div>
    `;
}

// Обновление содержимого реферальной системы
function updateReferralContent() {
    const content = document.querySelector('#referral-modal .modal-content');
    
    content.innerHTML = `
        <h2>Реферальная система</h2>
        <div class="referral-info">
            <p>Ваш реферальный код: <strong>${gameState.referralCode}</strong></p>
            <button onclick="copyReferralCode('${gameState.referralCode}')" class="copy-button">
                Скопировать код
            </button>
            <p class="referral-description">
                Поделитесь своим кодом с друзьями и получайте бонусы!<br>
                За каждого приглашенного друга: ${GAME_CONFIG.referralReward} ROXY
            </p>
        </div>
        
        <div class="referral-input">
            <input type="text" id="referral-code-input" placeholder="Введите реферальный код друга">
            <button onclick="activateReferralCode()">Активировать</button>
        </div>
        
        <div class="referral-stats">
            <h3>Ваши рефералы (${gameState.referrals.length}/${GAME_CONFIG.maxReferrals})</h3>
            ${gameState.referrals.length > 0 ? `
                <div class="referral-list">
                    ${gameState.referrals.map(ref => `
                        <div class="referral-item">
                            <span class="referral-name">${ref.name}</span>
                            <span class="referral-level">Уровень: ${ref.level}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '<p>У вас пока нет рефералов</p>'}
        </div>
    `;
}

// Копирование реферального кода
function copyReferralCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Реферальный код скопирован!', 'success');
    }).catch(() => {
        showNotification('Не удалось скопировать код', 'error');
    });
}

// Активация реферального кода
function activateReferralCode() {
    const input = document.getElementById('referral-code-input');
    const code = input.value.trim();
    
    if (!code) {
        showNotification('Введите реферальный код', 'error');
        return;
    }
    
    if (gameState.referrer) {
        showNotification('Вы уже активировали реферальный код', 'error');
        return;
    }
    
    const [referrerId] = code.split('-');
    if (referrerId === tg.initDataUnsafe.user.id.toString()) {
        showNotification('Нельзя использовать свой собственный код', 'error');
        return;
    }
    
    // Активация кода
    gameState.referrer = referrerId;
    gameState.roxy += GAME_CONFIG.friendReward;
    saveGameState();
    
    showNotification(`Реферальный код активирован! Получено ${GAME_CONFIG.friendReward} ROXY`, 'success');
    updateUI();
    updateReferralContent();
}

// Мини-игра "Угадай число"
function startNumberGame() {
    const targetNumber = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    const maxAttempts = 7;
    
    const makeGuess = () => {
        const guess = parseInt(prompt(`Попытка ${attempts + 1}/${maxAttempts}. Введите число от 1 до 100:`));
        
        if (isNaN(guess)) {
            showNotification('Пожалуйста, введите число', 'error');
            return;
        }
        
        attempts++;
        
        if (guess === targetNumber) {
            const reward = Math.floor(100 * (1 + (maxAttempts - attempts) / maxAttempts));
            gameState.roxy += reward;
            saveGameState();
            updateUI();
            showNotification(`Поздравляем! Вы угадали число! Получено ${reward} ROXY`, 'success');
            return;
        }
        
        if (attempts >= maxAttempts) {
            showNotification(`Игра окончена. Загаданное число было: ${targetNumber}`, 'error');
            return;
        }
        
        const hint = guess > targetNumber ? 'Меньше' : 'Больше';
        if (confirm(`${hint}! Хотите продолжить?`)) {
            makeGuess();
        }
    };
    
    makeGuess();
}

// Мини-игра "Быстрые клики"
function startSpeedClickGame() {
    const gameTime = 10; // секунд
    let clicks = 0;
    let isGameActive = true;
    
    const content = document.querySelector('#minigames-modal .modal-content');
    content.innerHTML = `
        <h2>Быстрые клики</h2>
        <div class="speed-click-game">
            <p>Время: <span id="game-timer">${gameTime}</span> сек</p>
            <p>Клики: <span id="game-clicks">0</span></p>
            <button id="game-button" class="game-click-button">КЛИК!</button>
        </div>
    `;
    
    const timerElement = document.getElementById('game-timer');
    const clicksElement = document.getElementById('game-clicks');
    const gameButton = document.getElementById('game-button');
    
    let timeLeft = gameTime;
    const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            isGameActive = false;
            gameButton.disabled = true;
            
            const reward = Math.floor(clicks * 2);
            gameState.roxy += reward;
            saveGameState();
            updateUI();
            
            showNotification(`Игра окончена! Кликов: ${clicks}, Получено ${reward} ROXY`, 'success');
            setTimeout(updateMinigamesContent, 2000);
        }
    }, 1000);
    
    gameButton.addEventListener('click', () => {
        if (isGameActive) {
            clicks++;
            clicksElement.textContent = clicks;
        }
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка состояния игры
    loadGameState();
    
    // Обработчик клика
    document.getElementById('click-button').addEventListener('click', handleClick);
    
    // Обработчики кнопок меню
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.id.replace('-button', '-modal');
            showModal(modalId);
        });
    });
    
    // Обработчики закрытия модальных окон
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Автосохранение каждые 30 секунд
    setInterval(saveGameState, 30000);
    
    // Обновление UI
    updateUI();
}); 