const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const EXPLICIT_OUTCOMES = new Set(['Convertido', 'Não converteu']);

export function deriveImportedStatus({ situation, antifraud, orderCode, orderCapturedAt, orderApprovedAt, orderInvoicedAt } = {}) {
  const situationText = normalize(situation);
  const antifraudText = normalize(antifraud);
  const hasOrder = [orderCode, orderCapturedAt, orderApprovedAt, orderInvoicedAt]
    .some(value => String(value ?? '').trim());
  const fraud = situationText.includes('fraud')
    || situationText.includes('suspeit')
    || antifraudText.includes('reprov')
    || antifraudText.includes('suspeit');

  if (fraud) return { status: 'Não converteu', blocked: true, hasOrder: false, fraud: true };
  if (hasOrder) return { status: 'Convertido', blocked: false, hasOrder: true, fraud: false };
  if (situationText.includes('em contato')) return { status: 'Em contato', blocked: false, hasOrder: false, fraud: false };
  return { status: 'Pendente', blocked: false, hasOrder: false, fraud: false };
}

export function importClassificationPriority(row = {}) {
  if (row.base === 'I6' || row.base === 'Cessados') return 50;
  if (row.base === 'Atividade') return 40;
  if (row.base === 'Intenções') return 20;
  return 10;
}

export function mergeImportedRows(current, incoming) {
  if (!current) return incoming;
  const currentPriority = importClassificationPriority(current);
  const incomingPriority = importClassificationPriority(incoming);
  const preferred = incomingPriority >= currentPriority ? incoming : current;
  const secondary = preferred === incoming ? current : incoming;

  return {
    ...secondary,
    ...preferred,
    metadata: {
      ...(secondary.metadata || {}),
      ...(preferred.metadata || {}),
      mergedSources: [
        ...(secondary.metadata?.mergedSources || [secondary.metadata?.sourceFile].filter(Boolean)),
        ...(preferred.metadata?.mergedSources || [preferred.metadata?.sourceFile].filter(Boolean)),
      ].filter((value, index, values) => values.indexOf(value) === index),
    },
  };
}

export function mergeExistingImportState(existing = {}, incoming = {}) {
  const incomingStatus = incoming.status || 'Pendente';
  const existingStatus = existing.status || 'Pendente';
  const status = EXPLICIT_OUTCOMES.has(incomingStatus)
    ? incomingStatus
    : existingStatus !== 'Pendente'
      ? existingStatus
      : incomingStatus;

  return {
    ...incoming,
    status,
    responsavelId: existing.responsavelId || incoming.responsavelId || null,
    metadata: {
      ...(existing.metadata || {}),
      ...(incoming.metadata || {}),
    },
  };
}
