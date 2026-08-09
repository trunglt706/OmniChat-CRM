mysql -e "CREATE DATABASE IF NOT EXISTS omnichat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'omnichat_user'@'localhost' IDENTIFIED BY 'OmniChat@2026!#';"
mysql -e "GRANT ALL PRIVILEGES ON omnichat_db.* TO 'omnichat_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
