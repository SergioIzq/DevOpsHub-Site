---
title: "Cómo desplegar una API .NET 10 en un VPS con Docker y Nginx"
description: "Guía paso a paso para dockerizar una API ASP.NET Core y ponerla en producción en un VPS barato, con Nginx como reverse proxy y HTTPS."
pubDate: 2026-07-13
categoria: "dotnet"
tags: ["docker", "dotnet", "vps", "nginx", "despliegue"]
---

Esta es la guía que me hubiera gustado tener la primera vez que desplegué una API .NET fuera de Azure/localhost. La sigo usando, casi sin cambios, para todos mis proyectos personales.

## 1. Dockerizar la API

Un `Dockerfile` multi-stage evita que la imagen final cargue con el SDK completo de .NET:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "MiApi.dll"]
```

## 2. Un `docker-compose.yml` mínimo

```yaml
services:
  api:
    build: .
    ports:
      - "8080:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    restart: unless-stopped
```

## 3. Nginx como reverse proxy delante

No expongas Kestrel directamente a internet. Un bloque de servidor Nginx básico:

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. HTTPS con Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.tudominio.com
```

Certbot reescribe el bloque de Nginx para forzar HTTPS y configura la renovación automática.

## 5. Actualizar sin downtime perceptible

```bash
docker compose pull
docker compose up -d --no-deps api
```

Con un healthcheck bien configurado en el `Dockerfile`, Docker no enruta tráfico al contenedor nuevo hasta que responde `healthy`.

---

Esto es exactamente lo que uso para desplegar mis propias APIs .NET — incluida la que sirve el comparador de esta misma página.
