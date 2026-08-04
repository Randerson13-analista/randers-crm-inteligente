import{defaultAvatar}from'../data/avatarOptions';
const KEY = 'randerscrm_react_state_v5';
export const initialRevendedores = [
{id:'1',codigo:'1001',nome:'Ana Paula',telefone:'84999990001',cidade:'São Paulo do Potengi',nivel:'Platina',base:'VIP',atividade:'Ativo 1',status:'Pendente',responsavel:'Randerson'},
{id:'2',codigo:'1002',nome:'Carlos Henrique',telefone:'84999990002',cidade:'Riachuelo',nivel:'Bronze',base:'Atividade',atividade:'Ativo 2',status:'Em contato',responsavel:'Milena'},
{id:'3',codigo:'1003',nome:'Maria José',telefone:'84999990003',cidade:'Barcelona',nivel:'Cobre',base:'I6',atividade:'Inativo 6',status:'Retorno',responsavel:'João'},
{id:'4',codigo:'1004',nome:'João Batista',telefone:'84999990004',cidade:'São Pedro',nivel:'Ouro',base:'Atividade',atividade:'Ativo 1',status:'Convertido',responsavel:'Milena'},
{id:'5',codigo:'1005',nome:'Renata Alves',telefone:'84999990005',cidade:'Bom Jesus',nivel:'Diamante',base:'VIP',atividade:'Ativo 1',status:'Pendente',responsavel:'Randerson'},
{id:'6',codigo:'1006',nome:'Lucas Silva',telefone:'84999990006',cidade:'João Câmara',nivel:'Prata',base:'Cessados',atividade:'Cessado 7',status:'Pendente',responsavel:'João'},
{id:'7',codigo:'1007',nome:'Patrícia Lima',telefone:'84999990007',cidade:'Santa Maria',nivel:'Rubi',base:'VIP',atividade:'Ativo 2',status:'Em contato',responsavel:'Randerson'},
{id:'8',codigo:'1008',nome:'Francisco Melo',telefone:'84999990008',cidade:'Poço Branco',nivel:'Bronze',base:'Intenções',atividade:'Intenção',status:'Retorno',responsavel:'João'}];
export const defaultUsers=[
{id:'u1',nome:'Randerson',email:'admin@randerscrm.local',senha:'randers123',cargo:'Administrador',carteira:'Todas',ativo:true,avatarConfig:{...defaultAvatar,skin:'#cf8b55',hairStyle:'Topete',accessory:'Crachá'}},
{id:'u2',nome:'João',email:'joao@randerscrm.local',senha:'joao123',cargo:'Consultor',carteira:'Recuperação',ativo:true,avatarConfig:{...defaultAvatar,skin:'#ad673e',hairStyle:'Curto',facialHair:'Barba cheia',outfit:'Jaqueta premium'}},
{id:'u3',nome:'Milena',email:'milena@randerscrm.local',senha:'milena123',cargo:'Consultor',carteira:'Cobre a Ouro',ativo:true,avatarConfig:{...defaultAvatar,character:'female',skin:'#cf8b55',hairStyle:'Longo',outfit:'Polo branca'}}];
const now=new Date().toISOString();
const defaultState={revendedores:initialRevendedores,imports:[],avatar:null,users:defaultUsers,agenda:[{id:'a1',revendedorId:'3',data:new Date().toISOString().slice(0,10),hora:'14:30',responsavel:'João',status:'Pendente',observacao:'Retornar sobre campanha de reativação.'},{id:'a2',revendedorId:'7',data:new Date(Date.now()+86400000).toISOString().slice(0,10),hora:'10:00',responsavel:'Randerson',status:'Pendente',observacao:'Confirmar pedido do ciclo.'}],history:[{id:'h1',revendedorId:'4',usuario:'Milena',canal:'WhatsApp',resultado:'Convertido',observacao:'Pedido confirmado.',data:now}],goals:{u1:{calls:20,whats:30,conversions:5},u2:{calls:25,whats:35,conversions:6},u3:{calls:20,whats:40,conversions:8}},campaigns:[],audit:[]};
export function loadState(){try{const stored=JSON.parse(localStorage.getItem(KEY))||{};const merged={...defaultState,...stored};merged.users=(merged.users||defaultUsers).map((u,i)=>({...u,avatarConfig:u.avatarConfig||defaultUsers[i]?.avatarConfig||defaultAvatar}));return merged}catch{return defaultState}}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(state))}
