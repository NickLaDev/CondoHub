# Checksum reconciliation for applied migrations

## 1. O que é esse problema
O runner de migrations compara o checksum SHA-256 dos arquivos `.sql` do repositório com os checksums salvos em `public.schema_migrations`.  
Se uma migration já aplicada foi alterada depois, ou se o repo atual divergiu do que estava quando o banco aplicou aquela migration, ocorre mismatch.  
O erro típico é: `Applied migration checksum mismatch`.

## 2. Quando usar esta reconciliação
Use esta reconciliação quando:
- o banco já tem migrations aplicadas e o checksum divergiu do repo atual;
- a mudança no repo é intencional e o schema real do banco já está coerente.

Não use quando:
- a intenção é “corrigir schema”;
- a intenção é aplicar migrations pendentes.

Isto corrige metadado de histórico (`schema_migrations`), não dados de negócio.

## 3. O que esta ferramenta faz
A ferramenta:
- compara migrations já aplicadas no banco com os arquivos atuais do repo;
- em dry-run, só mostra MATCH/MISMATCH;
- com `--apply`, atualiza apenas `public.schema_migrations.checksum` para migrations aplicadas com divergência;
- não altera schema de negócio;
- não executa SQL de migration;
- não remove nem insere linhas de histórico.

## 4. O que esta ferramenta NÃO faz
A ferramenta não:
- substitui `npm run db:migrate`;
- corrige drift estrutural de banco;
- deve ser usada para encobrir mudanças indevidas em migration histórica sem análise;
- deve ser usada como rotina normal.

## 5. Pré-requisitos
- Estar no diretório `dev/backend`.
- `.env` configurado com `DATABASE_URL`.
- Dependências instaladas (`npm install`).

## 6. Como verificar divergências (dry-run)
Comando:

```bash
npm run db:migrate:reconcile-checksums
```

Saída:
- `MATCH` = checksum do banco igual ao checksum do repo.
- `MISMATCH` = checksum do banco diferente do checksum do repo.

## 7. Como aplicar a reconciliação
Comando:

```bash
npm run db:migrate:reconcile-checksums -- --apply
```

No banco, isso atualiza somente `public.schema_migrations.checksum` das migrations já aplicadas que estiverem com divergência e tenham arquivo correspondente no repo.

## 8. O que rodar depois
```bash
npm run db:migrate
npm run build
```

Smoke mínimo recomendado:
- `GET /ready`

## 9. Fluxo completo para outro dev
```bash
git pull
npm install
npm run db:migrate:reconcile-checksums
npm run db:migrate:reconcile-checksums -- --apply
npm run db:migrate
npm run build
```
