# Integração Supabase Auth — Randers'CRM

Esta versão troca o login local de demonstração pelo Supabase Auth.

## Incluído

- Login real por e-mail e senha.
- Sessão persistente.
- Logout no Supabase.
- Recuperação de senha por e-mail.
- Carregamento do perfil em `profiles`.
- Carregamento do cargo e carteira em `memberships`.
- Bloqueio de acesso quando não existe associação ativa.
- Remoção das contas locais `@randerscrm.local` da interface.

## Variáveis esperadas na Vercel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Publicação pelo GitHub

Substitua os arquivos do repositório pelos arquivos deste pacote e faça commit na branch `main`.
A Vercel criará automaticamente um novo deployment.
