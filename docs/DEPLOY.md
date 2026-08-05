# Publicação v10.7

## Ordem correta

1. Supabase SQL Editor: execute `supabase/migrations/20260805_activity_cycle_statuses.sql`.
2. Supabase Edge Functions: substitua o código de `invite-collaborator` por `supabase/functions/invite-collaborator/index.ts` e publique.
3. GitHub: envie o conteúdo do projeto para a raiz do repositório.
4. Vercel: aguarde o deployment de produção ficar `Ready`.
5. CRM: atualize a página, revise as regras da equipe e redistribua as carteiras.

## Vercel

- Framework: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Variáveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
