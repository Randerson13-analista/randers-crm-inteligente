import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Closet from './components/Closet';
import ClosetErrorBoundary from './components/ClosetErrorBoundary';
import Dashboard from './components/Dashboard';
import Wallet from './components/Wallet';
import Importer from './components/Importer';
import SupabaseLogin from './components/SupabaseLogin';
import Agenda from './components/Agenda';
import History from './components/History';
import Admin from './components/Admin';
import GoalsRanking from './components/GoalsRanking';
import ManagerPanel from './components/ManagerPanel';
import Audit from './components/Audit';
import Notifications from './components/Notifications';
import Campaigns from './components/Campaigns';
import Reports from './components/Reports';
import RevTimeline from './components/RevTimeline';
import Sync from './components/Sync';
import Achievements from './components/Achievements';
import AvatarPreview from './components/AvatarPreview';
import { Bell, LogOut } from 'lucide-react';
import { loadState, saveState } from './services/storage';
import { scoreRevendedor, matchesCampaign } from './services/intelligence';
import { distributeWallets } from './services/assignment';
import { getCurrentSession, loadAppUser, onAuthStateChange, signOut } from './services/auth';
import { inviteCollaborator, listOrganizationUsers, updateMembership } from './services/team';
import {
  createCampaign,
  createInteraction,
  createTask,
  deleteCampaign,
  importResellers,
  loadCrmData,
  logAudit,
  saveAvatar,
  saveGoal,
  updateReseller,
  updateTask,
} from './services/crm';

const allowed = (reseller, wallet) =>
  !wallet ||
  wallet === 'Todas' ||
  (wallet === 'Recuperação' && ['I6', 'Cessados', 'Intenções'].includes(reseller.base)) ||
  (wallet === 'Cobre a Ouro' && ['Cobre', 'Bronze', 'Prata', 'Ouro'].includes(reseller.nivel)) ||
  (wallet === 'VIP' && ['Platina', 'Rubi', 'Esmeralda', 'Diamante'].includes(reseller.nivel));

const titles = {
  Dashboard: ['Dashboard', 'Visão geral da sua operação e carteira.'],
  Carteira: ['Carteira', 'Pesquise, filtre e trabalhe seus revendedores.'],
  Agenda: ['Agenda', 'Organize retornos e compromissos.'],
  Histórico: ['Histórico', 'Registre e consulte todos os atendimentos.'],
  'Metas e ranking': ['Metas e ranking', 'Acompanhe metas e desempenho da equipe.'],
  'Painel do gestor': ['Painel do gestor', 'Analise produtividade, conversões e atrasos.'],
  Campanhas: ['Campanhas', 'Crie abordagens e públicos para o WhatsApp.'],
  Relatórios: ['Relatórios', 'Exporte dados e acompanhe resultados.'],
  'Importar planilhas': ['Importar planilhas', 'Envie suas bases e deixe o CRM classificá-las.'],
  Sincronização: ['Sincronização', 'Acompanhe a conexão e os dados em nuvem.'],
  'Meu Closet': ['Meu Closet Boti', 'Crie um avatar único e mostre seu estilo no Randers’CRM.'],
  'Meu perfil': ['Meu perfil', 'Acompanhe nível, moedas e conquistas.'],
  Administração: ['Administração', 'Cadastre colaboradores e distribua carteiras.'],
  Auditoria: ['Auditoria', 'Consulte as principais ações realizadas no sistema.'],
};

