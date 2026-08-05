export const ACTIVITY_SEGMENTS = [
  'Cobre',
  'Bronze',
  'Prata',
  'Ouro',
  'Platina',
  'Rubi',
  'Esmeralda',
  'Diamante',
];

export const STANDARD_ACTIVITY_SEGMENTS = ['Cobre', 'Bronze', 'Prata', 'Ouro'];
export const VIP_ACTIVITY_SEGMENTS = ['Platina', 'Rubi', 'Esmeralda', 'Diamante'];
export const RECOVERY_GROUPS = ['I6', 'Cessados', 'Intenções'];

export const ACTIVITY_CYCLE_STATUSES = [
  'Ativo',
  'Ativo 1',
  'Ativo 2',
  'Ativo 3',
  'Inativo 4',
  'Inativo 5',
];

export const WALLET_LABELS = {
  recovery: 'Recuperação',
  standard: 'Atividade · Cobre a Ouro',
  vip: 'Atividade · Platina a Diamante',
  all: 'Todas',
  custom: 'Carteira personalizada',
};

const strip = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const canonicalFrom = (value, options) => {
  const normalized = strip(value);
  if (!normalized) return '';
  const exact = options.find(option => strip(option) === normalized);
  if (exact) return exact;
  return options.find(option => {
    const token = strip(option);
    return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, 'i').test(normalized);
  }) || '';
};

export function canonicalSegment(value) {
  return canonicalFrom(value, ACTIVITY_SEGMENTS);
}

export function canonicalRecoveryGroup(value) {
  const normalized = strip(value);
  if (!normalized) return '';
  if (normalized.includes('intenc')) return 'Intenções';
  if (normalized.includes('cess')) return 'Cessados';
  const hasI6Token = /(^|[^a-z0-9])i[\s_-]*6([^a-z0-9]|$)/i.test(normalized);
  if (hasI6Token || normalized.includes('inativo 6') || normalized.includes('inatividade 6')) return 'I6';
  return canonicalFrom(value, RECOVERY_GROUPS);
}

export function canonicalActivityCycleStatus(value) {
  const normalized = strip(value);
  if (!normalized) return '';
  if (/^(ativo|a\s*0|ativo\s*0)$/.test(normalized)) return 'Ativo';
  if (/^(ativo|a)\s*1$/.test(normalized)) return 'Ativo 1';
  if (/^(ativo|a)\s*2$/.test(normalized)) return 'Ativo 2';
  if (/^(ativo|a)\s*3$/.test(normalized)) return 'Ativo 3';
  if (/^(inativo|i)\s*4$/.test(normalized)) return 'Inativo 4';
  if (/^(inativo|i)\s*5$/.test(normalized)) return 'Inativo 5';
  return canonicalFrom(value, ACTIVITY_CYCLE_STATUSES);
}

function cycleNumberFromText(value) {
  const normalized = strip(value);
  if (!normalized) return null;
  const status = canonicalActivityCycleStatus(normalized);
  if (status === 'Ativo') return 0;
  const activityMatch = status.match(/(\d+)/);
  if (activityMatch) return Number(activityMatch[1]);
  if (/(^|[^a-z0-9])i\s*6([^a-z0-9]|$)/.test(normalized) || normalized.includes('inativo 6')) return 6;
  const ceasedMatch = normalized.match(/(?:cessado|inativo|inatividade)\D*(\d+)/);
  if (ceasedMatch) return Number(ceasedMatch[1]);
  return null;
}

