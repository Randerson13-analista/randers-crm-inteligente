import React, { useMemo, useState } from 'react';
import {
  Clock3,
  Filter,
  MessageCircle,
  NotebookPen,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  classificationLabel,
  normalizeResellerClassification,
} from '../domain/portfolio';
import { openWhatsApp } from '../services/whatsapp';

const blankForm = {
  id: null,
  codigo: '',
  nome: '',
  telefone: '',
  cidade: '',
  bairro: '',
  fluxo: 'Atividade',
  segmentacao: 'Cobre',
  status: 'Pendente',
};

function resellerToForm(reseller) {
  const normalized = normalizeResellerClassification(reseller);
  const recovery = RECOVERY_GROUPS.includes(normalized.base);
  return {
    id: normalized.id,
    codigo: normalized.codigo || '',
    nome: normalized.nome || '',
    telefone: normalized.telefone || '',
    cidade: normalized.cidade || '',
    bairro: normalized.bairro || '',
    fluxo: recovery ? 'Recuperação' : 'Atividade',
    segmentacao: recovery ? normalized.base : normalized.nivel || 'Cobre',
    status: normalized.status || 'Pendente',
  };
}

function formToReseller(form) {
  const classification = form.fluxo === 'Recuperação'
    ? { base: form.segmentacao, nivel: '', atividade: form.segmentacao }
    : { base: 'Atividade', nivel: form.segmentacao, atividade: form.segmentacao };
  return normalizeResellerClassification({
    id: form.id,
    codigo: form.codigo.trim(),
    nome: form.nome.trim(),
    telefone: form.telefone.replace(/\D/g, ''),
    cidade: form.cidade.trim(),
    bairro: form.bairro.trim(),
    status: form.status,
    ...classification,
  });
}

