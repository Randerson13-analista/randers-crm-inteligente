# Randers’CRM v10.9 — finalização operacional

## Entregue nesta versão

- Foto real no perfil por upload no Supabase Storage.
- JPG, PNG e WebP com limite de 5 MB.
- Iniciais automáticas quando não existir foto.
- Foto aplicada no cabeçalho, menu, administração, metas e painel gerencial.
- Menu lateral fixo durante toda a rolagem.
- Submenus recolhíveis: Atendimento, Gestão, Dados e sistema e Minha conta.
- Menu lateral móvel com botão de abertura e painel deslizante.
- Correção do indicador de e-mail confirmado para contas antigas.
- Closet preservado para uma etapa futura, sem retrabalho nesta entrega.

## Ordem de instalação

1. Execute `supabase/migrations/20260805_profile_photos_final_ui.sql` no SQL Editor.
2. Publique todos os arquivos deste pacote no GitHub.
3. Aguarde o deployment da Vercel ficar Ready.
4. Atualize o CRM com Ctrl + Shift + R.
5. Abra Meu perfil e adicione uma foto.
