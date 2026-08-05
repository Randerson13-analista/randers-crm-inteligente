import React from 'react';
import {
  BarChart3,
  CalendarDays,
  Cloud,
  FileText,
  History,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Shirt,
  Trophy,
  Upload,
  UserCircle,
  Users,
  WalletCards,
} from 'lucide-react';
import AvatarPreview from './AvatarPreview';

const allItems = [
  [LayoutDashboard, 'Dashboard'],
  [WalletCards, 'Carteira'],
  [CalendarDays, 'Agenda'],
  [History, 'Histórico'],
  [Trophy, 'Metas e ranking'],
  [BarChart3, 'Painel do gestor'],
  [Megaphone, 'Campanhas'],
  [Shirt, 'Meu Closet'],
  [UserCircle, 'Meu perfil'],
  [FileText, 'Relatórios'],
  [Upload, 'Importar planilhas'],
  [Cloud, 'Sincronização'],
  [Users, 'Administração'],
  [ShieldCheck, 'Auditoria'],
  [Settings, 'Configurações'],
];

export default function Sidebar({ active, onChange, user }) {
  const manager = ['Administrador', 'Gerente'].includes(user.cargo);
  const admin = user.cargo === 'Administrador';
  const items = allItems
    .filter(([, label]) => !['Administração', 'Auditoria', 'Configurações'].includes(label) || admin)
    .filter(([, label]) => !['Painel do gestor', 'Campanhas', 'Importar planilhas'].includes(label) || manager);

  return <aside className="sidebar">
    <div className="brand"><img src="/brain.svg" alt=""/>Randers’CRM</div>
    <nav>{items.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => onChange(label)}><Icon size={19}/>{label}</button>)}</nav>
    <div className="profile-card">
      <div className="profile-avatar"><AvatarPreview compact avatar={user.avatarConfig}/></div>
      <div><b>{user.nome}</b><small>{user.cargo} · {user.carteiraResumo || user.carteira}</small></div>
    </div>
  </aside>;
}
