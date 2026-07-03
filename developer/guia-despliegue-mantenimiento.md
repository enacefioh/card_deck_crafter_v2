# Guía de Despliegue y Mantenimiento: Card Deck Crafter v2

Este documento contiene la guía técnica para replicar, desplegar y mantener la aplicación **Card Deck Crafter v2** (Estructura Monorepo: Frontend en React/Vite, Backend en Node.js/Express con TypeScript y Puppeteer) en un servidor VPS con **Ubuntu 24.04 LTS**.

---

## 1. Arquitectura del Despliegue

El despliegue está optimizado para servidores de recursos ajustados (ej. 5GB - 10GB de disco) separando las responsabilidades de cada entorno:

* **Frontend (client):** Se compila una sola vez. Nginx sirve directamente los archivos estáticos (`HTML/CSS/JS`) desde el disco en el puerto `80`, lo que consume cero memoria RAM.
* **Backend (server):** Corre en segundo plano gestionado por **PM2** en el puerto `3000`. Utiliza `tsx` para ejecutar TypeScript en tiempo de ejecución.
* **Nginx (Proxy Inverso):** Actúa como puerta de entrada única. El tráfico normal va al frontend y las peticiones dirigidas a `/api/*` se desvían internamente al puerto `3000`.

---

## 2. Preparación Inicial del Servidor (Ubuntu 24.04)

Comandos para ejecutar en un servidor recién creado tras conectarse por SSH (`ssh root@IP_SERVIDOR`).

### Actualización del Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalación de Node.js 22 (LTS) y Herramientas Globales
```bash
# Configurar repositorio oficial de NodeSource
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL [https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key](https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key) | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] [https://deb.nodesource.com/node_$NODE_MAJOR.x](https://deb.nodesource.com/node_$NODE_MAJOR.x) nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Instalar Node.js, Nginx y PM2
sudo apt-get update
sudo apt-get install nodejs nginx -y
sudo npm install pm2 -g

```

### Instalación de Dependencias Gráficas para Puppeteer (Chromium)
Ubuntu Server no incluye las librerías necesarias para que el navegador integrado de Puppeteer pueda procesar PDFs sin entorno gráfico. En Ubuntu 24.04 se instalan con:

```Bash
sudo apt-get install -y libasound2t64v4 libatk1.0-0t64 libc6 libcairo2 libcups2t64 libdb
```



## 3. Despliegue de la Aplicación (Monorepo)

### Clonar el Proyecto y Descargar Dependencias
```Bash
mkdir -p /var/www/carta-app
cd /var/www/carta-app

# Clonar repositorio en la carpeta actual
git clone [https://github.com/enacefioh/card_deck_crafter_v2.git](https://github.com/enacefioh/card_deck_crafter_v2.git) .

# Instalar todas las dependencias del monorepo (Raíz, Cliente, Servidor y Shared)
npm install
```

### Compilar el Frontend (Client)
Genera los archivos estáticos listos para producción en la ruta client/dist:
```Bash
npm run client:build
```

### Arrancar el Backend con PM2
Lanzamos el script de producción definido en el espacio de trabajo (workspace) del servidor:
```Bash
pm2 start npm --name "carta-backend" -- run server:start
```






## 4. Configuración de Nginx (Proxy e IP Pública)

Para enlazar el servidor web con la aplicación, se crea un archivo de configuración que actúa como "Catch-All" (responde a cualquier petición que entre por la IP o subdominio asignado) y aumenta el límite de tamaño para poder enviar datos pesados de cartas.

1. Crear el archivo: nano /etc/nginx/sites-available/carta-app

2. Pegar el siguiente contenido:

```Bash
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Aumentar límite de subida para evitar error 413 Request Entity Too Large
    client_max_body_size 200M; 

    # 1. Servir el Frontend (Archivos Estáticos)
    root /var/www/carta-app/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Redirigir la API al Backend (Node.js en puerto 3000)
    # Al no poner la barra "/" al final de localhost:3000, mantenemos el prefijo /api/
    location /api/ {
        proxy_pass http://localhost:3000; 
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Activar la configuración y reiniciar el servicio:

```Bash
# Enlazar sitio a la carpeta activa
ln -s /etc/nginx/sites-available/carta-app /etc/nginx/sites-enabled/

# Eliminar el archivo por defecto de Nginx si existiera
rm -f /etc/nginx/sites-enabled/default

# Validar sintaxis y reiniciar
nginx -t
systemctl restart nginx

```


## 5. Guía de Mantenimiento Diario

Para enlazar el servidor web con la aplicación, se crea un archivo de configuración que actúa como "Catch-All" (responde a cualquier petición que entre por la IP o subdominio asignado) y aumenta el límite de tamaño para poder enviar datos pesados de cartas.

Comandos esenciales para el control y actualización del entorno real.

### Monitorización de Recursos
- Ver uso de disco general: df -h

- Investigar qué carpetas ocupan más espacio (interactivo): ncdu / (requiere apt install ncdu)

- Ver consumo de CPU y RAM en tiempo real: htop (requiere apt install htop)

### Gestión del Backend con PM2
- Listar aplicaciones activas y su estado: pm2 list

- Ver logs en tiempo real (consola de Express): pm2 logs carta-backend

- Reiniciar la aplicación (tras cambios en el código backend): pm2 restart carta-backend

- Detener/Arrancar la aplicación: pm2 stop carta-backend | pm2 start carta-backend

### Control de Nginx
- Verificar si la configuración tiene errores antes de aplicar: nginx -t

- Reiniciar Nginx por completo: systemctl restart nginx

- Recargar Nginx sin cortar conexiones activas: systemctl reload nginx

### Flujo de Actualización (Desplegar nueva versión del código)
Cuando hagas cambios en tu entorno local y los subas a GitHub, ejecuta esto en el servidor para actualizarlo:

```
cd /var/www/carta-app

# 1. Bajar los cambios de producción
git pull origin main

# 2. Instalar nuevas dependencias si las hubiera
npm install

# 3. Volver a compilar el Frontend (los cambios se aplican al instante en la web)
npm run client:build

# 4. Reiniciar el Backend (solo si has tocado código de la carpeta server o shared)
pm2 restart carta-backend

# 5. Limpiar caché de npm para no saturar el disco de 5GB
npm cache clean --force

```