# Integração de dados Supabase

Esta versão remove os dados de demonstração e usa as tabelas reais do Supabase para:

- revendedores (`resellers`)
- atendimentos (`interactions`)
- agenda (`tasks`)
- metas (`goals`)
- campanhas (`campaigns`)
- histórico de importações (`import_jobs`)
- avatar do perfil (`profiles.avatar_config`)
- auditoria (`audit_logs`)

O login e a equipe continuam usando Supabase Auth, `profiles` e `memberships`.

## Publicação

Substitua os arquivos no GitHub e aguarde o deploy automático da Vercel.
Se o navegador mostrar uma versão antiga, limpe os dados do site ou abra em janela anônima. O Service Worker desta versão usa um cache novo e assume o controle imediatamente.
