import React, { useMemo, useState } from 'react';
import { BarChart3, Eye, Megaphone, Plus, Send, Trash2, Users } from 'lucide-react';
import { matchesCampaign } from '../services/intelligence';
import { ACTIVITY_SEGMENTS, RECOVERY_GROUPS, WALLET_LABELS } from '../domain/portfolio';

const groups = ['Todos', WALLET_LABELS.recovery, WALLET_LABELS.standard, WALLET_LABELS.vip, ...ACTIVITY_SEGMENTS, ...RECOVERY_GROUPS];

export default function Campaigns({ campaigns = [], revendedores = [], onAdd, onDelete, onRun }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Todos');
  const [message, setMessage] = useState('Olá, {nome}! Temos novidades para sua atividade {nivel} neste ciclo. Posso te apresentar?');
  const [preview, setPreview] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [error, setError] = useState('');

  const audience = useMemo(
    () => revendedores.filter(reseller => matchesCampaign(reseller, group) && reseller.telefone),
    [revendedores, group],
  );
  const sample = audience[0];
  const rendered = sample
    ? message
      .replaceAll('{nome}', sample.nome || '')
      .replaceAll('{cidade}', sample.cidade || '')
      .replaceAll('{nivel}', sample.nivel || '')
      .replaceAll('{base}', sample.base || '')
    : message;

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !message.trim()) return setError('Informe o nome e a mensagem da campanha.');
    if (!audience.length) return setError('Nenhum revendedor com telefone válido corresponde ao público selecionado.');
    try {
      await onAdd({
        name: name.trim(),
        group,
        message: message.trim(),
        status: 'rascunho',
        resellerIds: audience.map(item => item.id),
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
    try {
      await onRun(campaign);
    } finally {
      setRunningId(null);
    }
  };

  return <div className="module-page">
    <div className="campaign-kpis">
      <div><Send/><b>{totals.sent}</b><span>Contatos abertos</span></div>
      <div><Users/><b>{totals.replies}</b><span>Respostas registradas</span></div>
      <div><BarChart3/><b>{totals.conversions}</b><span>Conversões atribuídas</span></div>
    </div>

    <div className="campaign-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="panel-title"><div><h2>Nova campanha</h2><span>Crie mensagens por carteira real.</span></div><Megaphone/></div>
        <label>Nome<input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Oportunidades do ciclo"/></label>
        <label>Público<select value={group} onChange={event => setGroup(event.target.value)}>{groups.map(item => <option key={item}>{item}</option>)}</select><small>Você pode selecionar um grupo de trabalho ou uma segmentação específica dentro de Atividade.</small></label>
        <label>Mensagem<textarea value={message} onChange={event => setMessage(event.target.value)} rows="7"/></label>
        <div className="template-help"><b>Variáveis:</b> {'{nome}'}, {'{cidade}'}, {'{nivel}'}, {'{base}'}</div>
        <div className="audience-preview"><Users size={18}/><b>{audience.length}</b> revendedores com telefone válido</div>
        <button type="button" className="secondary-btn" onClick={() => setPreview(value => !value)}><Eye size={17}/>{preview ? 'Ocultar prévia' : 'Ver prévia'}</button>
        {preview && <div className="message-preview"><small>Prévia para {sample?.nome || 'um contato'}</small><p>{rendered}</p></div>}
        {error && <div className="form-error">{error}</div>}
        <button className="primary" type="submit"><Plus size={17}/>Salvar campanha e público</button>
      </form>

      <section className="panel">
        <div className="panel-title"><div><h2>Campanhas salvas</h2><span>Fila individual persistida no Supabase.</span></div></div>
        <div className="campaign-list">
          {campaigns.length === 0 ? <div className="empty">Nenhuma campanha criada.</div> : campaigns.map(campaign => <article className="campaign-card" key={campaign.id}>
            <div className="campaign-card-head"><div><strong>{campaign.name}</strong><small>{campaign.group} · {campaign.pending || 0} pendentes</small></div><span className="pill">{campaign.status || 'rascunho'}</span></div>
            <p>{campaign.message}</p>
            <div className="campaign-metrics"><span><b>{campaign.sent || 0}</b> abertos</span><span><b>{campaign.replies || 0}</b> respostas</span><span><b>{campaign.conversions || 0}</b> conversões</span></div>
            <div className="campaign-actions">
              <button className="small-action" disabled={runningId === campaign.id} onClick={() => run(campaign)}><Send size={15}/>{runningId === campaign.id ? 'Abrindo...' : 'Abrir próximo contato'}</button>
              <button className="danger-btn" onClick={() => onDelete(campaign.id)}><Trash2 size={15}/></button>
            </div>
          </article>)}
        </div>
      </section>
    </div>
  </div>;
}
