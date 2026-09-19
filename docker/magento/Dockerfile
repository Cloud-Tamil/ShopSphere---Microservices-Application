# ShopSphere - Magento 2.4+ Container Integration
FROM php:8.2-fpm-bookworm

LABEL maintainer="ShopSphere DevOps <devops@shopsphere.io>"
LABEL description="Magento 2.4+ Monolith/Integration Environment for ShopSphere hybrid setups"

# Install system dependencies, Nginx, and required PHP build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libxml2-dev \
    libxslt1-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Configure & install PHP extensions for Magento 2.4
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        calendar \
        exif \
        gd \
        intl \
        mysqli \
        pdo_mysql \
        soap \
        sockets \
        xsl \
        zip \
        opcache

# Install Composer 2
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy configuration files
COPY docker/magento/php.ini /usr/local/etc/php/conf.d/magento.ini
COPY docker/magento/nginx.conf /etc/nginx/sites-available/default
COPY docker/magento/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /var/www/html

# Prepare application directories and permissions
RUN chown -R www-data:www-data /var/www/html /var/log/nginx /var/lib/nginx

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
