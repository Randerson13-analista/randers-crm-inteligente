# Randers'CRM v10.1 — correção do convite

- chamada direta autenticada para a Edge Function;
- cabeçalhos `Authorization` e `apikey` explícitos;
- timeout de 20 segundos;
- botão sempre volta ao estado normal;
- mensagens específicas para 401, 404, CORS/rede e erro do servidor;
- função alinhada ao wrapper oficial `withSupabase` com CORS automático.
