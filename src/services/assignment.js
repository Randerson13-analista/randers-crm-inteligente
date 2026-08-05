import {
  normalizeResellerClassification,
  summarizePortfolio,
  userCanHandleReseller,
  walletForReseller,
} from '../domain/portfolio.js';

const stableHash = value => {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const activeConsultants = users => (users || [])
  .filter(user => user.ativo && user.cargo === 'Consultor')
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));

export function eligibleConsultants(reseller, users = []) {
  return activeConsultants(users).filter(user => userCanHandleReseller(user, reseller));
}

export function distributeWallets(revendedores = [], users = []) {
  return revendedores.map(source => {
    const revendedor = normalizeResellerClassification(source);
    const candidates = eligibleConsultants(revendedor, users);

    if (!candidates.length) {
      return {
        ...revendedor,
        carteiraTrabalho: walletForReseller(revendedor),
        responsavelId: null,
        responsavel: 'Não atribuído',
      };
    }

    const currentOwner = candidates.find(candidate => candidate.id === revendedor.responsavelId);
    if (currentOwner) {
      return {
        ...revendedor,
        carteiraTrabalho: summarizePortfolio(currentOwner),
        responsavelId: currentOwner.id,
        responsavel: currentOwner.nome,
      };
    }

    const key = revendedor.codigo
      || revendedor.telefone
      || revendedor.id
      || `${revendedor.nome}-${revendedor.cidade}-${revendedor.base}-${revendedor.nivel}`;
    const owner = candidates[stableHash(key) % candidates.length];
    return {
      ...revendedor,
      carteiraTrabalho: summarizePortfolio(owner),
      responsavelId: owner.id,
      responsavel: owner.nome,
    };
  });
}

export function assignmentSummary(revendedores = [], users = []) {
  const distributed = distributeWallets(revendedores, users);
  return activeConsultants(users).map(user => ({
    id: user.id,
    nome: user.nome,
    carteira: summarizePortfolio(user),
    total: distributed.filter(revendedor => revendedor.responsavelId === user.id).length,
    activitySegments: user.activitySegments || [],
    recoveryGroups: user.recoveryGroups || [],
  }));
}

export { walletForReseller };
