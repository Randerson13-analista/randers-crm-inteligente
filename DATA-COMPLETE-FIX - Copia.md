# Randers'CRM v10.6 — carteira completa e contagens corretas

## Problemas corrigidos

1. O Supabase retorna no máximo 1.000 linhas por consulta quando não há paginação. A carteira tinha 1.047 registros, então 47 não eram carregados no painel.
2. A aba `I6` não era reconhecida quando seu nome aparecia dentro do texto combinado do arquivo e da planilha.
3. O painel de “Segmentações da Atividade” contava também os níveis preservados em I6 e Cessados.
4. A reimportação consultava somente os primeiros 1.000 cadastros existentes e poderia criar duplicidades acima desse limite.

## Resultado esperado após publicar e reimportar

- Atividade: 470
- I6: 31
- Cessados: 479
- Intenções: 67
- Total importado das duas planilhas: 1.047

Segmentações somente de Atividade:

- Bronze: 221
- Prata: 117
- Cobre: 84
- Ouro: 27
- Platina: 12
- Rubi: 5
- Esmeralda: 4
- Diamante: 0

Pode existir um registro adicional caso haja um contato de teste anterior no banco. Ele deve ser identificado e excluído pela Carteira, não por SQL em massa.
