# Randers'CRM — Closet e Ranking Profissionais

## Arquitetura

- Apenas um contexto WebGL no Closet.
- Apenas um contexto WebGL no ranking 3D.
- Miniaturas usam previews leves em CSS, evitando estouro de GPU.
- Modelos GLB são opcionais e têm fallback procedural.
- Personagens, animais e criaturas internos não dependem da internet.
- Frases de camisas são renderizadas em texturas Canvas dentro do modelo 3D.
- A corrida usa carros esportivos procedurais com materiais PBR, luzes, rodas e motorista.
- Os carros avançam com base nos pontos reais do CRM.

## Limite visual

A base interna é 3D estilizada de alta qualidade e estável. Aparência humana fotorrealista depende de modelos GLB licenciados. O carregador está pronto para esses arquivos sem comprometer o restante do sistema.