export default function Wallet({
  revendedores = [],
  onCreate,
  onUpdate,
  onDelete,
  onTimeline,
  onNotify,
  whatsappTemplates,
  canManage = false,
}) {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('Todos');
  const [flow, setFlow] = useState('Todos');
  const [priority, setPriority] = useState('Todas');
  const [sort, setSort] = useState('score');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => revendedores
    .filter(reseller => {
      const normalized = normalizeResellerClassification(reseller);
      const haystack = `${normalized.nome} ${normalized.codigo} ${normalized.telefone} ${normalized.cidade}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesSegment = segment === 'Todos' || normalized.nivel === segment || normalized.base === segment;
      const isRecovery = RECOVERY_GROUPS.includes(normalized.base);
      const matchesFlow = flow === 'Todos'
        || (flow === 'Atividade' && normalized.base === 'Atividade')
        || (flow === 'Recuperação' && isRecovery);
      const matchesPriority = priority === 'Todas' || normalized.prioridade === priority;
      return matchesQuery && matchesSegment && matchesFlow && matchesPriority;
    })
    .sort((a, b) => {
      if (sort === 'score') return (b.score || 0) - (a.score || 0);
      if (sort === 'nome') return String(a.nome).localeCompare(String(b.nome));
      return String(a.cidade || '').localeCompare(String(b.cidade || ''));
    }), [revendedores, query, segment, flow, priority, sort]);

  const handleWhatsApp = reseller => {
    const result = openWhatsApp(reseller, { templates: whatsappTemplates });
    if (!result.valid) onNotify?.(result.error);
  };

  const submit = async event => {
    event.preventDefault();
    if (!form?.nome.trim()) return onNotify?.('Informe o nome do revendedor.');
    setSaving(true);
    try {
      const payload = formToReseller(form);
      if (payload.id) await onUpdate(payload.id, payload);
      else await onCreate(payload);
      setForm(null);
    } catch {
      // A mensagem de erro é exibida pelo App; mantemos o formulário aberto.
    } finally {
      setSaving(false);
    }
  };

  const remove = async reseller => {
    if (!window.confirm(`Excluir ${reseller.nome}? O histórico relacionado também poderá ser removido.`)) return;
    try { await onDelete(reseller.id); } catch { /* mensagem exibida pelo App */ }
  };

  return <section className="module-page">
    <div className="toolbar wallet-toolbar">
      <label className="search-box">
        <Search size={18}/>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome, código, telefone ou cidade"/>
      </label>
      <label><Filter size={17}/><select value={flow} onChange={event => setFlow(event.target.value)}>
        <option>Todos</option><option>Atividade</option><option>Recuperação</option>
      </select></label>
      <label><select value={segment} onChange={event => setSegment(event.target.value)}>
        <option>Todos</option>
        <optgroup label="Segmentações da Atividade">{ACTIVITY_SEGMENTS.map(item => <option key={item}>{item}</option>)}</optgroup>
        <optgroup label="Recuperação">{RECOVERY_GROUPS.map(item => <option key={item}>{item}</option>)}</optgroup>
      </select></label>
      <label><select value={priority} onChange={event => setPriority(event.target.value)}>
        <option>Todas</option><option>Alta</option><option>Média</option><option>Baixa</option>
      </select></label>
      <label><select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="score">Maior prioridade</option><option value="nome">Nome</option><option value="cidade">Cidade</option>
      </select></label>
      {canManage && <button className="primary" onClick={() => setForm(blankForm)}><Plus size={17}/>Novo revendedor</button>}
    </div>

    <div className="smart-summary">
      <Star size={18}/><b>{rows.filter(item => item.prioridade === 'Alta').length}</b> contatos de alta prioridade.
      <span>Atividade contém Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante.</span>
    </div>

    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>Revendedor</th><th>Cidade</th><th>Classificação</th><th>Responsável</th><th>Prioridade</th><th>Próxima ação</th><th>Status</th><th>Ações</th>
        </tr></thead>
        <tbody>{rows.map(reseller => <tr key={reseller.id}>
          <td><button className="link-button" onClick={() => onTimeline(reseller)}>{reseller.nome}</button><small>{reseller.codigo || 'Sem código'} · {reseller.telefone || 'Sem telefone'}</small></td>
          <td>{reseller.cidade || '—'}</td>
          <td><span className="pill">{classificationLabel(reseller)}</span></td>
          <td>{reseller.responsavel || 'Não atribuído'}</td>
          <td><div className="priority-cell"><span className={`priority priority-${(reseller.prioridade || 'Média').toLowerCase().replace('é', 'e')}`}>{reseller.prioridade || 'Média'}</span><small>{reseller.score || 0}/100</small></div></td>
          <td><b className="next-action">{reseller.nextAction}</b><small>{reseller.recommendedChannel} · {reseller.motivoPrioridade}</small></td>
          <td><select value={reseller.status} onChange={event => onUpdate(reseller.id, { status: event.target.value }).catch(() => {})}>
            <option>Pendente</option><option>Não atendeu</option><option>Em contato</option><option>Retorno</option><option>Negociando</option><option>Pedido</option><option>Convertido</option><option>Não converteu</option>
          </select></td>
          <td><div className="row-actions">
            <button className="small-action" onClick={() => handleWhatsApp(reseller)}><MessageCircle size={16}/>WhatsApp</button>
            <button className="small-action ghost" onClick={() => onTimeline(reseller)}><Clock3 size={16}/>Timeline</button>
            {canManage && <button className="small-action ghost" onClick={() => setForm(resellerToForm(reseller))}><NotebookPen size={16}/>Editar</button>}
            {canManage && <button className="danger-btn" onClick={() => remove(reseller)}><Trash2 size={15}/></button>}
          </div></td>
        </tr>)}</tbody>
      </table>
      {rows.length === 0 && <div className="empty">Nenhum revendedor encontrado.</div>}
    </div>

    {form && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setForm(null)}>
      <form className="modal-card reseller-form" onSubmit={submit}>
        <div className="panel-title"><div><small>Carteira real</small><h2>{form.id ? 'Editar revendedor' : 'Novo revendedor'}</h2></div><button type="button" className="icon-btn" onClick={() => setForm(null)}><X size={18}/></button></div>
        <div className="form-row"><label>Nome<input value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label><label>Código<input value={form.codigo} onChange={event => setForm({ ...form, codigo: event.target.value })}/></label></div>
        <div className="form-row"><label>Telefone<input value={form.telefone} onChange={event => setForm({ ...form, telefone: event.target.value })}/></label><label>Cidade<input value={form.cidade} onChange={event => setForm({ ...form, cidade: event.target.value })}/></label></div>
        <label>Bairro<input value={form.bairro} onChange={event => setForm({ ...form, bairro: event.target.value })}/></label>
        <div className="form-row">
          <label>Fluxo<select value={form.fluxo} onChange={event => setForm({ ...form, fluxo: event.target.value, segmentacao: event.target.value === 'Atividade' ? 'Cobre' : 'I6' })}><option>Atividade</option><option>Recuperação</option></select></label>
          <label>{form.fluxo === 'Atividade' ? 'Segmentação da Atividade' : 'Grupo de recuperação'}<select value={form.segmentacao} onChange={event => setForm({ ...form, segmentacao: event.target.value })}>{(form.fluxo === 'Atividade' ? ACTIVITY_SEGMENTS : RECOVERY_GROUPS).map(item => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option>Pendente</option><option>Em contato</option><option>Retorno</option><option>Convertido</option><option>Não converteu</option></select></label>
        <button className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar revendedor'}</button>
      </form>
    </div>}
  </section>;
}
