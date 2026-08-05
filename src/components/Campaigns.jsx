import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Megaphone, Plus, Send, Trash2, Users } from 'lucide-react';
import { matchesCampaign } from '../services/intelligence';
import {
  ACTIVITY_CYCLE_STATUSES,
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  WALLET_LABELS,
  activityCycleStatus,
} from '../domain/portfolio';
import { MAX_WHATSAPP_BATCH, normalizeBrazilPhone, renderMessage } from '../services/whatsapp';

const groups = ['Todos', WALLET_LABELS.recovery, WALLET_LABELS.standard, WALLET_LABELS.vip, ...ACTIVITY_SEGMENTS, ...RECOVERY_GROUPS];
const MAX_BATCH = MAX_WHATSAPP_BATCH;
const recipientStatuses = [
  ['pendente', 'Pendente'],
  ['aberto', 'Conversa aberta'],
  ['enviado', 'Enviado'],
  ['respondeu', 'Respondeu'],
  ['convertido', 'Convertido'],
  ['nao_respondeu', 'Não respondeu'],
  ['bloqueado', 'Não deseja mensagens'],
];
const statusLabel = value => recipientStatuses.find(([key]) => key === value)?.[1] || value || 'Pendente';

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

  const cities = useMemo(() => [...new Set(revendedores.map(item => item.cidade).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [revendedores]);
  const owners = useMemo(() => [...new Set(revendedores.map(item => item.responsavel || 'Não atribuído'))].sort((a, b) => a.localeCompare(b)), [revendedores]);

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

  const totals = campaigns.reduce((result, campaign) => ({
    sent: result.sent + (campaign.sent || 0),
    replies: result.replies + (campaign.replies || 0),
    conversions: result.conversions + (campaign.conversions || 0),
  }), { sent: 0, replies: 0, conversions: 0 });

  const run = async campaign => {
    setRunningId(campaign.id);
    try { await onRun(campaign); } finally { setRunningId(null); }
  };

  const updateRecipient = async (campaign, resellerId, status) => {
    const key = `${campaign.id}:${resellerId}`;
    setUpdatingKey(key);
    try { await onUpdateRecipient(campaign, resellerId, status); } finally { setUpdatingKey(''); }
  };

  const resellerById = useMemo(() => new Map(revendedores.map(item => [item.id, item])), [revendedores]);

  return <div className="module-page">
    <div className="campaign-kpis">
      <div><Send/><b>{totals.sent}</b><span>Contatos trabalhados</span></div>
      <div><Users/><b>{totals.replies}</b><span>Respostas registradas</span></div>
      <div><BarChart3/><b>{totals.conversions}</b><span>Conversões atribuídas</span></div>
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

      <section className="panel">
        <div className="panel-title"><div><h2>Lotes salvos</h2><span>Fila individual persistida no Supabase.</span></div></div>
        <div className="campaign-list">
          {campaigns.length === 0 ? <div className="empty">Nenhum lote criado.</div> : campaigns.map(campaign => {
            const recipients = campaign.recipients || [];
            const completed = Math.max(0, (campaign.total || recipients.length) - (campaign.pending || 0));
            const total = campaign.total || recipients.length || 0;
            const open = expandedId === campaign.id;
            return <article className="campaign-card" key={campaign.id}>
              <div className="campaign-card-head"><div><strong>{campaign.name}</strong><small>{campaign.group} · {campaign.pending || 0} pendentes de {total}</small></div><span className="pill">{campaign.status || 'rascunho'}</span></div>
              <p>{campaign.message}</p>
              <progress className="campaign-progress" value={completed} max={Math.max(total, 1)}/>
              <div className="campaign-metrics"><span><b>{campaign.sent || 0}</b> trabalhados</span><span><b>{campaign.replies || 0}</b> respostas</span><span><b>{campaign.conversions || 0}</b> conversões</span></div>
              <div className="campaign-actions">
                <button className="small-action" disabled={runningId === campaign.id || !(campaign.pending || 0)} onClick={() => run(campaign)}><Send size={15}/>{runningId === campaign.id ? 'Abrindo...' : 'Abrir próximo contato'}</button>
                <button className="small-action ghost" onClick={() => setExpandedId(open ? null : campaign.id)}>{open ? 'Fechar lote' : 'Gerenciar lote'}</button>
                <button className="danger-btn" onClick={() => onDelete(campaign.id)}><Trash2 size={15}/></button>
              </div>

              {open && <div className="campaign-recipient-list">
                {recipients.map(recipient => {
                  const reseller = resellerById.get(recipient.resellerId);
                  if (!reseller) return null;
                  const key = `${campaign.id}:${recipient.resellerId}`;
                  return <div className="campaign-recipient" key={recipient.id || key}>
                    <div><b>{reseller.nome}</b><small>{reseller.telefone} · {activityCycleStatus(reseller)}</small></div>
                    <select value={recipient.status || 'pendente'} disabled={updatingKey === key} onChange={event => updateRecipient(campaign, recipient.resellerId, event.target.value)}>
                      {recipientStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <span className={`recipient-status recipient-${recipient.status || 'pendente'}`}>{statusLabel(recipient.status)}</span>
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
