import assert from 'node:assert/strict';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  normalizeResellerClassification,
  userCanHandleReseller,
} from '../src/domain/portfolio.js';
import { distributeWallets } from '../src/services/assignment.js';

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
