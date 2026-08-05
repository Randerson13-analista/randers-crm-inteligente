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

const resellerKey = reseller => reseller.codigo
  || reseller.telefone
  || reseller.id
  || `${reseller.nome}-${reseller.cidade}-${reseller.base}-${reseller.nivel}`;

export function eligibleConsultants(reseller, users = []) {
  return activeConsultants(users).filter(user => userCanHandleReseller(user, reseller));
}

/**
 * Distribuição determinística e equilibrada.
 * Com a mesma equipe, regras e carteira, o resultado permanece estável.
 * Em cada empate, o hash do revendedor alterna o primeiro candidato para
 * evitar que o mesmo consultor seja favorecido alfabeticamente.
 */
export function distributeWallets(revendedores = [], users = []) {
  const consultants = activeConsultants(users);
  const load = new Map(consultants.map(user => [user.id, 0]));
  const normalized = revendedores.map((source, index) => ({
    index,
    reseller: normalizeResellerClassification(source),
  }));

  const ordered = [...normalized].sort((left, right) => {
    const leftKey = resellerKey(left.reseller);
    const rightKey = resellerKey(right.reseller);
    return stableHash(leftKey) - stableHash(rightKey) || String(leftKey).localeCompare(String(rightKey));
  });

  const result = new Array(revendedores.length);
  for (const item of ordered) {
    const revendedor = item.reseller;
    const candidates = consultants.filter(user => userCanHandleReseller(user, revendedor));

    if (!candidates.length) {
      result[item.index] = {
        ...revendedor,
        carteiraTrabalho: walletForReseller(revendedor),
        responsavelId: null,
        responsavel: 'Não atribuído',
      };
      continue;
    }

    const minimum = Math.min(...candidates.map(candidate => load.get(candidate.id) || 0));
    const leastLoaded = candidates.filter(candidate => (load.get(candidate.id) || 0) === minimum);
    const key = resellerKey(revendedor);
    const owner = leastLoaded[stableHash(key) % leastLoaded.length];
    load.set(owner.id, (load.get(owner.id) || 0) + 1);

    result[item.index] = {
      ...revendedor,
      carteiraTrabalho: summarizePortfolio(owner),
      responsavelId: owner.id,
      responsavel: owner.nome,
    };
  }

  return result;
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
    activityCycleStatuses: user.activityCycleStatuses || [],
  }));
}

export { walletForReseller };
