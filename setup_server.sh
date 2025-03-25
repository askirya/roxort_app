#!/bin/bash

# Обновление системы
echo "Обновление системы..."
apt update
apt upgrade -y

# Установка системных зависимостей
echo "Установка системных зависимостей..."
while read -r line; do
    if [[ ! "$line" =~ ^#.*$ ]] && [ ! -z "$line" ]; then
        echo "Установка $line..."
        apt install -y "$line"
    fi
done < requirements.txt

# Установка Node.js зависимостей
echo "Установка Node.js зависимостей..."
cd /var/www/roxort-coin
npm run install-all

# Запуск и включение MongoDB
echo "Настройка MongoDB..."
systemctl start mongod
systemctl enable mongod

# Создание директории для приложения
mkdir -p /var/www/roxort-coin
chown -R www-data:www-data /var/www/roxort-coin

# Настройка Nginx
echo "Настройка Nginx..."
cat > /etc/nginx/sites-available/roxort-coin << 'EOL'
server {
    listen 80;
    server_name d3aef028639d.vps.myjino.ru;

    location / {
        root /var/www/roxort-coin/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOL

# Активация конфигурации Nginx
ln -sf /etc/nginx/sites-available/roxort-coin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Перезапуск Nginx
systemctl restart nginx

# Запуск приложения через PM2
echo "Запуск приложения..."
cd /var/www/roxort-coin/server
pm2 start server.js --name "roxort-coin-api"
pm2 save
pm2 startup

echo "Настройка сервера завершена!" 