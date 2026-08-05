import assert from 'node:assert/strict';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  normalizeResellerClassification,
  userCanHandleReseller,
} from '../src/domain/portfolio.js';
import { distributeWallets } from '../src/services/assignment.js';
import { deriveImportedStatus, mergeExistingImportState, mergeImportedRows } from '../src/services/importRules.js';

const bronzeActivity = normalizeResellerClassification({ base: 'Atividade', nivel: 'Bronze', nome: 'Bronze' });
assert.equal(bronzeActivity.base, 'Atividade');
assert.equal(bronzeActivity.nivel, 'Bronze');

const esmeralda = normalizeResellerClassification({ base: 'VIP', nivel: 'Esmeralda GB', nome: 'Esmeralda' });
assert.equal(esmeralda.base, 'Atividade');
assert.equal(esmeralda.nivel, 'Esmeralda');

const i6Bronze = normalizeResellerClassification({ base: 'I6', nivel: 'Bronze', nome: 'I6 Bronze' });
assert.equal(i6Bronze.base, 'I6');
assert.equal(i6Bronze.nivel, 'Bronze');

const recoveryUser = {
  id: 'recovery', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: [], recoveryGroups: [...RECOVERY_GROUPS],
};
const standardUser = {
  id: 'standard', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: ['Cobre', 'Bronze', 'Prata', 'Ouro'], recoveryGroups: [],
};
const premiumUser = {
  id: 'premium', cargo: 'Consultor', ativo: true, carteira: 'Carteira personalizada', activitySegments: ['Platina', 'Rubi', 'Esmeralda', 'Diamante'], recoveryGroups: [],
};

assert.equal(userCanHandleReseller(recoveryUser, i6Bronze), true);
assert.equal(userCanHandleReseller(standardUser, bronzeActivity), true);
assert.equal(userCanHandleReseller(premiumUser, esmeralda), true);
assert.equal(userCanHandleReseller(standardUser, esmeralda), false);

const records = [
  { id: '1', nome: 'Recuperação', base: 'I6', nivel: 'Bronze' },
  { id: '2', nome: 'Atividade Bronze', base: 'Atividade', nivel: 'Bronze' },
  { id: '3', nome: 'Atividade Esmeralda', base: 'Atividade', nivel: 'Esmeralda' },
];
const distributed = distributeWallets(records, [recoveryUser, standardUser, premiumUser]);
assert.equal(distributed.find(item => item.id === '1').responsavelId, 'recovery');
assert.equal(distributed.find(item => item.id === '2').responsavelId, 'standard');
assert.equal(distributed.find(item => item.id === '3').responsavelId, 'premium');
assert.deepEqual(ACTIVITY_SEGMENTS, ['Cobre', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Rubi', 'Esmeralda', 'Diamante']);

console.log('Testes centrais concluídos: classificação, permissões e distribuição validadas.');


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
