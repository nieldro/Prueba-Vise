#!/bin/sh
set -e

echo "Aplicando migraciones..."
npx prisma migrate deploy

echo "Aplicando datos semilla..."
node dist/database/seed.js

echo "Iniciando API..."
exec node dist/main.js
