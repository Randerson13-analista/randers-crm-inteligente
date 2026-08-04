import React from 'react';
import {ShieldCheck} from 'lucide-react';
export default function Audit({entries}){return <section className="module-page"><article className="panel"><div className="panel-title"><h2>Auditoria</h2><ShieldCheck size={20}/></div><div className="audit-list">{entries.map(e=><div className="audit-row" key={e.id}><span>{new Date(e.date).toLocaleString('pt-BR')}</span><b>{e.user}</b><p>{e.action}</p></div>)}{!entries.length&&<div className="empty">Nenhuma ação registrada.</div>}</div></article></section>}
