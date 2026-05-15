"use client";

import React, { useState, useMemo, useCallback } from "react";
import { signOut } from "next-auth/react";

// ── TYPES ──
interface User { id:number; name:string; email:string; color:string; initials:string; role:string; guardia:boolean; active:boolean; }
interface Guardia { id:number; userId:number; satDate:string; }
interface Vacation { id:number; userId:number; dates:string[]; status:string; comment?:string; }
interface Request { id:number; userId:number; type:string; fromDate:string; toDate?:string; comment?:string; status:string; createdAt:string; }
interface Holiday { id:number; date:string; name?:string; }
interface Position { id:string; name:string; shortName:string; displayOrder:number; }
interface Assignment { id:number; date:string; positionId:string; userId?:number; subUserId?:number; }
interface DayNote { id:number; date:string; note:string; }

interface Props {
  initialData: { users:User[]; guardias:Guardia[]; vacations:Vacation[]; requests:Request[]; holidays:Holiday[]; positions:Position[]; assignments:Assignment[]; dayNotes:DayNote[]; };
  currentUser: { id:number; name:string; email:string; role:string; color:string; initials:string; guardia:boolean; };
}

// ── UTILS ──
const YEAR = 2026;
const pad = (n:number) => String(n).padStart(2,"0");
const dk = (y:number,m:number,d:number) => `${y}-${pad(m+1)}-${pad(d)}`;
const fmtD = (s:string) => { const [y,mm,dd]=s.split("-"); return `${dd}/${mm}/${y}`; };
const fmtDow = (s:string) => ["Dg","Dl","Dt","Dc","Dj","Dv","Ds"][new Date(s).getDay()];
const isWeekend = (s:string) => { const d=new Date(s).getDay(); return d===0||d===6; };
const MAX_VAC = 29;
const TODAY = new Date().toISOString().split("T")[0];
const MONTHS = ["Gener","Febrer","Març","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"];
const DAYS_HDR = ["Dl","Dt","Dc","Dj","Dv","Ds","Dg"];

const workDays = (from:string, to:string, holidaySet:Set<string>) => {
  const days:string[]=[]; let c=new Date(from); const e=new Date(to);
  while(c<=e){ const dow=c.getDay(); const k=dk(c.getFullYear(),c.getMonth(),c.getDate());
    if(dow!==0&&dow!==6&&!holidaySet.has(k)) days.push(k); c.setDate(c.getDate()+1); }
  return days;
};
const allDays = (from:string, to:string) => {
  const days:string[]=[]; let c=new Date(from); const e=new Date(to);
  while(c<=e){ days.push(dk(c.getFullYear(),c.getMonth(),c.getDate())); c.setDate(c.getDate()+1); }
  return days;
};
const weekMonday = (dateKey:string) => {
  const d=new Date(dateKey); const dow=d.getDay()===0?6:d.getDay()-1;
  d.setDate(d.getDate()-dow); return dk(d.getFullYear(),d.getMonth(),d.getDate());
};

// ── ICONS (inline SVG) ──
const Icons:Record<string,React.ReactElement> = {
  home:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  grid:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  usr:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  inbox:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  bell:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  gear:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  uP:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  ck:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  xx:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  left:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  right:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  logout:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  key:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
};
const Ic = ({i,s=15}:{i:React.ReactElement,s?:number}) => <span style={{width:s,height:s,display:"inline-flex"}}>{i}</span>;
const Btn = ({children,onClick,bg="#111827",c="#fff",s,disabled}:any) => <button disabled={disabled} onClick={onClick} style={{padding:"6px 13px",borderRadius:6,fontSize:11,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"none",background:disabled?"#d1d5db":bg,color:disabled?"#9ca3af":c,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:5,opacity:disabled?0.7:1,...s}}>{children}</button>;
const Badge = ({children,bg,c}:any) => <span style={{display:"inline-flex",padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:600,background:bg,color:c}}>{children}</span>;
const Avatar = ({p,sz=24}:{p:any,sz?:number}) => <div style={{width:sz,height:sz,borderRadius:sz>28?8:5,background:p?.color||"#999",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.35,fontWeight:700,color:"#fff",flexShrink:0}}>{p?.initials||p?.ini||"?"}</div>;
const Modal = ({children,onClose}:any) => (<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}><div onClick={(e:any)=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,padding:22,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxWidth:460,width:"92%",maxHeight:"88vh",overflowY:"auto",position:"relative"}}><button onClick={onClose} style={{position:"absolute",top:10,right:12,background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:18}}>✕</button>{children}</div></div>);

