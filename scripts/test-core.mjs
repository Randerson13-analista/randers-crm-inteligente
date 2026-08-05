import assert from 'node:assert/strict';
import {
  ACTIVITY_CYCLE_STATUSES,
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  activityCycleStatus,
  normalizeResellerClassification,
  userCanHandleReseller,
} from '../src/domain/portfolio.js';
import { distributeWallets } from '../src/services/assignment.js';
import { deriveImportedStatus, mergeExistingImportState, mergeImportedRows } from '../src/services/importRules.js';
import {
  MAX_WHATSAPP_BATCH,
  normalizeBrazilPhone,
  renderMessage,
  templateKeyForReseller,
} from '../src/services/whatsapp.js';

const bronzeActivity = normalizeResellerClassification({ base: 'Atividade', nivel: 'Bronze', nome: 'Bronze' });
assert.equal(bronzeActivity.base, 'Atividade');
assert.equal(bronzeActivity.nivel, 'Bronze');

const esmeralda = normalizeResellerClassification({ base: 'VIP', nivel: 'Esmeralda GB', nome: 'Esmeralda' });
assert.equal(esmeralda.base, 'Atividade');
assert.equal(esmeralda.nivel, 'Esmeralda');

const i6Bronze = normalizeResellerClassification({ base: 'I6', nivel: 'Bronze', nome: 'I6 Bronze' });
assert.equal(i6Bronze.base, 'I6');
assert.equal(i6Bronze.nivel, 'Bronze');

for (let cycles = 0; cycles <= 5; cycles += 1) {
  assert.equal(
    activityCycleStatus({ base: 'Atividade', nivel: 'Bronze', ciclosInatividade: cycles }),
    ACTIVITY_CYCLE_STATUSES[cycles],
  );
}

const recoveryUser = {
  id: 'recovery', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: [], recoveryGroups: [...RECOVERY_GROUPS], activityCycleStatuses: [],
};
const standardUser = {
  id: 'standard', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: ['Cobre', 'Bronze', 'Prata', 'Ouro'], recoveryGroups: [], activityCycleStatuses: [...ACTIVITY_CYCLE_STATUSES],
};
const premiumUser = {
  id: 'premium', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: ['Platina', 'Rubi', 'Esmeralda', 'Diamante'], recoveryGroups: [], activityCycleStatuses: [...ACTIVITY_CYCLE_STATUSES],
};
const i4OnlyUser = {
  id: 'i4', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: ['Bronze'], recoveryGroups: [], activityCycleStatuses: ['Inativo 4'],
};

assert.equal(userCanHandleReseller(recoveryUser, i6Bronze), true);
assert.equal(userCanHandleReseller(standardUser, bronzeActivity), true);
assert.equal(userCanHandleReseller(premiumUser, esmeralda), true);
assert.equal(userCanHandleReseller(standardUser, esmeralda), false);
assert.equal(userCanHandleReseller(i4OnlyUser, { base: 'Atividade', nivel: 'Bronze', ciclosInatividade: 4 }), true);
assert.equal(userCanHandleReseller(i4OnlyUser, { base: 'Atividade', nivel: 'Bronze', ciclosInatividade: 5 }), false);

