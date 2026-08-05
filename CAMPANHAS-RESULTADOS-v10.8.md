# Campanhas e resultados — v10.8

Esta versão completa o acompanhamento das campanhas assistidas de WhatsApp.

## Incluído

- indicadores consolidados de lotes, contatos trabalhados, respostas, conversões e opt-outs;
- filtros do histórico por período, situação e texto;
- detalhamento por lote e por destinatário;
- busca de contatos dentro de cada lote;
- registro das datas de trabalho, resposta e conversão;
- exportação CSV consolidada e por lote;
- resultados das campanhas no módulo Relatórios;
- confirmação antes de excluir um lote.

A atualização usa as tabelas `campaigns` e `campaign_recipients` já existentes. Não exige SQL novo nem alteração da Edge Function.
