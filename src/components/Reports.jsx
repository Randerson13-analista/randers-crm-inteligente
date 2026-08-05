import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Megaphone,
  MessageCircle,
  Phone,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ACTIVITY_SEGMENTS, RECOVERY_GROUPS, activityCycleStatus, classificationLabel } from '../domain/portfolio';
import {
  campaignAudienceLabel,
  campaignStatusLabel,
  campaignSummary,
  filterCampaigns,
  recipientStatusLabel,
} from '../services/campaignAnalytics';

const csv = rows => rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
const save = (name, text) => {
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const formatDate = value => value ? new Date(value).toLocaleString('pt-BR') : '';

export default function Reports({ revendedores = [], history = [], agenda = [], campaigns = [] }) {
  const [period, setPeriod] = useState('Todos');
  const filteredHistory = useMemo(() => {
    if (period === 'Todos') return history;
    const cutoff = Date.now() - Number(period) * 86400000;
    return history.filter(item => new Date(item.data).getTime() >= cutoff);
  }, [history, period]);
  const filteredCampaigns = useMemo(() => filterCampaigns(campaigns, { period }), [campaigns, period]);
  const campaignStats = useMemo(() => campaignSummary(filteredCampaigns), [filteredCampaigns]);

  const stats = useMemo(() => ({
    total: revendedores.length,
    converted: revendedores.filter(item => item.status === 'Convertido').length,
    contacts: filteredHistory.length,
    calls: filteredHistory.filter(item => item.canal === 'Ligação').length,
    whats: filteredHistory.filter(item => item.canal === 'WhatsApp').length,
    overdue: agenda.filter(item => item.status !== 'Concluído' && new Date(`${item.data}T${item.hora || '23:59'}`) < new Date()).length,
  }), [revendedores, filteredHistory, agenda]);

  const byFlow = useMemo(() => Object.entries(revendedores.reduce((result, reseller) => {
    const key = RECOVERY_GROUPS.includes(reseller.base) ? reseller.base : 'Atividade';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]), [revendedores]);

  const bySegment = useMemo(() => ACTIVITY_SEGMENTS
    .map(segment => [segment, revendedores.filter(item => item.base === 'Atividade' && item.nivel === segment).length])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]), [revendedores]);

  const byUser = useMemo(() => Object.entries(filteredHistory.reduce((result, item) => {
    const key = item.usuario || 'Sem usuário';
    result[key] ||= { contacts: 0, conversions: 0 };
    result[key].contacts += 1;
    if (item.resultado === 'Convertido') result[key].conversions += 1;
    return result;
  }, {})).sort((a, b) => b[1].conversions - a[1].conversions || b[1].contacts - a[1].contacts), [filteredHistory]);

  const campaignPerformance = useMemo(() => filteredCampaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    total: campaign.total || campaign.recipients?.length || 0,
    worked: campaign.sent || 0,
    replies: campaign.replies || 0,
    conversions: campaign.conversions || 0,
    status: campaign.status,
  })).sort((a, b) => b.conversions - a.conversions || b.replies - a.replies || b.worked - a.worked), [filteredCampaigns]);

  const resellerById = useMemo(() => new Map(revendedores.map(item => [item.id, item])), [revendedores]);

  const exportWallet = () => save('carteira-randerscrm.csv', csv([
    ['Código', 'Nome', 'Telefone', 'Cidade', 'Fluxo', 'Segmentação da Atividade', 'Classificação', 'Responsável', 'Status'],
    ...revendedores.map(item => [item.codigo, item.nome, item.telefone, item.cidade, item.base, item.nivel, classificationLabel(item), item.responsavel, item.status]),
  ]));
  const exportHistory = () => save('historico-randerscrm.csv', csv([
    ['Data', 'Revendedor', 'Usuário', 'Canal', 'Resultado', 'Observação'],
    ...filteredHistory.map(item => [item.data, resellerById.get(item.revendedorId)?.nome || '', item.usuario, item.canal, item.resultado, item.observacao]),
  ]));
  const exportCampaigns = () => save('campanhas-randerscrm.csv', csv([
    ['Lote', 'Criado em', 'Criado por', 'Situação do lote', 'Público', 'Contato', 'Telefone', 'Cidade', 'Fluxo', 'Segmentação', 'Situação no ciclo', 'Responsável', 'Situação do contato', 'Trabalhado em', 'Respondido em', 'Convertido em'],
    ...filteredCampaigns.flatMap(campaign => (campaign.recipients || []).map(recipient => {
      const reseller = resellerById.get(recipient.resellerId) || {};
      return [campaign.name, formatDate(campaign.createdAt), campaign.createdByName, campaignStatusLabel(campaign.status), campaignAudienceLabel(campaign), reseller.nome || '', reseller.telefone || '', reseller.cidade || '', reseller.base || '', reseller.nivel || '', reseller.id ? activityCycleStatus(reseller) : '', reseller.responsavel || '', recipientStatusLabel(recipient.status), formatDate(recipient.sentAt), formatDate(recipient.repliedAt), formatDate(recipient.convertedAt)];
    })),
  ]));

  return <div className="module-page">
    <div className="report-toolbar"><div><b>Período dos atendimentos e campanhas</b><small>Os dados da carteira permanecem atuais.</small></div><select value={period} onChange={event => setPeriod(event.target.value)}><option>Todos</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div>
    <div className="report-kpis report-kpis-eight">
      <div className="report-kpi"><Users/><div><b>{stats.total}</b><span>Revendedores</span></div></div>
      <div className="report-kpi"><CheckCircle2/><div><b>{stats.converted}</b><span>Convertidos</span></div></div>
      <div className="report-kpi"><TrendingUp/><div><b>{stats.contacts}</b><span>Atendimentos</span></div></div>
      <div className="report-kpi"><Phone/><div><b>{stats.calls}</b><span>Ligações</span></div></div>
      <div className="report-kpi"><MessageCircle/><div><b>{stats.whats}</b><span>WhatsApps</span></div></div>
      <div className="report-kpi"><Megaphone/><div><b>{campaignStats.worked}</b><span>Contatos em lotes</span></div></div>
      <div className="report-kpi"><TrendingUp/><div><b>{campaignStats.replyRate}%</b><span>Respostas de campanha</span></div></div>
      <div className="report-kpi"><Clock3/><div><b>{stats.overdue}</b><span>Retornos atrasados</span></div></div>
    </div>
    <div className="report-grid">
      <section className="panel"><div className="panel-title"><div><h2>Fluxos operacionais</h2><span>Atividade e Recuperação.</span></div></div><div className="bar-list">{byFlow.map(([label, value]) => <div key={label}><div><b>{label}</b><span>{value}</span></div><progress max={Math.max(...byFlow.map(([, amount]) => amount), 1)} value={value}/></div>)}</div></section>
      <section className="panel"><div className="panel-title"><div><h2>Segmentações da Atividade</h2><span>Cobre a Diamante.</span></div></div><div className="bar-list">{bySegment.length ? bySegment.map(([label, value]) => <div key={label}><div><b>{label}</b><span>{value}</span></div><progress max={Math.max(...bySegment.map(([, amount]) => amount), 1)} value={value}/></div>) : <div className="empty">Sem segmentações importadas.</div>}</div></section>
      <section className="panel"><div className="panel-title"><div><h2>Desempenho por colaborador</h2><span>Atendimentos e conversões no período.</span></div></div><div className="performance-list">{byUser.length === 0 ? <div className="empty">Sem atendimentos no período.</div> : byUser.map(([name, data]) => <div key={name}><div><b>{name}</b><small>{data.contacts} atendimentos</small></div><span>{data.conversions} conversões</span></div>)}</div></section>
      <section className="panel"><div className="panel-title"><div><h2>Resultados das campanhas</h2><span>{campaignStats.campaigns} lotes · {campaignStats.total} contatos no período.</span></div><Megaphone/></div><div className="campaign-report-summary"><span><b>{campaignStats.worked}</b> trabalhados</span><span><b>{campaignStats.responses}</b> respostas</span><span><b>{campaignStats.conversions}</b> conversões</span><span><b>{campaignStats.blocked}</b> opt-outs</span></div><div className="performance-list">{campaignPerformance.length === 0 ? <div className="empty">Sem campanhas no período.</div> : campaignPerformance.slice(0, 10).map(item => <div key={item.id}><div><b>{item.name}</b><small>{campaignStatusLabel(item.status)} · {item.worked}/{item.total} trabalhados</small></div><span>{item.replies} resp. · {item.conversions} conv.</span></div>)}</div></section>
      <section className="panel export-panel"><div className="panel-title"><div><h2>Exportações</h2><span>Arquivos compatíveis com Excel.</span></div><FileSpreadsheet/></div><div className="export-actions"><button className="primary" onClick={exportWallet}><Download size={17}/>Exportar carteira</button><button className="secondary-btn" onClick={exportHistory}><Download size={17}/>Exportar histórico</button><button className="secondary-btn" onClick={exportCampaigns} disabled={!filteredCampaigns.length}><Download size={17}/>Exportar campanhas</button></div><p className="muted-note">Os relatórios respeitam os registros visíveis do usuário conectado.</p></section>
      <section className="panel campaign-compliance-panel"><div className="panel-title"><div><h2>Consentimento e bloqueios</h2><span>Proteção para campanhas futuras.</span></div><ShieldCheck/></div><div className="campaign-compliance-number">{campaignStats.blocked}</div><p>contatos marcaram que não desejam mensagens e são excluídos automaticamente de novos lotes.</p></section>
    </div>
  </div>;
}
