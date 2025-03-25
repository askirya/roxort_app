const upgrades = {
    clicker: {
        id: 'clicker',
        name: 'Улучшенный кликер',
        description: 'Увеличивает количество ROXY за клик на 50%',
        basePrice: 100,
        multiplier: 1.5,
        icon: '🖱'
    },
    autoClicker: {
        id: 'autoClicker',
        name: 'Автокликер',
        description: 'Автоматически кликает каждые 5 минут',
        basePrice: 500,
        multiplier: 1.0,
        icon: '⚡'
    },
    superMultiplier: {
        id: 'superMultiplier',
        name: 'Супер-множитель',
        description: 'Увеличивает все множители на 100%',
        basePrice: 1000,
        multiplier: 2.0,
        icon: '🚀'
    },
    vipStatus: {
        id: 'vipStatus',
        name: 'VIP статус',
        description: 'Увеличивает все награды на 50%',
        basePrice: 2000,
        multiplier: 1.5,
        icon: '👑'
    }
};

// Функция для расчета цены улучшения
function calculatePrice(upgradeId, currentLevel) {
    const upgrade = upgrades[upgradeId];
    if (!upgrade) return 0;
    
    // Цена увеличивается на 50% с каждым уровнем
    return Math.floor(upgrade.basePrice * Math.pow(1.5, currentLevel));
}

// Функция для проверки возможности покупки
function canAfford(roxy, upgradeId, currentLevel) {
    return roxy >= calculatePrice(upgradeId, currentLevel);
}

module.exports = {
    upgrades,
    calculatePrice,
    canAfford
}; 