const records = [
  { id: '1', nome: 'Recuperação', base: 'I6', nivel: 'Bronze' },
  { id: '2', nome: 'Atividade Bronze', base: 'Atividade', nivel: 'Bronze', ciclosInatividade: 2 },
  { id: '3', nome: 'Atividade Esmeralda', base: 'Atividade', nivel: 'Esmeralda', ciclosInatividade: 1 },
];
const distributed = distributeWallets(records, [recoveryUser, standardUser, premiumUser]);
assert.equal(distributed.find(item => item.id === '1').responsavelId, 'recovery');
assert.equal(distributed.find(item => item.id === '2').responsavelId, 'standard');
assert.equal(distributed.find(item => item.id === '3').responsavelId, 'premium');
assert.deepEqual(ACTIVITY_SEGMENTS, ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Rubi', 'Esmeralda', 'Diamante']);

const balancedUsers = ['a', 'b'].map(id => ({
  id, nome: id, cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada',
  activitySegments: ['Bronze'], recoveryGroups: [], activityCycleStatuses: ['Inativo 4'],
}));
const balancedRecords = Array.from({ length: 21 }, (_, index) => ({
  id: `i4-${index}`, codigo: `R${index}`, nome: `I4 ${index}`, base: 'Atividade', nivel: 'Bronze', ciclosInatividade: 4,
}));
const firstDistribution = distributeWallets(balancedRecords, balancedUsers);
const secondDistribution = distributeWallets(balancedRecords, balancedUsers);
assert.deepEqual(
  firstDistribution.map(item => item.responsavelId),
  secondDistribution.map(item => item.responsavelId),
  'A distribuição deve permanecer estável com os mesmos dados.',
);
const counts = firstDistribution.reduce((map, item) => map.set(item.responsavelId, (map.get(item.responsavelId) || 0) + 1), new Map());
assert.ok(Math.abs((counts.get('a') || 0) - (counts.get('b') || 0)) <= 1, 'A distribuição deve ser equilibrada.');

console.log('Testes centrais concluídos: classificação, regras Ativo–I5, permissões e distribuição equilibrada validadas.');

const convertedIntention = deriveImportedStatus({ orderCode: '523.000.001', situation: 'Cadastrada' });
assert.equal(convertedIntention.status, 'Convertido');
assert.equal(convertedIntention.hasOrder, true);

const fraudIntention = deriveImportedStatus({ situation: 'Cancelada por suspeita de fraude', antifraud: 'Reprovado - suspeito' });
assert.equal(fraudIntention.status, 'Não converteu');
assert.equal(fraudIntention.blocked, true);

const activityWinsOverStaleIntention = mergeImportedRows(
  { codigo: '1', base: 'Atividade', nivel: 'Bronze', status: 'Pendente', metadata: { sourceFile: 'atividade.xlsx' } },
  { codigo: '1', base: 'Intenções', nivel: '', status: 'Convertido', metadata: { sourceFile: 'intencoes.xlsx' } },
);
assert.equal(activityWinsOverStaleIntention.base, 'Atividade');
assert.equal(activityWinsOverStaleIntention.nivel, 'Bronze');

const i6WinsOverActivity = mergeImportedRows(
  { codigo: '2', base: 'Atividade', nivel: 'Prata', status: 'Pendente' },
  { codigo: '2', base: 'I6', nivel: 'Prata', status: 'Pendente' },
);
assert.equal(i6WinsOverActivity.base, 'I6');

const preservedProgress = mergeExistingImportState(
  { status: 'Negociando', responsavelId: 'consultor-1', metadata: { historico: true } },
  { status: 'Pendente', responsavelId: null, metadata: { sourceFile: 'ciclo-11.xlsx' } },
);
assert.equal(preservedProgress.status, 'Negociando');
assert.equal(preservedProgress.responsavelId, 'consultor-1');
assert.equal(preservedProgress.metadata.historico, true);

console.log('Testes de importação real concluídos: prioridade de bases, intenções convertidas, fraude e preservação de progresso.');

assert.equal(MAX_WHATSAPP_BATCH, 30);
assert.deepEqual(normalizeBrazilPhone('(84) 99999-1234'), {
  valid: true,
  national: '84999991234',
  international: '5584999991234',
});
assert.equal(
  templateKeyForReseller({ base: 'Atividade', nivel: 'Bronze', ciclosInatividade: 4 }),
  'atividade_inativo_4',
);
assert.equal(
  renderMessage('Olá, {nome}! Situação: {situacao_ciclo}.', { nome: 'Adriana', base: 'Atividade', nivel: 'Prata', ciclosInatividade: 5 }),
  'Olá, Adriana! Situação: Inativo 5.',
);

console.log('Testes de WhatsApp concluídos: lote de 30, telefone brasileiro e mensagens por situação validados.');
