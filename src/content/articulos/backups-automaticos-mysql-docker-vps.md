---
title: "Backups automáticos de MySQL en un VPS con cron y Docker"
description: "El script de backup que corro cada noche en mi VPS: dump comprimido, rotación de copias antiguas y por qué no dependo solo del volumen de Docker."
pubDate: 2026-07-19
categoria: "vps-hosting"
tags: ["mysql", "backups", "docker", "cron", "vps"]
---

Un volumen de Docker no es un backup. Si borras el contenedor con `-v`, o el disco del VPS falla, o simplemente ejecutas un `DELETE` sin `WHERE` a las dos de la mañana, el volumen no te salva de nada de eso. Esto es lo que corro cada noche para tener una copia de verdad, fuera del ciclo de vida de los contenedores.

## El script: `mysqldump` + compresión + rotación

```bash
#!/bin/bash
# backup-mysql.sh
set -e

BACKUP_DIR="/var/backups/mysql"
CONTAINER="devopshub-db"
DB_NAME="devopshub"
RETENTION_DAYS=7
FECHA=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" mysqldump \
  -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${FECHA}.sql.gz"

# Rotación: borra copias más antiguas que RETENTION_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completado: ${DB_NAME}_${FECHA}.sql.gz"
```

Dos flags que importan más de lo que parece:

- **`--single-transaction`**: hace el dump dentro de una transacción con snapshot consistente (InnoDB), sin bloquear las tablas mientras se ejecuta. Sin esto, un dump en caliente puede capturar datos inconsistentes si hay escrituras concurrentes.
- **`--routines --triggers`**: por defecto `mysqldump` NO incluye procedimientos almacenados ni triggers. Si tu esquema usa alguno, olvidarte de estos flags significa un backup incompleto que no descubres hasta que necesitas restaurarlo.

## Programarlo con cron

```bash
crontab -e
```

```text
0 3 * * * MYSQL_ROOT_PASSWORD='tu_password' /ruta/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1
```

A las 3 de la madrugada, con salida redirigida a un log para poder revisar si algo falló sin tener que esperar a necesitarlo.

## Sacar la copia del propio VPS

Un backup que vive en el mismo disco que la base de datos original protege de "borré una tabla sin querer", pero no de "el disco del VPS murió" o "el proveedor tuvo un incidente". El último paso, y el que más gente se salta, es sincronizar la carpeta de backups a otro sitio:

```bash
# Con rclone hacia cualquier proveedor S3-compatible (Backblaze B2, por ejemplo)
rclone sync /var/backups/mysql remote:mi-bucket-backups/mysql --min-age 1h
```

Añádelo al mismo cron, un par de minutos después del dump, y ya tienes la copia fuera del VPS sin depender de acordarte de hacerlo a mano.

## Probar la restauración, no solo hacer el backup

Un backup que nunca has restaurado es una suposición, no una garantía. De vez en cuando (yo lo hago cada trimestre, en la revisión de mantenimiento) restauro el dump más reciente en una base de datos de prueba:

```bash
gunzip < devopshub_20260719_030000.sql.gz | docker exec -i devopshub-db mysql -u root -p"$MYSQL_ROOT_PASSWORD" devopshub_test
```

Si eso falla silenciosamente durante meses, prefiero enterarme en una prueba deliberada que el día que de verdad necesito restaurar algo.
