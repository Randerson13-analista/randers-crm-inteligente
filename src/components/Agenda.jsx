import React, { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, MessageCircle } from 'lucide-react';

export default function Agenda({ agenda = [], revendedores = [], user, onAdd, onUpdate }) {
  const [form, setForm] = useState({ revendedorId: '', data: new Date().toISOString().slice(0, 10), hora: '09:00', observacao: '' });
  const manager = ['Administrador', 'Gerente'].includes(user.cargo);
  const visible = useMemo(() => agenda
    .filter(item => manager || item.responsavelId === user.id)
    .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`)), [agenda, user, manager]);

  const submit = event => {
    event.preventDefault();
    if (!form.revendedorId) return;
    const reseller = revendedores.find(item => item.id === form.revendedorId);
    onAdd({
      ...form,
      id: crypto.randomUUID(),
      responsavelId: reseller?.responsavelId || user.id,
      responsavel: reseller?.responsavel || user.nome,
      status: 'Pendente',
    });
    setForm(current => ({ ...current, revendedorId: '', observacao: '' }));
  };

  const name = id => revendedores.find(item => item.id === id)?.nome || 'Revendedor removido';

  return <section className="module-page"><div className="agenda-grid">
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title"><h2>Novo retorno</h2><CalendarPlus size={20}/></div>
      <label>Revendedor<select value={form.revendedorId} onChange={event => setForm({ ...form, revendedorId: event.target.value })}><option value="">Selecione</option>{revendedores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <div className="form-row"><label>Data<input type="date" value={form.data} onChange={event => setForm({ ...form, data: event.target.value })}/></label><label>Hora<input type="time" value={form.hora} onChange={event => setForm({ ...form, hora: event.target.value })}/></label></div>
      <label>Observação<textarea value={form.observacao} onChange={event => setForm({ ...form, observacao: event.target.value })}/></label>
      <button className="primary">Agendar retorno</button>
    </form>
    <article className="panel">
      <div className="panel-title"><h2>{manager ? 'Retornos da equipe' : 'Meus retornos'}</h2><span>{visible.length}</span></div>
      <div className="agenda-list">{visible.map(item => <div className={`agenda-item ${item.status === 'Concluído' ? 'done' : ''}`} key={item.id}>
        <div className="agenda-date"><b>{new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</b><span>{item.hora}</span></div>
        <div><b>{name(item.revendedorId)}</b><small>{item.observacao || 'Sem observação'} · {item.responsavel}</small></div>
        <button className="small-action" onClick={() => onUpdate(item.id, { status: item.status === 'Concluído' ? 'Pendente' : 'Concluído' })}>{item.status === 'Concluído' ? <MessageCircle size={16}/> : <CheckCircle2 size={16}/>} {item.status}</button>
      </div>)}{!visible.length && <div className="empty">Nenhum retorno agendado.</div>}</div>
    </article>
  </div></section>;
}
