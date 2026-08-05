import React from 'react';

export default class ClosetErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null,retry:0}}
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error,info){console.error('[Randers CRM] Erro isolado no Closet:',error,info)}
 retry=()=>this.setState(state=>({error:null,retry:state.retry+1}));
 render(){
  if(this.state.error)return <section className="closet-safe-error"><img src="/brain.svg" alt="Randers CRM"/><h2>O Closet encontrou uma falha</h2><p>O restante do CRM continua protegido. Tente reiniciar somente o módulo ou use o modo seguro.</p><div><button type="button" className="primary" onClick={this.retry}>Tentar novamente</button><button type="button" onClick={()=>window.location.reload()}>Recarregar o CRM</button></div><details><summary>Detalhes técnicos</summary><code>{String(this.state.error?.message||this.state.error)}</code></details></section>;
  return <React.Fragment key={this.state.retry}>{this.props.children}</React.Fragment>;
 }
}
