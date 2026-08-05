import React, { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../services/whatsapp';

const templateLabels = {
  recuperacao_i6: 'Recuperação · I6',
  recuperacao_cessados: 'Recuperação · Cessados',
  intencoes: 'Recuperação · Intenções',
  atividade_padrao: 'Atividade · Cobre, Bronze, Prata e Ouro',
  atividade_vip: 'Atividade · Platina, Rubi, Esmeralda e Diamante',
};

const buildSettings = organization => ({
  autoAssignment: organization?.settings?.autoAssignment ?? true,
  showAdvancedCloset: organization?.settings?.showAdvancedCloset ?? true,
  whatsappTemplates: {
    ...DEFAULT_TEMPLATES,
    ...(organization?.settings?.whatsappTemplates || {}),
  },
});

export default function SettingsPanel({ organization, onSave }) {
  const [name, setName] = useState(organization?.name || 'Randers CRM');
  const [settings, setSettings] = useState(() => buildSettings(organization));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(organization?.name || 'Randers CRM');
    setSettings(buildSettings(organization));
  }, [organization]);

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    try { await onSave(name, settings); } finally { setSaving(false); }
  };

  return <section className="module-page settings-page">
    <form className="panel settings-form" onSubmit={submit}>
      <div className="panel-title"><div><small>Configuração da organização</small><h2>Preferências do CRM</h2></div><Settings size={22}/></div>
      <label>Nome exibido da organização<input value={name} onChange={event => setName(event.target.value)}/></label>
      <label className="settings-toggle"><input type="checkbox" checked={settings.autoAssignment} onChange={event => setSettings({ ...settings, autoAssignment: event.target.checked })}/><span><b>Distribuição automática após importação</b><small>Distribui I6, Cessados, Intenções e as segmentações dentro de Atividade conforme as regras de cada consultor.</small></span></label>
      <label className="settings-toggle"><input type="checkbox" checked={settings.showAdvancedCloset} onChange={event => setSettings({ ...settings, showAdvancedCloset: event.target.checked })}/><span><b>Closet avançado</b><small>Mantém os recursos visuais avançados habilitados. O acabamento live action será concluído na etapa visual.</small></span></label>

      <div className="settings-section">
        <h3>Mensagens padrão do WhatsApp</h3>
        <p>Variáveis permitidas: {'{nome}'}, {'{cidade}'}, {'{nivel}'}, {'{base}'}, {'{atividade}'}.</p>
        {Object.entries(templateLabels).map(([key, label]) => <label key={key}>{label}<textarea rows="3" value={settings.whatsappTemplates[key] || ''} onChange={event => setSettings({ ...settings, whatsappTemplates: { ...settings.whatsappTemplates, [key]: event.target.value } })}/></label>)}
      </div>

      <button className="primary" disabled={saving}><Save size={17}/>{saving ? 'Salvando...' : 'Salvar configurações'}</button>
    </form>
  </section>;
}
