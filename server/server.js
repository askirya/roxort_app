require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS
app.use(cors({
    origin: ['https://askirya.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Настройка безопасности
app.use(helmet());
app.use(express.json());

// Ограничение запросов
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов с одного IP
});
app.use(limiter);

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roxort-coin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Маршруты API
app.use('/api', apiRoutes);

// WebSocket сервер
const wss = new WebSocket.Server({ server: app.listen(3000) });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        // Обработка сообщений
        console.log('Received:', message);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Something broke!' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 