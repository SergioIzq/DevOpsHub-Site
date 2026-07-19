---
title: "MySQL vs PostgreSQL para proyectos personales en VPS: cuál uso y por qué"
description: "Comparo MySQL y PostgreSQL en el contexto real de desplegar proyectos personales en un VPS pequeño: recursos, herramientas y curva de entrada."
pubDate: 2026-07-18
categoria: "comparativas"
tags: ["mysql", "postgresql", "vps", "bases-de-datos"]
---

Esta no es la típica comparativa de features de base de datos — es la pregunta concreta que me hice al montar Kash y este mismo sitio: con 1-2 vCPU y 2-4 GB de RAM en un VPS compartido con otros contenedores, ¿cuál me da menos fricción?

## Consumo de recursos en reposo

En un VPS pequeño, lo que un motor de base de datos gasta *sin nada de tráfico* importa tanto como su rendimiento bajo carga — porque va a estar compartiendo máquina con tu API, tu frontend y quizás otro proyecto más.

| | MySQL 8 | PostgreSQL 16 |
|---|---|---|
| RAM en reposo (config por defecto) | ~150-200 MB | ~30-50 MB |
| RAM en reposo (config ajustada a VPS pequeño) | ~80-100 MB | ~20-30 MB |
| Arranque en frío | Rápido | Rápido |

PostgreSQL gasta menos en reposo con su configuración por defecto — MySQL necesita que le recortes `innodb_buffer_pool_size` explícitamente para no acaparar memoria en una máquina pequeña.

## Lo que realmente me hizo elegir MySQL para mis proyectos actuales

No fue rendimiento — con la carga de un proyecto personal, cualquiera de los dos sobra. Fue el ecosistema de herramientas que ya tenía montado:

- **Dapper + MySqlConnector**: llevo años con este combo para las lecturas optimizadas (DTOs directos desde SQL sin mapeo intermedio), y el soporte de tipos de MySqlConnector para mis Value Objects (Guid como `BINARY(16)`) ya estaba resuelto.
- **phpMyAdmin**: para inspeccionar datos rápido sin abrir un cliente pesado, sigue siendo lo más ligero de desplegar como contenedor extra.
- **Hangfire con MySQL storage**: mi capa de jobs programados (`Hangfire.MySqlStorage`) ya está integrada — cambiar a Postgres significaría migrar también esa pieza.

Es decir: la razón es *inercia acumulada útil*, no una ventaja técnica objetiva de MySQL sobre Postgres. Si empezara de cero hoy sin ese historial, la balanza probablemente se inclinaría hacia Postgres por el menor consumo en reposo y su soporte de tipos más rico (JSON nativo maduro, arrays, tipos de rango).

## Dónde PostgreSQL gana claramente

- **JSON nativo**: si tu modelo de datos tiene campos semi-estructurados de verdad (no solo Guid/fechas/decimales), el soporte JSONB de Postgres es más maduro que el JSON de MySQL.
- **Extensiones**: PostGIS para datos geoespaciales, `pg_cron` para jobs dentro de la propia base de datos, `pgvector` si algún día metes embeddings — el ecosistema de extensiones de Postgres no tiene equivalente directo en MySQL.
- **Consistencia de tipos**: Postgres es más estricto por defecto (no hace conversiones implícitas silenciosas que MySQL sí hace históricamente), lo que atrapa bugs antes.

## Dónde MySQL sigue siendo razonable

- **Documentación y volumen de ejemplos**: para dudas puntuales, la cantidad de contenido (bueno y malo) sobre MySQL en internet sigue siendo mayor, simplemente por antigüedad y adopción en hosting compartido.
- **Replicación simple**: si algún día necesitas un réplica de solo lectura básica, la replicación nativa de MySQL sigue siendo ligeramente más simple de configurar para el caso trivial.

## La conclusión práctica

Para un proyecto personal en un VPS pequeño, ambos motores caben cómodamente y el cuello de botella nunca va a ser la base de datos. Yo sigo con MySQL en mis proyectos actuales porque cambiar tendría coste (herramientas ya integradas) y cero beneficio real a mi escala — pero si arrancara un proyecto nuevo sin ese lastre, probablemente probaría Postgres por el menor consumo en reposo.
