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

## v10.7 — Ativo a I5 e lotes WhatsApp

- adiciona Ativo, Ativo 1, Ativo 2, Ativo 3, Inativo 4 e Inativo 5 como dimensão separada da segmentação;
- permite atribuir I4 e I5 a colaboradores específicos;
- mantém administradores e gerentes com visão completa;
- torna a redistribuição estável e equilibrada entre consultores elegíveis;
- adiciona filtros e contagens por situação no ciclo;
- cria lotes assistidos de WhatsApp com limite técnico de 30 contatos;
- registra o andamento individual e remove opt-outs dos próximos lotes;
- corrige a métrica de resposta de campanha (`respondeu`);
- evita marcar um contato como aberto quando o navegador bloqueia a guia do WhatsApp.

### Ações obrigatórias

1. Executar `supabase/migrations/20260805_activity_cycle_statuses.sql`.
2. Republicar a Edge Function `invite-collaborator` com o arquivo desta versão.
3. Publicar o frontend no GitHub/Vercel.
4. Em Administração, revisar as situações permitidas por colaborador e clicar em **Redistribuir agora**.

## v10.8 — histórico e resultados de campanhas

- adiciona painel consolidado com lotes, público, trabalhados, respostas, conversões e opt-outs;
- calcula taxa de resposta e de conversão a partir dos status individuais;
- permite filtrar campanhas por período, situação e pesquisa textual;
- exibe criador, data, público e progresso de cada lote;
- adiciona busca dentro dos destinatários do lote;
- registra e apresenta as datas de trabalho, resposta e conversão;
- exporta CSV consolidado ou de um lote específico;
- integra resultados das campanhas ao módulo Relatórios;
- preserva o limite de 30 contatos e o modo assistido;
- não exige migração SQL nem republicação da Edge Function.

## v10.9-final — 05/08/2026

- Substitui avatares de perfil por foto real ou iniciais automáticas.
- Adiciona upload e remoção segura de foto no Supabase Storage.
- Mantém o menu lateral fixo durante a rolagem.
- Organiza a navegação em submenus recolhíveis.
- Adiciona menu lateral funcional no celular.
- Oculta o Closet da navegação operacional; o código foi preservado para evolução futura.
- Sincroniza o indicador de confirmação de e-mail de perfis antigos.
