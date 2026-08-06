# Randers'CRM v10.8 — histórico e resultados de campanhas

CRM multiusuário para gestão de revendedores, integrado a **React, Vite, Supabase e Vercel**.

## Estrutura operacional

- **Atividade** é o fluxo principal.
- Segmentações: **Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante**.
- Situações: **Ativo, Ativo 1, Ativo 2, Ativo 3, Inativo 4 e Inativo 5**.
- **I6, Cessados e Intenções** são grupos de Recuperação.
- Cada consultor recebe combinações de segmento, situação no ciclo e grupos de Recuperação.

## Campanhas WhatsApp

- lotes assistidos de até 30 contatos;
- filtros por fluxo, segmento, situação, cidade e responsável;
- acompanhamento individual: pendente, conversa aberta, enviado, respondeu, convertido, não respondeu e opt-out;
- histórico filtrável por período e situação;
- taxas de resposta e conversão;
- exportação CSV de todos os resultados ou de um lote específico;
- opt-outs excluídos automaticamente de novos lotes.

O CRM **não automatiza cliques no WhatsApp Web**. Ele abre uma conversa por vez e o usuário confirma o envio. Disparo automático exige integração futura com a API oficial da Meta.

## Publicação

Esta versão não exige novo SQL nem atualização da Edge Function. Envie o conteúdo do pacote para a raiz do repositório e aguarde o deploy da Vercel ficar `Ready`.

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

## Atualização final v10.9

Antes do deploy, execute `supabase/migrations/20260805_profile_photos_final_ui.sql`.
Esta migração cria a coluna de foto, o bucket `profile-photos`, as políticas de acesso por usuário e corrige indicadores antigos de e-mail confirmado.
