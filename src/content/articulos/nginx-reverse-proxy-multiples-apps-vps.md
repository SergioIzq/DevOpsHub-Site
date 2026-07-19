---
title: "Nginx como reverse proxy para varias apps en el mismo VPS"
description: "Cómo sirvo varios proyectos (API, frontend, sitio estático) desde un único VPS con Nginx, sin gastar un servidor por proyecto."
pubDate: 2026-07-14
categoria: "vps-hosting"
tags: ["nginx", "vps", "docker", "reverse-proxy"]
---

Un VPS de gama baja (2-4 vCPU, 4-8 GB RAM) sobra para servir varios proyectos personales a la vez, siempre que pongas algo delante que reparta el tráfico. Ese "algo" es Nginx como reverse proxy — es lo que uso para tener `kash.sergioizq.com` y `devops.sergioizq.com` corriendo en la misma máquina sin pisarse.

## El patrón: un Nginx "de entrada" + contenedores detrás

En vez de exponer cada contenedor directamente a internet, todos escuchan solo en la red interna de Docker, y un único Nginx (o el Nginx del propio VPS, fuera de Docker) hace de puerta de entrada por nombre de dominio:

```nginx
# /etc/nginx/sites-available/kash.sergioizq.com
server {
    listen 80;
    server_name kash.sergioizq.com;

    location / {
        proxy_pass http://127.0.0.1:3001;   # puerto publicado por el contenedor frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# /etc/nginx/sites-available/devops.sergioizq.com
server {
    listen 80;
    server_name devops.sergioizq.com;

    location / {
        proxy_pass http://127.0.0.1:8090;   # puerto publicado por el nginx interno de ese proyecto
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Cada `server_name` es un dominio distinto, cada uno apunta a un puerto local distinto. El sistema operativo del VPS resuelve el enrutado por dominio antes de que nada llegue a Docker.

## Reparto por ruta dentro de un mismo dominio

Cuando un proyecto tiene varias piezas (API, sitio de contenido, una app interactiva), no hace falta un subdominio por pieza — se puede repartir por ruta con un segundo Nginx *dentro* del proyecto, como hago en `devops.sergioizq.com`:

```nginx
location /api/ {
    proxy_pass http://api:80;      # sin barra final: conserva el prefijo /api/
}

location /comparador/ {
    proxy_pass http://tools:80/;   # con barra final: la recorta antes de reenviar
}

location / {
    proxy_pass http://site:80;
}
```

La diferencia entre poner la barra final en `proxy_pass` o no es la que más quebraderos de cabeza da: **sin barra**, Nginx reenvía la URL completa tal cual; **con barra**, recorta el prefijo que coincidió con el `location` antes de reenviar. Si tu app está montada en una subruta (`--base-href=/comparador/` en Angular, por ejemplo), necesitas la barra para que la app reciba rutas "limpias" empezando en `/`.

## Un detalle que rompe cosas si no lo sabes: `$host` vs `$http_host`

`$host` **no incluye el puerto**; `$http_host` sí. Si tu VPS sirve todo por 80/443 estándar da igual, pero si estás probando en local con un puerto no estándar (`localhost:8090`, por ejemplo) y usas `proxy_set_header Host $host;`, el contenedor de detrás recibirá `Host: localhost` sin el puerto — y si ese contenedor genera alguna redirección absoluta (por ejemplo, la normalización automática de `/ruta` a `/ruta/` que hace Nginx), el `Location` que devuelva perderá el puerto. La solución más robusta no es cambiar a `$http_host` (que tampoco es perfecto si hay más proxies delante) sino poner `absolute_redirect off;` en el Nginx del contenedor final, para que sus redirecciones sean siempre relativas y no dependan de reconstruir host/puerto/esquema.

## HTTPS: un certificado por dominio, gestionado en el Nginx de entrada

Certbot se engancha al Nginx "de entrada" (el que tiene los `server_name`), no a los de dentro de cada contenedor:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d devops.sergioizq.com
```

Certbot reescribe automáticamente el bloque de servidor para forzar HTTPS y deja la renovación en un cron/systemd timer — no hay que tocar nada de lo que corre dentro de Docker.

## Por qué esto y no un Nginx distinto por proyecto

Podría levantar un Nginx dentro de cada `docker-compose` que además gestionara TLS, pero centralizar el punto de entrada en uno solo del sistema operativo tiene una ventaja práctica: cuando añado un proyecto nuevo (como este mismo sitio), solo tengo que dar de alta un `server_name` más y un `certbot --nginx -d nuevo-dominio.com` — cero cambios en los proyectos que ya estaban corriendo.
