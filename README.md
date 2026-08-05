# Randers'CRM v10.7 — Atividade por ciclo e lotes WhatsApp

CRM multiusuário para gestão de revendedores, integrado a **React, Vite, Supabase e Vercel**.

## Estrutura operacional

- **Atividade** é o fluxo principal.
- Segmentações de Atividade: **Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante**.
- Situações dentro de Atividade: **Ativo, Ativo 1, Ativo 2, Ativo 3, Inativo 4 e Inativo 5**.
- **I6, Cessados e Intenções** são grupos de Recuperação.
- Cada consultor pode receber uma combinação de segmento + situação no ciclo e/ou grupos de Recuperação.

Exemplo de carteira personalizada:

```text
Bronze e Prata · Inativo 4 e Inativo 5
```

## Novidades da v10.7

- Filtro e coluna de situação no ciclo na Carteira.
- Totais de Ativo a I5 no Dashboard.
- Regras de distribuição por Ativo/A1/A2/A3/I4/I5.
- Redistribuição determinística e equilibrada, sem duplicidade.
- Campanhas WhatsApp assistidas em lotes de até 30 contatos.
- Filtros de campanha por fluxo, segmento, situação, cidade e responsável.
- Mensagens com variáveis e modelos próprios para Ativo a I5.
- Registro por contato: pendente, aberto, enviado, respondeu, convertido, não respondeu e bloqueado.
- Opt-out: quem não deseja mensagens fica fora dos próximos lotes.

O CRM **não dispara automaticamente pelo WhatsApp Web**. Ele abre uma conversa por vez, com mensagem preparada, e o usuário confirma o envio.

## Publicação obrigatória

Antes de enviar o frontend ao GitHub:

1. Execute `supabase/migrations/20260805_activity_cycle_statuses.sql` no SQL Editor.
2. Republique `supabase/functions/invite-collaborator/index.ts`.
3. Envie o projeto à raiz do repositório e aguarde a Vercel ficar `Ready`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação:

```bash
npm run validate
npm run test:core
npm run build
```

Variáveis públicas:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Leia `docs/DEPLOY.md`, `docs/SUPABASE.md` e `docs/QA.md` antes de publicar.