// ── MONTH CALENDAR ──
function MonthCal({month,holidaySet,gMap,vMap,pendVMap,pendGMap,filter,users,onClick}:any) {
  const [hov,setHov]=useState<string|null>(null);
  const dim=new Date(YEAR,month+1,0).getDate();
  let s0=new Date(YEAR,month,1).getDay(); s0=s0===0?6:s0-1;
  const cells=[]; for(let i=0;i<s0;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
  return (
    <div style={{background:"#fff",borderRadius:9,padding:"12px 8px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
      <div style={{fontSize:11,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:0.6,color:"#374151",textAlign:"center"}}>{MONTHS[month]}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
        {DAYS_HDR.map(d=><div key={d} style={{fontSize:8.5,fontWeight:700,textAlign:"center",color:"#9ca3af",padding:"2px 0"}}>{d}</div>)}
        {cells.map((day,ci)=>{
          if(!day) return <div key={`e${ci}`}/>;
          const key=dk(YEAR,month,day),dow=new Date(YEAR,month,day).getDay();
          const isWe=dow===0||dow===6,isHol=holidaySet.has(key);
          const gUid=gMap[key],vUids:number[]=vMap[key]||[],pendVUids:number[]=pendVMap[key]||[];
          const pendG=pendGMap[key];
          const gP=gUid?users.find((p:User)=>p.id===gUid):null;
          const fl=filter>0,dimmed=fl&&gUid!==filter&&!vUids.includes(filter)&&!pendVUids.includes(filter)&&pendG?.pid!==filter;
          let bg="transparent",clr=isWe?"#b0b0b0":"#1a1a2e",brd="none",fw=500;
          if(isHol&&!gP){bg="#fef2f2";clr="#ef4444";fw=700;}
          if(gP&&(!fl||gUid===filter)){bg=gP.color;clr="#fff";fw=700;}
          if(!gP&&vUids.length>0){const sp=fl?users.find((p:User)=>p.id===filter):users.find((p:User)=>p.id===vUids[0]);if(sp&&(!fl||vUids.includes(filter))){bg=`${sp.color}20`;brd=`1.5px solid ${sp.color}55`;clr=sp.color;}}
          if(!gP&&vUids.length===0&&pendVUids.length>0){const sp=fl?users.find((p:User)=>p.id===filter):users.find((p:User)=>p.id===pendVUids[0]);if(sp&&(!fl||pendVUids.includes(filter))){bg=`${sp.color}10`;brd=`1.5px dashed ${sp.color}`;clr=sp.color;}}
          if(pendG&&(!fl||pendG.pid===filter)){const pp=users.find((p:User)=>p.id===pendG.pid);if(pp){if(!gP){bg=`${pp.color}10`;clr=pp.color;}brd=`2px dashed ${pendG.role==="to"?"#059669":pp.color}`;}}
          if(isHol&&gP) clr="#fef2f2";
          if(dimmed){bg="transparent";clr="#e5e7eb";brd="none";}
          const tips:string[]=[]; if(isHol)tips.push("🔴 Festiu"); if(gP)tips.push(`🛡️ ${gP.name}`); vUids.forEach((v:number)=>{const p=users.find((x:User)=>x.id===v);if(p)tips.push(`🌴 ${p.name}`);}); pendVUids.forEach((v:number)=>{const p=users.find((x:User)=>x.id===v);if(p)tips.push(`⏳ ${p.name} (vac. pendent)`);}); if(pendG&&!gP){const p=users.find((x:User)=>x.id===pendG.pid);if(p)tips.push(`⏳ ${p.name} (guàrdia pendent)`);}
          return(
            <div key={key} onMouseEnter={()=>setHov(key)} onMouseLeave={()=>setHov(null)} onClick={()=>onClick&&onClick(key)}
              style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,borderRadius:4,fontWeight:fw,background:bg,color:clr,border:brd,position:"relative",cursor:"pointer",opacity:dimmed?0.3:1}}>
              {isHol&&gP&&<div style={{position:"absolute",top:1,right:1,width:4,height:4,borderRadius:"50%",background:"#ff3333",border:"0.5px solid rgba(255,255,255,0.6)"}}/>}
              <span style={{textDecoration:isHol&&gP?"underline":"none",textDecorationColor:"rgba(255,200,200,0.8)",textUnderlineOffset:"2px"}}>{day}</span>
              {hov===key&&tips.length>0&&<div style={{position:"absolute",bottom:"calc(100% + 3px)",left:"50%",transform:"translateX(-50%)",background:"#1a1a2e",color:"#fff",padding:"3px 7px",borderRadius:4,fontSize:9,whiteSpace:"nowrap",zIndex:20,fontWeight:500}}>{tips.join(" · ")}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function GuardiaApp({ initialData, currentUser }: Props) {
  const [users,setUsers] = useState<User[]>(initialData.users);
  const [guardias,setGuardias] = useState<Guardia[]>(initialData.guardias);
  const [vacations,setVacations] = useState<Vacation[]>(initialData.vacations);
  const [requests,setRequests] = useState<Request[]>(initialData.requests);
  const [holidays,setHolidays] = useState<Holiday[]>(initialData.holidays);
  const positions = initialData.positions;
  const [assignments,setAssignments] = useState<Assignment[]>(initialData.assignments);
  const [dayNotes,setDayNotes] = useState<DayNote[]>(initialData.dayNotes);

  const [view,setView] = useState("stats");
  const [filter,setFilter] = useState(0);
  const [weekOff,setWeekOff] = useState(0);
  const [saving,setSaving] = useState(false);

  // Modal state
  const [modal,setModal] = useState<any>(null);
  const [mAction,setMAction] = useState("vacation");
  const [mPerson,setMPerson] = useState("");
  const [mFrom,setMFrom] = useState("");
  const [mTo,setMTo] = useState("");
  const [mComment,setMComment] = useState("");
  const [mSuccess,setMSuccess] = useState(false);

  // Quadrant modal
  const [qModal,setQModal] = useState<any>(null);
  const [qPerson,setQPerson] = useState("");
  const [qSub,setQSub] = useState("");
  const [qApplyWeek,setQApplyWeek] = useState(false);

  // Day note modal
  const [noteModal,setNoteModal] = useState<{dateKey:string}|null>(null);
  const [noteText,setNoteText] = useState("");

  // Password change modal
  const [pwModal,setPwModal] = useState(false);
  const [pwCurrent,setPwCurrent] = useState("");
  const [pwNew,setPwNew] = useState("");
  const [pwConfirm,setPwConfirm] = useState("");
  const [pwError,setPwError] = useState("");
  const [pwSuccess,setPwSuccess] = useState(false);

  // User form
  const [showAddUser,setShowAddUser] = useState(false);
  const [newUName,setNewUName] = useState("");
  const [newUEmail,setNewUEmail] = useState("");
  const [newURole,setNewURole] = useState("AUXILIAR");
  const [newUGuardia,setNewUGuardia] = useState(false);

  const isAdm = currentUser.role === "ADMIN";
  const gStaff = users.filter(u=>u.guardia&&u.active);
  const holidaySet = useMemo(()=>new Set(holidays.map(h=>h.date)),[holidays]);

  const gMap = useMemo(()=>{
    const m:Record<string,number>={};
    guardias.forEach(g=>{
      m[g.satDate]=g.userId;
      const sun=new Date(g.satDate); sun.setDate(sun.getDate()+1);
      m[dk(sun.getFullYear(),sun.getMonth(),sun.getDate())]=g.userId;
    });
    return m;
  },[guardias]);

  const vMap = useMemo(()=>{
    const m:Record<string,number[]>={};
    vacations.filter(v=>v.status==="APPROVED").forEach(v=>{v.dates.forEach(d=>{if(!m[d])m[d]=[];m[d].push(v.userId);});});
    return m;
  },[vacations]);

  const pendVMap = useMemo(()=>{
    const m:Record<string,number[]>={};
    vacations.filter(v=>v.status==="PENDING").forEach(v=>{v.dates.forEach(d=>{if(!m[d])m[d]=[];m[d].push(v.userId);});});
    return m;
  },[vacations]);

  const pendGMap = useMemo(()=>{
    const m:Record<string,{pid:number,role:string}>={};
    requests.filter(r=>r.status==="PENDING"&&(r.type==="GUARDIA"||r.type==="REMOVE")).forEach(r=>{
      if(r.fromDate) m[r.fromDate]={pid:r.userId,role:"from"};
      if(r.toDate) m[r.toDate]={pid:r.userId,role:"to"};
    });
    return m;
  },[requests]);

  const DEFAULTS:Record<string,number> = {"qm1":1,"qm2":2,"q1220":9,"cures":3,"q1422":5,"q917":4};

  const getTitular = useCallback((date:string, posId:string): number|null => {
    const a = assignments.find(a=>a.date===date&&a.positionId===posId);
    if(a) return a.userId ?? null;
    return DEFAULTS[posId] || null;
  },[assignments]);

  const getSub = useCallback((date:string, posId:string): number|null => {
    const a = assignments.find(a=>a.date===date&&a.positionId===posId);
    return a?.subUserId ?? null;
  },[assignments]);

  // backward-compat alias: returns sub if exists, else titular
  const getAssignment = useCallback((date:string, posId:string) => {
    return getSub(date,posId) ?? getTitular(date,posId);
  },[getTitular,getSub]);

  const noteMap = useMemo(()=>{
    const m:Record<string,string>={};
    dayNotes.forEach(n=>{m[n.date]=n.note;});
    return m;
  },[dayNotes]);

  const saveNote = async () => {
    if(!noteModal) return;
    const {dateKey} = noteModal;
    const res = await api("/api/day-notes","POST",{date:dateKey,note:noteText});
    if(res.deleted) {
      setDayNotes(prev=>prev.filter(n=>n.date!==dateKey));
    } else {
      setDayNotes(prev=>[...prev.filter(n=>n.date!==dateKey),res]);
    }
    setNoteModal(null);
  };

  const vacDaysUsed = (uid:number) =>
    vacations.filter(v=>v.status==="APPROVED"&&v.userId===uid)
      .reduce((s,v)=>s+v.dates.filter(d=>!isWeekend(d)&&!holidaySet.has(d)).length, 0);

  const gCount = useMemo(()=>{
    const c:Record<number,number>={};
    gStaff.forEach(u=>{c[u.id]=0});
    guardias.forEach(g=>{c[g.userId]=(c[g.userId]||0)+1});
    return c;
  },[guardias,gStaff]);

  const pendCt = requests.filter(r=>r.status==="PENDING").length;
  const myPendCt = requests.filter(r=>r.userId===currentUser.id&&r.status==="PENDING").length;
  const weekDates = useMemo(()=>{
    const b=new Date(TODAY);const off=b.getDay()===0?6:b.getDay()-1;b.setDate(b.getDate()-off+(weekOff*7));
    return Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(d.getDate()+i);return dk(d.getFullYear(),d.getMonth(),d.getDate());});
  },[weekOff]);

  const mWorkDays = useMemo(()=>mFrom&&mTo?workDays(mFrom,mTo,holidaySet):[], [mFrom,mTo,holidaySet]);

  // API helpers
  const api = async (url:string, method:string, body?:any) => {
    const r = await fetch(url, { method, headers:{"Content-Type":"application/json"}, ...(body&&{body:JSON.stringify(body)}) });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  };

  const handleCalClick = (dateKey:string) => {
    const isHol=holidaySet.has(dateKey),isWe=isWeekend(dateKey);
    const canGuardia=isWe||isHol;
    setModal({dateKey,isWe,isHol,canGuardia,gUid:gMap[dateKey],vUids:vMap[dateKey]||[],pendVUids:pendVMap[dateKey]||[]});
    setMAction(canGuardia?"guardia":"vacation");
    setMPerson(gMap[dateKey]?String(gMap[dateKey]):"");
    setMFrom(dateKey);setMTo(dateKey);setMComment("");setMSuccess(false);
  };
  const closeModal = () => {setModal(null);setMSuccess(false);};

  const applyEdit = async () => {
    if(!modal) return;
    setSaving(true);
    try {
      const pid = mPerson?+mPerson:null;
      if(mAction==="guardia"&&pid){
        const days=allDays(mFrom,mTo).filter(d=>isWeekend(d)||holidaySet.has(d));
        const satKeys=new Set<string>();
        days.forEach(d=>{ const dow=new Date(d).getDay(); if(dow===6)satKeys.add(d); else if(dow===0){const sat=new Date(d);sat.setDate(sat.getDate()-1);satKeys.add(dk(sat.getFullYear(),sat.getMonth(),sat.getDate()));}else if(holidaySet.has(d))satKeys.add(d);});
        for(const satDate of satKeys){
          const g = await api("/api/guardias","POST",{userId:pid,satDate});
          setGuardias(prev=>[...prev.filter(x=>x.satDate!==satDate),g]);
        }
      } else if(mAction==="vacation"&&pid){
        const v = await api("/api/vacations","POST",{userId:pid,dates:mWorkDays,comment:mComment,status:"APPROVED"});
        setVacations(prev=>[...prev,v]);
      } else if(mAction==="remove"){
        const days=allDays(mFrom,mTo);
        const satKeys=new Set<string>();
        // BUG-04: inclou festius entre setmana a més de dissabtes/diumenges
        days.forEach(d=>{ const dow=new Date(d).getDay(); if(dow===6)satKeys.add(d); else if(dow===0){const sat=new Date(d);sat.setDate(sat.getDate()-1);satKeys.add(dk(sat.getFullYear(),sat.getMonth(),sat.getDate()));}else if(holidaySet.has(d))satKeys.add(d);});
        for(const satDate of satKeys) await api("/api/guardias","DELETE",{satDate});
        setGuardias(prev=>prev.filter(g=>!satKeys.has(g.satDate)));
      }
      closeModal();
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const submitReq = async () => {
    if(!modal) return;
    setSaving(true);
    try {
      if(mAction==="vacation"){
        // BUG-02: la vacation es crea a l'API de requests, no cal crida extra
        const { request:req, vacation:vac } = await api("/api/requests","POST",{type:"VACATION",fromDate:mFrom,toDate:mTo,comment:mComment,workDates:mWorkDays});
        setRequests(prev=>[req,...prev]);
        if(vac) setVacations(prev=>[...prev,vac]);
      } else if(mAction==="guardia"){
        const { request:req } = await api("/api/requests","POST",{type:"GUARDIA",fromDate:mFrom,toDate:mTo,comment:mComment});
        setRequests(prev=>[req,...prev]);
      } else if(mAction==="remove_request"){
        const { request:req } = await api("/api/requests","POST",{type:"REMOVE",fromDate:mFrom,toDate:mTo,comment:mComment});
        setRequests(prev=>[req,...prev]);
      }
      setMSuccess(true);setTimeout(closeModal,2000);
    } catch(e:any){
      const msg = JSON.parse(e.message||"{}").error || "Error en enviar la sol·licitud.";
      alert(msg);
    }
    setSaving(false);
  };

  const handleApprove = async (id:number) => {
    const r = await api(`/api/requests/${id}`,"PUT",{status:"APPROVED"});
    setRequests(prev=>prev.map(x=>x.id===id?r:x));
    const updated = await fetch("/api/vacations").then(r=>r.json());
    setVacations(updated);
    const updatedG = await fetch("/api/guardias").then(r=>r.json());
    setGuardias(updatedG);
  };

  const handleReject = async (id:number) => {
    const r = await api(`/api/requests/${id}`,"PUT",{status:"REJECTED"});
    setRequests(prev=>prev.map(x=>x.id===id?r:x));
  };

  const applyQEdit = async () => {
    if(!qModal) return;
    const pid  = qPerson ? +qPerson : null;
    const sid  = qSub    ? +qSub    : null;
    const datesToApply = qApplyWeek
      ? allDays(weekMonday(qModal.dateKey), weekMonday(qModal.dateKey)).concat(
          Array.from({length:4},(_,i)=>{const d=new Date(weekMonday(qModal.dateKey));d.setDate(d.getDate()+i+1);return dk(d.getFullYear(),d.getMonth(),d.getDate());})
        ).filter(d=>{const dow=new Date(d).getDay();return dow!==0&&dow!==6&&!holidaySet.has(d);})
      : [qModal.dateKey];
    for(const date of datesToApply){
      const a = await api("/api/positions","POST",{date,positionId:qModal.posId,userId:pid,subUserId:sid});
      setAssignments(prev=>[...prev.filter(x=>!(x.date===date&&x.positionId===qModal.posId)),a]);
    }
    setQModal(null);setQApplyWeek(false);setQSub("");
  };

  const handleChangePassword = async () => {
    setPwError("");
    if(pwNew!==pwConfirm){setPwError("Les contrasenyes no coincideixen.");return;}
    if(pwNew.length<6){setPwError("Mínim 6 caràcters.");return;}
    try {
      await api("/api/change-password","POST",{currentPassword:pwCurrent,newPassword:pwNew});
      setPwSuccess(true);
      setTimeout(()=>{setPwModal(false);setPwCurrent("");setPwNew("");setPwConfirm("");setPwSuccess(false);},2000);
    } catch(e:any){
      const msg = await fetch("/api/change-password").catch(()=>({ok:false}));
      setPwError("Contrasenya actual incorrecta.");
    }
  };

  const handleAddUser = async () => {
    if(!newUName.trim()||!newUEmail.trim()) return;
    const ini=newUName.trim().split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2);
    const colors=["#D946A8","#22A855","#0EA5E9","#EA8C0F","#C9A800","#8B5CF6","#14B8A6","#F97316","#EC4899","#6366F1"];
    const used=users.map(u=>u.color);
    const color=colors.find(c=>!used.includes(c))||"#6b7280";
    const u = await api("/api/users","POST",{name:newUName.trim(),email:newUEmail.trim(),color,initials:ini,role:newURole,guardia:newUGuardia});
    setUsers(prev=>[...prev,u]);
    setNewUName("");setNewUEmail("");setNewURole("AUXILIAR");setNewUGuardia(false);setShowAddUser(false);
  };

  const updateUser = async (id:number, data:any) => {
    const u = await api(`/api/users/${id}`,"PUT",data);
    setUsers(prev=>prev.map(x=>x.id===id?u:x));
  };

  const nav = [
    {id:"stats",label:"Resum",icon:Icons.usr},
    {id:"today",label:"Avui",icon:Icons.home},
    {id:"calendar",label:"Calendari Guàrdies",icon:Icons.cal},
    {id:"quadrant",label:"Quadrant Posicions",icon:Icons.grid},
    {id:"admin",label:"Gestió",icon:Icons.inbox,badge:isAdm?pendCt:myPendCt},
    ...(isAdm?[{id:"users",label:"Usuaris",icon:Icons.uP},{id:"hols",label:"Festius",icon:Icons.gear}]:[]),
  ];

  const counterPid = isAdm ? (mPerson?+mPerson:null) : currentUser.id;
  const counterPerson = counterPid ? users.find(p=>p.id===counterPid) : null;

  return (
    <><style>{`*{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px;}`}</style>
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#1a1a2e",fontSize:13}}>

      {/* SIDEBAR */}
      <div style={{width:210,background:"#111827",color:"#fff",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 14px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{fontSize:13.5,fontWeight:700}}>🏥 GuàrdiesApp</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:2}}>Cirurgia · HCV · {YEAR}</div>
        </div>
        <div style={{padding:"6px 5px",flex:1,overflowY:"auto"}}>
          {nav.map(n=>(<div key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:view===n.id?600:500,color:view===n.id?"#fff":"rgba(255,255,255,0.4)",background:view===n.id?"rgba(255,255,255,0.1)":"transparent",marginBottom:1}}>
            <Ic i={n.icon} s={14}/>{n.label}
            {(n as any).badge>0&&<span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",fontSize:8.5,fontWeight:700,padding:"1px 5px",borderRadius:10}}>{(n as any).badge}</span>}
          </div>))}
        </div>
        <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
            <Avatar p={currentUser} sz={24}/>
            <div><div style={{fontSize:10,fontWeight:600}}>{currentUser.name}</div><div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)"}}>{isAdm?"Admin":"Auxiliar"}</div></div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setPwModal(true)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:3,padding:"4px 6px",borderRadius:4,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              <Ic i={Icons.key} s={10}/>Contrasenya
            </button>
            <button onClick={()=>signOut({callbackUrl:"/login"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:3,padding:"4px 6px",borderRadius:4,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              <Ic i={Icons.logout} s={10}/>Sortir
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#f3f4f6"}}>
        <div style={{height:46,background:"#fff",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",flexShrink:0}}>
          <h2 style={{fontSize:14,fontWeight:700}}>{{today:`Avui — ${fmtDow(TODAY)} ${fmtD(TODAY)}`,calendar:`Calendari ${YEAR}`,quadrant:"Quadrant de posicions",stats:"Resum per auxiliar",admin:"Gestió de sol·licituds",users:"Gestió d'usuaris",hols:"Gestió de festius"}[view]}</h2>
          {view==="calendar"&&<div style={{display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontSize:9.5,color:"#6b7280",fontStyle:"italic"}}>{isAdm?"✏️ Clic per editar":"📋 Clic per sol·licitar"}</span>
            <select value={filter} onChange={e=>setFilter(+e.target.value)} style={{padding:"3px 7px",borderRadius:5,border:"1.5px solid #d1d5db",fontSize:10.5,fontFamily:"inherit"}}><option value={0}>Totes</option>{gStaff.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>

          {/* TODAY */}
          {view==="today"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {positions.map(pos=>{
                const titId=getTitular(TODAY,pos.id);
                const subId=getSub(TODAY,pos.id);
                const titular=titId?users.find(u=>u.id===titId):null;
                const sub=subId?users.find(u=>u.id===subId):null;
                const titOnVac=(vMap[TODAY]||[]).includes(titId!);
                const isHol=holidaySet.has(TODAY);
                const effectivePerson=sub||titular;
                return(<div key={pos.id} style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",borderLeft:`4px solid ${isHol?"#d1d5db":effectivePerson?.color||"#d1d5db"}`}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.4,marginBottom:7}}>{pos.name}</div>
                  {isHol?<div style={{color:"#ef4444",fontSize:11,fontWeight:600}}>🔴 Festiu — posició buida</div>
                  :sub?(
                    <div>
                      {titular&&<div style={{display:"flex",alignItems:"center",gap:5,opacity:0.4,textDecoration:"line-through",marginBottom:4}}><Avatar p={titular} sz={20}/><span style={{fontSize:10.5}}>{titular.name}</span>{titOnVac&&<span>🌴</span>}</div>}
                      <div style={{display:"flex",alignItems:"center",gap:7}}><Avatar p={sub} sz={30}/><div><div style={{fontSize:12.5,fontWeight:700}}>{sub.name}</div><Badge bg={`${sub.color}20`} c={sub.color}>suplent</Badge></div></div>
                    </div>
                  ):titOnVac?(<div><div style={{display:"flex",alignItems:"center",gap:6,opacity:0.4,textDecoration:"line-through",marginBottom:4}}><Avatar p={titular} sz={26}/><span style={{fontSize:11.5,fontWeight:600}}>{titular?.name}</span></div><Badge bg="#fef3c7" c="#92400e">🌴 De vacances</Badge><div style={{marginTop:6,padding:6,background:"#fef2f2",borderRadius:5,fontSize:10,color:"#991b1b"}}>⚠️ Cal substitut/a</div></div>)
                  :(<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar p={titular} sz={30}/><div style={{fontSize:12.5,fontWeight:700}}>{titular?.name||"—"}</div></div>)}
                </div>);
              })}
            </div>
            {gMap[TODAY]&&(()=>{const gp=users.find(u=>u.id===gMap[TODAY]);return gp?(<div style={{background:"#fff",borderRadius:10,padding:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{background:gp.color,color:"#fff",padding:"5px 10px",borderRadius:5,fontSize:10.5,fontWeight:700}}>🛡️ GUÀRDIA</div><Avatar p={gp} sz={26}/><span style={{fontSize:12.5,fontWeight:700}}>{gp.name}</span></div>):null;})()}
            {isAdm&&pendCt>0&&<div onClick={()=>setView("admin")} style={{background:"#fff",borderRadius:10,padding:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Badge bg="#fef3c7" c="#92400e">📨 {pendCt} sol·licituds pendents</Badge><span style={{fontSize:10.5,color:"#6b7280"}}>→ Gestionar</span></div>}
          </>)}

          {/* CALENDAR */}
          {view==="calendar"&&(<>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10,padding:"8px 10px",background:"#fff",borderRadius:8,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",alignItems:"center"}}>
              {gStaff.map(p=><div key={p.id} onClick={()=>setFilter(f=>f===p.id?0:p.id)} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,fontWeight:500,cursor:"pointer",opacity:filter&&filter!==p.id?0.3:1}}><div style={{width:10,height:10,borderRadius:2,background:p.color}}/>{p.name}</div>)}
              <div style={{width:1,height:10,background:"#e5e7eb"}}/>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:10}}><div style={{width:10,height:10,borderRadius:2,background:"#fef2f2",border:"1px solid #fca5a5"}}/>Festiu</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:10}}><div style={{width:10,height:10,borderRadius:2,background:"#e0f2fe",border:"1.5px solid #7dd3fc"}}/>Vacances</div>
              <div style={{display:"flex",alignItems:"center",gap:3,fontSize:10}}><div style={{width:10,height:10,borderRadius:2,background:"#f0fdf4",border:"1.5px dashed #86efac"}}/>Pendent</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {Array.from({length:12},(_,m)=><MonthCal key={m} month={m} holidaySet={holidaySet} gMap={gMap} vMap={vMap} pendVMap={pendVMap} pendGMap={pendGMap} filter={filter} users={users} onClick={handleCalClick}/>)}
            </div>
          </>)}

          {/* QUADRANT */}
          {view==="quadrant"&&(<>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <button onClick={()=>setWeekOff(w=>w-1)} style={{width:28,height:28,borderRadius:5,border:"1.5px solid #d1d5db",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic i={Icons.left} s={13}/></button>
              <span style={{fontSize:12.5,fontWeight:700,minWidth:210,textAlign:"center"}}>{fmtD(weekDates[0])} — {fmtD(weekDates[6])}</span>
              <button onClick={()=>setWeekOff(w=>w+1)} style={{width:28,height:28,borderRadius:5,border:"1.5px solid #d1d5db",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic i={Icons.right} s={13}/></button>
              <button onClick={()=>setWeekOff(0)} style={{padding:"4px 9px",borderRadius:5,border:"1.5px solid #d1d5db",background:"#fff",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Avui</button>
              {isAdm&&<span style={{fontSize:9.5,color:"#6b7280",fontStyle:"italic"}}>✏️ Clic per editar</span>}
            </div>
            <div style={{background:"#fff",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={{textAlign:"left",padding:"9px 10px",fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#6b7280",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",width:115}}>Dia</th>
                  {positions.map(pos=><th key={pos.id} style={{textAlign:"center",padding:"9px 6px",fontSize:8.5,fontWeight:700,textTransform:"uppercase",color:"#6b7280",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>{pos.name}</th>)}
                </tr></thead>
                <tbody>{weekDates.map(dateKey=>{
                  const dow=new Date(dateKey).getDay(),isWe=dow===0||dow===6,isHol=holidaySet.has(dateKey),gUid=gMap[dateKey],todayV=vMap[dateKey]||[];
                  if(isWe){const gP=gUid?users.find(u=>u.id===gUid):null;return(<tr key={dateKey} style={{background:"#f9fafb"}}><td style={{padding:"7px 10px",fontSize:10.5,fontWeight:600,color:"#9ca3af"}}>{fmtDow(dateKey)} {fmtD(dateKey)}</td><td colSpan={6} style={{padding:"7px 10px",textAlign:"center",fontSize:10.5,color:"#9ca3af"}}>{gP?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><Avatar p={gP} sz={16}/>🛡️ <strong>{gP.name}</strong></span>:"Cap de setmana"}</td></tr>);}
                  if(isHol){return(<tr key={dateKey} style={{background:"#fef2f2"}}><td style={{padding:"7px 10px",fontSize:10.5,fontWeight:600,color:"#ef4444"}}>{fmtDow(dateKey)} {fmtD(dateKey)} 🔴</td><td colSpan={6} style={{padding:"7px 10px",textAlign:"center",fontSize:10.5,color:"#ef4444",fontWeight:600}}>Festiu — sense activitat</td></tr>);}
                  const dayNote=noteMap[dateKey];
                  return(<tr key={dateKey} style={{background:dateKey===TODAY?"#fffbeb":"transparent"}}>
                    <td style={{padding:"7px 10px",fontSize:10.5,fontWeight:dateKey===TODAY?700:600,color:"#374151"}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span>{fmtDow(dateKey)} {fmtD(dateKey)}{dateKey===TODAY&&<span style={{fontSize:7.5,background:"#111827",color:"#fff",padding:"1px 4px",borderRadius:3,marginLeft:3}}>AVUI</span>}</span>
                        {isAdm&&<button onClick={()=>{setNoteModal({dateKey});setNoteText(noteMap[dateKey]||"");}} title={dayNote||"Afegir nota"} style={{marginLeft:"auto",width:18,height:18,borderRadius:4,border:"none",background:dayNote?"#fef3c7":"transparent",color:dayNote?"#92400e":"#d1d5db",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✎</button>}
                      </div>
                      {dayNote&&<div style={{fontSize:9,color:"#92400e",background:"#fef9c3",borderRadius:3,padding:"1px 4px",marginTop:2,maxWidth:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dayNote}</div>}
                    </td>
                    {positions.map(pos=>{
                      const titularId=getTitular(dateKey,pos.id);
                      const subId=getSub(dateKey,pos.id);
                      const titular=titularId?users.find(u=>u.id===titularId):null;
                      const sub=subId?users.find(u=>u.id===subId):null;
                      const titularOnVac=titularId?todayV.includes(titularId):false;
                      const openModal=()=>{if(isAdm){setQModal({dateKey,posId:pos.id});setQPerson(titularId?String(titularId):"");setQSub(subId?String(subId):"");setQApplyWeek(false);}};
                      return(<td key={pos.id} onClick={openModal} style={{padding:"4px 6px",textAlign:"center",borderLeft:"1px solid #f3f4f6",cursor:isAdm?"pointer":"default",verticalAlign:"middle"}}>
                        {sub?(
                          <div>
                            {titular&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2,opacity:0.45,marginBottom:1}}>
                              <Avatar p={titular} sz={13}/><span style={{fontSize:8.5,textDecoration:titularOnVac?"line-through":"none",color:"#9ca3af"}}>{titular.name}</span>
                              {titularOnVac&&<span style={{fontSize:7.5}}>🌴</span>}
                            </div>}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2,background:`${sub.color}15`,borderRadius:4,padding:"1px 3px"}}>
                              <Avatar p={sub} sz={16}/><span style={{fontSize:9.5,fontWeight:700,color:sub.color}}>{sub.name}</span>
                            </div>
                          </div>
                        ):titular?(titularOnVac?(
                          <div>
                            <div style={{fontSize:9.5,textDecoration:"line-through",color:"#d1d5db"}}>{titular.name}</div>
                            <Badge bg="#fef3c7" c="#92400e">🌴</Badge>
                          </div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                            <Avatar p={titular} sz={16}/><span style={{fontSize:10,fontWeight:600}}>{titular.name}</span>
                          </div>
                        )):<span style={{color:"#d1d5db",fontSize:10}}>—</span>}
                      </td>);
                    })}
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </>)}

          {/* STATS */}
          {view==="stats"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
            {(isAdm ? gStaff : gStaff.filter(p=>p.id===currentUser.id)).map(p=>{const g=gCount[p.id]||0,va=vacDaysUsed(p.id),ve=vacations.filter(v=>v.status==="APPROVED"&&v.userId===p.id).reduce((s,v)=>s+v.dates.filter(d=>d<=TODAY&&!isWeekend(d)&&!holidaySet.has(d)).length,0),pR=requests.filter(r=>r.userId===p.id&&r.status==="PENDING").length;
              return(<div key={p.id} style={{background:"#fff",borderRadius:9,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Avatar p={p} sz={30}/><div style={{fontSize:12.5,fontWeight:700}}>{p.name}</div></div>
                {[["🛡️ Guàrdies",g,"#111827"],["🌴 Aprovades",`${va}/${MAX_VAC}`,va>=MAX_VAC?"#ef4444":"#111827"],["✅ Disfrutades",`${ve}/${MAX_VAC}`,"#059669"],["📨 Sol·licituds pendents",pR,pR>0?"#ea8c0f":"#111827"]].map(([l,v,c]:any,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:i<3?"1px solid #f3f4f6":"none"}}><span style={{color:"#6b7280"}}>{l}</span><span style={{fontWeight:700,fontSize:12,color:c}}>{v}</span></div>
                ))}
                <div style={{marginTop:8}}><div style={{height:4,background:"#f3f4f6",borderRadius:2,overflow:"hidden",position:"relative"}}><div style={{height:"100%",width:`${Math.min((va/MAX_VAC)*100,100)}%`,background:`${p.color}40`,borderRadius:2,position:"absolute",top:0,left:0}}/><div style={{height:"100%",width:`${Math.min((ve/MAX_VAC)*100,100)}%`,background:p.color,borderRadius:2,position:"absolute",top:0,left:0}}/></div></div>
              </div>);
            })}
          </div>)}

          {/* GESTIÓ */}
          {view==="admin"&&(()=>{
            const visibleRequests = isAdm ? requests : requests.filter(r=>r.userId===currentUser.id);
            const cols = isAdm ? ["Auxiliar","Tipus","Detall","Comentari","Data","Estat",""] : ["Tipus","Detall","Comentari","Data","Estat"];
            return(<div style={{background:"#fff",borderRadius:9,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden"}}>
              {!isAdm&&<div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7eb",fontSize:11,color:"#6b7280"}}>Historial de les teves sol·licituds</div>}
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{cols.map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#6b7280",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                <tbody>{visibleRequests.length===0
                  ?<tr><td colSpan={cols.length} style={{padding:"20px",textAlign:"center",fontSize:11,color:"#9ca3af"}}>Cap sol·licitud</td></tr>
                  :visibleRequests.map(r=>{
                    const p=users.find(u=>u.id===r.userId);
                    const tBg=r.type==="GUARDIA"?"#e0e7ff":r.type==="REMOVE"?"#fee2e2":"#d1fae5";
                    const tC=r.type==="GUARDIA"?"#3730a3":r.type==="REMOVE"?"#991b1b":"#065f46";
                    const tL=r.type==="GUARDIA"?"Sol·licita guàrdia":r.type==="REMOVE"?"Eliminar guàrdia":"Vacances";
                    const sBg=r.status==="PENDING"?"#fef3c7":r.status==="APPROVED"?"#d1fae5":"#fee2e2";
                    const sC=r.status==="PENDING"?"#92400e":r.status==="APPROVED"?"#065f46":"#991b1b";
                    return(<tr key={r.id}>
                      {isAdm&&<td style={{padding:"7px 10px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><Avatar p={p} sz={20}/><span style={{fontSize:11,fontWeight:600}}>{p?.name}</span></div></td>}
                      <td style={{padding:"7px 10px"}}><Badge bg={tBg} c={tC}>{tL}</Badge></td>
                      <td style={{padding:"7px 10px",fontSize:11}}>{fmtD(r.fromDate)}{r.toDate&&r.toDate!==r.fromDate?` → ${fmtD(r.toDate)}`:""}</td>
                      <td style={{padding:"7px 10px",fontSize:10.5,color:"#6b7280",maxWidth:140}}>{r.comment}</td>
                      <td style={{padding:"7px 10px",fontSize:10,color:"#9ca3af"}}>{fmtD(r.createdAt.split("T")[0])}</td>
                      <td style={{padding:"7px 10px"}}><Badge bg={sBg} c={sC}>{r.status==="PENDING"?"Pendent":r.status==="APPROVED"?"Aprovada":"Rebutjada"}</Badge></td>
                      {isAdm&&<td style={{padding:"7px 10px"}}>{r.status==="PENDING"&&<div style={{display:"flex",gap:3}}>
                        <button onClick={()=>handleApprove(r.id)} style={{width:22,height:22,borderRadius:4,border:"none",background:"#d1fae5",color:"#059669",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic i={Icons.ck} s={12}/></button>
                        <button onClick={()=>handleReject(r.id)} style={{width:22,height:22,borderRadius:4,border:"none",background:"#fee2e2",color:"#dc2626",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic i={Icons.xx} s={12}/></button>
                      </div>}</td>}
                    </tr>);
                  })
                }</tbody>
              </table>
            </div>);
          })()}

          {/* USERS */}
          {view==="users"&&isAdm&&(<div style={{maxWidth:680}}>
            <div style={{background:"#fff",borderRadius:9,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden",marginBottom:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["","Nom","Email","Color","Rol","Guàrdies","Actiu",""].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#6b7280",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                <tbody>{users.map(u=>(
                  <tr key={u.id} style={{opacity:u.active?1:0.5,borderBottom:"1px solid #f9fafb"}}>
                    <td style={{padding:"6px 10px"}}><Avatar p={u} sz={22}/></td>
                    <td style={{padding:"6px 10px",fontSize:11.5,fontWeight:600}}>{u.name}</td>
                    <td style={{padding:"6px 10px",fontSize:10,color:"#6b7280"}}>{u.email}</td>
                    <td style={{padding:"6px 10px"}}>
                      <input type="color" value={u.color} onChange={e=>updateUser(u.id,{color:e.target.value})} style={{width:28,height:24,padding:0,border:"none",borderRadius:4,cursor:"pointer"}}/>
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <button onClick={()=>updateUser(u.id,{role:u.role==="ADMIN"?"AUXILIAR":"ADMIN"})} style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit",background:u.role==="ADMIN"?"#e0e7ff":"#f3f4f6",color:u.role==="ADMIN"?"#3730a3":"#6b7280"}}>{u.role==="ADMIN"?"Admin ↕":"Auxiliar ↕"}</button>
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <div onClick={()=>updateUser(u.id,{guardia:!u.guardia})} style={{width:32,height:18,borderRadius:9,background:u.guardia?"#22A855":"#d1d5db",padding:2,cursor:"pointer",display:"flex",justifyContent:u.guardia?"flex-end":"flex-start",transition:"background 0.15s"}}><div style={{width:14,height:14,borderRadius:7,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,0.2)"}}/></div>
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <div onClick={()=>updateUser(u.id,{active:!u.active})} style={{width:32,height:18,borderRadius:9,background:u.active?"#22A855":"#d1d5db",padding:2,cursor:"pointer",display:"flex",justifyContent:u.active?"flex-end":"flex-start",transition:"background 0.15s"}}><div style={{width:14,height:14,borderRadius:7,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,0.2)"}}/></div>
                    </td>
                    <td style={{padding:"6px 10px"}}><button onClick={()=>updateUser(u.id,{active:false})} style={{fontSize:10,color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Desactivar</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!showAddUser?<Btn onClick={()=>setShowAddUser(true)}>+ Afegir usuari</Btn>:(
              <div style={{background:"#fff",borderRadius:9,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Nou usuari</div>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                  <input value={newUName} onChange={e=>setNewUName(e.target.value)} placeholder="Nom complet" style={{flex:"1 1 150px",padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}/>
                  <input value={newUEmail} onChange={e=>setNewUEmail(e.target.value)} placeholder="email@hcv.cat" style={{flex:"1 1 180px",padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}/>
                  <select value={newURole} onChange={e=>setNewURole(e.target.value)} style={{padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}><option value="AUXILIAR">Auxiliar</option><option value="ADMIN">Admin</option></select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,cursor:"pointer"}}><input type="checkbox" checked={newUGuardia} onChange={e=>setNewUGuardia(e.target.checked)}/> Fa guàrdies</label>
                </div>
                <div style={{display:"flex",gap:5}}><Btn onClick={handleAddUser}>Crear</Btn><Btn onClick={()=>setShowAddUser(false)} bg="transparent" c="#6b7280" s={{border:"1.5px solid #d1d5db"}}>Cancel·lar</Btn></div>
              </div>
            )}
          </div>)}

          {/* HOLIDAYS */}
          {view==="hols"&&isAdm&&(<div style={{maxWidth:520}}>
            <div style={{background:"#fff",borderRadius:9,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",marginBottom:10}}>
              <div style={{fontSize:12.5,fontWeight:700,marginBottom:8}}>Festius {YEAR}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{holidays.sort((a,b)=>a.date.localeCompare(b.date)).map(h=><div key={h.date} style={{display:"inline-flex",alignItems:"center",gap:3,background:"#fef2f2",color:"#991b1b",padding:"3px 7px",borderRadius:4,fontSize:10,fontWeight:500}}>{fmtD(h.date)}{h.name?` · ${h.name}`:""}<button onClick={async()=>{await api("/api/holidays","DELETE",{date:h.date});setHolidays(prev=>prev.filter(x=>x.date!==h.date));}} style={{background:"none",border:"none",cursor:"pointer",color:"#991b1b",fontSize:12}}>×</button></div>)}</div>
            </div>
            <div style={{background:"#fff",borderRadius:9,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:7}}>Afegir festiu</div>
              <div style={{display:"flex",gap:6}}>
                <input type="date" id="newHolDate" style={{flex:1,padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}/>
                <input id="newHolName" placeholder="Nom (opcional)" style={{flex:1,padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}/>
                <Btn onClick={async()=>{const d=(document.getElementById("newHolDate") as HTMLInputElement).value;const n=(document.getElementById("newHolName") as HTMLInputElement).value;if(!d)return;const h=await api("/api/holidays","POST",{date:d,name:n||undefined});setHolidays(prev=>[...prev,h]);}}>Afegir</Btn>
              </div>
            </div>
          </div>)}
        </div>
      </div>

      {/* CALENDAR MODAL */}
      {modal&&<Modal onClose={closeModal}>
        {mSuccess?(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{width:40,height:40,borderRadius:"50%",background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",color:"#059669"}}><Ic i={Icons.ck} s={20}/></div><div style={{fontSize:13,fontWeight:700}}>{isAdm?"Canvi aplicat!":"Sol·licitud enviada!"}</div>{!isAdm&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>L'administradora la revisarà aviat.</div>}</div>)
        :(<>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{isAdm?"✏️ Editar calendari":"📋 Sol·licitar canvi"}</div>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:10}}>{fmtDow(modal.dateKey)} {fmtD(modal.dateKey)}{modal.isWe&&" (cap de setmana)"}{modal.isHol&&" · 🔴 Festiu"}</div>

          {(modal.gUid||modal.vUids?.length>0)&&(<div style={{marginBottom:10,padding:8,background:"#f9fafb",borderRadius:6}}>
            <div style={{fontSize:9,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Ara</div>
            {modal.gUid&&(()=>{const gp=users.find((u:User)=>u.id===modal.gUid);return gp?<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><Avatar p={gp} sz={16}/>🛡️ {gp.name}</div>:null;})()}
            {modal.vUids?.map((v:number)=>{const p=users.find((u:User)=>u.id===v);return p?<div key={v} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><Avatar p={p} sz={16}/>🌴 {p.name}</div>:null;})}
          </div>)}

          <div style={{marginBottom:10}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Acció</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {[["guardia",`🛡️ ${isAdm?"Assignar":"Sol·licitar"} guàrdia`,!modal.canGuardia],["vacation",`🌴 ${isAdm?"Assignar":"Demanar"} vacances`,false],...(isAdm?[["remove","🗑️ Eliminar",false]]:[["remove_request","🗑️ Eliminar guàrdia",!modal.gUid||gMap[modal.dateKey]!==currentUser.id]])].map(([a,l,dis]:any)=>(
                <button key={a} onClick={()=>!dis&&setMAction(a)} style={{padding:"5px 10px",borderRadius:5,fontSize:10.5,fontWeight:600,cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",border:mAction===a?"none":"1.5px solid #d1d5db",background:dis?"#f3f4f6":mAction===a?(a==="remove"?"#dc2626":"#111827"):"transparent",color:dis?"#9ca3af":mAction===a?"#fff":"#374151",opacity:dis?0.5:1}}>{l}</button>
              ))}
            </div>
            {!modal.canGuardia&&mAction==="guardia"&&<div style={{fontSize:9.5,color:"#ea8c0f",marginTop:3}}>⚠️ Només caps de setmana o festius.</div>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Data inici</div>
              <input type="date" value={mFrom} onChange={e=>{setMFrom(e.target.value);if(mTo&&e.target.value>mTo)setMTo(e.target.value);}} style={{width:"100%",padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit"}}/></div>
            <div><div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Data fi</div>
              <input type="date" value={mTo} min={mFrom} onChange={e=>setMTo(e.target.value<mFrom?mFrom:e.target.value)} style={{width:"100%",padding:"5px 7px",border:`1.5px solid ${mTo<mFrom?"#ef4444":"#d1d5db"}`,borderRadius:5,fontSize:11,fontFamily:"inherit"}}/>
              {mTo<mFrom&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>⚠️ Ha de ser ≥ inici</div>}
            </div>
          </div>
          {mFrom!==mTo&&mAction==="vacation"&&<div style={{fontSize:10,color:"#059669",fontWeight:600,marginBottom:8,padding:"4px 8px",background:"#f0fdf4",borderRadius:5}}>📅 {mWorkDays.length} dies laborables (sense caps de setmana ni festius)</div>}

          {counterPerson&&(mAction==="vacation"||mAction==="guardia")&&(<div style={{padding:"8px 10px",background:"#f0f9ff",borderRadius:7,border:"1px solid #bae6fd",marginBottom:10}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#0369a1",marginBottom:4}}>{isAdm&&mPerson?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><Avatar p={counterPerson} sz={14}/>{counterPerson.name}</span>:"Les meves dades"}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {mAction==="vacation"&&<><span style={{fontSize:11,color:"#0369a1"}}>Dies restants: <strong style={{color:MAX_VAC-vacDaysUsed(counterPid!)<5?"#ef4444":"#059669"}}>{MAX_VAC-vacDaysUsed(counterPid!)}/{MAX_VAC}</strong></span>
              {mWorkDays.length>0&&<span style={{fontSize:11,color:"#0369a1"}}>Seleccionats: <strong>{mWorkDays.length}</strong></span>}</>}
              {mAction==="guardia"&&<span style={{fontSize:11,color:"#0369a1"}}>Guàrdies enguany: <strong>{gCount[counterPid!]||0}</strong></span>}
            </div>
          </div>)}

          {isAdm&&mAction!=="remove"&&(<div style={{marginBottom:10}}>
            <div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Assignar a</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {(mAction==="guardia"?gStaff:users.filter(u=>u.active)).map(p=>(
                <button key={p.id} onClick={()=>setMPerson(String(p.id))} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:5,border:mPerson===String(p.id)?`2px solid ${p.color}`:"1.5px solid #e5e7eb",background:mPerson===String(p.id)?`${p.color}15`:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:600}}><Avatar p={p} sz={14}/>{p.name}</button>
              ))}
            </div>
          </div>)}

          {mAction==="remove_request"&&(<div style={{padding:"10px 12px",background:"#fef2f2",borderRadius:7,border:"1px solid #fecaca",marginBottom:10}}>
            <div style={{fontSize:11,color:"#991b1b"}}>Sol·licitaràs l'eliminació de la guàrdia del <strong>{fmtD(mFrom)}</strong>.</div>
          </div>)}

          {!isAdm&&(<div style={{marginBottom:10}}><div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>Comentari</div>
            <textarea value={mComment} onChange={e=>setMComment(e.target.value)} placeholder="Motiu..." style={{width:"100%",padding:"5px 7px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11,fontFamily:"inherit",resize:"vertical",minHeight:40}}/></div>)}

          <div style={{display:"flex",gap:5}}>
            {isAdm?<Btn onClick={applyEdit} disabled={saving||mTo<mFrom||(mAction==="vacation"&&mWorkDays.length===0)} bg={mAction==="remove"?"#dc2626":"#111827"}>{saving?"...":mAction==="remove"?"Eliminar":"Aplicar"}</Btn>
              :<Btn onClick={submitReq} disabled={saving||mTo<mFrom||(mAction==="vacation"&&mWorkDays.length===0)}>{saving?"...":"📋 Sol·licitar"}</Btn>}
          {mAction==="vacation"&&mWorkDays.length===0&&mFrom&&<div style={{fontSize:9.5,color:"#ef4444",marginTop:3}}>⚠️ Cap dia laborable al rang seleccionat.</div>}
            <Btn onClick={closeModal} bg="transparent" c="#6b7280" s={{border:"1.5px solid #d1d5db"}}>Cancel·lar</Btn>
          </div>
        </>)}
      </Modal>}

      {/* QUADRANT MODAL */}
      {qModal&&isAdm&&(()=>{
        const pos=positions.find(p=>p.id===qModal.posId);
        const titularOnVac=qPerson?(vMap[qModal.dateKey]||[]).includes(+qPerson):false;
        const PersonPicker=({value,onChange,label,highlight}:{value:string,onChange:(v:string)=>void,label:string,highlight?:boolean})=>(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9.5,fontWeight:700,color:highlight?"#92400e":"#6b7280",textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
              {highlight&&<span>⚠️</span>}{label}
              {highlight&&<span style={{fontSize:9,fontWeight:400,color:"#92400e"}}>(de vacances aquest dia)</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              <button onClick={()=>onChange("")} style={{padding:"4px 9px",borderRadius:5,border:!value?"2px solid #111":"1.5px solid #e5e7eb",background:!value?"#f3f4f6":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:600}}>— Ningú</button>
              {users.filter(u=>u.active).map(u=>(<button key={u.id} onClick={()=>onChange(String(u.id))} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:5,border:value===String(u.id)?`2px solid ${u.color}`:"1.5px solid #e5e7eb",background:value===String(u.id)?`${u.color}15`:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:600}}><Avatar p={u} sz={14}/>{u.name}</button>))}
            </div>
          </div>
        );
        return(<Modal onClose={()=>{setQModal(null);setQSub("");}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>✏️ Editar posició</div>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:14}}>{fmtDow(qModal.dateKey)} {fmtD(qModal.dateKey)} — {pos?.name}</div>
          <PersonPicker value={qPerson} onChange={setQPerson} label="Titular" highlight={titularOnVac}/>
          <div style={{borderTop:"1px dashed #e5e7eb",marginBottom:12,paddingTop:12}}>
            <PersonPicker value={qSub} onChange={setQSub} label={`Suplent${titularOnVac?" (recomanat)":""}`}/>
          </div>
          {qSub&&qPerson&&qSub===qPerson&&<div style={{fontSize:10,color:"#dc2626",marginBottom:8}}>⚠️ El suplent és la mateixa persona que el titular.</div>}
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:14,padding:"8px 10px",background:"#f9fafb",borderRadius:6}}>
            <input type="checkbox" checked={qApplyWeek} onChange={e=>setQApplyWeek(e.target.checked)} style={{width:14,height:14}}/>
            <div><div style={{fontSize:11.5,fontWeight:600}}>Aplicar a tota la setmana</div><div style={{fontSize:10,color:"#6b7280"}}>Canvia tots els dies laborables de la setmana</div></div>
          </label>
          <div style={{display:"flex",gap:5}}>
            <Btn onClick={applyQEdit}>Aplicar</Btn>
            <Btn onClick={()=>{setQModal(null);setQSub("");}} bg="transparent" c="#6b7280" s={{border:"1.5px solid #d1d5db"}}>Cancel·lar</Btn>
          </div>
        </Modal>);
      })()}

      {/* DAY NOTE MODAL */}
      {noteModal&&isAdm&&<Modal onClose={()=>setNoteModal(null)}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>✎ Nota del dia</div>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:12}}>{fmtDow(noteModal.dateKey)} {fmtD(noteModal.dateKey)}</div>
        <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Escriu una nota per a aquest dia..." autoFocus style={{width:"100%",padding:"6px 9px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:11.5,fontFamily:"inherit",resize:"vertical",minHeight:64,marginBottom:10}}/>
        <div style={{display:"flex",gap:5}}>
          <Btn onClick={saveNote}>{noteText.trim()?"Desar":"Esborrar nota"}</Btn>
          {noteMap[noteModal.dateKey]&&noteText.trim()&&<Btn onClick={()=>setNoteText("")} bg="#dc2626">Esborrar</Btn>}
          <Btn onClick={()=>setNoteModal(null)} bg="transparent" c="#6b7280" s={{border:"1.5px solid #d1d5db"}}>Cancel·lar</Btn>
        </div>
      </Modal>}

      {/* PASSWORD MODAL */}
      {pwModal&&<Modal onClose={()=>{setPwModal(false);setPwError("");setPwSuccess(false);}}>
        {pwSuccess?(<div style={{textAlign:"center",padding:"16px 0"}}><div style={{width:40,height:40,borderRadius:"50%",background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",color:"#059669"}}><Ic i={Icons.ck} s={20}/></div><div style={{fontSize:13,fontWeight:700}}>Contrasenya canviada!</div></div>)
        :(<>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>🔑 Canviar contrasenya</div>
          {[["pwCurrent","Contrasenya actual",pwCurrent,(v:string)=>setPwCurrent(v)],["pwNew","Nova contrasenya",pwNew,(v:string)=>setPwNew(v)],["pwConfirm","Confirma nova contrasenya",pwConfirm,(v:string)=>setPwConfirm(v)]].map(([id,label,val,setter]:any)=>(
            <div key={id} style={{marginBottom:10}}>
              <div style={{fontSize:9.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>{label}</div>
              <input type="password" value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",padding:"6px 9px",border:"1.5px solid #d1d5db",borderRadius:5,fontSize:12,fontFamily:"inherit"}}/>
            </div>
          ))}
          {pwError&&<div style={{fontSize:11,color:"#dc2626",marginBottom:10,padding:"6px 10px",background:"#fef2f2",borderRadius:5}}>{pwError}</div>}
          <div style={{display:"flex",gap:5}}>
            <Btn onClick={handleChangePassword}>Desar</Btn>
            <Btn onClick={()=>{setPwModal(false);setPwError("");}} bg="transparent" c="#6b7280" s={{border:"1.5px solid #d1d5db"}}>Cancel·lar</Btn>
          </div>
        </>)}
      </Modal>}

    </div></>
  );
}
