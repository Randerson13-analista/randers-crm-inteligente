export const WALLET_RULES = {
  'Recuperação': revendedor => ['I6', 'Cessados', 'Intenções'].includes(revendedor.base),
  'Cobre a Ouro': revendedor => ['Cobre', 'Bronze', 'Prata', 'Ouro'].includes(revendedor.nivel),
  'VIP': revendedor => ['Platina', 'Rubi', 'Esmeralda', 'Diamante'].includes(revendedor.nivel),
};

const stableHash = value => {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const walletForRevendedor = revendedor => {
  for (const [wallet, predicate] of Object.entries(WALLET_RULES)) {
    if (predicate(revendedor)) return wallet;
  }
  return null;
};

export function distributeWallets(revendedores = [], users = []) {
  const activeByWallet = Object.keys(WALLET_RULES).reduce((acc, wallet) => {
    acc[wallet] = users
      .filter(user => user.ativo && user.cargo === 'Consultor' && user.carteira === wallet)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return acc;
  }, {});

  return revendedores.map(revendedor => {
    const wallet = walletForRevendedor(revendedor);
    const candidates = wallet ? activeByWallet[wallet] : [];
    if (!candidates?.length) return { ...revendedor, carteiraTrabalho: wallet, responsavelId: null, responsavel: 'Não atribuído' };
    const key = revendedor.codigo || revendedor.telefone || revendedor.id || `${revendedor.nome}-${revendedor.cidade}`;
    const owner = candidates[stableHash(key) % candidates.length];
    return { ...revendedor, carteiraTrabalho: wallet, responsavelId: owner.id, responsavel: owner.nome };
  });
}

export function assignmentSummary(revendedores = [], users = []) {
  const distributed = distributeWallets(revendedores, users);
  return users
    .filter(user => user.ativo && user.cargo === 'Consultor')
    .map(user => ({
      id: user.id,
      nome: user.nome,
      carteira: user.carteira,
      total: distributed.filter(revendedor => revendedor.responsavelId === user.id).length,
    }));
}
