import React,{useId} from 'react';
import {defaultAvatar} from '../data/avatarOptions';
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase();
export default function AvatarPreview({avatar:raw,compact=false}){
 const uid=useId().replace(/:/g,''); const a={...defaultAvatar,...raw}; const human=String(a.character).startsWith('male')||String(a.character).startsWith('female'); const creature=!human; const female=String(a.character).startsWith('female');
 const expression=[['M8 17q4 4 8 0'],['M8 16q4 5 8 0'],['M8 17q4 2 8 0'],['M8 17q4 5 8 0'],['M8 18h8'],['M8 19q4-3 8 0']][a.expressionIndex]||['M8 17q4 4 8 0'];
 const earColor=a.character==='alien'?'#80d9a7':a.character==='robot'?'#9db6ad':a.character==='dragon'?'#45a66f':a.character==='panda'?'#202a26':a.character==='fox'?'#df743e':a.character==='cat'?'#d19a63':a.character==='dog'?'#a87349':a.skin;
 return <div className={`avatar-render ${compact?'compact':''} scene-${slug(a.scene)}`} title={`${a.character} · ${a.outfit}`}>
  <svg viewBox="0 0 240 360" role="img" aria-label="Avatar personalizado">
   <defs><linearGradient id={`shirt-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={a.outfit.includes('branca')?'#ffffff':a.outfit.includes('celebra')?'#f4c84a':'#16895a'}/><stop offset="1" stopColor={a.outfit.includes('branca')?'#e8efeb':a.outfit.includes('celebra')?'#d89a21':'#075c3c'}/></linearGradient><filter id={`shadow-${uid}`}><feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity=".18"/></filter></defs>
   {!compact&&<ellipse cx="120" cy="338" rx="62" ry="12" fill="rgba(7,92,60,.15)"/>}
   <g filter={`url(#shadow-${uid})`}>
    {creature&&<><path d="M72 80 L88 35 L108 78" fill={earColor}/><path d="M132 78 L153 35 L168 82" fill={earColor}/></>}
    <rect x="72" y="58" width="96" height="104" rx={a.faceShape==='Quadrado'?28:a.faceShape==='Alongado'?42:48} fill={human?a.skin:earColor}/>
    {a.character==='panda'&&<><ellipse cx="94" cy="105" rx="18" ry="22" fill="#26302c"/><ellipse cx="146" cy="105" rx="18" ry="22" fill="#26302c"/></>}
    {a.character==='robot'&&<rect x="83" y="72" width="74" height="47" rx="13" fill="#dce9e3" stroke="#55766a" strokeWidth="5"/>}
    {human&&a.hairStyle!=='Sem cabelo'&&<path d={a.hairStyle==='Longo'||a.hairStyle==='Tranças'||a.hairStyle==='Dreadlocks'?'M73 108Q65 42 120 38Q181 42 168 122L157 87Q120 60 82 88Z':a.hairStyle==='Coque'?'M77 91Q78 38 120 40Q163 39 166 91Q142 63 83 87ZM112 35Q120 13 136 34Z':a.hairStyle==='Moicano'?'M94 66L104 25L116 62L128 20L140 64L153 42L160 82Q120 58 79 86Z':'M75 89Q80 37 120 39Q163 40 166 91Q136 64 81 87Z'} fill={a.hairColor}/>} 
    <circle cx="98" cy="108" r={a.eyeStyle==='Grandes'?7:5} fill="#16231e"/><circle cx="142" cy="108" r={a.eyeStyle==='Grandes'?7:5} fill="#16231e"/>
    <path d={a.brow==='Arqueada'?'M88 94q10-8 20 0M132 94q10-8 20 0':a.brow==='Reta'?'M88 94h20M132 94h20':'M88 95q10-4 20 0M132 95q10-4 20 0'} stroke="#3c2a22" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d={expression[0]} transform="translate(100 100)" stroke="#7a342c" strokeWidth="4" fill="none" strokeLinecap="round"/>
    {human&&a.facialHair!=='Nenhum'&&<path d={a.facialHair==='Bigode'?'M103 132q17-10 34 0q-17 8-34 0':a.facialHair==='Cavanhaque'?'M107 132q13 8 26 0l-5 20h-16Z':'M84 123q36 39 72 0v24q-36 34-72 0Z'} fill={a.hairColor} opacity=".9"/>}
    <path d={female?'M70 180Q120 154 170 180L181 281Q120 306 59 281Z':'M66 180Q120 155 174 180L184 280Q120 307 56 280Z'} fill={`url(#shirt-${uid})`} stroke="rgba(255,255,255,.45)" strokeWidth="4"/>
    <rect x="92" y="199" width="56" height="30" rx="10" fill="#fff" opacity=".95"/><text x="120" y="220" textAnchor="middle" fontSize="17" fontWeight="900" fill="#075c3c">Boti</text>
    <path d="M69 188Q38 212 49 260" stroke={a.skin} strokeWidth="22" fill="none" strokeLinecap="round"/><path d="M171 188Q202 212 191 260" stroke={a.skin} strokeWidth="22" fill="none" strokeLinecap="round"/>
    <rect x="77" y="274" width="43" height="55" rx="17" fill="#24342e"/><rect x="121" y="274" width="43" height="55" rx="17" fill="#24342e"/>
    <ellipse cx="94" cy="330" rx="30" ry="14" fill={a.shoes.includes('verde')?'#16895a':a.shoes.includes('social')?'#34251d':'#f8fbf9'} stroke="#cad8d0" strokeWidth="4"/><ellipse cx="147" cy="330" rx="30" ry="14" fill={a.shoes.includes('verde')?'#16895a':a.shoes.includes('social')?'#34251d':'#f8fbf9'} stroke="#cad8d0" strokeWidth="4"/>
    {a.accessory==='Óculos'&&<g fill="none" stroke="#15221d" strokeWidth="5"><rect x="80" y="96" width="36" height="24" rx="8"/><rect x="124" y="96" width="36" height="24" rx="8"/><path d="M116 106h8"/></g>}
    {a.accessory==='Boné'&&<><path d="M75 82Q83 42 124 45Q159 48 166 79Z" fill="#075c3c"/><path d="M120 78h65q-18 18-65 12Z" fill="#0d8b57"/></>}
    {a.accessory==='Headset'&&<><path d="M75 105Q74 55 120 52Q167 55 166 105" fill="none" stroke="#263a33" strokeWidth="8"/><rect x="67" y="101" width="16" height="38" rx="8" fill="#263a33"/><rect x="158" y="101" width="16" height="38" rx="8" fill="#263a33"/></>}
    {a.accessory==='Crachá'&&<rect x="144" y="219" width="26" height="34" rx="5" fill="#fff" stroke="#b7c9bf" strokeWidth="2"/>}
    {a.accessory==='Coroa'&&<path d="M88 61L98 31L120 52L142 31L153 62Z" fill="#f1c63f"/>}
   </g>
  </svg>
 </div>
}
