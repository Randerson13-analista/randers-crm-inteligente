import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Cloud,
  FileText,
  History,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Trophy,
  Upload,
  UserCircle,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import ProfilePhoto from './ProfilePhoto';

const navigationGroups = [
  {
    id: 'atendimento',
    label: 'Atendimento',
    items: [
      [WalletCards, 'Carteira'],
      [CalendarDays, 'Agenda'],
      [History, 'Histórico'],
      [Megaphone, 'Campanhas'],
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      [Trophy, 'Metas e ranking'],
      [BarChart3, 'Painel do gestor'],
      [FileText, 'Relatórios'],
    ],
  },
  {
    id: 'dados',
    label: 'Dados e sistema',
    items: [
      [Upload, 'Importar planilhas'],
      [Cloud, 'Sincronização'],
      [Users, 'Administração'],
      [ShieldCheck, 'Auditoria'],
      [Settings, 'Configurações'],
    ],
  },
  {
    id: 'conta',
    label: 'Minha conta',
    items: [
      [UserCircle, 'Meu perfil'],
    ],
  },
];

const allowedForUser = (label, user) => {
  const manager = ['Administrador', 'Gerente'].includes(user.cargo);
  const admin = user.cargo === 'Administrador';
  if (['Administração', 'Auditoria', 'Configurações'].includes(label)) return admin;
  if (['Painel do gestor', 'Campanhas', 'Importar planilhas'].includes(label)) return manager;
  return true;
};

export default function Sidebar({ active, onChange, user, mobileOpen = false, onClose }) {
  const groups = useMemo(() => navigationGroups
    .map(group => ({ ...group, items: group.items.filter(([, label]) => allowedForUser(label, user)) }))
    .filter(group => group.items.length), [user]);

  const activeGroup = groups.find(group => group.items.some(([, label]) => label === active))?.id;
  const [expanded, setExpanded] = useState(() => new Set(['atendimento']));

  useEffect(() => {
    if (!activeGroup) return;
    setExpanded(current => new Set([...current, activeGroup]));
  }, [activeGroup]);

  const navigate = label => {
    onChange(label);
    onClose?.();
  };

  const toggleGroup = id => {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return <>
    {mobileOpen && <button className="sidebar-backdrop" type="button" aria-label="Fechar menu" onClick={onClose}/>} 
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand-row">
        <div className="brand"><img src="/brain.svg" alt=""/>Randers’CRM</div>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Fechar menu"><X size={20}/></button>
      </div>

      <nav aria-label="Menu principal">
        <button className={`sidebar-link ${active === 'Dashboard' ? 'active' : ''}`} onClick={() => navigate('Dashboard')}>
          <LayoutDashboard size={19}/>Dashboard
        </button>

        {groups.map(group => {
          const isExpanded = expanded.has(group.id);
          const groupActive = group.items.some(([, label]) => label === active);
          return <section className={`sidebar-group ${groupActive ? 'has-active' : ''}`} key={group.id}>
            <button
              type="button"
              className="sidebar-group-toggle"
              aria-expanded={isExpanded}
              onClick={() => toggleGroup(group.id)}
            >
              <span>{group.label}</span><ChevronDown size={16}/>
            </button>
            <div className={`sidebar-submenu ${isExpanded ? 'expanded' : ''}`}>
              {group.items.map(([Icon, label]) => <button
                key={label}
                className={`sidebar-link sidebar-sublink ${active === label ? 'active' : ''}`}
                onClick={() => navigate(label)}
              ><Icon size={18}/><span>{label}</span></button>)}
            </div>
          </section>;
        })}
      </nav>

      <button type="button" className="profile-card" onClick={() => navigate('Meu perfil')}>
        <ProfilePhoto name={user.nome} photoUrl={user.photoUrl} size="small"/>
        <div><b>{user.nome}</b><small>{user.cargo} · {user.carteiraResumo || user.carteira}</small></div>
      </button>
    </aside>
  </>;
}