export default function App() {
  const [active, setActive] = useState('Dashboard');
  const [state, setState] = useState(() => loadState());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedRev, setSelectedRev] = useState(null);

  useEffect(() => saveState(state), [state]);

  const notify = text => {
    setToast(text);
    window.setTimeout(() => setToast(''), 3000);
  };

  const hydrate = async appUser => {
    setDataLoading(true);
    try {
      const team = await listOrganizationUsers(appUser.organizationId);
      const isManager = ['Administrador', 'Gerente'].includes(appUser.cargo);
      const crmData = await loadCrmData(appUser.organizationId, team, isManager);
      setState(current => ({ ...current, ...crmData, users: team }));
    } finally {
      setDataLoading(false);
    }
  };

  const authenticate = async authUser => {
    setAuthLoading(true);
    try {
      const appUser = await loadAppUser(authUser);
      setUser(appUser);
      setAuthError('');
      await hydrate(appUser);
      await logAudit(appUser.organizationId, appUser.id, 'Entrou no sistema.');
      notify(`Bem-vindo, ${appUser.nome}!`);
    } catch (error) {
      setAuthError(error.message || 'Não foi possível carregar seu perfil.');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const applySession = async session => {
      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const appUser = await loadAppUser(session.user);
        if (!mounted) return;
        setUser(appUser);
        setAuthError('');
        await hydrate(appUser);
      } catch (error) {
        if (!mounted) return;
        setUser(null);
        setAuthError(error.message || 'Não foi possível carregar seu perfil.');
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    getCurrentSession()
      .then(applySession)
      .catch(error => {
        if (mounted) {
          setAuthError(error.message || 'Falha ao verificar a sessão.');
          setAuthLoading(false);
        }
      });
    const subscription = onAuthStateChange(session => applySession(session));
    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const refreshAll = async () => {
    if (!user) return;
    await hydrate(user);
  };

  const refreshTeam = async organizationId => {
    if (!organizationId) return;
    setTeamLoading(true);
    try {
      const team = await listOrganizationUsers(organizationId);
      setState(current => ({ ...current, users: team }));
    } catch (error) {
      notify(error.message || 'Não foi possível carregar a equipe.');
    } finally {
      setTeamLoading(false);
    }
  };

  const distributedRev = useMemo(
    () => distributeWallets(state.revendedores, state.users),
    [state.revendedores, state.users],
  );

  const visibleRev = useMemo(
    () =>
      distributedRev
        .filter(reseller => {
          if (!allowed(reseller, user?.carteira)) return false;
          if (['Administrador', 'Gerente'].includes(user?.cargo) || user?.carteira === 'Todas') return true;
          return reseller.responsavelId === user?.id;
        })
        .map(reseller => ({ ...reseller, ...scoreRevendedor(reseller, state.history, state.agenda) })),
    [distributedRev, state.history, state.agenda, user],
  );

  const overdue = useMemo(
    () =>
      state.agenda.filter(item =>
        item.status !== 'Concluído' &&
        new Date(`${item.data}T${item.hora || '23:59'}`) < new Date() &&
        (['Administrador', 'Gerente'].includes(user?.cargo) || item.responsavelId === user?.id),
      ),
    [state.agenda, user],
  );

  const notifications = [
    ...overdue.slice(0, 5).map(item => ({
      id: item.id,
      title: 'Retorno atrasado',
      text: `${item.responsavel}: ${item.data} às ${item.hora}`,
    })),
    ...visibleRev
      .filter(reseller => reseller.status === 'Retorno')
      .slice(0, 3)
      .map(reseller => ({ id: `r-${reseller.id}`, title: 'Revendedor aguardando retorno', text: reseller.nome })),
  ];

  const audit = async (action, entityType = null, entityId = null, details = {}) => {
    if (!user) return;
    await logAudit(user.organizationId, user.id, action, entityType, entityId, details);
    if (['Administrador', 'Gerente'].includes(user.cargo)) {
      setState(current => ({
        ...current,
        audit: [{ id: crypto.randomUUID(), date: new Date().toISOString(), user: user.nome, action, details }, ...current.audit],
      }));
    }
  };

  const handleUpdateReseller = async (id, patch) => {
    try {
      await updateReseller(id, patch);
      setState(current => ({
        ...current,
        revendedores: current.revendedores.map(item => (item.id === id ? { ...item, ...patch } : item)),
      }));
      await audit('Atualizou um revendedor.', 'reseller', id, patch);
      notify('Revendedor atualizado.');
    } catch (error) {
      notify(error.message || 'Não foi possível atualizar o revendedor.');
    }
  };

  const handleImport = async (rows, importHistory) => {
    try {
      const created = await importResellers(rows, user.organizationId, user.id, importHistory?.[0]?.name || 'Planilha importada');
      await audit(`Importou ${created.length} revendedores.`, 'import');
      notify(`${created.length} registros importados para o Supabase.`);
      await refreshAll();
    } catch (error) {
      notify(error.message || 'Não foi possível importar a planilha.');
    }
  };

  const handleAddTask = async item => {
    try {
      await createTask({ ...item, responsavelId: user.id }, user.organizationId, user.id);
      await audit('Criou um retorno na agenda.', 'task');
      notify('Retorno agendado.');
      await refreshAll();
    } catch (error) {
      notify(error.message || 'Não foi possível criar o retorno.');
    }
  };

  const handleUpdateTask = async (id, patch) => {
    try {
      await updateTask(id, patch);
      setState(current => ({
        ...current,
        agenda: current.agenda.map(item => (item.id === id ? { ...item, ...patch } : item)),
      }));
      await audit('Atualizou um retorno da agenda.', 'task', id, patch);
    } catch (error) {
      notify(error.message || 'Não foi possível atualizar o retorno.');
    }
  };

  const handleInteraction = async item => {
    try {
      await createInteraction(item, user.organizationId, user.id);
      await audit(`Registrou atendimento: ${item.resultado}.`, 'interaction', item.revendedorId);
      notify('Atendimento registrado.');
      await refreshAll();
    } catch (error) {
      notify(error.message || 'Não foi possível registrar o atendimento.');
    }
  };

  const handleGoal = async (id, goal) => {
    try {
      await saveGoal(id, goal, user.organizationId, user.id);
      setState(current => ({ ...current, goals: { ...current.goals, [id]: goal } }));
      await audit('Alterou metas de um colaborador.', 'goal', id, goal);
      notify('Meta salva.');
    } catch (error) {
      notify(error.message || 'Não foi possível salvar a meta.');
    }
  };

  if (authLoading || (user && dataLoading)) {
    return <div className="auth-loading"><img src="/brain.svg" alt="Randers CRM"/><strong>Carregando seu acesso...</strong></div>;
  }

  if (!user) {
    return <><SupabaseLogin onAuthenticated={authenticate}/>{authError && <div className="global-auth-error">{authError}</div>}</>;
  }

  const [title, subtitle] = titles[active] || [active, 'Módulo em preparação.'];
  let content = <div className="placeholder"><h2>{active}</h2><p>Este módulo será conectado em uma próxima versão.</p></div>;

  if (active === 'Dashboard') {
    content = <Dashboard revendedores={visibleRev} history={state.history} agenda={state.agenda}/>;
  } else if (active === 'Carteira') {
    content = <Wallet revendedores={visibleRev} onUpdate={handleUpdateReseller} onTimeline={setSelectedRev}/>;
  } else if (active === 'Importar planilhas') {
    content = <Importer onImport={handleImport} imports={state.imports}/>;
  } else if (active === 'Meu Closet') {
    content = <ClosetErrorBoundary><Closet initialAvatar={user.avatarConfig} coins={user.coins || 0} onSave={async avatar => {
      try {
        await saveAvatar(user.id, avatar);
        setUser(current => ({ ...current, avatarConfig: avatar }));
        setState(current => ({ ...current, users: current.users.map(item => item.id === user.id ? { ...item, avatarConfig: avatar } : item) }));
        await audit('Atualizou o avatar.', 'profile', user.id);
        notify('Avatar salvo no Supabase.');
      } catch (error) {
        notify(error.message || 'Não foi possível salvar o avatar.');
      }
    }}/></ClosetErrorBoundary>;
  } else if (active === 'Meu perfil') {
    content = <Achievements user={user} history={state.history}/>;
  } else if (active === 'Agenda') {
    content = <Agenda agenda={state.agenda} revendedores={visibleRev} user={user} onAdd={handleAddTask} onUpdate={handleUpdateTask}/>;
  } else if (active === 'Histórico') {
    content = <History history={state.history} revendedores={visibleRev} user={user} onAdd={handleInteraction}/>;
  } else if (active === 'Campanhas') {
    content = <Campaigns campaigns={state.campaigns || []} revendedores={visibleRev} onAdd={async campaign => {
      try {
        await createCampaign(campaign, user.organizationId, user.id);
        await audit(`Criou a campanha ${campaign.name}.`, 'campaign');
        notify('Campanha salva.');
        await refreshAll();
      } catch (error) {
        notify(error.message || 'Não foi possível criar a campanha.');
      }
    }} onDelete={async id => {
      try {
        await deleteCampaign(id);
        await audit('Excluiu uma campanha.', 'campaign', id);
        setState(current => ({ ...current, campaigns: current.campaigns.filter(item => item.id !== id) }));
      } catch (error) {
        notify(error.message || 'Não foi possível excluir a campanha.');
      }
    }} onRun={campaign => {
      const target = visibleRev.find(reseller => matchesCampaign(reseller, campaign.group) && reseller.telefone);
      if (!target) return notify('Nenhum contato válido para esta campanha.');
      const raw = String(target.telefone).replace(/\D/g, '');
      const phone = raw.startsWith('55') ? raw : `55${raw}`;
      const message = campaign.message.replaceAll('{nome}', target.nome || '').replaceAll('{cidade}', target.cidade || '').replaceAll('{nivel}', target.nivel || '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }}/>;
  } else if (active === 'Sincronização') {
    content = <Sync state={state} user={user} notify={notify} audit={audit} onRestore={refreshAll}/>;
  } else if (active === 'Relatórios') {
    content = <Reports revendedores={visibleRev} history={state.history} agenda={state.agenda}/>;
  } else if (active === 'Metas e ranking') {
    content = <GoalsRanking users={state.users} history={state.history} goals={state.goals || {}} currentUser={user} onGoalChange={handleGoal}/>;
  } else if (active === 'Painel do gestor') {
    content = <ManagerPanel users={state.users} history={state.history} agenda={state.agenda}/>;
  } else if (active === 'Administração' && user.cargo === 'Administrador') {
    content = <Admin users={state.users} revendedores={distributedRev} loading={teamLoading} onInvite={async form => {
      await inviteCollaborator({ organizationId: user.organizationId, ...form });
      await audit(`Convidou ${form.nome}.`, 'membership');
      notify('Convite enviado por e-mail.');
      await refreshTeam(user.organizationId);
    }} onUpdate={async (id, patch) => {
      await updateMembership(id, patch, user.organizationId);
      setState(current => ({ ...current, users: current.users.map(item => item.id === id ? { ...item, ...patch } : item) }));
      await audit('Atualizou um colaborador.', 'membership', id, patch);
      notify('Colaborador atualizado.');
    }} onDistribute={async () => {
      notify('A distribuição será gravada no banco na próxima etapa.');
    }}/>;
  } else if (active === 'Auditoria' && user.cargo === 'Administrador') {
    content = <Audit entries={state.audit || []}/>;
  }

  return <div className="app-shell">
    <Sidebar active={active} onChange={setActive} user={user}/>
    <main className="main">
      <header>
        <div><small>{active === 'Meu Closet' ? 'Perfil' : 'Randers’CRM'}</small><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="header-actions">
          <div className="notification-wrap">
            <button className="icon-btn" onClick={() => setShowNotifs(value => !value)}><Bell size={20}/>{notifications.length > 0 && <i className="notification-badge">{notifications.length}</i>}</button>
            {showNotifs && <Notifications items={notifications} onClose={() => setShowNotifs(false)}/>} 
          </div>
          <div className="header-user"><span><AvatarPreview compact avatar={user.avatarConfig}/></span><div><b>{user.nome}</b><small>{user.cargo}</small></div></div>
          <button className="logout" onClick={async () => {
            await audit('Saiu do sistema.');
            try { await signOut(); } finally { setUser(null); setActive('Dashboard'); }
          }}><LogOut size={17}/>Sair</button>
        </div>
      </header>
      {content}
      {toast && <div className="toast">{toast}</div>}
      {selectedRev && <RevTimeline revendedor={selectedRev} history={state.history} agenda={state.agenda} onClose={() => setSelectedRev(null)}/>} 
    </main>
  </div>;
}
