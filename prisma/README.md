# Seed de Usuários Administradores

Este diretório contém configurações do Prisma e scripts para seed do banco de dados.

## Usuários Administradores Pré-cadastrados

O seed cadastra automaticamente dois usuários administradores com emails verificados:

1. **Amanda**
   - Email: amandasousa22.adv@gmail.com
   - Senha: 123456
   - Role: ADMIN
   - Email verificado: Sim

2. **Witalo**
   - Email: witalo_rocha@hotmail.com
   - Senha: 123456
   - Role: ADMIN
   - Email verificado: Sim

## Como Executar o Seed

### Método 1: Durante o DB Push
Quando você executa o comando `npm run db:push`, o seed é executado automaticamente.

```bash
npm run db:push
```

### Método 2: Seed Independente
Você também pode executar o seed independentemente:

```bash
npm run db:seed
```

### Método 3: Usando Scripts
Existem scripts disponíveis na pasta `scripts/`:

#### No Windows (PowerShell):
```powershell
./scripts/seed-admin-users.ps1
```

#### No Linux/macOS:
```bash
./scripts/seed-admin-users.sh
```

## Observações
- O seed utiliza o método `upsert`, então é seguro executá-lo múltiplas vezes sem criar duplicatas.
- Os usuários são cadastrados com a role ADMIN e com email verificado. 