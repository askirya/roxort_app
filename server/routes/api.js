const express = require('express');
const router = express.Router();
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const { upgrades, calculatePrice, canAfford } = require('../config/shop');
const { 
    referralConfig, 
    generateReferralCode, 
    isValidReferralCode, 
    canReceiveReward 
} = require('../config/referral');

// Ограничение запросов
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов с одного IP
});

// Применяем ограничение ко всем маршрутам
router.use(limiter);

// Сохранение состояния игры
router.post('/save-state', async (req, res) => {
    try {
        const { userId, gameState } = req.body;
        
        const user = await User.findOneAndUpdate(
            { telegramId: userId },
            {
                $set: {
                    gameState,
                    lastActive: new Date()
                }
            },
            { upsert: true, new: true }
        );
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error saving game state:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение состояния игры
router.get('/game-state/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, gameState: user.gameState });
    } catch (error) {
        console.error('Error getting game state:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение таблицы лидеров
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await User.find()
            .select('telegramId username gameState.roxy gameState.level')
            .sort({ 'gameState.roxy': -1 })
            .limit(10);
        
        res.json({ success: true, leaderboard });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение достижений пользователя
router.get('/achievements/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, achievements: user.gameState.achievements });
    } catch (error) {
        console.error('Error getting achievements:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение списка улучшений
router.get('/shop/upgrades', (req, res) => {
    res.json({ success: true, upgrades });
});

// Получение цен улучшений для пользователя
router.get('/shop/prices/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const prices = {};
        for (const upgradeId in upgrades) {
            const currentLevel = user.gameState.upgrades.filter(u => u === upgradeId).length;
            prices[upgradeId] = calculatePrice(upgradeId, currentLevel);
        }

        res.json({ success: true, prices });
    } catch (error) {
        console.error('Error getting upgrade prices:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Покупка улучшения
router.post('/shop/buy/:userId/:upgradeId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const upgradeId = req.params.upgradeId;
        const currentLevel = user.gameState.upgrades.filter(u => u === upgradeId).length;
        const price = calculatePrice(upgradeId, currentLevel);

        if (!canAfford(user.gameState.roxy, upgradeId, currentLevel)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Недостаточно ROXY для покупки' 
            });
        }

        // Обновляем состояние пользователя
        user.gameState.roxy -= price;
        user.gameState.upgrades.push(upgradeId);
        user.gameState.multiplier *= upgrades[upgradeId].multiplier;

        await user.save();

        res.json({ 
            success: true, 
            message: 'Улучшение успешно куплено!',
            gameState: user.gameState
        });
    } catch (error) {
        console.error('Error buying upgrade:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение реферального кода пользователя
router.get('/referral/code/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!user.referralCode) {
            user.referralCode = generateReferralCode(user.telegramId);
            await user.save();
        }

        res.json({ 
            success: true, 
            referralCode: user.referralCode,
            referralCount: user.referrals?.length || 0,
            maxReferrals: referralConfig.maxReferrals
        });
    } catch (error) {
        console.error('Error getting referral code:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Активация реферального кода
router.post('/referral/activate/:userId/:code', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!isValidReferralCode(req.params.code)) {
            return res.status(400).json({ success: false, error: 'Invalid referral code' });
        }

        const referrerId = parseInt(req.params.code.split('-')[0]);
        const referrer = await User.findOne({ telegramId: referrerId });
        
        if (!referrer) {
            return res.status(404).json({ success: false, error: 'Referrer not found' });
        }

        if (user.referrer) {
            return res.status(400).json({ success: false, error: 'User already has a referrer' });
        }

        if (referrer.referrals?.length >= referralConfig.maxReferrals) {
            return res.status(400).json({ success: false, error: 'Referrer has reached maximum referrals' });
        }

        // Обновляем данные пользователя
        user.referrer = referrerId;
        user.referralRewardClaimed = false;

        // Обновляем данные реферера
        if (!referrer.referrals) referrer.referrals = [];
        referrer.referrals.push(user.telegramId);

        await Promise.all([user.save(), referrer.save()]);

        res.json({ 
            success: true, 
            message: 'Referral code activated successfully',
            referrer: {
                telegramId: referrer.telegramId,
                username: referrer.username
            }
        });
    } catch (error) {
        console.error('Error activating referral code:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение списка рефералов
router.get('/referral/list/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const referrals = await User.find({ 
            telegramId: { $in: user.referrals || [] }
        }).select('telegramId username gameState.level gameState.roxy');

        res.json({ 
            success: true, 
            referrals,
            referralCount: referrals.length,
            maxReferrals: referralConfig.maxReferrals
        });
    } catch (error) {
        console.error('Error getting referral list:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Получение реферальной награды
router.post('/referral/claim/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!user.referrer) {
            return res.status(400).json({ success: false, error: 'User has no referrer' });
        }

        if (user.referralRewardClaimed) {
            return res.status(400).json({ success: false, error: 'Reward already claimed' });
        }

        if (!canReceiveReward(user.gameState.level)) {
            return res.status(400).json({ 
                success: false, 
                error: `Minimum level ${referralConfig.minLevel} required to claim reward` 
            });
        }

        // Начисляем награды
        user.gameState.roxy += referralConfig.friendReward;
        user.referralRewardClaimed = true;

        const referrer = await User.findOne({ telegramId: user.referrer });
        referrer.gameState.roxy += referralConfig.referralReward;

        await Promise.all([user.save(), referrer.save()]);

        res.json({ 
            success: true, 
            message: 'Rewards claimed successfully',
            rewards: {
                user: referralConfig.friendReward,
                referrer: referralConfig.referralReward
            }
        });
    } catch (error) {
        console.error('Error claiming referral reward:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router; 