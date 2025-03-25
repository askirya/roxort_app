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
    referrer: null,
    referralRewardClaimed: false
};

// Конфигурация
const API_URL = 'http://d3aef028639d.vps.myjino.ru/api';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка состояния игры
    loadGameState();
    
    // Инициализация обработчиков событий
    initializeEventListeners();
    
    // Обновление UI
    updateUI();
});

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
    gameState.roxy += gameState.multiplier;
    gameState.clicks++;
    gameState.experience += 1;
    
    // Проверка уровня
    checkLevelUp();
    
    // Сохранение состояния
    saveGameState();
    
    // Обновление UI
    updateUI();
    
    // Отправка данных на сервер
    sendDataToServer();
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

// Отправка данных на сервер
async function sendDataToServer() {
    try {
        const response = await fetch(`${API_URL}/save-state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: tg.initDataUnsafe.user.id,
                gameState: gameState
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

// Функции для работы с реферальной системой
async function loadReferralData() {
    try {
        const response = await fetch(`${API_URL}/referral/code/${tg.initDataUnsafe.user.id}`);
        const data = await response.json();
        
        if (data.success) {
            return data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading referral data:', error);
        showNotification('Ошибка загрузки реферальных данных', 'error');
        return null;
    }
}

async function activateReferralCode(code) {
    try {
        const response = await fetch(`${API_URL}/referral/activate/${tg.initDataUnsafe.user.id}/${code}`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification('Реферальный код успешно активирован!', 'success');
            updateReferralContent();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error activating referral code:', error);
        showNotification('Ошибка активации реферального кода', 'error');
    }
}

async function loadReferralList() {
    try {
        const response = await fetch(`${API_URL}/referral/list/${tg.initDataUnsafe.user.id}`);
        const data = await response.json();
        
        if (data.success) {
            return data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading referral list:', error);
        showNotification('Ошибка загрузки списка рефералов', 'error');
        return null;
    }
}

async function claimReferralReward() {
    try {
        const response = await fetch(`${API_URL}/referral/claim/${tg.initDataUnsafe.user.id}`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            gameState.roxy += data.rewards.user;
            showNotification(`Получено ${data.rewards.user} ROXY!`, 'success');
            updateUI();
            updateReferralContent();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error claiming referral reward:', error);
        showNotification('Ошибка получения награды', 'error');
    }
}

// Обновление содержимого реферального модального окна
async function updateReferralContent() {
    const modal = document.getElementById('referral-modal');
    const content = modal.querySelector('.modal-content');
    
    // Загружаем данные
    const referralData = await loadReferralData();
    const referralList = await loadReferralList();
    
    if (!referralData || !referralList) return;
    
    // Создаем HTML
    let html = `
        <h2>Реферальная система</h2>
        <div class="referral-info">
            <p>Ваш реферальный код: <strong>${referralData.referralCode}</strong></p>
            <p>Приглашено друзей: ${referralList.referralCount}/${referralData.maxReferrals}</p>
        </div>
        
        <div class="referral-input">
            <input type="text" id="referral-code-input" placeholder="Введите реферальный код">
            <button onclick="activateReferralCode(document.getElementById('referral-code-input').value)">Активировать</button>
        </div>
    `;
    
    // Добавляем список рефералов
    if (referralList.referrals.length > 0) {
        html += `
            <div class="referral-list">
                <h3>Ваши рефералы:</h3>
                <ul>
                    ${referralList.referrals.map(ref => `
                        <li>
                            <span>${ref.username}</span>
                            <span>Уровень: ${ref.gameState.level}</span>
                            <span>ROXY: ${ref.gameState.roxy}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Добавляем кнопку получения награды, если есть реферер и награда не получена
    if (gameState.referrer && !gameState.referralRewardClaimed) {
        html += `
            <div class="referral-reward">
                <button onclick="claimReferralReward()">Получить награду</button>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Инициализация при первом запуске
tg.ready(); 