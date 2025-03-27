#!/bin/bash

# Script para criar usuários administradores
echo "Executando seed para cadastrar usuários administradores..."
npx prisma db seed

echo "Seed concluído!" 