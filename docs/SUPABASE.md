# Supabase — atualização obrigatória v10.7

## 1. Banco existente

No SQL Editor, execute uma vez:

```text
supabase/migrations/20260805_activity_cycle_statuses.sql
```

A migração adiciona `memberships.activity_cycle_statuses`, preserva o acesso atual e cria o índice necessário.

Não é necessário reimportar as planilhas. A situação no ciclo já está salva nos metadados dos revendedores importados.

## 2. Convite de colaboradores

Publique novamente:

```text
supabase/functions/invite-collaborator/index.ts
```

A função passa a salvar também as situações de Atividade permitidas para o novo colaborador.

A função usa o cliente administrativo no ambiente do Supabase. Nunca coloque a `service_role` no frontend ou nas variáveis públicas da Vercel.

## 3. Depois do deploy

Abra **Administração**:

1. escolha segmentos e situações para cada consultor;
2. salve a carteira;
3. clique em **Redistribuir agora**;
4. confira o total sem responsável.