export function inactivityCyclesForReseller(reseller = {}) {
  const metadata = reseller.metadata || {};
  const candidates = [
    reseller.ciclosInatividade,
    reseller.inactivityCycles,
    reseller.ciclos_inatividade,
    metadata.ciclosInatividade,
    metadata.inactivityCycles,
    metadata.ciclos_inatividade,
  ];

  for (const candidate of candidates) {
    if (candidate === '' || candidate === null || candidate === undefined) continue;
    const number = Number(String(candidate).replace(',', '.'));
    if (Number.isFinite(number) && number >= 0) return Math.floor(number);
  }

  const textCandidates = [
    reseller.situacaoCiclo,
    reseller.statusAtividade,
    metadata.situacaoCiclo,
    metadata.statusAtividade,
    metadata.papelOriginal,
    reseller.atividadeAtual,
  ];
  for (const candidate of textCandidates) {
    const parsed = cycleNumberFromText(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function normalizeResellerClassification(reseller = {}) {
  const rawBase = reseller.base || reseller.tipo || reseller.grupo || reseller.fluxo || '';
  const rawSegment = reseller.nivel
    || reseller.segmentacao
    || reseller.segmento
    || reseller.papel
    || reseller.atividade
    || '';

  const recovery = canonicalRecoveryGroup(rawBase) || canonicalRecoveryGroup(reseller.tipo || reseller.grupo || '');
  const segment = canonicalSegment(rawSegment) || (!recovery ? canonicalSegment(rawBase) : '');

  if (recovery) {
    return {
      ...reseller,
      base: recovery,
      nivel: segment || reseller.nivel || '',
      atividade: segment || reseller.atividade || '',
      classificacao: `${recovery}${segment ? ` · Atividade ${segment}` : ''}`,
    };
  }

  if (segment) {
    return {
      ...reseller,
      base: 'Atividade',
      nivel: segment,
      atividade: segment,
      classificacao: `Atividade · ${segment}`,
    };
  }

  const normalizedBase = strip(rawBase);
  const base = normalizedBase.includes('ativ') || normalizedBase.includes('vip') || !rawBase
    ? 'Atividade'
    : rawBase;
  const fallbackSegment = canonicalSegment(reseller.nivel || reseller.atividade || '');
  return {
    ...reseller,
    base,
    nivel: fallbackSegment || reseller.nivel || '',
    atividade: fallbackSegment || reseller.atividade || '',
    classificacao: base === 'Atividade'
      ? `Atividade${fallbackSegment ? ` · ${fallbackSegment}` : ''}`
      : `${base}${fallbackSegment ? ` · Atividade ${fallbackSegment}` : ''}`,
  };
}

export function activityCycleStatus(reseller = {}) {
  const normalized = normalizeResellerClassification(reseller);
  if (normalized.base === 'I6') return 'I6';
  if (normalized.base === 'Cessados') {
    const cycles = inactivityCyclesForReseller(normalized);
    return cycles && cycles >= 7 ? `Cessado ${cycles}` : 'Cessado 7+';
  }
  if (normalized.base === 'Intenções') return 'Intenção de revenda';
  if (normalized.base !== 'Atividade') return 'Não informado';

  const cycles = inactivityCyclesForReseller(normalized);
  if (cycles === 0) return 'Ativo';
  if (cycles === 1) return 'Ativo 1';
  if (cycles === 2) return 'Ativo 2';
  if (cycles === 3) return 'Ativo 3';
  if (cycles === 4) return 'Inativo 4';
  if (cycles === 5) return 'Inativo 5';
  if (cycles === 6) return 'I6';
  if (cycles !== null && cycles >= 7) return `Cessado ${cycles}`;

  const textual = canonicalActivityCycleStatus(
    normalized.situacaoCiclo
      || normalized.statusAtividade
      || normalized.metadata?.situacaoCiclo
      || normalized.metadata?.papelOriginal,
  );
  return textual || 'Não informado';
}

export function isActivityReseller(reseller = {}) {
  return normalizeResellerClassification(reseller).base === 'Atividade';
}

export function isRecoveryReseller(reseller = {}) {
  return RECOVERY_GROUPS.includes(normalizeResellerClassification(reseller).base);
}

export function walletForReseller(reseller = {}) {
  const normalized = normalizeResellerClassification(reseller);
  if (RECOVERY_GROUPS.includes(normalized.base)) return WALLET_LABELS.recovery;
  if (STANDARD_ACTIVITY_SEGMENTS.includes(normalized.nivel)) return WALLET_LABELS.standard;
  if (VIP_ACTIVITY_SEGMENTS.includes(normalized.nivel)) return WALLET_LABELS.vip;
  return null;
}

export function normalizeWalletLabel(value) {
  const normalized = strip(value);
  if (!normalized) return '';
  if (normalized === 'todas' || normalized === 'todas as carteiras') return WALLET_LABELS.all;
  if (normalized.includes('personal')) return WALLET_LABELS.custom;
  if (normalized.includes('recuper')) return WALLET_LABELS.recovery;
  if (normalized === 'vip' || normalized.includes('platina') || normalized.includes('diamante')) return WALLET_LABELS.vip;
  if (normalized.includes('cobre') || normalized.includes('ouro')) return WALLET_LABELS.standard;
  return value;
}

export function defaultPortfolioForWallet(wallet) {
  const normalized = normalizeWalletLabel(wallet);
  if (normalized === WALLET_LABELS.all) {
    return { activitySegments: [...ACTIVITY_SEGMENTS], recoveryGroups: [...RECOVERY_GROUPS], activityCycleStatuses: [...ACTIVITY_CYCLE_STATUSES] };
  }
  if (normalized === WALLET_LABELS.recovery) {
    return { activitySegments: [], recoveryGroups: [...RECOVERY_GROUPS], activityCycleStatuses: [] };
  }
  if (normalized === WALLET_LABELS.vip) {
    return { activitySegments: [...VIP_ACTIVITY_SEGMENTS], recoveryGroups: [], activityCycleStatuses: [...ACTIVITY_CYCLE_STATUSES] };
  }
  return { activitySegments: [...STANDARD_ACTIVITY_SEGMENTS], recoveryGroups: [], activityCycleStatuses: [...ACTIVITY_CYCLE_STATUSES] };
}

export function normalizePortfolioRules(user = {}) {
  const legacy = defaultPortfolioForWallet(user.carteira || user.wallet);
  const activitySegments = Array.isArray(user.activitySegments) && user.activitySegments.length
    ? user.activitySegments.map(canonicalSegment).filter(Boolean)
    : legacy.activitySegments;
  const recoveryGroups = Array.isArray(user.recoveryGroups) && user.recoveryGroups.length
    ? user.recoveryGroups.map(canonicalRecoveryGroup).filter(Boolean)
    : legacy.recoveryGroups;
  const activityCycleStatuses = Array.isArray(user.activityCycleStatuses)
    ? user.activityCycleStatuses.map(canonicalActivityCycleStatus).filter(Boolean)
    : legacy.activityCycleStatuses;

  return {
    activitySegments: [...new Set(activitySegments)],
    recoveryGroups: [...new Set(recoveryGroups)],
    activityCycleStatuses: [...new Set(activityCycleStatuses)],
  };
}

export function userCanHandleReseller(user, reseller) {
  if (!user) return false;
  if (['Administrador', 'Gerente'].includes(user.cargo) || normalizeWalletLabel(user.carteira) === WALLET_LABELS.all) return true;
  const rules = normalizePortfolioRules(user);
  const normalized = normalizeResellerClassification(reseller);
  if (RECOVERY_GROUPS.includes(normalized.base)) return rules.recoveryGroups.includes(normalized.base);
  if (normalized.base === 'Atividade') {
    const status = activityCycleStatus(normalized);
    const cycleAllowed = status === 'Não informado'
      ? rules.activityCycleStatuses.length === ACTIVITY_CYCLE_STATUSES.length
      : rules.activityCycleStatuses.includes(status);
    return rules.activitySegments.includes(normalized.nivel) && cycleAllowed;
  }
  return false;
}

export function summarizePortfolio(user = {}) {
  if (['Administrador', 'Gerente'].includes(user.cargo) || normalizeWalletLabel(user.carteira) === WALLET_LABELS.all) return WALLET_LABELS.all;
  const rules = normalizePortfolioRules(user);
  if (rules.recoveryGroups.length && !rules.activitySegments.length) return `Recuperação · ${rules.recoveryGroups.join(', ')}`;
  if (rules.activitySegments.length && !rules.recoveryGroups.length) {
    const allCycleStatuses = rules.activityCycleStatuses.length === ACTIVITY_CYCLE_STATUSES.length;
    const cycleLabel = allCycleStatuses ? 'Ativo a I5' : rules.activityCycleStatuses.join(', ');
    return `Atividade · ${rules.activitySegments.join(', ')} · ${cycleLabel || 'sem situação selecionada'}`;
  }
  if (rules.activitySegments.length || rules.recoveryGroups.length) return WALLET_LABELS.custom;
  return 'Sem carteira';
}

export function canAccessReseller(reseller, walletOrUser) {
  if (walletOrUser && typeof walletOrUser === 'object') return userCanHandleReseller(walletOrUser, reseller);
  const normalizedWallet = normalizeWalletLabel(walletOrUser);
  if (!normalizedWallet || normalizedWallet === WALLET_LABELS.all) return true;
  return walletForReseller(reseller) === normalizedWallet;
}

export function classificationLabel(reseller = {}) {
  return normalizeResellerClassification(reseller).classificacao;
}

export function campaignGroupMatches(reseller, group) {
  const normalized = normalizeResellerClassification(reseller);
  if (group === 'Todos' || normalizeWalletLabel(group) === WALLET_LABELS.all) return true;
  if (ACTIVITY_CYCLE_STATUSES.includes(group)) return normalized.base === 'Atividade' && activityCycleStatus(normalized) === group;
  if (ACTIVITY_SEGMENTS.includes(group)) return normalized.nivel === group;
  if (RECOVERY_GROUPS.includes(group)) return normalized.base === group;
  return walletForReseller(normalized) === normalizeWalletLabel(group);
}
