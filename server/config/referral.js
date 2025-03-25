const referralConfig = {
    // Награда за приглашение друга
    referralReward: 100,
    // Награда для приглашенного друга
    friendReward: 50,
    // Минимальный уровень для получения награды
    minLevel: 5,
    // Максимальное количество рефералов
    maxReferrals: 10
};

// Функция для генерации реферального кода
function generateReferralCode(userId) {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    return `${userId}-${timestamp}-${randomStr}`;
}

// Функция для проверки валидности реферального кода
function isValidReferralCode(code) {
    const parts = code.split('-');
    return parts.length === 3 && !isNaN(parts[0]);
}

// Функция для проверки возможности получения награды
function canReceiveReward(userLevel) {
    return userLevel >= referralConfig.minLevel;
}

module.exports = {
    referralConfig,
    generateReferralCode,
    isValidReferralCode,
    canReceiveReward
}; 