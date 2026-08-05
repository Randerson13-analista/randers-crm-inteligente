import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { matchesCampaign } from '../services/intelligence';
import {
  ACTIVITY_CYCLE_STATUSES,
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  WALLET_LABELS,
  activityCycleStatus,
} from '../domain/portfolio';
import { MAX_WHATSAPP_BATCH, normalizeBrazilPhone, renderMessage } from '../services/whatsapp';
import {
  CAMPAIGN_STATUS_LABELS,
  RECIPIENT_STATUS_LABELS,
  campaignAudienceLabel,
  campaignRecipientCounts,
  campaignStatusLabel,
  campaignSummary,
  filterCampaigns,
  recipientStatusLabel,
} from '../services/campaignAnalytics';

const groups = ['Todos', WALLET_LABELS.recovery, WALLET_LABELS.standard, WALLET_LABELS.vip, ...ACTIVITY_SEGMENTS, ...RECOVERY_GROUPS];
const MAX_BATCH = MAX_WHATSAPP_BATCH;
const recipientStatuses = Object.entries(RECIPIENT_STATUS_LABELS);
const campaignStatuses = Object.entries(CAMPAIGN_STATUS_LABELS);

const csv = rows => rows
  .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'))
  .join('\n');

const saveCsv = (name, rows) => {
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv(rows)], { type: 'text/csv;charset=utf-8' }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatDate = value => value ? new Date(value).toLocaleString('pt-BR') : '';
const safeFileName = value => String(value || 'campanha')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9-_]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

