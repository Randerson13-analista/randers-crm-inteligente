import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Falha não tratada no Randers CRM:', error, info);
  }

  async resetApplication() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.update()));
      }
    } finally {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-error-screen">
      <img src="/brain.svg" alt="Randers CRM"/>
      <small>Proteção de estabilidade</small>
      <h1>O módulo encontrou um erro inesperado</h1>
      <p>O restante dos seus dados permanece protegido no Supabase. Recarregue a aplicação para tentar novamente.</p>
      <details><summary>Detalhes técnicos</summary><code>{this.state.error?.message || 'Erro desconhecido'}</code></details>
      <button className="primary" onClick={() => this.resetApplication()}>Recarregar o Randers CRM</button>
    </main>;
  }
}
