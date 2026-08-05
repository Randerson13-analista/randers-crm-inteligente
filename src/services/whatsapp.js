import {
  VIP_ACTIVITY_SEGMENTS,
  normalizeResellerClassification,
} from '../domain/portfolio';

export const DEFAULT_TEMPLATES = {
  recuperacao_i6: 'Olá, {nome}! Tudo bem? Sentimos sua falta neste ciclo. Posso te ajudar a retomar seus pedidos e aproveitar as oportunidades disponíveis?',
  recuperacao_cessados: 'Olá, {nome}! Tudo bem? Quero te apoiar na reativação do seu cadastro e mostrar as melhores oportunidades para voltar a revender.',
  intencoes: 'Olá, {nome}! Tudo bem? Vi seu interesse em revender. Posso te explicar como funciona e ajudar você a concluir o cadastro?',
  atividade_vip: 'Olá, {nome}! Tudo bem? Separei um atendimento especial para sua atividade {nivel}, com oportunidades compatíveis com o seu perfil. Posso te apresentar?',
  atividade_padrao: 'Olá, {nome}! Tudo bem? Separei as novidades deste ciclo para sua atividade {nivel}. Posso te mostrar as melhores oportunidades?',
};

export function normalizeBrazilPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'O revendedor não possui telefone cadastrado.' };

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('55')) digits = digits.slice(2);

  if (digits.startsWith('0') && (digits.length === 13 || digits.length === 14)) digits = digits.slice(3);
  else if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) digits = digits.slice(1);

  if (![10, 11].includes(digits.length)) {
    return { valid: false, error: 'Telefone incompleto. Informe DDD e número com 10 ou 11 dígitos.' };
  }

  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (ddd === '00' || ddd.startsWith('0') || subscriber.startsWith('0')) {
    return { valid: false, error: 'O DDD ou o número informado é inválido.' };
  }

  return { valid: true, national: digits, international: `55${digits}` };
}

export function templateKeyForReseller(reseller) {
  const normalized = normalizeResellerClassification(reseller);
  if (normalized.base === 'I6') return 'recuperacao_i6';
  if (normalized.base === 'Cessados') return 'recuperacao_cessados';
  if (normalized.base === 'Intenções') return 'intencoes';
  if (VIP_ACTIVITY_SEGMENTS.includes(normalized.nivel)) return 'atividade_vip';
  return 'atividade_padrao';
}

export function renderMessage(template, reseller = {}) {
  const normalized = normalizeResellerClassification(reseller);
  return String(template || '')
    .replaceAll('{nome}', normalized.nome || 'revendedor(a)')
    .replaceAll('{cidade}', normalized.cidade || '')
    .replaceAll('{nivel}', normalized.nivel || '')
    .replaceAll('{base}', normalized.base || '')
    .replaceAll('{atividade}', normalized.atividade || normalized.nivel || '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function buildWhatsAppMessage(reseller, templates = {}) {
  const key = templateKeyForReseller(reseller);
  const template = templates[key] || DEFAULT_TEMPLATES[key] || DEFAULT_TEMPLATES.atividade_padrao;
  return renderMessage(template, reseller);
}

export function createWhatsAppUrl(reseller, options = {}) {
  const phone = normalizeBrazilPhone(reseller?.telefone);
  if (!phone.valid) return phone;
  const message = options.message || buildWhatsAppMessage(reseller, options.templates || {});
  return {
    valid: true,
    phone: phone.international,
    message,
    url: `https://wa.me/${phone.international}?text=${encodeURIComponent(message)}`,
  };
}

export function openWhatsApp(reseller, options = {}) {
  const result = createWhatsAppUrl(reseller, options);
  if (!result.valid) return result;
  const opened = window.open(result.url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    return {
      ...result,
      valid: false,
      error: 'O navegador bloqueou a nova guia. Permita pop-ups para o Randers’CRM.',
    };
  }
  return result;
}
