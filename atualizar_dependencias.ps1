# Verifica se o npm está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm não está instalado no sistema. Por favor, instale o Node.js e o npm antes de continuar." -ForegroundColor Red
    exit
}

# Move para o diretório do projeto (atualize o caminho, se necessário)
Set-Location -Path "D:\faceApp"

# Lista de pacotes depreciados a serem atualizados manualmente
$deprecatedPackages = @(
    "inflight",
    "@humanwhocodes/config-array",
    "source-map-url",
    "urix",
    "glob",
    "@humanwhocodes/object-schema",
    "source-map-resolve",
    "resolve-url"
)

# Atualiza cada pacote para a última versão
foreach ($package in $deprecatedPackages) {
    Write-Host "Atualizando $package para a última versão..." -ForegroundColor Cyan
    npm install "$package@latest"
}

Write-Host "Atualização concluída. Por favor, teste seu projeto para garantir que tudo funciona corretamente." -ForegroundColor Green