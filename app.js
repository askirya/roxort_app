// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
let gameState = {
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
    referralRewardClaimed: false
};

// Конфигурация игры
const GAME_CONFIG = {
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка состояния игры
    loadGameState();
    
    // Генерация реферального кода при первом запуске
    if (!gameState.referralCode) {
        gameState.referralCode = generateReferralCode();
        saveGameState();
    }
    
    // Инициализация обработчиков событий
    initializeEventListeners();
    
    // Обновление UI
    updateUI();
});

// Генерация реферального кода
function generateReferralCode() {
    const userId = tg.initDataUnsafe.user.id;
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    return `${userId}-${timestamp}-${randomStr}`;
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Обработчик клика
    document.getElementById('click-button').addEventListener('click', handleClick);
    
    // Обработчики модальных окон
    document.getElementById('shop-button').addEventListener('click', () => showModal('shop-modal'));
    document.getElementById('achievements-button').addEventListener('click', () => showModal('achievements-modal'));
    document.getElementById('minigames-button').addEventListener('click', () => showModal('minigames-modal'));
    document.getElementById('profile-button').addEventListener('click', () => showModal('profile-modal'));
    
    // Обработчики закрытия модальных окон
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// Обработка клика
function handleClick() {
    // Анимация клика
    const button = document.getElementById('click-button');
    button.classList.add('click-animation');
    setTimeout(() => button.classList.remove('click-animation'), 100);
    
    // Обновление состояния
    gameState.roxy += calculateClickReward();
    gameState.clicks++;
    gameState.experience += 1;
    
    // Проверка уровня
    checkLevelUp();
    
    // Сохранение состояния
    saveGameState();
    
    // Обновление UI
    updateUI();
}

// Расчет награды за клик
function calculateClickReward() {
    let reward = gameState.multiplier;
    // Применяем множители от улучшений
    gameState.upgrades.forEach(upgrade => {
        reward *= GAME_CONFIG.upgrades[upgrade]?.multiplier || 1;
    });
    return reward;
}

// Проверка повышения уровня
function checkLevelUp() {
    const expNeeded = gameState.level * 100;
    if (gameState.experience >= expNeeded) {
        gameState.level++;
        gameState.experience -= expNeeded;
        gameState.multiplier += 0.1;
    }
}

// Обновление UI
function updateUI() {
    document.getElementById('roxy-balance').textContent = Math.floor(gameState.roxy);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('experience').textContent = `${gameState.experience}/${gameState.level * 100}`;
    document.getElementById('clicks').textContent = gameState.clicks;
    document.getElementById('multiplier').textContent = gameState.multiplier.toFixed(1);
}

// Показ модального окна
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    updateModalContent(modalId);
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

// Сохранение состояния игры
function saveGameState() {
    localStorage.setItem('roxortGameState', JSON.stringify(gameState));
}

// Загрузка состояния игры
function loadGameState() {
    const savedState = localStorage.getItem('roxortGameState');
    if (savedState) {
        gameState = JSON.parse(savedState);
    }
}

// Обновление содержимого модального окна магазина
function updateShopContent() {
    const modal = document.getElementById('shop-modal');
    const content = modal.querySelector('.modal-content');
    
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

// Обновление содержимого реферального окна
function updateReferralContent() {
    const modal = document.getElementById('referral-modal');
    const content = modal.querySelector('.modal-content');
    
    let html = `
        <h2>Реферальная система</h2>
        <div class="referral-info">
            <p>Ваш реферальный код: <strong>${gameState.referralCode}</strong></p>
            <p>Приглашено друзей: ${gameState.referrals.length}/${GAME_CONFIG.maxReferrals}</p>
        </div>
        
        <div class="referral-input">
            <input type="text" id="referral-code-input" placeholder="Введите реферальный код">
            <button onclick="activateReferralCode(document.getElementById('referral-code-input').value)">
                Активировать
            </button>
        </div>
    `;
    
    if (gameState.referrals.length > 0) {
        html += `
            <div class="referral-list">
                <h3>Ваши рефералы:</h3>
                <ul>
                    ${gameState.referrals.map(ref => `
                        <li>
                            <span>${ref.username}</span>
                            <span>Уровень: ${ref.level}</span>
                            <span>ROXY: ${ref.roxy}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Активация реферального кода
function activateReferralCode(code) {
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
    
    gameState.referrer = referrerId;
    gameState.roxy += GAME_CONFIG.friendReward;
    saveGameState();
    
    showNotification(`Реферальный код активирован! Получено ${GAME_CONFIG.friendReward} ROXY`, 'success');
    updateUI();
    updateReferralContent();
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

// Инициализация при первом запуске
tg.ready(); 