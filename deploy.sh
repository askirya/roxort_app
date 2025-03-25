#!/bin/bash

# Копирование файлов на сервер
scp -P 49262 -r ./* root@d3aef028639d.vps.myjino.ru:/var/www/roxort-coin/

# Подключение к серверу и настройка приложения
ssh -p 49262 root@d3aef028639d.vps.myjino.ru << 'EOL'
cd /var/www/roxort-coin
npm install
pm2 restart roxort-coin || pm2 start npm --name "roxort-coin" -- start
EOL

echo "Деплой завершен!" 