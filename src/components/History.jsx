import React, { useMemo, useState } from 'react';
import { MessageCircle, NotebookPen, Phone } from 'lucide-react';

export default function History({ history = [], revendedores = [], user, onAdd }) {
  const [form, setForm] = useState({ revendedorId: '', canal: 'WhatsApp', resultado: 'Em contato', observacao: '' });
  const manager = ['Administrador', 'Gerente'].includes(user.cargo);
  const visible = useMemo(() => history
    .filter(item => manager || item.userId === user.id)
    .sort((a, b) => new Date(b.data) - new Date(a.data)), [history, user, manager]);

  const submit = event => {
    event.preventDefault();
    if (!form.revendedorId) return;
    onAdd({ ...form, id: crypto.randomUUID(), userId: user.id, usuario: user.nome, data: new Date().toISOString() });
    setForm(current => ({ ...current, revendedorId: '', observacao: '' }));
  };
  const name = id => revendedores.find(item => item.id === id)?.nome || 'Revendedor removido';

  return <section className="module-page"><div className="history-grid">
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-title"><h2>Registrar atendimento</h2><NotebookPen size={20}/></div>
      <label>Revendedor<select value={form.revendedorId} onChange={event => setForm({ ...form, revendedorId: event.target.value })}><option value="">Selecione</option>{revendedores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <div className="form-row"><label>Canal<select value={form.canal} onChange={event => setForm({ ...form, canal: event.target.value })}><option>WhatsApp</option><option>Ligação</option><option>Visita</option><option>Outro</option></select></label><label>Resultado<select value={form.resultado} onChange={event => setForm({ ...form, resultado: event.target.value })}><option>Não atendeu</option><option>Em contato</option><option>Retorno</option><option>Negociando</option><option>Pedido</option><option>Convertido</option><option>Não converteu</option></select></label></div>
      <label>Observação<textarea value={form.observacao} onChange={event => setForm({ ...form, observacao: event.target.value })}/></label>
      <button className="primary">Salvar atendimento</button>
    </form>
    <article className="panel">
      <div className="panel-title"><h2>{manager ? 'Linha do tempo da equipe' : 'Minha linha do tempo'}</h2><span>{visible.length}</span></div>
      <div className="timeline">{visible.map(item => <div className="timeline-item" key={item.id}>
        <span className="timeline-icon">{item.canal === 'Ligação' ? <Phone size={17}/> : <MessageCircle size={17}/>}</span>
        <div><b>{name(item.revendedorId)} · {item.resultado}</b><small>{new Date(item.data).toLocaleString('pt-BR')} · {item.usuario}</small><p>{item.observacao || 'Sem observação.'}</p></div>
      </div>)}{!visible.length && <div className="empty">Nenhum atendimento registrado.</div>}</div>
    </article>
  </div></section>;
}
