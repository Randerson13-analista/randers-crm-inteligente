# Randers'CRM v10.3 — senha obrigatória no primeiro acesso

## Problema corrigido
O link de convite do Supabase confirma o e-mail e cria uma sessão temporária, mas o frontend anterior permitia abrir o CRM sem apresentar a criação da senha.

## Novo comportamento
- Usuários com `profiles.must_change_password = true` ficam bloqueados na tela de criação de senha.
- O CRM não carrega carteira, agenda, histórico ou módulos antes da senha ser criada.
- A senha precisa ter pelo menos 8 caracteres, letra maiúscula, letra minúscula e número.
- Após `supabase.auth.updateUser({ password })`, o perfil é atualizado para `must_change_password = false`.
- A recuperação de senha também utiliza a mesma tela protegida.
- Falha de auditoria não impede o acesso depois que a senha foi salva.

## Publicação
Substitua os arquivos no GitHub. Não é necessário executar SQL nem republicar a Edge Function.
