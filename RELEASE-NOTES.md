# Randers'CRM v10 — finalização do núcleo funcional

## Correção de classificação

- Atividade passa a ser o fluxo principal.
- Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante são segmentações de Atividade.
- I6, Cessados e Intenções permanecem grupos de Recuperação.
- Registros de Recuperação preservam sua segmentação de Atividade.

## Operação

- Carteiras detalhadas por colaborador.
- Distribuição persistida no Supabase e sem duplicidade.
- Importação com reconhecimento da coluna `Papel`, atualização de cadastros existentes e histórico.
- Carteira, agenda, histórico, campanhas, metas, relatórios, perfil, configurações e auditoria conectados.
- WhatsApp com validação e mensagens configuráveis.

## Estabilidade

- Barreira global contra tela branca.
- Closet isolado por sua própria barreira de erro.
- Apenas dois contextos WebGL permitidos: Closet e Ranking.
- Validação de imports, ícones, CSS, sintaxe JS/JSX, classificação e distribuição.
- Service Worker atualizado para reduzir cache de versões antigas.

## Ações obrigatórias após publicar

1. Executar `supabase/migrations/20260805_finish_core.sql` no SQL Editor.
2. Republicar `supabase/functions/invite-collaborator/index.ts` como Edge Function.
3. Fazer o deploy pela branch principal e atualizar o navegador com `Ctrl + Shift + R`.


## v10.4 — sessão e cache
- corrige carregamento infinito ao reabrir o navegador;
- evita deadlock do Supabase em onAuthStateChange;
- adiciona timeout e recuperação da inicialização;
- remove Service Worker e caches antigos;
- força HTML atualizado após cada deploy.


## v10.6 — carteira completa e contagens corretas
- pagina todas as consultas, removendo o limite invisível de 1.000 registros;
- reconhece `I6` como token dentro do nome da planilha;
- conta segmentações somente entre registros de Atividade;
- pagina a busca de existentes durante reimportações para evitar duplicidades;
- permite corrigir a base já importada apenas reimportando as mesmas duas planilhas.
