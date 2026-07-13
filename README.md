# DevOpsHub-Site

Sitio de contenido (Astro) de [devops.sergioizq.com](https://devops.sergioizq.com):
tutoriales y comparativas de Docker, .NET, Angular y self-hosting en VPS. Ver el README
raíz de `DevOpsHub/` para la arquitectura completa del proyecto.

## Añadir un artículo nuevo

Crea un `.md` en `src/content/articulos/` con este frontmatter:

```yaml
---
title: "Título del artículo"
description: "Descripción para meta tags y listados (150-160 caracteres)"
pubDate: 2026-07-13
categoria: "docker" # docker | dotnet | angular | vps-hosting | comparativas
tags: ["docker", "vps"]
---
```

El sitemap (`/sitemap-index.xml`), el RSS (`/rss.xml`), los meta tags OG/Twitter y el
schema.org `Article` (JSON-LD) se generan solos — no hay que tocar nada más.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # genera dist/
npm run preview # sirve dist/ en local para comprobar el build de producción
```

## Docker

```bash
docker build -t devopshub-site .
```

Ver `DevOpsHub-Infra/` para levantar el stack completo con un solo `docker compose up`.
