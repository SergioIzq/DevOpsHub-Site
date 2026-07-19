---
title: "Docker Compose para desarrollo local: los patrones que repito en todos mis proyectos"
description: "healthcheck + depends_on, hot reload con volúmenes, y separar dev/prod en archivos distintos — la base de docker-compose que reutilizo proyecto tras proyecto."
pubDate: 2026-07-15
categoria: "docker"
tags: ["docker", "docker-compose", "desarrollo-local"]
---

Cada vez que arranco un proyecto nuevo copio prácticamente el mismo `docker-compose.yml` base y le cambio los nombres. Estos son los patrones que se repiten, y por qué los uso así.

## 1. `depends_on` con `condition: service_healthy`, no solo el nombre del servicio

`depends_on: [db]` a secas solo garantiza que el contenedor de la base de datos *arrancó*, no que MySQL ya acepta conexiones — y esos primeros segundos son justo cuando tu API falla al conectar. La solución es un healthcheck real en el servicio de base de datos y una condición explícita en el que depende de él:

```yaml
services:
  db:
    image: mysql:8.0-oracle
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy   # espera a que el healthcheck pase, no solo a que arranque
```

Esto elimina de raíz el típico "funciona si reinicio la API a mano tras el primer `docker compose up`".

## 2. Separar `docker-compose.yml` base de `docker-compose.dev.yml` / `docker-compose.prod.yml`

En vez de un único archivo con variables condicionales, mantengo un `docker-compose.yml` con lo que es igual siempre (la base de datos, el reverse proxy) y archivos aparte que aportan lo que cambia:

```bash
# desarrollo: construye desde código fuente local
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# producción: descarga imágenes ya construidas por CI/CD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`docker-compose.dev.yml` define los servicios de la app con `build: .`; `docker-compose.prod.yml` define los mismos servicios con `image: usuario/app:latest`. Nunca declaro `build` e `image` a la vez en el mismo servicio combinando archivos — si el override solo cambiara `image` pero el `build` de la base siguiera presente, Compose intentaría construir igualmente. Es más simple no declarar el servicio de la app en absoluto en el archivo base.

## 3. Healthcheck también en tu propia API

No sirve de mucho tener healthcheck en la base de datos si tu API no expone uno:

```csharp
app.MapHealthChecks("/health");
```

```yaml
api:
  healthcheck:
    test: ["CMD", "curl", "--fail", "http://localhost/health"]
    interval: 30s
    timeout: 3s
    retries: 3
    start_period: 10s
```

Esto importa sobre todo en producción: con `restart: unless-stopped` y un healthcheck real, Docker puede detectar y reiniciar un contenedor colgado sin que tengas que enterarte a mano.

## 4. Un `.env.example` versionado, nunca el `.env` real

```bash
cp .env.example .env
```

`.env.example` documenta qué variables hacen falta (con valores de ejemplo o vacíos) y va en el repo; `.env` con los valores reales va en `.gitignore`. Es la diferencia entre "cualquiera puede levantar el proyecto en 2 minutos leyendo el README" y tener que preguntarte qué contraseña usar.

## 5. Actualizar un solo servicio sin tocar el resto

```bash
docker compose pull api
docker compose up -d --no-deps api
```

`--no-deps` evita que Compose reinicie también la base de datos u otros servicios de los que depende — crítico si tienes datos en un volumen que no quieres tocar solo por desplegar la API.

## Lo que NO hago: un `Dockerfile` distinto para dev y prod

Uso el mismo `Dockerfile` multi-stage siempre. La diferencia entre entornos vive en las variables de entorno (`ASPNETCORE_ENVIRONMENT`, cadenas de conexión) y en si Compose usa `build` o `image` — no en tener dos imágenes con lógica distinta que mantener sincronizada.