export default function Campaigns({ campaigns = [], revendedores = [], onAdd, onDelete, onRun, onUpdateRecipient }) {
  const [name, setName] = useState('');
  const [flow, setFlow] = useState('Todos');
  const [group, setGroup] = useState('Todos');
  const [cycleStatus, setCycleStatus] = useState('Todos');
  const [city, setCity] = useState('Todas');
  const [owner, setOwner] = useState('Todos');
  const [message, setMessage] = useState('Olá, {nome}! Tudo bem? Tenho uma oportunidade para sua situação {situacao_ciclo} neste ciclo. Posso te apresentar?');
  const [preview, setPreview] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [updatingKey, setUpdatingKey] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState('Todos');
  const [historyStatus, setHistoryStatus] = useState('Todos');
  const [historyQuery, setHistoryQuery] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');

  const cities = useMemo(() => [...new Set(revendedores.map(item => item.cidade).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [revendedores]);
  const owners = useMemo(() => [...new Set(revendedores.map(item => item.responsavel || 'Não atribuído'))].sort((a, b) => a.localeCompare(b)), [revendedores]);
  const resellerById = useMemo(() => new Map(revendedores.map(item => [item.id, item])), [revendedores]);

  const audience = useMemo(() => revendedores
    .filter(reseller => {
      const isRecovery = RECOVERY_GROUPS.includes(reseller.base);
      const matchesFlow = flow === 'Todos'
        || (flow === 'Atividade' && reseller.base === 'Atividade')
        || (flow === 'Recuperação' && isRecovery);
      const matchesGroup = matchesCampaign(reseller, group);
      const matchesCycle = cycleStatus === 'Todos' || activityCycleStatus(reseller) === cycleStatus;
      const matchesCity = city === 'Todas' || reseller.cidade === city;
      const responsible = reseller.responsavel || 'Não atribuído';
      const matchesOwner = owner === 'Todos' || responsible === owner;
      const phone = normalizeBrazilPhone(reseller.telefone);
      const canReceive = phone.valid && !reseller.bloqueado && !reseller.metadata?.whatsappOptOut;
      return matchesFlow && matchesGroup && matchesCycle && matchesCity && matchesOwner && canReceive;
    })
    .sort((a, b) => (b.score || b.prioridadeScore || 0) - (a.score || a.prioridadeScore || 0) || String(a.nome).localeCompare(String(b.nome))),
  [revendedores, flow, group, cycleStatus, city, owner]);

  useEffect(() => {
    setSelectedIds(audience.slice(0, MAX_BATCH).map(item => item.id));
  }, [audience]);

  const selected = useMemo(() => {
    const ids = new Set(selectedIds);
    return audience.filter(item => ids.has(item.id)).slice(0, MAX_BATCH);
  }, [audience, selectedIds]);
  const sample = selected[0] || audience[0];
  const rendered = sample ? renderMessage(message, sample) : message;

  const visibleCampaigns = useMemo(() => filterCampaigns(campaigns, {
    period: historyPeriod,
    status: historyStatus,
    query: historyQuery,
  }), [campaigns, historyPeriod, historyStatus, historyQuery]);
  const totals = useMemo(() => campaignSummary(campaigns), [campaigns]);
  const visibleTotals = useMemo(() => campaignSummary(visibleCampaigns), [visibleCampaigns]);

  const toggleSelection = id => {
    setError('');
    setSelectedIds(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= MAX_BATCH) {
        setError(`O lote permite no máximo ${MAX_BATCH} contatos.`);
        return current;
      }
      return [...current, id];
    });
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !message.trim()) return setError('Informe o nome e a mensagem da campanha.');
    if (!selected.length) return setError('Selecione pelo menos um contato para o lote.');
    if (selected.length > MAX_BATCH) return setError(`O lote permite no máximo ${MAX_BATCH} contatos.`);
    try {
      await onAdd({
        name: name.trim(),
        group,
        audience: { flow, group, cycleStatus, city, owner, batchLimit: MAX_BATCH },
        message: message.trim(),
        status: 'rascunho',
        resellerIds: selected.map(item => item.id),
      });
      setName('');
    } catch (exception) {
      setError(exception.message || 'Não foi possível salvar a campanha.');
    }
  };

  const run = async campaign => {
    setRunningId(campaign.id);
    try { await onRun(campaign); } finally { setRunningId(null); }
  };

  const updateRecipient = async (campaign, resellerId, status) => {
    const key = `${campaign.id}:${resellerId}`;
    setUpdatingKey(key);
    try { await onUpdateRecipient(campaign, resellerId, status); } finally { setUpdatingKey(''); }
  };

  const exportRows = list => [
    ['Lote', 'Criado em', 'Criado por', 'Situação do lote', 'Público', 'Contato', 'Telefone', 'Cidade', 'Fluxo', 'Segmentação', 'Situação no ciclo', 'Responsável', 'Situação do contato', 'Trabalhado em', 'Respondido em', 'Convertido em'],
    ...list.flatMap(campaign => (campaign.recipients || []).map(recipient => {
      const reseller = resellerById.get(recipient.resellerId) || {};
      return [
        campaign.name,
        formatDate(campaign.createdAt),
        campaign.createdByName,
        campaignStatusLabel(campaign.status),
        campaignAudienceLabel(campaign),
        reseller.nome || 'Contato não disponível',
        reseller.telefone || '',
        reseller.cidade || '',
        reseller.base || '',
        reseller.nivel || '',
        reseller.id ? activityCycleStatus(reseller) : '',
        reseller.responsavel || '',
        recipientStatusLabel(recipient.status),
        formatDate(recipient.sentAt),
        formatDate(recipient.repliedAt),
        formatDate(recipient.convertedAt),
      ];
    })),
  ];

  const exportAll = () => saveCsv('resultados-campanhas-randerscrm.csv', exportRows(visibleCampaigns));
  const exportOne = campaign => saveCsv(`campanha-${safeFileName(campaign.name)}.csv`, exportRows([campaign]));

  return <div className="module-page">
    <div className="campaign-kpis campaign-kpis-detailed">
      <div><Megaphone/><b>{totals.campaigns}</b><span>Lotes criados</span></div>
      <div><Users/><b>{totals.total}</b><span>Contatos incluídos</span></div>
      <div><Send/><b>{totals.worked}</b><span>Contatos trabalhados</span></div>
      <div><MessageCircle/><b>{totals.replyRate}%</b><span>Taxa de resposta</span></div>
      <div><CheckCircle2/><b>{totals.conversions}</b><span>Conversões</span></div>
      <div><ShieldCheck/><b>{totals.blocked}</b><span>Opt-outs registrados</span></div>
    </div>

    <div className="campaign-grid campaign-grid-wide">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="panel-title"><div><h2>Novo lote WhatsApp</h2><span>Selecione e trabalhe até 30 contatos por vez.</span></div><Megaphone/></div>
        <label>Nome do lote<input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: I4 ciclo 11 · lote 1"/></label>

        <div className="campaign-filter-grid">
          <label>Fluxo<select value={flow} onChange={event => setFlow(event.target.value)}><option>Todos</option><option>Atividade</option><option>Recuperação</option></select></label>
          <label>Base ou segmento<select value={group} onChange={event => setGroup(event.target.value)}>{groups.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Situação no ciclo<select value={cycleStatus} onChange={event => setCycleStatus(event.target.value)}><option>Todos</option>{ACTIVITY_CYCLE_STATUSES.map(item => <option key={item}>{item}</option>)}<option>I6</option><option>Cessado 7+</option><option>Intenção de revenda</option></select></label>
          <label>Cidade<select value={city} onChange={event => setCity(event.target.value)}><option>Todas</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Responsável<select value={owner} onChange={event => setOwner(event.target.value)}><option>Todos</option>{owners.map(item => <option key={item}>{item}</option>)}</select></label>
        </div>

        <label>Mensagem<textarea value={message} onChange={event => setMessage(event.target.value)} rows="6"/></label>
        <div className="template-help"><b>Variáveis:</b> {'{nome}'}, {'{cidade}'}, {'{nivel}'}, {'{base}'}, {'{situacao_ciclo}'}, {'{responsavel}'}</div>
        <div className="audience-preview"><Users size={18}/><b>{audience.length}</b> disponíveis · <strong>{selected.length}/{MAX_BATCH}</strong> selecionados</div>
        <div className="batch-actions">
          <button type="button" className="secondary-btn" onClick={() => setSelectedIds(audience.slice(0, MAX_BATCH).map(item => item.id))}>Selecionar primeiros 30</button>
          <button type="button" className="secondary-btn" onClick={() => setSelectedIds([])}>Limpar seleção</button>
          <button type="button" className="secondary-btn" onClick={() => setPreview(value => !value)}><Eye size={17}/>{preview ? 'Ocultar prévia' : 'Ver prévia'}</button>
        </div>
        {preview && <div className="message-preview"><small>Prévia para {sample?.nome || 'um contato'}</small><p>{rendered}</p></div>}

        <div className="batch-contact-list">
          {audience.length === 0 ? <div className="empty">Nenhum contato válido corresponde aos filtros.</div> : audience.slice(0, 100).map(reseller => {
            const checked = selectedIds.includes(reseller.id);
            return <label className={checked ? 'batch-contact selected' : 'batch-contact'} key={reseller.id}>
              <input type="checkbox" checked={checked} onChange={() => toggleSelection(reseller.id)}/>
              <span><b>{reseller.nome}</b><small>{reseller.telefone} · {reseller.cidade || 'Sem cidade'}</small></span>
              <em>{activityCycleStatus(reseller)}</em>
            </label>;
          })}
          {audience.length > 100 && <small className="muted-note">Exibindo os 100 primeiros por prioridade. Refine os filtros para localizar outros contatos.</small>}
        </div>

        {error && <div className="form-error">{error}</div>}
        <button className="primary" type="submit" disabled={!selected.length}><Plus size={17}/>Salvar lote com {selected.length} contatos</button>
        <small className="campaign-safety-note">O CRM abre uma conversa por vez e registra o andamento. O envio continua sendo confirmado por você no WhatsApp.</small>
      </form>

      <section className="panel campaign-history-panel">
        <div className="panel-title"><div><h2>Histórico e resultados</h2><span>Consulte, filtre e exporte os lotes salvos.</span></div><BarChart3/></div>
        <div className="campaign-history-toolbar">
          <label className="campaign-search"><Search size={17}/><input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Buscar lote, público ou criador"/></label>
          <label><Filter size={16}/><select value={historyStatus} onChange={event => setHistoryStatus(event.target.value)}><option>Todos</option>{campaignStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <select value={historyPeriod} onChange={event => setHistoryPeriod(event.target.value)}><option>Todos</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
          <button type="button" className="secondary-btn" onClick={exportAll} disabled={!visibleCampaigns.length}><Download size={17}/>Exportar resultados</button>
        </div>
        <div className="campaign-filter-summary">
          <span><b>{visibleCampaigns.length}</b> lotes</span>
          <span><b>{visibleTotals.total}</b> contatos</span>
          <span><b>{visibleTotals.replyRate}%</b> respostas</span>
          <span><b>{visibleTotals.conversionRate}%</b> conversão</span>
        </div>

        <div className="campaign-list">
          {visibleCampaigns.length === 0 ? <div className="empty">Nenhum lote corresponde aos filtros.</div> : visibleCampaigns.map(campaign => {
            const counts = campaignRecipientCounts(campaign);
            const open = expandedId === campaign.id;
            const needle = recipientQuery.trim().toLowerCase();
            const recipients = (campaign.recipients || []).filter(recipient => {
              if (!needle) return true;
              const reseller = resellerById.get(recipient.resellerId);
              return [reseller?.nome, reseller?.telefone, reseller?.cidade, recipientStatusLabel(recipient.status)]
                .some(value => String(value || '').toLowerCase().includes(needle));
            });
            return <article className="campaign-card campaign-result-card" key={campaign.id}>
              <div className="campaign-card-head"><div><strong>{campaign.name}</strong><small>{formatDate(campaign.createdAt)} · {campaign.createdByName || 'Usuário'}</small></div><span className={`pill campaign-status-${campaign.status || 'rascunho'}`}>{campaignStatusLabel(campaign.status)}</span></div>
              <div className="campaign-audience-line">{campaignAudienceLabel(campaign)}</div>
              <p>{campaign.message}</p>
              <progress className="campaign-progress" value={counts.worked} max={Math.max(counts.total, 1)}/>
              <div className="campaign-metrics campaign-metrics-detailed">
                <span><b>{counts.worked}/{counts.total}</b> trabalhados</span>
                <span><b>{counts.pending}</b> pendentes</span>
                <span><b>{counts.responses}</b> respostas</span>
                <span><b>{counts.replyRate}%</b> taxa de resposta</span>
                <span><b>{counts.converted}</b> conversões</span>
                <span><b>{counts.blocked}</b> opt-outs</span>
              </div>
              <div className="campaign-actions">
                <button className="small-action" disabled={runningId === campaign.id || !counts.pending} onClick={() => run(campaign)}><Send size={15}/>{runningId === campaign.id ? 'Abrindo...' : 'Abrir próximo contato'}</button>
                <button className="small-action ghost" onClick={() => { setExpandedId(open ? null : campaign.id); setRecipientQuery(''); }}>{open ? 'Fechar lote' : 'Gerenciar lote'}</button>
                <button className="small-action ghost" onClick={() => exportOne(campaign)}><Download size={15}/>CSV</button>
                <button className="danger-btn" onClick={() => window.confirm(`Excluir o lote “${campaign.name}”?`) && onDelete(campaign.id)}><Trash2 size={15}/></button>
              </div>

              {open && <div className="campaign-recipient-list">
                <label className="campaign-recipient-search"><Search size={16}/><input value={recipientQuery} onChange={event => setRecipientQuery(event.target.value)} placeholder="Buscar contato dentro do lote"/></label>
                {recipients.length === 0 ? <div className="empty">Nenhum contato encontrado neste lote.</div> : recipients.map(recipient => {
                  const reseller = resellerById.get(recipient.resellerId);
                  if (!reseller) return <div className="campaign-recipient" key={recipient.id}><div><b>Contato não disponível</b><small>ID: {recipient.resellerId}</small></div><span className={`recipient-status recipient-${recipient.status || 'pendente'}`}>{recipientStatusLabel(recipient.status)}</span></div>;
                  const key = `${campaign.id}:${recipient.resellerId}`;
                  return <div className="campaign-recipient" key={recipient.id || key}>
                    <div><b>{reseller.nome}</b><small>{reseller.telefone} · {activityCycleStatus(reseller)}{recipient.sentAt ? ` · ${formatDate(recipient.sentAt)}` : ''}</small></div>
                    <select value={recipient.status || 'pendente'} disabled={updatingKey === key} onChange={event => updateRecipient(campaign, recipient.resellerId, event.target.value)}>
                      {recipientStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <span className={`recipient-status recipient-${recipient.status || 'pendente'}`}>{recipientStatusLabel(recipient.status)}</span>
                  </div>;
                })}
              </div>}
            </article>;
          })}
        </div>
      </section>
    </div>
  </div>;
}
