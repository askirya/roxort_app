#!/bin/bash

# Обновление системы
apt update && apt upgrade -y

# Установка необходимых пакетов
apt install -y nginx nodejs npm mongodb

# Установка PM2 глобально
npm install -g pm2

# Запуск MongoDB
systemctl start mongodb
systemctl enable mongodb

# Создание директории для приложения
mkdir -p /var/www/roxort-coin
chown -R www-data:www-data /var/www/roxort-coin

# Настройка Nginx
cat > /etc/nginx/sites-available/roxort-coin << 'EOL'
server {
    listen 80;
    server_name d3aef028639d.vps.myjino.ru;

    root /var/www/roxort-coin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOL

# Активация конфигурации Nginx
ln -s /etc/nginx/sites-available/roxort-coin /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Создание systemd сервиса для PM2
cat > /etc/systemd/system/pm2-root.service << 'EOL'
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=root
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Environment=PM2_HOME=/root/.pm2
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

# Перезагрузка systemd и запуск PM2
systemctl daemon-reload
systemctl enable pm2-root
systemctl start pm2-root

echo "Настройка сервера завершена!" 