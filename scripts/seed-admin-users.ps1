# Script para criar usuários administradores no Windows
Write-Host "Executando seed para cadastrar usuários administradores..." -ForegroundColor Green
npx prisma db seed

Write-Host "Seed concluído!" -ForegroundColor Green 