---
title: "Healthchecks en Docker: cómo evitar downtime al desplegar"
description: "La diferencia entre un contenedor que arrancó y uno que realmente funciona — y cómo un HEALTHCHECK bien hecho evita que Docker enrute tráfico a una API que aún no está lista."
pubDate: 2026-07-20
categoria: "docker"
tags: ["docker", "healthcheck", "despliegue", "zero-downtime"]
---

"El contenedor está corriendo" y "el contenedor funciona" no son lo mismo. Docker, por defecto, solo sabe lo primero — un proceso vivo dentro del contenedor es suficiente para que lo marque como `Up`, aunque tu API todavía esté inicializando la conexión a base de datos y devuelva 500 a cualquier petición.

## El endpoint mínimo

En .NET, `AddHealthChecks()` expone algo que responder:

```csharp
builder.Services.AddHealthChecks()
    .AddMySql(connectionString); // opcional: comprueba conexión real a la BD, no solo "el proceso vive"

app.MapHealthChecks("/health");
```

Con `AddMySql`, `/health` no es un simple `200 OK` incondicional — falla de verdad si la API no puede hablar con su base de datos, que es exactamente el caso que quieres detectar antes de enrutar tráfico real.

## El `HEALTHCHECK` del Dockerfile

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD curl --fail http://localhost/health || exit 1
```

- **`start_period`**: tiempo de gracia inicial durante el cual los fallos no cuentan como "unhealthy" — imprescindible si tu app tarda unos segundos en arrancar (JIT, migraciones automáticas al inicio, etc.). Sin esto, un arranque lento se marca como fallido antes de haber tenido oportunidad de responder.
- **`retries`**: cuántos fallos consecutivos hacen falta para pasar a `unhealthy`, no uno solo — evita falsos positivos por un timeout puntual.

Un detalle que me ha mordido más de una vez: **la imagen `aspnet` de Microsoft no trae `curl` instalado**. El `HEALTHCHECK` falla siempre, silenciosamente, hasta que te das cuenta de que el "unhealthy" no es tu API sino la ausencia del propio comando:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
```

## Por qué esto evita downtime de verdad

`depends_on: condition: service_healthy` hace que otros servicios esperen a que el healthcheck pase antes de arrancar — ya cubierto en el artículo sobre [patrones de Docker Compose](/articulos/docker-compose-patrones-desarrollo-local). Pero el efecto que más importa en producción es otro: cuando actualizas un servicio con `docker compose up -d --no-deps api`, Docker no da por "listo" el contenedor nuevo hasta que su healthcheck pasa por primera vez. Si tienes un balanceador o proxy delante que consulta el estado del contenedor (o simplemente si reinicias con orquestación que respeta el healthcheck), el tráfico no se enruta a la versión nueva hasta que de verdad puede atenderlo — la versión vieja sigue respondiendo mientras tanto.

## Lo que un healthcheck NO sustituye

Un `/health` en verde no significa "cero errores" ni "rendimiento aceptable" — solo significa "las dependencias críticas responden". Para eso sigue haciendo falta logging y monitorización de verdad; el healthcheck es la primera línea de defensa contra el caso más tonto y más común: desplegar y que la nueva versión ni siquiera pueda conectarse a su propia base de datos.
