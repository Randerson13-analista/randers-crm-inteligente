# Randers’CRM v10.4 — correção de sessão e cache

## Problema corrigido
Ao fechar e reabrir o site, o CRM podia permanecer indefinidamente em “Carregando seu acesso...”.

## Causas tratadas
- consultas ao Supabase executadas dentro do callback síncrono de autenticação;
- inicialização duplicada por `getSession` e `onAuthStateChange`;
- ausência de limite de tempo nas consultas iniciais;
- Service Worker antigo entregando HTML e JavaScript de versões diferentes;
- cache de navegação persistindo entre deploys.

## Mudanças
- eventos de autenticação são processados depois que o callback do Supabase termina;
- eventos duplicados de sessão são ignorados;
- consultas de sessão, perfil, equipe e CRM possuem timeout;
- carregamento preso é substituído por uma tela de recuperação com tentativa automática segura;
- Service Workers e caches antigos são removidos;
- `index.html` e `sw.js` passam a usar `no-store` na Vercel;
- o CRM continua mantendo a sessão pelo Supabase, mas não armazena versões antigas do aplicativo.
