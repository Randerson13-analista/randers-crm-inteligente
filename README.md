# Randers'CRM — núcleo funcional v10

CRM multiusuário para gestão de revendedores, integrado a **React, Vite, Supabase e Vercel**.

## Regra de negócio principal

- **Atividade** é o fluxo principal.
- Dentro de Atividade ficam as segmentações: **Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante**.
- **I6, Cessados e Intenções** são grupos de Recuperação.
- Cada consultor recebe segmentações e/ou grupos específicos. O sistema distribui os revendedores sem duplicidade.

## Módulos concluídos nesta base

- Login real, recuperação de senha e sessão pelo Supabase Auth.
- Administração de colaboradores, cargos, ativação e carteiras detalhadas.
- Convite por e-mail via Edge Function segura.
- Carteira com cadastro, edição, exclusão, filtros, prioridade e WhatsApp.
- Importação XLSX/XLS com reconhecimento, consolidação, atualização e distribuição.
- Agenda, histórico de atendimentos e timeline.
- Dashboard, painel do gestor, metas, ranking e relatórios.
- Campanhas com fila de destinatários e métricas.
- Auditoria, configurações da organização e PWA.
- Closet e corrida 3D mantidos como base funcional; o acabamento visual live action será feito depois.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação antes do build:

```bash
npm run validate
npm run test:core
npm run build
```

## Configuração

Copie `.env.example` para `.env.local` e informe as variáveis públicas do Supabase.

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Leia [docs/DEPLOY.md](docs/DEPLOY.md) e [docs/SUPABASE.md](docs/SUPABASE.md) antes de publicar.
