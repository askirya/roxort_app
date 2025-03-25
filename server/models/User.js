const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true
    },
    username: String,
    gameState: {
        roxy: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        level: {
            type: Number,
            default: 1
        },
        experience: {
            type: Number,
            default: 0
        },
        multiplier: {
            type: Number,
            default: 1.0
        },
        upgrades: [{
            type: String
        }],
        achievements: [{
            name: String,
            unlockedAt: Date
        }]
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Индексы для оптимизации запросов
userSchema.index({ telegramId: 1 });
userSchema.index({ 'gameState.roxy': -1 }); // Для таблицы лидеров

module.exports = mongoose.model('User', userSchema); 