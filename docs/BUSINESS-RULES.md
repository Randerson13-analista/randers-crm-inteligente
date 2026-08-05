# Regras de carteira

## Atividade

Atividade é o fluxo principal e possui duas dimensões combináveis.

### Segmentação

- Cobre
- Bronze
- Prata
- Ouro
- Platina
- Rubi
- Esmeralda
- Diamante

### Situação no ciclo

- Ativo: comprou no ciclo atual
- Ativo 1: um ciclo sem comprar
- Ativo 2: dois ciclos sem comprar
- Ativo 3: três ciclos sem comprar
- Inativo 4: quatro ciclos sem comprar
- Inativo 5: cinco ciclos sem comprar

O administrador pode atribuir qualquer combinação. Exemplo: um consultor pode trabalhar apenas **Bronze + Prata em I4 e I5**.

## Recuperação

- I6
- Cessados
- Intenções

Um registro de Recuperação pode preservar o nível comercial. Exemplo: `I6 · Atividade Bronze`.

## Distribuição

- Apenas consultores ativos participam.
- Um revendedor possui no máximo um responsável.
- A elegibilidade combina segmento, situação no ciclo e grupo de Recuperação.
- A distribuição é determinística: com os mesmos dados e regras, produz o mesmo resultado.
- Entre consultores com as mesmas regras, a diferença de carga tende a no máximo um contato.
- Administradores e gerentes possuem visão completa.

## WhatsApp

- Cada lote contém no máximo 30 contatos únicos.
- O CRM abre uma conversa por vez e não clica em Enviar automaticamente.
- Números sem DDD ou inválidos são excluídos da seleção.
- Contatos bloqueados ou que pediram para não receber mensagens ficam fora de novos lotes.
- O histórico individual da campanha permanece salvo no Supabase.
