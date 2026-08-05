import React,{useMemo,useState}from'react';
import{Shuffle,Camera,Save,RotateCcw,Lock,Coins,Star,Search}from'lucide-react';
import AvatarPreview from'./AvatarPreview';
import{characters,skinTones,hairColors,hairStyles,faceShapes,eyeStyles,brows,facialHair,outfits,accessories,shoes,scenes,poses,defaultAvatar}from'../data/avatarOptions';

const tabs=['Personagem','Rosto','Cabelo','Roupas','Acessórios','Calçados','Cenário'];
const featuredAccessories=['Boné','Óculos','Headset','Relógio','Crachá','Mochila'];
const lookNames=['Executivo Boti','Esportivo Boti','Casual Boti','Premium Boti'];

export default function Closet({initialAvatar,onSave,coins=2450}){
 const[tab,setTab]=useState('Personagem');
 const[avatar,setAvatar]=useState({...defaultAvatar,...initialAvatar});
 const[query,setQuery]=useState('');
 const[savedLooks,setSavedLooks]=useState(()=>[
  {...defaultAvatar,outfit:'Polo verde',accessory:'Crachá',scene:'Loja Boti'},
  {...defaultAvatar,outfit:'Look esportivo',accessory:'Boné',scene:'Estúdio'},
  {...defaultAvatar,outfit:'Conjunto casual',accessory:'Relógio',scene:'Escritório'},
  {...defaultAvatar,outfit:'Look executivo',accessory:'Óculos premium',scene:'Loja premium'}
 ]);
 const update=(k,v)=>setAvatar(a=>({...a,[k]:v}));
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const randomize=()=>setAvatar({...defaultAvatar,character:pick(characters).id,skin:pick(skinTones),hairColor:pick(hairColors),hairStyle:pick(hairStyles),faceShape:pick(faceShapes),eyeStyle:pick(eyeStyles),brow:pick(brows),facialHair:pick(facialHair),outfit:pick(outfits),accessory:pick(accessories),shoes:pick(shoes),scene:pick(scenes),pose:pick(poses),expressionIndex:Math.floor(Math.random()*6)});
 const filtered=items=>items.filter(item=>String(typeof item==='string'?item:item.label).toLowerCase().includes(query.toLowerCase()));
 const cards=(items,key,lockedAfter=999,mode='avatar')=><div className="premium-option-grid">{filtered(items).map((item,i)=>{const value=typeof item==='string'?item:item.id,label=typeof item==='string'?item:item.label,locked=i>=lockedAfter;return <button type="button" key={value} disabled={locked} className={`premium-option ${avatar[key]===value?'active':''}`} onClick={()=>update(key,value)}>{locked&&<span className="locked"><Lock size={12}/>80</span>}<span className={`premium-option-preview ${mode==='text'?'text-preview':''}`}>{mode==='avatar'?<AvatarPreview compact avatar={{...avatar,[key]:value}}/>:<b>{label.slice(0,2).toUpperCase()}</b>}</span><strong>{label}</strong>{key==='character'&&<small>{String(value).includes('female')?'Feminino':String(value).includes('male')?'Masculino':'Personagem'}</small>}</button>})}</div>;
 const progress=useMemo(()=>Math.min(100,Math.round((Object.values(avatar).filter(Boolean).length/14)*100)),[avatar]);
 const characterLabel=characters.find(c=>c.id===avatar.character)?.label||'Meu avatar';
 const saveCurrent=()=>{onSave?.(avatar)};
 const addLook=()=>setSavedLooks(l=>[{...avatar},...l].slice(0,6));

 return <section className="closet-premium-page">
  <div className="premium-topbar">
   <div><span className="eyebrow">Perfil</span><h2>Meu Closet Boti</h2><p>Crie um avatar único e mostre seu estilo no Randers’CRM.</p></div>
   <button className="primary premium-save" onClick={saveCurrent}><Save size={18}/>Salvar avatar</button>
  </div>

  <div className="premium-closet-layout">
   <aside className="premium-stage-card">
    <div className={`premium-stage scene-${String(avatar.scene).replaceAll(' ','-').toLowerCase()}`}>
     <div className="neon-line neon-one"/><div className="neon-line neon-two"/>
     <div className="stage-brand">O BOTICÁRIO</div>
     <div className="stage-shelf"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
     <div className="stage-controls">
      <button onClick={randomize}><Shuffle size={20}/><span>Aleatório</span></button>
      <button onClick={()=>window.print()}><Camera size={20}/><span>Foto</span></button>
      <button onClick={()=>update('pose',pick(poses))}><Star size={20}/><span>Pose</span></button>
      <button onClick={()=>update('scene',pick(scenes))}><Camera size={20}/><span>Fundo</span></button>
      <button onClick={()=>setAvatar({...defaultAvatar})}><RotateCcw size={20}/><span>Redefinir</span></button>
     </div>
     <div className="premium-avatar-wrap"><AvatarPreview avatar={avatar}/><span className="premium-avatar-name">{characterLabel}</span></div>
     <div className="stage-podium"><span/><span/></div>
     <div className="premium-expression-bar">{['😀','😄','😊','😍','😎','😤'].map((e,i)=><button key={e} className={avatar.expressionIndex===i?'active':''} onClick={()=>update('expressionIndex',i)}>{e}</button>)}</div>
    </div>
   </aside>

   <main className="premium-editor-card">
    <div className="premium-tabs">{tabs.map(t=><button key={t} className={tab===t?'active':''} onClick={()=>{setTab(t);setQuery('')}}>{t}</button>)}</div>
    <label className="closet-search premium-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Buscar em ${tab.toLowerCase()}...`}/></label>
    <div className="premium-editor-scroll">
     {tab==='Personagem'&&<><h3>Escolha seu personagem</h3>{cards(characters,'character')}<h3>Tom de pele</h3><div className="premium-swatches">{skinTones.map(c=><button aria-label="Tom de pele" key={c} className={avatar.skin===c?'active':''} style={{background:c}} onClick={()=>update('skin',c)}/>)}</div><h3>Cor do cabelo</h3><div className="premium-swatches hair">{hairColors.map(c=><button aria-label="Cor do cabelo" key={c} className={avatar.hairColor===c?'active':''} style={{background:c}} onClick={()=>update('hairColor',c)}/>)}</div></>}
     {tab==='Rosto'&&<><h3>Formato do rosto</h3>{cards(faceShapes,'faceShape',999,'text')}<h3>Olhos</h3>{cards(eyeStyles,'eyeStyle',999,'text')}<h3>Sobrancelhas</h3>{cards(brows,'brow',999,'text')}<h3>Barba e bigode</h3>{cards(facialHair,'facialHair',999,'text')}</>}
     {tab==='Cabelo'&&<><h3>Estilo do cabelo</h3>{cards(hairStyles,'hairStyle',999,'text')}<h3>Cor</h3><div className="premium-swatches">{hairColors.map(c=><button aria-label="Cor do cabelo" key={c} className={avatar.hairColor===c?'active':''} style={{background:c}} onClick={()=>update('hairColor',c)}/>)}</div></>}
     {tab==='Roupas'&&<><h3>Roupas Boti</h3>{cards(outfits,'outfit',12)}</>}
     {tab==='Acessórios'&&<><h3>Acessórios em destaque</h3>{cards(accessories,'accessory',12)}</>}
     {tab==='Calçados'&&<><h3>Calçados</h3>{cards(shoes,'shoes')}</>}
     {tab==='Cenário'&&<><h3>Cenários</h3>{cards(scenes,'scene',999,'text')}</>}
    </div>

    <div className="premium-featured-strip">
     <div className="featured-title"><div><b>Acessórios em destaque</b><span>Itens disponíveis no seu closet</span></div><span className="coin-pill"><Coins size={16}/>{coins}</span></div>
     <div className="featured-items">{featuredAccessories.map((item,i)=><button key={item} className={avatar.accessory===item?'active':''} onClick={()=>update('accessory',item)}><span>{['🧢','👓','🎧','⌚','🪪','🎒'][i]}</span><small>{item} Boti</small></button>)}</div>
     <div className="current-kit"><b>Conjunto atual</b><div><span>🧢</span><span>👕</span><span>👖</span><span>👟</span><span>🪪</span></div><button onClick={saveCurrent}><Save size={16}/>Salvar avatar</button></div>
    </div>
   </main>

   <aside className="saved-looks-card">
    <div className="saved-title"><div><b>Looks salvos</b><small>{savedLooks.length} combinações</small></div><button onClick={addLook}>+ Novo look</button></div>
    <div className="saved-looks-list">{savedLooks.map((look,i)=><button key={i} onClick={()=>setAvatar({...look})}><span><AvatarPreview compact avatar={look}/></span><strong>{lookNames[i]||`Look ${i+1}`}</strong><small>{look.outfit}</small></button>)}</div>
   </aside>
  </div>

  <div className="premium-bottom-stats">
   <div><small>Carteira atual</small><b>💎 VIP</b><span>Platina, Rubi, Esmeralda e Diamante</span></div>
   <div><small>Meta do mês</small><b>R$ 25.000 / R$ 40.000</b><progress value="62" max="100"/><span>62%</span></div>
   <div><small>Conversões</small><b>152 <em>+18%</em></b><span>vs mês anterior</span></div>
   <div><small>Revendedores ativos</small><b>358 <em>+12%</em></b><span>vs mês anterior</span></div>
   <div className="mini-ranking"><small>Ranking de vendedores</small><div><span>🥇</span><AvatarPreview compact avatar={avatar}/><b>Randerson</b><i>12.450 pts</i></div></div>
  </div>
 </section>;
}
