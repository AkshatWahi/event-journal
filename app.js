// ═══════════════════════════════════════════════════════════════════
// EVENT JOURNAL v9 — Main Script
// ═══════════════════════════════════════════════════════════════════

// ── DB ──────────────────────────────────────────────────────────────
let db;
const DB_NAME = 'FairJournal', DB_VER = 3;
function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result, old = e.oldVersion;
      if (old > 0 && old < 3) try { localStorage.setItem('ej-legacy','1'); } catch(x) {}
      if (!d.objectStoreNames.contains('fairs'))   d.createObjectStore('fairs', { keyPath:'id' });
      if (!d.objectStoreNames.contains('entries')) { const s=d.createObjectStore('entries',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
      if (!d.objectStoreNames.contains('blobs'))   d.createObjectStore('blobs', { keyPath:'id' });
      if (!d.objectStoreNames.contains('companies'))      { const s=d.createObjectStore('companies',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
      if (!d.objectStoreNames.contains('meetings'))       { const s=d.createObjectStore('meetings',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
      if (!d.objectStoreNames.contains('dayPlan'))        { const s=d.createObjectStore('dayPlan',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
      if (!d.objectStoreNames.contains('visitObjectives')){ const s=d.createObjectStore('visitObjectives',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
      if (!d.objectStoreNames.contains('quickLinks'))     { const s=d.createObjectStore('quickLinks',{keyPath:'id'}); s.createIndex('fairId','fairId',{unique:false}); }
    };
    req.onsuccess = e => { db = e.target.result; res(); };
    req.onerror  = () => rej(req.error);
  });
}
const dbGet        = (store,key)      => new Promise((res,rej)=>{ const r=db.transaction(store,'readonly').objectStore(store).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const dbGetAll     = store            => new Promise((res,rej)=>{ const r=db.transaction(store,'readonly').objectStore(store).getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const dbGetByIndex = (store,idx,val)  => new Promise((res,rej)=>{ const r=db.transaction(store,'readonly').objectStore(store).index(idx).getAll(val); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const dbPut        = (store,obj)      => new Promise((res,rej)=>{ const r=db.transaction(store,'readwrite').objectStore(store).put(obj); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
const dbDelete     = (store,key)      => new Promise((res,rej)=>{ const r=db.transaction(store,'readwrite').objectStore(store).delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });

// ── STATE ────────────────────────────────────────────────────────────
let currentEventId=null, currentEventData=null, currentDay=1;
let photoBlob=null, photoPreviewUrl=null;
let _deleteEventId=null, _pendingRestore=null;
let _activeCtxId=null, _activeCtxType=null, _activeCtxPiId=null;
let _toastUndoPiId=null;
let _pendingDeleteActId=null, _pendingDeleteActType=null, _pendingDeleteEntryId=null;
let _flowMetaExpanded=false;
let _addPlanSelected=[];
let _currentLogsActId=null, _currentLogsActType=null;
let _lightboxEntries=[], _quickMeetingType='company';
let _coDomainsSelected=[], _coDomainOptions=[];
let toastTimer;

async function EJ_loadDemoEvent() {
  try {
    const fairId = 'demo-ew2026';
    const coBasler  = 'demo-co-basler';
    const coMe      = 'demo-co-me';
    const coNxp     = 'demo-co-nxp';
    const mtKeynote = 'demo-mt-keynote';
    const mtSick    = 'demo-mt-sick';
    const mtHms     = 'demo-mt-hms';
    await dbPut('companies', {id:coBasler,  fairId, name:'Basler AG',          location:'Hall 4, C12',       domains:['Vision'],             notes:'Focus on ace 2 series \u2014 CXP-12 for Q3 delivery.',            questions:[{text:'New drivers for Linux kernel 6.x?',done:false},{text:'Pricing for 10+ unit orders?',done:false},{text:'SDK roadmap for embedded ARM?',done:false}], visited:false});
    await dbPut('companies', {id:coMe,      fairId, name:'Micro-Epsilon',       location:'Hall 2, A08',       domains:['Sensors'],            notes:'Laser triangulation vs inductive \u2014 optoNCDT sub-5\u03bcm.',  questions:[{text:'Long-term drift spec for optoNCDT?',done:true},{text:'IO-Link availability?',done:false}], visited:true});
    await dbPut('companies', {id:coNxp,     fairId, name:'NXP Semiconductors',  location:'Hall 1, D03',       domains:['Semicon'],            notes:'i.MX 9 for next motor control platform.',                        questions:[{text:'Long-term supply post-2026?',done:false},{text:'Dev kit availability?',done:false}], visited:false});
    await dbPut('meetings',  {id:mtKeynote, fairId, name:'Keynote \u2014 Industrial AI', time:'09:30', location:'Hall 9, Main Stage', notes:'Opening keynote \u2014 watch for AI/edge themes and new standards.', questions:[{text:'Main AI themes this year?',done:false},{text:'New standards announced?',done:false}], visited:false});
    await dbPut('meetings',  {id:mtSick,    fairId, name:'Demo \u2014 SICK AG Vision',   time:'14:30', location:'Hall 17',            notes:'Invited by sales. 3D vision for inline inspection.',              questions:[{text:'Scan rate for 3D inline?',done:false},{text:'SDK / integration options?',done:false}], visited:false});
    await dbPut('meetings',  {id:mtHms,     fairId, name:'HMS Networks',                  time:'09:00', location:'Hall 3, B05',        notes:'Industrial connectivity \u2014 Anybus for EtherNet/IP.',           questions:[{text:'Anybus CompactCom roadmap?',done:false},{text:'Linux driver support?',done:false}], visited:false});
    await dbPut('dayPlan', {id:'demo-dp-d1-keynote', fairId, activityId:mtKeynote, activityType:'meeting', actName:'Keynote \u2014 Industrial AI', actSub:'Hall 9, Main Stage', actTime:'09:30', day:1, done:false, order:0});
    await dbPut('dayPlan', {id:'demo-dp-d1-basler',  fairId, activityId:coBasler,  activityType:'company',  actName:'Basler AG',           actSub:'Hall 4, C12',  actTime:'',    day:1, done:false, order:1});
    await dbPut('dayPlan', {id:'demo-dp-d1-me',      fairId, activityId:coMe,      activityType:'company',  actName:'Micro-Epsilon',        actSub:'Hall 2, A08',  actTime:'',    day:1, done:true,  order:2});
    await dbPut('dayPlan', {id:'demo-dp-d1-nxp',     fairId, activityId:coNxp,     activityType:'company',  actName:'NXP Semiconductors',   actSub:'Hall 1, D03',  actTime:'',    day:1, done:false, order:3});
    await dbPut('dayPlan', {id:'demo-dp-d1-sick',    fairId, activityId:mtSick,    activityType:'meeting',  actName:'Demo \u2014 SICK AG Vision', actSub:'Hall 17', actTime:'14:30', day:1, done:false, order:4});
    await dbPut('dayPlan', {id:'demo-dp-d2-hms',     fairId, activityId:mtHms,     activityType:'meeting',  actName:'HMS Networks',         actSub:'Hall 3, B05',  actTime:'09:00', day:2, done:false, order:0});
    await dbPut('dayPlan', {id:'demo-dp-d2-basler',  fairId, activityId:coBasler,  activityType:'company',  actName:'Basler AG',           actSub:'Hall 4, C12',  actTime:'',    day:2, done:false, order:1});
    await dbPut('dayPlan', {id:'demo-dp-d2-nxp',     fairId, activityId:coNxp,     activityType:'company',  actName:'NXP Semiconductors',   actSub:'Hall 1, D03',  actTime:'',    day:2, done:false, order:2});
    await dbPut('visitObjectives', {id:'demo-vo1', fairId, text:'Evaluate 3 vision camera vendors',    done:true,  order:0});
    await dbPut('visitObjectives', {id:'demo-vo2', fairId, text:'Collect pricing for Q3 procurement',  done:false, order:1});
    await dbPut('visitObjectives', {id:'demo-vo3', fairId, text:'Attend keynote and note AI standards', done:false, order:2});
    await dbPut('visitObjectives', {id:'demo-vo4', fairId, text:'Follow up on HMS Anybus CompactCom',  done:false, order:3});
    await dbPut('quickLinks', {id:'demo-ql1', fairId, title:'Embedded World Floor Plan', url:'https://www.embedded-world.de/en/exhibition/floorplan', order:0});
    await dbPut('quickLinks', {id:'demo-ql2', fairId, title:'Exhibitor Directory',        url:'https://www.embedded-world.de/en/exhibitors',           order:1});
    const d1=Date.now()-2*86400000; // 2 days ago = demo Day 1
    const entries = [
      {id:'demo-e1', fairId, type:'note',    timestamp:d1+ 2*3600000+  5*60000, activityId:mtKeynote, activityType:'meeting', text:'Edge AI on FPGA \u2014 sub-5ms latency. Multiple vendors converging. NVIDIA Jetson vs Hailo.'},
      {id:'demo-e2', fairId, type:'contact', timestamp:d1+ 3*3600000+ 55*60000, activityId:coBasler,  activityType:'company',  name:'Marco Heinz',  company:'Basler AG',      phone:'', email:'marco.heinz@baslerweb.com',     notes:''},
      {id:'demo-e3', fairId, type:'note',    timestamp:d1+ 4*3600000+  8*60000, activityId:coBasler,  activityType:'company',  text:'ace 2 Pro CXP-12 available Q3. Linux 6.x beta \u2192 main June. ARM SDK 2027, earlier than expected.'},
      {id:'demo-e4', fairId, type:'thought', timestamp:d1+ 4*3600000+ 15*60000, activityId:coBasler,  activityType:'company',  text:'CXP-12 + ARM SDK timing works for new platform. Flag in proposal.'},
      {id:'demo-e5', fairId, type:'thought', timestamp:d1+ 4*3600000+ 40*60000, activityId:null,      activityType:null,       text:'Cobot arm vision integration \u2014 unplanned booth Hall 6. Revisit tomorrow.'},
      {id:'demo-e6', fairId, type:'note',    timestamp:d1+ 5*3600000+ 35*60000, activityId:coMe,      activityType:'company',  text:'optoNCDT 1420 \u2014 drift <0.5\u03bcm/6h stable temp. IO-Link Q2 2026.'},
      {id:'demo-e7', fairId, type:'contact', timestamp:d1+ 5*3600000+ 42*60000, activityId:coMe,      activityType:'company',  name:'Lena Fischer', company:'Micro-Epsilon', phone:'', email:'l.fischer@micro-epsilon.de', notes:''},
      {id:'demo-e8', fairId, type:'todo',    timestamp:d1+ 3*3600000+ 50*60000, activityId:coBasler,  activityType:'company',  items:[{text:'Request CXP-12 pricing sheet',done:true},{text:'Confirm Q3 SDK beta access',done:false},{text:'Connect on LinkedIn',done:false}]},
    ];
    for (const e of entries) await dbPut('entries', e);
    await dbPut('fairs', {id:fairId, name:'Demo Event', location:'Nuremberg, DE', date:'2026-03-11', endDate:'2026-03-12', createdAt:d1-3600000, entryCount:entries.length, lastEntryAt:entries[entries.length-1].timestamp, lastExportedAt:null}); // demo-e8 is a todo with 1/3 done — shows in Basler block header
    await EJ_renderEventsList(); EJ_showToast('Demo event loaded');
  } catch(err) { console.error('Demo load failed', err); EJ_showToast('Failed to load demo'); }
}

initDB().then(() => { EJ_loadPreferences(); EJ_renderEventsList(); });

// ── PREFERENCES ─────────────────────────────────────────────────────
function EJ_setTheme(t) {
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('theme-light-btn').classList.toggle('active',t==='light');
  document.getElementById('theme-dark-btn').classList.toggle('active',t==='dark');
  try { localStorage.setItem('ej-theme',t); } catch(e) {}
}
function EJ_setCardStyle(s) {
  document.documentElement.setAttribute('data-cardstyle',s);
  document.getElementById('style-bordered-btn').classList.toggle('active',s==='bordered');
  document.getElementById('style-tinted-btn').classList.toggle('active',s==='tinted');
  try { localStorage.setItem('ej-cardstyle',s); } catch(e) {}
}
function EJ_loadPreferences() {
  try {
    EJ_setTheme(localStorage.getItem('ej-theme')||'light');
    EJ_setCardStyle(localStorage.getItem('ej-cardstyle')||'bordered');
    if (localStorage.getItem('ej-legacy')==='1') {
      localStorage.removeItem('ej-legacy');
      setTimeout(()=>EJ_showToast('v8 data found — clear app storage in browser settings to start fresh'),1000);
    }
  } catch(e) {}
}

// ── HAMBURGER ────────────────────────────────────────────────────────
function EJ_toggleHamburger(e) { e.stopPropagation(); document.getElementById('hamburger-menu').classList.toggle('open'); }
function EJ_closeHamburger()   { document.getElementById('hamburger-menu').classList.remove('open'); }
document.addEventListener('click', ()=>EJ_closeHamburger());

// ── NAV ──────────────────────────────────────────────────────────────
function EJ_showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function EJ_goHome() {
  currentEventId = null; currentEventData=null;
  _activeCtxId=null; _activeCtxType=null; _activeCtxPiId=null;
  EJ_showScreen('screen-events');
  EJ_renderEventsList();
}
async function EJ_openEvent(eventId) {
  try {
    currentEventId = eventId;
    const ev=await dbGet('fairs',eventId); if(!ev){EJ_showToast('Event not found');return;}
    currentEventData=ev;
    const start=new Date(ev.date); start.setHours(0,0,0,0);
    const end=ev.endDate?new Date(ev.endDate):start; end.setHours(0,0,0,0);
    const numDays=Math.max(1,Math.floor((end-start)/86400000)+1);
    const today=new Date(); today.setHours(0,0,0,0);
    currentDay=Math.max(1,Math.min(numDays,Math.floor((today-start)/86400000)+1));
    document.getElementById('event-title').textContent=ev.name;
    const dateMeta=ev.endDate&&ev.endDate!==ev.date?ev.date+' – '+ev.endDate:(ev.date||'');
    document.getElementById('event-date-sub').textContent=[ev.location,dateMeta].filter(Boolean).join(' — ');
    _activeCtxId=null; _activeCtxType=null; _activeCtxPiId=null;
    EJ_updateCtxBar();
    EJ_showScreen('screen-event');
    EJ_switchTab('flow');
    EJ_renderTimeline();
  } catch(err){console.error(err);EJ_showToast('Failed to open event');}
}
function EJ_switchTab(tab) {
  ['plan','flow'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('active',t===tab);
    document.getElementById('content-'+t).classList.toggle('active',t===tab);
  });
  if(tab==='plan') EJ_renderPlanTab();
  if(tab==='flow') EJ_renderTimeline();
}

// ── EVENTS LIST ──────────────────────────────────────────────────────
function EJ_buildExportBadge(ev) {
  if (!ev.lastExportedAt) return `<div class="export-status never"><div class="export-status-dot"></div>Never exported</div>`;
  if ((ev.lastEntryAt || 0) > ev.lastExportedAt) return `<div class="export-status pending"><div class="export-status-dot"></div>Export pending</div>`;
  const d = new Date(ev.lastExportedAt).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
  return `<div class="export-status done"><div class="export-status-dot"></div>Exported ${d}</div>`;
}
async function EJ_renderEventsList() {
  try {
    const evs=(await dbGetAll('fairs')).sort((a,b)=>b.createdAt - a.createdAt);
    const el=document.getElementById('events-list');
    let h='';
    if(!evs.length){h=`<div class="empty-state">No events yet.<br>Tap ＋ New Event below to start.</div>`;el.innerHTML=h;return;}
    h+=`<div class="log-qs-label" style="margin-top:4px">Your Events</div>`;
    const todayStr=new Date().toISOString().split('T')[0];
    const mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for(const ev of evs){
      const badge=EJ_buildExportBadge(ev);
      const year=ev.date?ev.date.split('-')[0]:'';
      const endD=ev.endDate&&ev.endDate!==ev.date?ev.endDate:(ev.date||'');
      let statusCls,statusTxt;
      if(todayStr<(ev.date||'')){statusCls='upcoming';statusTxt='Upcoming';}
      else if(todayStr>endD){statusCls='expired';statusTxt='Expired';}
      else{statusCls='active';statusTxt='Active';}
      const statusBadge=`<span class="evt-status-badge ${statusCls}">${statusTxt}</span>`;
      let dateTxt='';
      if(ev.date){
        const[,sm,sd]=ev.date.split('-');
        if(ev.endDate&&ev.endDate!==ev.date){
          const[,em,ed]=ev.endDate.split('-');
          dateTxt=sm===em?`${mons[+sm-1]} ${+sd} – ${+ed}`:`${mons[+sm-1]} ${+sd} – ${mons[+em-1]} ${+ed}`;
        }else{dateTxt=`${mons[+sm-1]} ${+sd}`;}
      }
      h+=`<div class="event-card" onclick="EJ_openEvent('${ev.id}')">
        <div style="flex:1;min-width:0">
          <div class="event-card-name">${esc(ev.name)}${year?`<span class="evt-year-sep"> | ${year}</span>`:''}
          </div>
          <div class="event-card-meta-row">
            ${dateTxt?`<span>${dateTxt}</span>`:''}
            ${ev.location?`<span>${esc(ev.location)}</span>`:''}
          </div>
          <div class="event-card-badges">${statusBadge}${badge}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:12px">
          <button class="btn-delete-event" onclick="event.stopPropagation();EJ_EJ_confirmDeleteEventFromList('${ev.id}')" title="Delete">&#10005;</button>
          <span style="color:var(--text2);font-size:20px">&#8250;</span>
        </div>
      </div>`;
    }
    el.innerHTML=h;
  } catch(err){console.error(err);EJ_showToast('Failed to load events');}
}
async function EJ_createEvent() {
  try {
    const name=document.getElementById('new-event-name').value.trim();
    if(!name){EJ_showToast('Event name is required');return;}
    const todayStr = new Date().toISOString().split('T')[0];
    const ev={id:uid(),name,location:document.getElementById('new-event-location').value.trim(),date:document.getElementById('new-event-date').value||todayStr,endDate:document.getElementById('new-event-enddate').value||'',createdAt:Date.now(),entryCount: 0,lastEntryAt:null,lastExportedAt: null};
    await dbPut('fairs',ev);
    EJ_closeModal('modal-new-event');
    ['new-event-name','new-event-location','new-event-date','new-event-enddate'].forEach(id=>document.getElementById(id).value='');
    EJ_openEvent(ev.id);
  } catch(err){console.error(err);EJ_showToast('Failed to create event');}
}
function EJ_confirmDeleteEvent(id) {
  if(!id)return; _deleteEventId=id;
  dbGet('fairs',id).then(ev=>{if(!ev)return;document.getElementById('confirm-event-name').textContent=ev.name;EJ_openModal('modal-confirm-delete-event');});
}
function EJ_EJ_confirmDeleteEventFromList(id,name) {
  _deleteEventId=id;
  if(name){document.getElementById('confirm-event-name').textContent=name;EJ_openModal('modal-confirm-delete-event');}
  else{dbGet('fairs',id).then(ev=>{document.getElementById('confirm-event-name').textContent=ev?ev.name:'';EJ_openModal('modal-confirm-delete-event');});}
}
async function EJ_deleteEventConfirmed() {
  EJ_closeModal('modal-confirm-delete-event'); EJ_showProgress('Deleting','Removing data...');
  try {
    const id=_deleteEventId;
    const entryItems=await dbGetByIndex('entries','fairId',id);
    for(const x of entryItems){await dbDelete('entries',x.id);await dbDelete('blobs',x.id);}
    for(const store of ['companies','meetings','dayPlan','visitObjectives','quickLinks']){
      const items=await dbGetByIndex(store,'fairId',id);
      for(const x of items)await dbDelete(store,x.id);
    }
    await dbDelete('fairs',id);
    EJ_hideProgress(); _deleteEventId=null;
    if(currentEventId===id){currentEventId=null;EJ_showScreen('screen-events');}
    EJ_renderEventsList(); EJ_showToast('Event deleted');
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('Delete failed');}
}

// ── PLAN TAB ─────────────────────────────────────────────────────────
async function EJ_renderPlanTab() {
  if(!currentEventId)return;
  await EJ_renderDayPlan();
  await EJ_renderObjectives();
  await EJ_renderQuickLinks();
  await EJ_renderCompanies();
  await EJ_renderMeetings();
  await EJ_renderGreenDots();
}

async function EJ_renderDayPlan() {
  const items=(await dbGetByIndex('dayPlan','fairId',currentEventId)).sort((a,b)=>a.day-b.day||a.order-b.order);
  const ev=currentEventData||await dbGet('fairs',currentEventId);
  const days=[...new Set(items.map(p=>p.day))].sort((a,b)=>a-b);
  if(!items.length){document.getElementById('day-plan-container').innerHTML='<div style="font-size:12px;color:var(--muted);padding:8px 0;font-family:var(--mono)">No plan items. Add companies first, then tap ＋.</div>';return;}
  let h='';
  const startDate=new Date(ev.date);
  days.forEach(day=>{
    const d=new Date(startDate); d.setDate(d.getDate()+day-1);
    const lbl=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
    const isToday=day===currentDay;
    const active=items.filter(p=>p.day===day&&!p.done).sort((a,b)=>a.order-b.order);
    const done=items.filter(p=>p.day===day&&p.done).sort((a,b)=>a.order-b.order);
    h+=`<div class="day-plan-day"><div class="dplan-day-hdr">${isToday?'<span class="dplan-today">Today</span>':''} Day ${day} &middot; ${lbl}
      <button class="sec-collapse" id="dc-${day}" onclick="EJ_toggleDayCollapse(${day})" style="margin-left:auto">&#x25b2;</button></div>
      <div id="pal-wrap-${day}">
        <div class="pal-day" id="pal-d${day}" data-day="${day}">`;
    active.forEach(p=>{h+=EJ_piHTML(p);});
    h+=`</div>`;
    if(done.length){h+=`<div class="done-label">Completed</div><div id="pdl-d${day}">`;done.forEach(p=>{h+=EJ_piHTML(p);});h+=`</div>`;}
    else h+=`<div id="pdl-d${day}"></div>`;
    h+=`</div></div>`;
  });
  document.getElementById('day-plan-container').innerHTML=h;
  EJ_initDragForAllDays();
}
function EJ_piHTML(p) {
  const isMtg=p.activityType==='meeting';
  const tagTxt=isMtg?('&#128336; '+(p.actTime||'')):'&#x25CE; Stop';
  const tagCls=isMtg?'pt-m':'pt-s';
  return `<div class="plan-item ${isMtg?'is-mtg':'is-stop'}${p.done?' done':''}" id="pi-${p.id}" data-piid="${p.id}" data-actid="${p.activityId}" draggable="true">
    <div class="pi-check" onclick="EJ_togglePlanItem('${p.id}')"><div class="pi-box${p.done?' done':''}">${p.done?'&#10003;':''}</div></div>
    <div class="pi-body"><div class="pi-title"><span class="pi-tag ${tagCls}">${tagTxt}</span>${esc(p.actName||'')}</div><div class="pi-meta">${esc(p.actSub||'')}</div></div>
    <button class="pi-del" onclick="EJ_deleteFromPlan('${p.id}')">&#x2715;</button>
    <div class="pi-drag">&#x2807;</div></div>`;
}
async function EJ_togglePlanItem(piId) {
  const item=await dbGet('dayPlan',piId); if(!item)return;
  item.done=!item.done; await dbPut('dayPlan',item);
  await EJ_renderDayPlan(); await EJ_renderGreenDots(); await EJ_renderAllQLists();
}
async function EJ_deleteFromPlan(piId) {
  await dbDelete('dayPlan',piId); await EJ_renderDayPlan(); await EJ_renderGreenDots();
}
function EJ_toggleDayCollapse(day) {
  const wrap=document.getElementById('pal-wrap-'+day), btn=document.getElementById('dc-'+day);
  if(!wrap||!btn)return;
  const c=wrap.style.display==='none'; wrap.style.display=c?'':'none'; btn.textContent=c?'▲':'▽';
}

// ── Add to Plan ──────────────────────────────────────────────────────
function EJ_openAddToPlan() {
  _addPlanSelected=[];
  (async()=>{
    const cos=await dbGetByIndex('companies','fairId',currentEventId);
    const mts=await dbGetByIndex('meetings','fairId',currentEventId);
    const all=[...cos.map(c=>{const ds=(c.domains||(c.domain?[c.domain]:[])).join(', ');return{id:c.id,type:'company',name:c.name,sub:ds+(c.location?(ds?' · ':'')+c.location:'')};}),...mts.map(m=>({id:m.id,type:'meeting',name:m.name,sub:(m.time||'')+(m.location?' · '+m.location:'')}))  ];
    if(!all.length){EJ_showToast('Add companies or meetings first');return;}
    document.getElementById('addplan-picker').innerHTML=all.map(a=>`<div class="picker-item" id="ap-${a.id}" onclick="EJ_togglePlanPick('${a.id}')"><div class="picker-bar ${a.type==='company'?'co':'mtg'}"></div><div><div class="picker-name">${esc(a.name)}</div><div class="picker-meta">${esc(a.sub)}</div></div></div>`).join('');
    document.getElementById('addplan-s1').classList.add('active');
    document.getElementById('addplan-s2').classList.remove('active');
    document.getElementById('addplan-title').textContent='Add to Day Plan';
    EJ_openOverlay('ov-add-plan');
  })();
}
function EJ_togglePlanPick(id) {
  const el=document.getElementById('ap-'+id); if(!el)return;
  const idx=_addPlanSelected.indexOf(id);
  if(idx===-1){_addPlanSelected.push(id);el.classList.add('sel');}
  else{_addPlanSelected.splice(idx,1);el.classList.remove('sel');}
}
async function EJ_addPlanStep2() {
  if(!_addPlanSelected.length){EJ_showToast('Select at least one item');return;}
  const ev=currentEventData||await dbGet('fairs',currentEventId);
  const start=new Date(ev.date), end=ev.endDate?new Date(ev.endDate):start;
  const numDays=Math.max(1,Math.floor((end-start)/86400000)+1);
  if(numDays<=1){await EJ_addSelectedToPlan(1);return;}
  document.getElementById('addplan-s1').classList.remove('active');
  document.getElementById('addplan-s2').classList.add('active');
  document.getElementById('addplan-title').textContent='Which day?';
  const startDate=new Date(ev.date);
  document.getElementById('addplan-day-btns').innerHTML=Array.from({length:numDays},(_,i)=>{
    const d=new Date(startDate); d.setDate(d.getDate()+i);
    const lbl=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    return `<button class="day-btn" onclick="EJ_addSelectedToPlan(${i+1})">${i+1===currentDay?'📌 ':''}Day ${i+1} · ${lbl}</button>`;
  }).join('');
}
function EJ_addPlanBack() {
  document.getElementById('addplan-s1').classList.add('active');
  document.getElementById('addplan-s2').classList.remove('active');
  document.getElementById('addplan-title').textContent='Add to Day Plan';
}
async function EJ_addSelectedToPlan(day) {
  const existing=(await dbGetByIndex('dayPlan','fairId',currentEventId)).filter(p=>p.day===day);
  const existIds=existing.map(p=>p.activityId);
  const maxOrder=existing.reduce((m,p)=>Math.max(m,p.order),-1);
  let off=1;
  for(const actId of _addPlanSelected){
    if(existIds.includes(actId))continue;
    let actName='',actSub='',actType='company',actTime='';
    const co=await dbGet('companies',actId);
    if(co){actName=co.name;const ds=(co.domains||(co.domain?[co.domain]:[])).join(', ');actSub=ds+(co.location?(ds?' · ':'')+co.location:'');}
    else{const mt=await dbGet('meetings',actId);if(mt){actName=mt.name;actSub=mt.location||'';actType='meeting';actTime=mt.time||'';}}
    await dbPut('dayPlan',{id:uid(),fairId:currentEventId,activityId:actId,activityType:actType,actName,actSub,actTime,day,done:false,order:maxOrder+off});off++;
  }
  EJ_closeOverlay('ov-add-plan'); await EJ_renderDayPlan(); await EJ_renderGreenDots();
}

// ── Objectives ───────────────────────────────────────────────────────
async function EJ_renderObjectives() {
  const objs=(await dbGetByIndex('visitObjectives','fairId',currentEventId)).sort((a,b)=>a.order-b.order);
  const makeRow=o=>`<div class="obj-row"><div class="obj-chk${o.done?' ticked':''}" onclick="EJ_toggleObjective('${o.id}')">${o.done?'✓':''}</div><div class="obj-txt${o.done?' ticked':''}" onclick="EJ_toggleObjective('${o.id}')">${esc(o.text)}</div><button class="obj-del" onclick="EJ_deleteObjective('${o.id}')">&#x2715;</button></div>`;
  const pl=document.getElementById('obj-list-plan');
  if(pl)pl.innerHTML=objs.length?objs.map(makeRow).join(''):'<div style="font-size:12px;color:var(--muted);padding:10px 14px;font-family:var(--mono)">No objectives yet.</div>';
  const fl=document.getElementById('fmh-obj-list');
  if(fl)fl.innerHTML=objs.map(o=>`<div style="display:flex;align-items:center;gap:9px;padding:3px 0"><div style="width:14px;height:14px;border:1.5px solid var(--border);border-radius:2px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:8px;${o.done?'background:var(--green);border-color:var(--green);color:#fff':''}" onclick="EJ_toggleObjective('${o.id}')">${o.done?'✓':''}</div><div style="font-size:12px;color:var(--text2);cursor:pointer;${o.done?'text-decoration:line-through;color:var(--muted)':''}" onclick="EJ_toggleObjective('${o.id}')">${esc(o.text)}</div></div>`).join('')||'<div style="font-size:12px;color:var(--muted)">No objectives yet.</div>';
  const done=objs.filter(o=>o.done).length, tot=objs.length;
  const dot=document.getElementById('fmh-dot'), sum=document.getElementById('fmh-summary');
  if(dot)dot.className='fmh-dot '+(tot>0&&done===tot?'all-done':'pending');
  if(sum)sum.textContent=done+'/'+tot+' objectives';
}
async function EJ_toggleObjective(id) {
  const o=await dbGet('visitObjectives',id); if(!o)return;
  o.done=!o.done; await dbPut('visitObjectives',o); await EJ_renderObjectives();
}
async function EJ_addObjective() {
  const inp=document.getElementById('obj-inp'), text=inp.value.trim(); if(!text)return;
  const objs=await dbGetByIndex('visitObjectives','fairId',currentEventId);
  const maxOrder=objs.reduce((m,o)=>Math.max(m,o.order||0),-1);
  await dbPut('visitObjectives',{id:uid(),fairId:currentEventId,text,done:false,order:maxOrder+1});
  inp.value=''; await EJ_renderObjectives();
}
async function EJ_deleteObjective(id) { await dbDelete('visitObjectives',id); await EJ_renderObjectives(); }

// ── Quick Links ──────────────────────────────────────────────────────
async function EJ_renderQuickLinks() {
  const links=(await dbGetByIndex('quickLinks','fairId',currentEventId)).sort((a,b)=>a.order-b.order);
  const pl=document.getElementById('ql-list-plan');
  if(pl)pl.innerHTML=links.length?links.map(l=>`<div class="ql-row"><span class="ql-icon">&#128279;</span><a class="ql-link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a><button class="ql-del" onclick="EJ_deleteQuickLink('${l.id}')">&#x2715;</button></div>`).join(''):'<div style="font-size:12px;color:var(--muted);padding:10px 14px;font-family:var(--mono)">No links yet.</div>';
  const fl=document.getElementById('fmh-link-list');
  if(fl){fl.innerHTML=links.map(l=>`<div style="padding:3px 0"><span style="font-size:11px;color:var(--blue);margin-right:4px">&#128279;</span><a href="${esc(l.url)}" target="_blank" rel="noopener" style="font-size:12px;color:var(--blue);text-decoration:none">${esc(l.title)}</a></div>`).join('')||'<div style="font-size:11px;color:var(--muted)">No links.</div>';const sec=document.getElementById('fmh-links-sec');if(sec)sec.style.display=links.length?'block':'none';}
}
async function EJ_addQuickLink() {
  const ti=document.getElementById('ql-title-inp'), ui=document.getElementById('ql-url-inp');
  const title=ti.value.trim(); let url=ui.value.trim();
  if(!title||!url){EJ_showToast('Both label and URL are required');return;}
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  try{const p=new URL(url);if(!['http:','https:'].includes(p.protocol))throw new Error();}
  catch{EJ_showToast('Please enter a valid URL');return;}
  const links=await dbGetByIndex('quickLinks','fairId',currentEventId);
  await dbPut('quickLinks',{id:uid(),fairId:currentEventId,title,url,order:links.reduce((m,l)=>Math.max(m,l.order||0),-1)+1});
  ti.value='';ui.value=''; await EJ_renderQuickLinks();
}
async function EJ_deleteQuickLink(id) { await dbDelete('quickLinks',id); await EJ_renderQuickLinks(); }

// ── Plan Cards ───────────────────────────────────────────────────────
async function EJ_renderCompanies() {
  const cos=(await dbGetByIndex('companies','fairId',currentEventId)).sort((a,b)=>a.name.localeCompare(b.name));
  const el=document.getElementById('companies-list'); if(!el)return;
  el.innerHTML=cos.map(c=>EJ_planCardHTML(c,'company')).join('');
  await EJ_renderAllQLists();
  await EJ_renderGreenDots();
}
async function EJ_renderMeetings() {
  const mts=(await dbGetByIndex('meetings','fairId',currentEventId)).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.name.localeCompare(b.name));
  const el=document.getElementById('meetings-list'); if(!el)return;
  el.innerHTML=mts.map(m=>EJ_planCardHTML(m,'meeting')).join('');
  await EJ_renderAllQLists();
  await EJ_renderGreenDots();
}
function EJ_planCardHTML(act,type) {
  const isMtg=type==='meeting';
  const domains=act.domains||(act.domain?[act.domain]:[]);
  const tag=isMtg&&act.time?`<div class="dtag dt-p">&#128336; ${esc(act.time)}</div>`:domains.map(d=>`<div class="dtag ${EJ_domainTagClass(d)}">${esc(d)}</div>`).join('');
  return `<div class="plan-card" id="pcard-${act.id}">
    <div class="pc-row" onclick="EJ_togglePlanCard('${act.id}')">
      <div class="pc-dot" id="pdot-${act.id}"></div><div class="pc-name">${esc(act.name)}</div>
      <div class="pc-count" id="pcnt-${act.id}">0</div>${tag}
      <div class="pc-chv" id="pchv-${act.id}">&#x203A;</div>
    </div>
    <div class="pc-detail" id="pdet-${act.id}">
      <div class="pc-notes" id="pnote-${act.id}">${esc(act.notes||'')}</div>
      <div class="q-list" id="pqlist-${act.id}"></div>
      <div class="pc-actions">
        <button class="btn-log" onclick="EJ_activateCtxAndGo('${act.id}','${type}')">Log in Flow</button>
        <button class="btn-logs" onclick="EJ_openLogs('${act.id}','${type}')">Logs</button>
        <button class="btn-edit" onclick="EJ_openEditActivity('${act.id}','${type}')">Edit</button>
      </div>
    </div></div>`;
}
function EJ_togglePlanCard(id) {
  const det=document.getElementById('pdet-'+id), chv=document.getElementById('pchv-'+id);
  if(!det||!chv)return;
  const open=det.classList.toggle('open'); chv.classList.toggle('open',open);
}
async function EJ_renderGreenDots() {
  const planItems=await dbGetByIndex('dayPlan','fairId',currentEventId);
  document.querySelectorAll('[id^="pdot-"]').forEach(async el=>{
    const actId=el.id.replace('pdot-','');
    el.classList.toggle('done',await EJ_isDoneToday(actId,planItems));
  });
}
async function EJ_isDoneToday(actId,planItems) {
  if(!planItems) planItems=await dbGetByIndex('dayPlan','fairId',currentEventId);
  const todayItem=planItems.find(p=>p.activityId===actId&&p.day===currentDay);
  if(todayItem)return todayItem.done;
  const co=await dbGet('companies',actId).catch(()=>null);
  if(co)return co.visited===true;
  const mt=await dbGet('meetings',actId).catch(()=>null);
  if(mt)return mt.visited===true;
  return false;
}
async function EJ_renderAllQLists() {
  const cos=await dbGetByIndex('companies','fairId',currentEventId);
  const mts=await dbGetByIndex('meetings','fairId',currentEventId);
  const entries=await dbGetByIndex('entries','fairId',currentEventId);
  for(const act of [...cos.map(c=>({...c,t:'company'})),...mts.map(m=>({...m,t:'meeting'}))]) {
    const qs=act.questions||[];
    const pl=document.getElementById('pqlist-'+act.id);
    if(pl)pl.innerHTML=qs.map((q,i)=>EJ_qRowHTML(act.id,i,q,false)).join('');
    const fl=document.getElementById('fqlist-'+act.id);
    if(fl)fl.innerHTML=qs.map((q,i)=>EJ_qRowHTML(act.id,i,q,true)).join('');
    const ll=document.getElementById('lqlist-'+act.id);
    if(ll)ll.innerHTML=qs.map((q,i)=>EJ_qRowHTML(act.id,i,q,false)).join('');
    const pnote=document.getElementById('pnote-'+act.id);
    if(pnote)pnote.textContent=act.notes||'';
    const fnote=document.getElementById('fnote-'+act.id);
    if(fnote)fnote.textContent=act.notes||'';
    const cnt=entries.filter(e=>e.activityId===act.id).length;
    const pcnt=document.getElementById('pcnt-'+act.id); if(pcnt)pcnt.textContent=cnt;
    const acnt=document.getElementById('cnt-'+act.id);  if(acnt)acnt.textContent=cnt;
    const tdes=entries.filter(e=>e.activityId===act.id&&e.type==='todo');
    const tditems=[...tdes.flatMap(e=>e.items||[{done:e.done||false}]),...(act.questions||[])];
    const tdEl=document.getElementById('td-'+act.id);
    if(tdEl){
      const block=document.getElementById('ab-'+act.id);
      const isEntries=block&&(block.dataset.collapse==='entries'||block.dataset.collapse==='full');
      if(tditems.length){tdEl.textContent=`${tditems.filter(x=>x.done).length}/${tditems.length} ✓`;tdEl.style.display=isEntries?'':'none';}
      else{tdEl.textContent='';tdEl.style.display='none';}
    }
  }
}
function EJ_qRowHTML(actId,idx,q,isFlow) {
  const ticked=q.done===true;
  const rc=isFlow?'ctx-q-row':'q-row', cc=isFlow?'ctx-q-chk':'q-chk', tc=isFlow?'ctx-q-txt':'q-txt';
  return `<div class="${rc}"><div class="${cc}${ticked?' ticked':''}" onclick="EJ_toggleQShared('${actId}',${idx})">${ticked?'✓':''}</div><div class="${tc}${ticked?' ticked':''}" onclick="EJ_toggleQShared('${actId}',${idx})">${esc(q.text||q)}</div></div>`;
}
async function EJ_toggleQShared(actId,idx) {
  let act=await dbGet('companies',actId), store='companies';
  if(!act){act=await dbGet('meetings',actId);store='meetings';}
  if(!act)return;
  const qs=act.questions||[]; if(!qs[idx])return;
  qs[idx].done=!qs[idx].done; act.questions=qs; await dbPut(store,act); await EJ_renderAllQLists();
}

// ── Domain chip input ────────────────────────────────────────────────
const _DTAG_COLORS=['dt-v','dt-s','dt-x','dt-p'];
function EJ_domainTagClass(name){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))&0xff;return _DTAG_COLORS[h%4];}
function EJ_renderDomainChips(){
  const wrap=document.getElementById('co-domains-wrap');if(!wrap)return;
  const pills=_coDomainOptions.map((d,i)=>{
    const sel=_coDomainsSelected.includes(d);
    return `<span class="dtag ${EJ_domainTagClass(d)}${sel?'':' domain-pill-off'}" onclick="EJ_toggleDomainPill(${i})">${esc(d)}</span>`;
  }).join('');
  wrap.innerHTML=pills+`<button class="domain-chip-add" onclick="EJ_showDomainInput()">＋ new</button>`;
}
function EJ_toggleDomainPill(i){
  const d=_coDomainOptions[i]; if(!d)return;
  const idx=_coDomainsSelected.indexOf(d);
  if(idx>=0)_coDomainsSelected.splice(idx,1);else _coDomainsSelected.push(d);
  EJ_renderDomainChips();
}
function EJ_showDomainInput(){
  const wrap=document.getElementById('co-domains-wrap');if(!wrap)return;
  const addBtn=wrap.querySelector('.domain-chip-add');if(!addBtn)return;
  const inp=document.createElement('input');
  inp.className='domain-chip-inp';inp.list='domain-suggestions';inp.placeholder='new domain';inp.autocomplete='off';
  inp.onkeydown=(e)=>{if(e.key==='Enter'){e.preventDefault();EJ_addDomainChip(inp.value);}else if(e.key==='Escape'){e.preventDefault();EJ_renderDomainChips();}};
  addBtn.replaceWith(inp);inp.focus();
}
function EJ_addDomainChip(val){
  val=(val||'').trim();
  if(val&&!_coDomainOptions.includes(val))_coDomainOptions.push(val);
  if(val&&!_coDomainsSelected.includes(val))_coDomainsSelected.push(val);
  EJ_renderDomainChips();
}
function EJ_removeDomainChip(idx){_coDomainsSelected.splice(idx,1);EJ_renderDomainChips();}

// ── Add Company / Meeting ────────────────────────────────────────────
async function EJ_loadDomainOptions(){
  if(currentEventId){
    const cos=await dbGetByIndex('companies','fairId',currentEventId);
    _coDomainOptions=[...new Set(cos.flatMap(c=>(c.domains||(c.domain?[c.domain]:[])).filter(Boolean)))];
    document.getElementById('domain-suggestions').innerHTML=_coDomainOptions.map(d=>`<option value="${esc(d)}">`).join('');
  }
  EJ_renderDomainChips();
}
async function EJ_openAddCompanyOverlay() {
  _coDomainsSelected=[];
  ['co-name','co-booth','co-notes','co-qs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const btn=document.getElementById('co-submit-btn'); if(btn){btn.textContent='Add Company';btn.onclick=EJ_submitAddCompany;}
  await EJ_loadDomainOptions();
  EJ_openOverlay('ov-company');
}
async function EJ_submitAddCompany() {
  const name=document.getElementById('co-name').value.trim(); if(!name){EJ_showToast('Name required');return;}
  const qsRaw=document.getElementById('co-qs').value.trim();
  const questions=qsRaw?qsRaw.split('\n').map(q=>q.trim()).filter(Boolean).map(t=>({text:t,done:false})):[];
  await dbPut('companies',{id:uid(),fairId:currentEventId,name,location:document.getElementById('co-booth').value.trim(),domains:[..._coDomainsSelected],notes:document.getElementById('co-notes').value.trim(),questions,visited:false});
  ['co-name','co-booth','co-notes','co-qs'].forEach(id=>document.getElementById(id).value='');
  _coDomainsSelected=[];
  const btn=document.getElementById('co-submit-btn'); btn.textContent='Add Company'; btn.onclick=EJ_submitAddCompany;
  EJ_closeOverlay('ov-company'); await EJ_renderCompanies();
}
function EJ_openAddMeetingOverlay() {
  ['mtg-name','mtg-time','mtg-loc','mtg-notes','mtg-qs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const btn=document.getElementById('mtg-submit-btn'); if(btn){btn.textContent='Add Meeting';btn.onclick=EJ_submitAddMeeting;}
  EJ_openOverlay('ov-meeting');
}
async function EJ_submitAddMeeting() {
  const name=document.getElementById('mtg-name').value.trim(); if(!name){EJ_showToast('Name required');return;}
  const qsRaw=document.getElementById('mtg-qs').value.trim();
  const questions=qsRaw?qsRaw.split('\n').map(q=>q.trim()).filter(Boolean).map(t=>({text:t,done:false})):[];
  await dbPut('meetings',{id:uid(),fairId:currentEventId,name,time:document.getElementById('mtg-time').value.trim(),location:document.getElementById('mtg-loc').value.trim(),notes:document.getElementById('mtg-notes').value.trim(),questions,visited:false});
  ['mtg-name','mtg-time','mtg-loc','mtg-notes','mtg-qs'].forEach(id=>document.getElementById(id).value='');
  const btn=document.getElementById('mtg-submit-btn'); btn.textContent='Add Meeting'; btn.onclick=EJ_submitAddMeeting;
  EJ_closeOverlay('ov-meeting'); await EJ_renderMeetings();
}
async function EJ_openEditActivity(actId,type) {
  const store=type==='company'?'companies':'meetings';
  const act=await dbGet(store,actId); if(!act)return;
  if(type==='company'){
    document.getElementById('co-name').value=act.name||'';
    document.getElementById('co-booth').value=act.location||'';
    document.getElementById('co-notes').value=act.notes||'';
    document.getElementById('co-qs').value=(act.questions||[]).map(q=>q.text||q).join('\n');
    _coDomainsSelected=[...(act.domains||(act.domain?[act.domain]:[]))];
    const btn=document.getElementById('co-submit-btn'); btn.textContent='Save Changes';
    btn.onclick=async()=>{
      act.name=document.getElementById('co-name').value.trim()||act.name;
      act.location=document.getElementById('co-booth').value.trim();
      act.domains=[..._coDomainsSelected];
      act.notes=document.getElementById('co-notes').value.trim();
      const raw=document.getElementById('co-qs').value.trim();
      act.questions=raw?raw.split('\n').map(q=>q.trim()).filter(Boolean).map(t=>({text:t,done:false})):act.questions;
      await dbPut('companies',act);
      ['co-name','co-booth','co-notes','co-qs'].forEach(id=>document.getElementById(id).value='');
      _coDomainsSelected=[];
      btn.textContent='Add Company'; btn.onclick=EJ_submitAddCompany;
      EJ_closeOverlay('ov-company'); await EJ_renderCompanies(); await EJ_renderAllQLists();
    };
    await EJ_loadDomainOptions();
    EJ_openOverlay('ov-company');
  } else {
    document.getElementById('mtg-name').value=act.name||'';
    document.getElementById('mtg-time').value=act.time||'';
    document.getElementById('mtg-loc').value=act.location||'';
    document.getElementById('mtg-notes').value=act.notes||'';
    document.getElementById('mtg-qs').value=(act.questions||[]).map(q=>q.text||q).join('\n');
    const btn=document.getElementById('mtg-submit-btn'); btn.textContent='Save Changes';
    btn.onclick=async()=>{
      act.name=document.getElementById('mtg-name').value.trim()||act.name;
      act.time=document.getElementById('mtg-time').value.trim();
      act.location=document.getElementById('mtg-loc').value.trim();
      act.notes=document.getElementById('mtg-notes').value.trim();
      const raw=document.getElementById('mtg-qs').value.trim();
      act.questions=raw?raw.split('\n').map(q=>q.trim()).filter(Boolean).map(t=>({text:t,done:false})):act.questions;
      await dbPut('meetings',act);
      ['mtg-name','mtg-time','mtg-loc','mtg-notes','mtg-qs'].forEach(id=>document.getElementById(id).value='');
      btn.textContent='Add Meeting'; btn.onclick=EJ_submitAddMeeting;
      EJ_closeOverlay('ov-meeting'); await EJ_renderMeetings(); await EJ_renderAllQLists();
    };
    EJ_openOverlay('ov-meeting');
  }
}

// ── Flow Meta ────────────────────────────────────────────────────────
function EJ_toggleFlowMeta() {
  _flowMetaExpanded=!_flowMetaExpanded;
  document.getElementById('fmh-body').style.display=_flowMetaExpanded?'block':'none';
  document.getElementById('fmh-expand-lbl').textContent=_flowMetaExpanded?'▲ Collapse':'▽ Expand';
  if(_flowMetaExpanded){EJ_renderObjectives();EJ_renderQuickLinks();}
}

// ── Flow Timeline ────────────────────────────────────────────────────
async function EJ_renderTimeline() {
  try {
    if(!currentEventId)return;
    await EJ_renderObjectives(); await EJ_renderQuickLinks();
    const entries=(await dbGetByIndex('entries','fairId',currentEventId)).sort((a,b)=>a.timestamp - b.timestamp);
    const container=document.getElementById('flow-scroll'); if(!container)return;
    let lastDay='';
    if(!entries.length){container.innerHTML='<div class="timeline-empty">No entries yet. Type a note or /command below.</div>';EJ_updateCtxBar();return;}
    const blockOrder=[], blockEntries={}, standalone=[];
    for(const e of entries){
      if(e.activityId){if(!blockEntries[e.activityId]){blockOrder.push(e.activityId);blockEntries[e.activityId]=[];}blockEntries[e.activityId].push(e);}
      else standalone.push(e);
    }
    const timeline=[];
    blockOrder.forEach(actId=>timeline.push({kind:'block',actId,ts:blockEntries[actId][0].timestamp}));
    standalone.forEach(e=>timeline.push({kind:'standalone',entry:e,ts:e.timestamp}));
    timeline.sort((a,b)=>a.ts-b.ts);
    const actCache={};
    for(const actId of blockOrder){
      let act=await dbGet('companies',actId),type='company';
      if(!act){act=await dbGet('meetings',actId);type='meeting';}
      actCache[actId]={act,type};
    }
    container.innerHTML='';
    for(const item of timeline){
      if(item.kind==='block'){
        const {act,type}=actCache[item.actId];
        container.appendChild(EJ_buildActivityBlock(item.actId,act,type,blockEntries[item.actId]));
        for(const e of blockEntries[item.actId])if(e.type==='photo')EJ_loadPhotoThumbnail(e.id);
      } else {
        container.appendChild(EJ_buildStandaloneEntry(item.entry));
        if(item.entry.type==='photo')EJ_loadPhotoThumbnail(item.entry.id);
      }
    }
    // If active context has no entries yet, append its block so the header is always visible
    if(_activeCtxId && !document.getElementById('ab-'+_activeCtxId)){
      const store=_activeCtxType==='company'?'companies':'meetings';
      const act=await dbGet(store,_activeCtxId).catch(()=>null);
      if(act)container.appendChild(EJ_buildActivityBlock(_activeCtxId,act,_activeCtxType,[]));
    }
    container.scrollTop = container.scrollHeight;
    EJ_updateCtxBar(); await EJ_renderGreenDots();
  } catch(err){console.error(err);EJ_showToast('Failed to load flow');}
}

function EJ_buildActivityBlock(actId,act,type,bes) {
  const isCo=type==='company', icon=isCo?'◎':'🕐';
  const name=act?esc(act.name):'Unknown';
  const sub=act?esc(isCo?(act.location||''):(act.location||'')):'';
  const domainChips=act&&isCo?(act.domains||(act.domain?[act.domain]:[])).map(d=>`<span class="dtag ${EJ_domainTagClass(d)}">${esc(d)}</span>`).join(''):'';
  const todoItems=[...bes.flatMap(e=>e.type==='todo'?(e.items||[{done:e.done||false}]):[]),...(act?act.questions||[]:[])];
  const todoSummary=`<span class="act-todo-count" id="td-${actId}" style="display:none">${todoItems.length?`${todoItems.filter(x=>x.done).length}/${todoItems.length} ✓`:''}</span>`;
  const qs=act&&act.questions?act.questions:[], note=act?esc(act.notes||''):'';
  const el=document.createElement('div');
  el.id='ab-'+actId; el.className='act-block '+(isCo?'co-block':'mtg-block');
  el.dataset.actid=actId; el.dataset.acttype=type;
  el.innerHTML=`<div class="act-hdr-row" onclick="EJ_toggleCollapse('ab-${actId}')">
    <div class="act-icon">${icon}</div>
    <div class="act-info"><div class="act-title">${name}</div><div class="act-sub">${sub}</div>${domainChips?`<div class="act-domains">${domainChips}</div>`:''}</div>
    <div class="act-right" onclick="event.stopPropagation()">
      ${todoSummary}<div class="act-count" id="cnt-${actId}">${bes.length}</div>
      <button class="act-log-btn" onclick="EJ_activateCtxFromBlock('${actId}','${type}')" title="Set as context">+</button>
      <button class="act-collapse-btn" onclick="EJ_fullCollapseBlock('ab-${actId}',event)">▲</button>
      <button class="act-del-btn" onclick="EJ_askDeleteBlock('${actId}','${type}',${esc(JSON.stringify(act?act.name:'Unknown'))})">&#x2715;</button>
    </div>
  </div>
  <div class="act-ctx" id="actx-${actId}">
    <div class="ctx-note-text" id="fnote-${actId}">${note}</div>
    <div class="ctx-qs" id="fqlist-${actId}">${qs.map((q,i)=>EJ_qRowHTML(actId,i,q,true)).join('')}</div>
  </div>
  <div class="act-entries" id="ae-${actId}">${bes.map(e=>EJ_flowEntryHTML(e)).join('')}</div>`;
  return el;
}

function EJ_entryTimeLabel(ts) {
  const d=new Date(ts);
  const time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()} · ${time}`;
}
function EJ_flowEntryHTML(e) {
  const time=EJ_entryTimeLabel(e.timestamp);
  return `<div class="flow-entry indented" id="fe-${e.id}" data-entry-id="${e.id}">
    <div class="entry-header-row"><span class="etag et-${e.type}">${e.type}</span><span class="entry-time-inline">${time}</span><div class="entry-acts"><button class="e-btn" onclick="EJ_editFlowEntry('${e.id}')">Edit</button><button class="e-btn" onclick="EJ_toggleMovePicker('${e.id}')">&#x2197; Move</button><button class="e-del" onclick="EJ_askDeleteEntry('${e.id}')">&#x2715;</button></div></div>
    <div class="entry-text" id="et-${e.id}">${EJ_entryContent(e)}</div>
    <div class="move-picker" id="mp-${e.id}"></div>
  </div>`;
}

function EJ_renderEntryCard(entry) {
  const time=new Date(entry.timestamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  let content='';
  if(entry.type==='note'||entry.type==='thought') content=esc(entry.text);
  else if(entry.type==='contact'){let h=`<strong>${esc(entry.name)}</strong>`;if(entry.company)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(entry.company)}</span>`;if(entry.email)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(entry.email)}</span>`;if(entry.phone)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(entry.phone)}</span>`;if(entry.notes)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(entry.notes)}</span>`;content=h;}
  else if(entry.type==='photo') content=`<img class="entry-photo-thumb" src="" data-entry-id="${entry.id}" alt="${esc(entry.caption)}" onclick="EJ_openLightbox('${entry.id}')">${entry.caption?`<div class="photo-caption">${esc(entry.caption)}</div>`:''}`;
  else if(entry.type==='todo'){const items=entry.items||[{text:entry.text,done:entry.done||false}];content=items.map((x,i)=>`<div class="todo-row"><div class="todo-check${x.done?' done':''}" onclick="EJ_toggleTodo('${entry.id}',${i})">${x.done?'✓':''}</div><div class="todo-text${x.done?' done':''}">${esc(x.text)}</div></div>`).join('');}
  else if(entry.type==='link'){const safe=(()=>{try{const u=new URL(entry.url||'');return['http:','https:'].includes(u.protocol)?entry.url:'';}catch{return '';}})();content=`${entry.title?`<strong>${esc(entry.title)}</strong><br>`:''}<a class="link-url" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">&#128279; ${esc(entry.url)}</a>${entry.notes?`<div class="link-note">${esc(entry.notes)}</div>`:''}`;}
  return `<div class="flow-entry" id="fe-${entry.id}" data-entry-id="${entry.id}"><span class="etag et-${entry.type}">${entry.type}</span><div class="entry-text" id="et-${entry.id}">${content}</div><div class="entry-foot"><div class="entry-time">${time}</div><div class="entry-acts"><button class="e-del" onclick="EJ_deleteEntry('${entry.id}')">&#x2715;</button></div></div></div>`;
}
function EJ_buildStandaloneEntry(e) {
  const el=document.createElement('div');
  el.className='standalone-entry'; el.id='se-'+e.id; el.dataset.entryId=e.id;
  const time=EJ_entryTimeLabel(e.timestamp);
  el.innerHTML=`<div class="entry-header-row"><span class="etag et-${e.type}">${e.type}</span><span class="entry-time-inline">${time}</span><div class="entry-acts"><button class="e-btn" onclick="EJ_editFlowEntry('${e.id}')">Edit</button><button class="e-btn" onclick="EJ_toggleAttachPicker('${e.id}')">＋ Attach</button><button class="e-del" onclick="EJ_askDeleteEntry('${e.id}')">&#x2715;</button></div></div>
    <div class="entry-text" id="et-${e.id}">${EJ_entryContent(e)}</div>
    <div class="attach-picker" id="ap-${e.id}"></div>`;
  return el;
}

function EJ_entryContent(e) {
  if(e.type==='note'||e.type==='thought')return esc(e.text);
  if(e.type==='todo'){const items=e.items||[{text:e.text,done:e.done||false}];return items.map((x,i)=>`<div class="todo-row"><div class="todo-check${x.done?' done':''}" onclick="EJ_toggleTodo('${e.id}',${i})">${x.done?'✓':''}</div><div class="todo-text${x.done?' done':''}">${esc(x.text)}</div></div>`).join('');}
  if(e.type==='contact'){let h=`<strong>${esc(e.name)}</strong>`;if(e.company)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(e.company)}</span>`;if(e.email)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(e.email)}</span>`;if(e.phone)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(e.phone)}</span>`;if(e.notes)h+=`<br><span style="color:var(--text2);font-size:12px">${esc(e.notes)}</span>`;return h;}
  if(e.type==='photo')return `<img class="entry-photo-thumb" src="" data-entry-id="${e.id}" alt="${esc(e.caption)}" onclick="EJ_openLightbox('${e.id}')">${e.caption?`<div class="photo-caption">${esc(e.caption)}</div>`:''}`;
  if(e.type==='link'){const safe=(()=>{try{const u=new URL(e.url||'');return['http:','https:'].includes(u.protocol)?e.url:'';}catch{return '';}})();return `${e.title?`<strong>${esc(e.title)}</strong><br>`:''}<a class="link-url" href="${esc(safe)}" target="_blank" rel="noopener">&#128279; ${esc(e.url)}</a>${e.notes?`<div class="link-note">${esc(e.notes)}</div>`:''}`;  }
  return '';
}

// ── Inline edit ──────────────────────────────────────────────────────
async function EJ_editFlowEntry(id) {
  const el=document.getElementById('et-'+id); if(!el)return;
  const e=await dbGet('entries',id); if(!e)return;
  const entryEl=document.getElementById('fe-'+id)||document.getElementById('se-'+id);
  const editBtn=entryEl?.querySelector('.e-btn');
  if(el.dataset.editing==='1'){
    if(e.type==='note'||e.type==='thought'){e.text=el.querySelector('textarea').value;}
    else if(e.type==='todo'){const lines=el.querySelector('textarea').value.split('\n').map(l=>l.trim()).filter(Boolean);e.items=lines.map((t,i)=>({text:t,done:(e.items||[])[i]?.done||false}));}
    else if(e.type==='contact'){const inp=el.querySelectorAll('input');e.name=inp[0]?.value.trim()||e.name;e.company=inp[1]?.value.trim()||'';e.phone=inp[2]?.value.trim()||'';e.email=inp[3]?.value.trim()||'';e.notes=el.querySelector('textarea')?.value.trim()||'';}
    else if(e.type==='link'){let rawUrl=el.querySelectorAll('input')[0]?.value.trim()||'';if(rawUrl&&!/^https?:\/\//i.test(rawUrl))rawUrl='https://'+rawUrl;e.url=rawUrl;e.title=el.querySelectorAll('input')[1]?.value.trim()||'';e.notes=el.querySelector('textarea')?.value.trim()||'';}
    else if(e.type==='photo'){e.caption=el.querySelector('input')?.value.trim()||'';}
    await dbPut('entries',e); delete el.dataset.editing; el.innerHTML=EJ_entryContent(e);
    if(e.type==='photo')EJ_loadPhotoThumbnail(e.id);
    if(e.type==='todo'){await EJ_renderAllQLists();const block=document.getElementById('fe-'+id)?.closest('.act-block');if(block&&block.dataset.collapse==='full')EJ_setBlockState(block,'full');}
    if(editBtn)editBtn.textContent='Edit';
  } else {
    el.dataset.editing='1';
    if(e.type==='note'||e.type==='thought'){const ta=document.createElement('textarea');ta.className='edit-ta';ta.value=e.text||'';ta.rows=3;el.innerHTML='';el.appendChild(ta);ta.focus();}
    else if(e.type==='todo'){const lines=(e.items||[]).map(i=>i.text).join('\n')||(e.text||'');el.innerHTML=`<textarea class="edit-ta" rows="${Math.max(3,(e.items||[]).length)}">${esc(lines)}</textarea><div class="edit-hint">One task per line · checked state preserved by position</div>`;el.querySelector('textarea').focus();}
    else if(e.type==='contact'){el.innerHTML=`<input class="edit-field" placeholder="Name" value="${esc(e.name||'')}"><input class="edit-field" placeholder="Company" value="${esc(e.company||'')}"><input class="edit-field" placeholder="Phone" value="${esc(e.phone||'')}"><input class="edit-field" placeholder="Email" value="${esc(e.email||'')}"><textarea class="edit-ta" placeholder="Notes" rows="2">${esc(e.notes||'')}</textarea>`;el.querySelector('input').focus();}
    else if(e.type==='link'){el.innerHTML=`<input class="edit-field" placeholder="URL" value="${esc(e.url||'')}"><input class="edit-field" placeholder="Title" value="${esc(e.title||'')}"><textarea class="edit-ta" placeholder="Notes" rows="2">${esc(e.notes||'')}</textarea>`;el.querySelector('input').focus();}
    else if(e.type==='photo'){el.innerHTML=EJ_entryContent(e)+`<input class="edit-field" placeholder="Caption" value="${esc(e.caption||'')}">`;}
    if(editBtn)editBtn.textContent='Save';
  }
}

// ── Move / Attach ─────────────────────────────────────────────────────
async function EJ_toggleMovePicker(id) {
  const picker=document.getElementById('mp-'+id); if(!picker)return;
  const open=picker.classList.contains('open'); EJ_closeAllPanels(); if(open)return;
  const curBlock=picker.closest('.act-block')?.id||null;
  const blocks=[...document.querySelectorAll('.act-block')];
  let h='<div class="mp-hdr">Move to</div>';
  blocks.forEach(b=>{if(b.id===curBlock)return;const isCo=b.classList.contains('co-block');const title=b.querySelector('.act-title')?.textContent?.trim()||'';h+=`<div class="mp-item" onclick="EJ_moveEntry('${id}','${b.id}')"><div class="mp-dot" style="background:${isCo?'var(--purple)':'var(--blue)'}"></div>${esc(title)}</div>`;});
  h+=`<div class="mp-item" onclick="EJ_moveEntry('${id}',null)"><div class="mp-dot" style="background:var(--muted)"></div>General (unattach)</div>`;
  picker.innerHTML=h; picker.classList.add('open');
}
async function EJ_moveEntry(id,blockId) {
  EJ_closeAllPanels();
  const e=await dbGet('entries',id); if(!e)return;
  if(!blockId){e.activityId=null;e.activityType=null;}
  else{const b=document.getElementById(blockId);if(!b)return;e.activityId=b.dataset.actid;e.activityType=b.dataset.acttype;}
  await dbPut('entries',e); await EJ_renderTimeline();
}
async function EJ_toggleAttachPicker(id) {
  const picker=document.getElementById('ap-'+id); if(!picker)return;
  const open=picker.classList.contains('open'); EJ_closeAllPanels(); if(open)return;
  const blocks=[...document.querySelectorAll('.act-block')];
  let h='<div class="ap-hdr">Attach to</div>';
  if(!blocks.length)h+='<div style="padding:10px 12px;font-size:12px;color:var(--text2)">No active blocks.</div>';
  blocks.forEach(b=>{const isCo=b.classList.contains('co-block');const title=b.querySelector('.act-title')?.textContent?.trim()||'';h+=`<div class="ap-item" onclick="EJ_attachEntry('${id}','${b.id}')"><div class="ap-dot" style="background:${isCo?'var(--purple)':'var(--blue)'}"></div>${esc(title)}</div>`;});
  picker.innerHTML=h; picker.classList.add('open');
}
async function EJ_attachEntry(id,blockId) {
  EJ_closeAllPanels();
  const b=document.getElementById(blockId),e=await dbGet('entries',id); if(!b||!e)return;
  e.activityId=b.dataset.actid; e.activityType=b.dataset.acttype;
  await dbPut('entries',e); await EJ_renderTimeline();
}
async function EJ_deleteFlowEntry(id) {
  const e=await dbGet('entries',id); if(!e)return;
  await dbDelete('entries',id); await dbDelete('blobs',id);
  const ev=await dbGet('fairs',currentEventId); ev.entryCount=Math.max(0,(ev.entryCount||1)-1); await dbPut('fairs',ev);
  await EJ_renderTimeline();
}
async function EJ_deleteEntry(id) {
  try {
    const e = await dbGet('entries', id); if (!e) return;
    await dbDelete('entries', id);
    await dbDelete('blobs', id);
    const ev = await dbGet('fairs', currentEventId);
    ev.entryCount = Math.max(0, (ev.entryCount||1) - 1);
    await dbPut('fairs', ev);
    await EJ_renderTimeline();
  } catch(err) { console.error(err); }
}

// ── Block collapse ────────────────────────────────────────────────────
function EJ_toggleCollapse(blockId) {
  const b=document.getElementById(blockId); if(!b)return;
  const s=b.dataset.collapse||'open';
  EJ_setBlockState(b,s==='full'?'open':s==='entries'?'open':'entries');
}
function EJ_fullCollapseBlock(blockId,e) {
  e.stopPropagation();
  const b=document.getElementById(blockId); if(!b)return;
  EJ_setBlockState(b,b.dataset.collapse==='full'?'open':'full');
}
function EJ_setBlockState(b,state) {
  const entries=b.querySelector('.act-entries'), ctx=b.querySelector('.act-ctx'), btn=b.querySelector('.act-collapse-btn');
  const actId=b.id.replace('ab-','');
  const tdEl=document.getElementById('td-'+actId);
  b.dataset.collapse=state;
  // Remove any existing todo summary pill
  b.querySelector('.block-todo-pill')?.remove();
  if(state==='open'){
    entries?.classList.remove('collapsed');ctx?.classList.remove('collapsed');if(btn)btn.textContent='▲';
    if(tdEl)tdEl.style.display='none';
  } else if(state==='entries'){
    entries?.classList.add('collapsed');ctx?.classList.remove('collapsed');if(btn)btn.textContent='▲';
    if(tdEl&&tdEl.textContent)tdEl.style.display='';
  } else{
    entries?.classList.add('collapsed');ctx?.classList.add('collapsed');if(btn)btn.textContent='▽';
    if(tdEl&&tdEl.textContent)tdEl.style.display='';
    // Count pending todos (entries) + unchecked questions
    const pendingTodos=[...b.querySelectorAll('.todo-row')].filter(r=>!r.querySelector('.todo-check.done')).length;
    const pendingQs=[...b.querySelectorAll('.ctx-q-chk')].filter(q=>!q.classList.contains('ticked')).length;
    const pending=pendingTodos+pendingQs;
    if(pending>0){
      const pill=document.createElement('div');
      pill.className='block-todo-pill';
      pill.textContent=`${pending} pending`;
      b.querySelector('.act-hdr-row')?.after(pill);
    }
  }
}

// ── Block delete ──────────────────────────────────────────────────────
function EJ_askDeleteBlock(actId,type,name) {
  document.getElementById('confirm-v9-title').textContent='Delete '+name+'?';
  document.getElementById('confirm-v9-msg').textContent='Removes this block and all its entries. Cannot be undone.';
  _pendingDeleteActId=actId; _pendingDeleteActType=type; _pendingDeleteEntryId=null;
  document.getElementById('confirm-overlay-v9').classList.add('open');
}
function EJ_askDeleteEntry(id) {
  document.getElementById('confirm-v9-title').textContent='Delete this entry?';
  document.getElementById('confirm-v9-msg').textContent='This entry will be permanently removed.';
  _pendingDeleteEntryId=id; _pendingDeleteActId=null;
  document.getElementById('confirm-overlay-v9').classList.add('open');
}
async function EJ_confirmDeleteBlock() {
  EJ_closeConfirmV9();
  if(_pendingDeleteEntryId){const eid=_pendingDeleteEntryId;_pendingDeleteEntryId=null;await EJ_deleteFlowEntry(eid);return;}
  if(!_pendingDeleteActId)return;
  const entries=await dbGetByIndex('entries','fairId',currentEventId);
  const toDel=entries.filter(e=>e.activityId===_pendingDeleteActId);
  for(const e of toDel){await dbDelete('entries',e.id);await dbDelete('blobs',e.id);}
  const ev=await dbGet('fairs',currentEventId); ev.entryCount=Math.max(0,(ev.entryCount||0)-toDel.length); await dbPut('fairs',ev);
  if(_activeCtxId===_pendingDeleteActId){_activeCtxId=null;EJ_updateCtxBar();}
  _pendingDeleteActId=null; await EJ_renderTimeline();
}
function EJ_closeConfirmV9() { document.getElementById('confirm-overlay-v9').classList.remove('open'); }

// ── Context ────────────────────────────────────────────────────────────
function EJ_activateCtxFromBlock(actId,actType) {
  if(_activeCtxId&&_activeCtxId!==actId)EJ_autoMarkDone(_activeCtxId);
  _activeCtxId=actId; _activeCtxType=actType; _activeCtxPiId=null; EJ_updateCtxBar();
}
async function EJ_activateCtxAndGo(actId,actType) {
  if(_activeCtxId&&_activeCtxId!==actId)EJ_autoMarkDone(_activeCtxId);
  _activeCtxId=actId; _activeCtxType=actType;
  const planItems=await dbGetByIndex('dayPlan','fairId',currentEventId);
  const todayItem=planItems.find(p=>p.activityId===actId&&p.day===currentDay);
  _activeCtxPiId=todayItem?todayItem.id:null;
  // Switch to flow tab first (without triggering its own renderTimeline)
  ['plan','flow'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('active',t==='flow');
    document.getElementById('content-'+t).classList.toggle('active',t==='flow');
  });
  // Render timeline — it will append the active ctx block if it has no entries yet
  await EJ_renderTimeline();
  setTimeout(()=>{const fs=document.getElementById('flow-scroll');if(fs)fs.scrollTop=fs.scrollHeight;},60);
}
function EJ_clearCtx() {
  if(_activeCtxId)EJ_autoMarkDone(_activeCtxId);
  _activeCtxId=null; _activeCtxType=null; _activeCtxPiId=null; EJ_updateCtxBar();
}
function EJ_updateCtxBar() {
  const strip=document.getElementById('ctx-strip');
  if(!_activeCtxId){strip.className='ctx-strip';return;}
  const isCo=_activeCtxType==='company';
  strip.className='ctx-strip active '+(isCo?'strip-co':'strip-mtg');
  const block=document.getElementById('ab-'+_activeCtxId);
  document.getElementById('ctx-name-lbl').textContent=block?block.querySelector('.act-title')?.textContent:'…';
  document.getElementById('ctx-for').textContent=isCo?'Company':'Meeting';
}
async function EJ_autoMarkDone(actId) {
  try {
    const planItems=await dbGetByIndex('dayPlan','fairId',currentEventId);
    let item=_activeCtxPiId?planItems.find(p=>p.id===_activeCtxPiId):null;
    if(!item)item=planItems.find(p=>p.activityId===actId&&p.day===currentDay);
    if(item&&!item.done){
      item.done=true; await dbPut('dayPlan',item); _toastUndoPiId=item.id;
      const name=document.getElementById('ab-'+actId)?.querySelector('.act-title')?.textContent||actId;
      EJ_showToastUndo(name+' marked done');
      await EJ_renderGreenDots();
      if(document.getElementById('content-plan').classList.contains('active'))await EJ_renderDayPlan();
    } else {
      const store=_activeCtxType==='company'?'companies':'meetings';
      const act=await dbGet(store,actId);
      if(act&&!act.visited){act.visited=true;await dbPut(store,act);await EJ_renderGreenDots();}
    }
  } catch(err){console.error(err);}
}
function EJ_showToastUndo(msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-msg').textContent=msg;
  document.getElementById('toast-undo-btn').style.display='inline-block';
  document.getElementById('toast').classList.add('show');
  toastTimer=setTimeout(()=>document.getElementById('toast').classList.remove('show'),4500);
}
async function EJ_undoAutoMark() {
  document.getElementById('toast').classList.remove('show'); clearTimeout(toastTimer);
  if(!_toastUndoPiId)return;
  const item=await dbGet('dayPlan',_toastUndoPiId);
  if(item){item.done=false;await dbPut('dayPlan',item);}
  _toastUndoPiId=null; await EJ_renderGreenDots();
  if(document.getElementById('content-plan').classList.contains('active'))await EJ_renderDayPlan();
}

// ── /visit panel ──────────────────────────────────────────────────────
async function EJ_buildVisitPanel() {
  const planItems=await dbGetByIndex('dayPlan','fairId',currentEventId);
  const today=planItems.filter(p=>p.day===currentDay&&!p.done).sort((a,b)=>a.order-b.order);
  const next=planItems.filter(p=>p.day===currentDay+1&&!p.done).sort((a,b)=>a.order-b.order);
  document.getElementById('vp-day-label').textContent=currentDay;
  const iHTML=p=>{const isCo=p.activityType==='company';return `<div class="vp-item" onclick="EJ_selectVisit('${p.id}','${p.activityId}','${p.activityType}')"><div class="vp-bar ${isCo?'co':'mtg'}"></div><div><div class="vp-name">${esc(p.actName||'')}</div><div class="vp-meta">${isCo?'◎':'🕐 '+(p.actTime||'')} · ${esc(p.actSub||'')}</div></div></div>`;};
  let h='';
  if(!today.length&&!next.length)h='<div style="padding:14px;font-size:12px;color:var(--muted);text-align:center;font-family:var(--mono)">All activities visited ✓</div>';
  else{today.forEach(p=>h+=iHTML(p));if(next.length){h+=`<div class="vp-nextday-btn" onclick="EJ_toggleNextDayVisit()">See Day ${currentDay+1} &rarr;</div><div id="vp-nd-sec" style="display:none">`;next.forEach(p=>h+=iHTML(p));h+=`</div>`;}}
  document.getElementById('vp-list').innerHTML=h;
}
function EJ_toggleNextDayVisit() {
  const s=document.getElementById('vp-nd-sec'); if(!s)return;
  const open=s.style.display!=='none'; s.style.display=open?'none':'block';
}
async function EJ_selectVisit(piId,actId,actType) {
  EJ_closeAllPanels(); document.getElementById('main-input').value='';
  if(_activeCtxId&&_activeCtxId!==actId)EJ_autoMarkDone(_activeCtxId);
  _activeCtxId=actId; _activeCtxType=actType; _activeCtxPiId=piId;
  await EJ_renderTimeline();
  setTimeout(()=>{const fs=document.getElementById('flow-scroll');if(fs)fs.scrollTop=fs.scrollHeight;},60);
}

// ── /meeting ─────────────────────────────────────────────────────────
function EJ_setQMType(t) {
  _quickMeetingType=t;
  document.getElementById('qm-co-btn').classList.toggle('active',t==='company');
  document.getElementById('qm-mtg-btn').classList.toggle('active',t==='meeting');
  const show=t==='meeting';
  document.getElementById('qm-time-label').style.display=show?'':'none';
  document.getElementById('qm-time').style.display=show?'':'none';
}
async function EJ_submitQuickMeeting() {
  const name=document.getElementById('qm-name').value.trim(); if(!name){EJ_showToast('Name required');return;}
  const notes=document.getElementById('qm-notes').value.trim();
  const actTime=_quickMeetingType==='meeting'?document.getElementById('qm-time').value:'';
  const actId=uid();
  if(_quickMeetingType==='company')await dbPut('companies',{id:actId,fairId:currentEventId,name,location:'',domain:'',notes,questions:[],visited:false});
  else await dbPut('meetings',{id:actId,fairId:currentEventId,name,time:actTime,location:'',notes,questions:[],visited:false});
  const existingPlan=await dbGetByIndex('dayPlan','fairId',currentEventId);
  const dayOrder=existingPlan.filter(p=>p.day===currentDay).length;
  await dbPut('dayPlan',{id:uid(),fairId:currentEventId,activityId:actId,activityType:_quickMeetingType,actName:name,actSub:'',actTime,day:currentDay,done:false,order:dayOrder});
  ['qm-name','qm-notes','qm-time'].forEach(id=>document.getElementById(id).value='');
  EJ_closeOverlay('ov-quick-meeting');
  await EJ_activateCtxAndGo(actId,_quickMeetingType);
  EJ_showToast(name+' added — start logging');
}

// ── Logs ─────────────────────────────────────────────────────────────
async function EJ_openLogs(actId,actType) {
  try {
    _currentLogsActId=actId; _currentLogsActType=actType;
    const store=actType==='company'?'companies':'meetings';
    const act=await dbGet(store,actId); if(!act)return;
    document.getElementById('log-title').textContent=act.name+' — Logs';
    document.getElementById('log-sub').textContent=act.location||'';
    document.getElementById('log-note-bar').textContent=act.notes||'';
    const qs=act.questions||[];
    const qHTML=qs.length?`<div style="margin-bottom:16px"><div class="log-qs-label">Questions</div><div class="q-list" id="lqlist-${actId}">${qs.map((q,i)=>EJ_qRowHTML(actId,i,q,false)).join('')}</div></div>`:'';
    const entries=(await dbGetByIndex('entries','fairId',currentEventId)).filter(e=>e.activityId===actId).sort((a,b)=>a.timestamp-b.timestamp);
    let eHTML='', lastDay='';
    for(const e of entries){
      const d=new Date(e.timestamp), day=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}), time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      if(day!==lastDay){eHTML+=`<div class="log-day">${day}</div>`;lastDay=day;}
      eHTML+=`<div class="log-entry"><span class="etag et-${e.type}">${e.type}</span><div class="entry-text" style="margin-top:4px">${EJ_entryContent(e)}</div><div class="entry-foot"><div class="entry-time">${time}</div></div></div>`;
    }
    if(!entries.length)eHTML='<div class="log-edit-hint">No entries yet.</div>';
    eHTML+='<div class="log-edit-hint">Read-only. Edit in Flow tab.</div>';
    document.getElementById('log-scroll').innerHTML=qHTML+eHTML;
    for(const e of entries)if(e.type==='photo')EJ_loadPhotoThumbnail(e.id);
    EJ_showScreen('screen-logs');
  } catch(err){console.error(err);EJ_showToast('Failed to open logs');}
}

// ── Input ─────────────────────────────────────────────────────────────
document.getElementById('main-input').addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();EJ_handleMainInput();}
  if(e.key==='Escape')EJ_closeAllPanels();
});
document.getElementById('main-input').addEventListener('input',function(){
  const v=this.value, m=document.getElementById('slash-menu');
  const cmds=['note','contact','photo','thought','todo','link','meeting','visit'];
  const exact=cmds.find(c => this.value.trim().toLowerCase() === c);
  if(exact){EJ_buildSlashMenu(exact);m.classList.add('open');}
  else if(v==='/'||v.startsWith('/')&&!v.includes(' ')){EJ_buildSlashMenu(v.slice(1).toLowerCase());m.classList.add('open');}
  else{m.classList.remove('open');document.getElementById('visit-panel').classList.remove('open');}
});
function EJ_buildSlashMenu(f) {
  const all=[{c:'note',d:'Quick text note'},{c:'contact',d:"Person's name, email"},{c:'photo',d:'Photo with caption'},{c:'thought',d:'Idea to revisit'},{c:'todo',d:'Checklist tasks'},{c:'link',d:'Save a URL'},{c:'meeting',d:'Log unplanned visit',n:true},{c:'visit',d:'Activate next stop',n:true}];
  const fl=f?all.filter(x=>x.c.startsWith(f)):all;
  const m=document.getElementById('slash-menu');
  m.innerHTML=fl.map(x=>`<div class="slash-row" data-cmd="${x.c}" onclick="EJ_triggerSlash('${x.c}')"><span class="slash-cmd">/${x.c}</span><span class="slash-desc">${x.d}</span>${x.n?'<span class="slash-new">new</span>':''}</div>`).join('')||'<div style="padding:10px 14px;font-size:12px;color:var(--muted)">No commands match.</div>';
}
function EJ_handleMainInput() {
  const val=document.getElementById('main-input').value.trim(); if(!val)return;
  const cmds=['note','contact','photo','thought','todo','link','meeting','visit'];
  const m=cmds.find(c=>val.toLowerCase()==='/'+c||val.toLowerCase().startsWith('/'+c+' '));
  if(m){document.getElementById('main-input').value='';EJ_triggerSlash(m);}
  else{EJ_addEntry({type:'note', text:val});document.getElementById('main-input').value='';}
  EJ_closeAllPanels();
}
function EJ_triggerSlash(type) {
  EJ_closeAllPanels(); document.getElementById('main-input').value='';
  if(type==='visit'){EJ_buildVisitPanel();document.getElementById('visit-panel').classList.add('open');return;}
  if(type==='meeting'){_quickMeetingType='company';EJ_setQMType('company');EJ_openOverlay('ov-quick-meeting');return;}
  EJ_openModal('modal-'+type);
}
function EJ_closeAllPanels() {
  document.getElementById('slash-menu').classList.remove('open');
  document.getElementById('visit-panel').classList.remove('open');
  document.querySelectorAll('.move-picker.open,.attach-picker.open').forEach(p=>p.classList.remove('open'));
}

// ── Entry submissions ─────────────────────────────────────────────────
function EJ_submitNote(){const text=document.getElementById('note-text').value.trim();if (!text)return;EJ_addEntry({type:'note',text});document.getElementById('note-text').value='';EJ_closeModal('modal-note');}
function EJ_submitThought(){const t=document.getElementById('thought-text').value.trim();if(!t)return;EJ_addEntry({type:'thought',text:t});document.getElementById('thought-text').value='';EJ_closeModal('modal-thought');}
function EJ_submitTodo(){const items=document.getElementById('todo-text').value.split('\n').map(l=>l.trim()).filter(Boolean);if(!items.length){EJ_showToast('Enter at least one task');return;}EJ_addEntry({type:'todo',items:items.map(t=>({text:t,done:false}))});document.getElementById('todo-text').value='';EJ_closeModal('modal-todo');}
function EJ_submitContact(){const name=document.getElementById('contact-name').value.trim();if(!name){EJ_showToast('Name required');return;}EJ_addEntry({type:'contact',name,company:document.getElementById('contact-company').value.trim(),phone:document.getElementById('contact-phone').value.trim(),email:document.getElementById('contact-email').value.trim(),notes:document.getElementById('contact-notes').value.trim()});['contact-name','contact-company','contact-phone','contact-email','contact-notes'].forEach(id=>document.getElementById(id).value='');EJ_closeModal('modal-contact');}
async function EJ_handlePhotoSelect(e) {
  try {
    const file=e.target.files[0]; if(!file)return;
    EJ_showToast('Compressing...');
    photoBlob=await EJ_compressImage(file);
    if(photoPreviewUrl)URL.revokeObjectURL(photoPreviewUrl);
    photoPreviewUrl=URL.createObjectURL(photoBlob);
    const img=document.getElementById('photo-preview'); img.src=photoPreviewUrl; img.style.display='block';
    document.getElementById('photo-placeholder').style.display='none';
  } catch(err){console.error(err);EJ_showToast('Photo error');}
}
async function EJ_submitPhoto() {
  if(!photoBlob){EJ_showToast('Select a photo first');return;}
  const cap=document.getElementById('photo-caption').value.trim();
  await EJ_addEntry({type:'photo',caption:cap},photoBlob);
  photoBlob=null; if(photoPreviewUrl){URL.revokeObjectURL(photoPreviewUrl);photoPreviewUrl=null;}
  document.getElementById('photo-preview').style.display='none';
  document.getElementById('photo-preview').src='';
  document.getElementById('photo-placeholder').style.display='';
  document.getElementById('photo-caption').value='';
  document.getElementById('photo-cam-input').value='';
  document.getElementById('photo-gal-input').value='';
  EJ_closeModal('modal-photo');
}
function EJ_submitLink() {
  const rawUrl=document.getElementById('link-url').value.trim(); if(!rawUrl){EJ_showToast('URL required');return;}
  let url=!/^https?:\/\//i.test(rawUrl)?'https://' + rawUrl:rawUrl;
  try{const p=new URL(url);if(!['http:','https:'].includes(p.protocol)){EJ_showToast('Only http/https URLs allowed');return;}}
  catch{EJ_showToast('Enter a valid URL (e.g. google.com)');return;}
  EJ_addEntry({type:'link',url,title:document.getElementById('link-title').value.trim(),notes:document.getElementById('link-notes').value.trim()});
  ['link-url','link-title','link-notes'].forEach(id=>document.getElementById(id).value='');
  EJ_closeModal('modal-link');
}
async function EJ_addEntry(data,blob) {
  try {
    const e={id:uid(),fairId:currentEventId,timestamp:Date.now(),activityId:_activeCtxId||null,activityType:_activeCtxType||null,...data};
    await dbPut('entries',e); if(blob)await dbPut('blobs',{id:e.id,blob});
    const ev=await dbGet('fairs',currentEventId); ev.entryCount=(ev.entryCount||0)+1; ev.lastEntryAt=e.timestamp; await dbPut('fairs',ev);
    await EJ_renderTimeline(); EJ_showToast(data.type.charAt(0).toUpperCase()+data.type.slice(1)+' added');
  } catch(err){console.error(err);EJ_showToast('Failed to add entry');}
}
async function EJ_toggleTodo(id,idx) {
  try {
    const e=await dbGet('entries',id); if(!e)return;
    if(!e.items)e.items=[{text:e.text,done:e.done||false}];
    e.done = !e.done;
    e.items[idx].done=!e.items[idx].done; await dbPut('entries',e);
    const el=document.getElementById('et-'+id); if(el)el.innerHTML=EJ_entryContent(e);
    await EJ_renderAllQLists();
    const block=document.getElementById('fe-'+id)?.closest('.act-block');
    if(block&&block.dataset.collapse==='full')EJ_setBlockState(block,'full');
  } catch(err){console.error(err);}
}

// ── Lightbox ──────────────────────────────────────────────────────────
async function EJ_openLightbox(id) {
  try {
    const entries=await dbGetByIndex('entries','fairId',currentEventId);
    const photos=entries.filter(e=>e.type==='photo').sort((a,b)=>a.timestamp-b.timestamp);
    const idx=photos.findIndex(e=>e.id===id); if(idx===-1)return;
    _lightboxEntries=photos; EJ_showLightboxAt(idx);
  } catch(err){console.error(err);EJ_showToast('Failed to open photo');}
}
async function EJ_showLightboxAt(idx) {
  try {
    const e=_lightboxEntries[idx]; if(!e)return;
    const rec=await dbGet('blobs',e.id);
    const url=rec?URL.createObjectURL(rec.blob):'';
    const img=document.getElementById('lightbox-img');
    if(img._blobUrl)URL.revokeObjectURL(img._blobUrl);
    img._blobUrl=url; img.src=url;
    document.getElementById('lightbox-caption').textContent=e.caption||'';
    document.getElementById('lightbox').classList.add('open');
    document.getElementById('lightbox')._idx=idx;
  } catch(err){console.error(err);EJ_showToast('Failed to show photo');}
}
function EJ_closeLightbox(event) {
  const lb=document.getElementById('lightbox');
  if(!event||event.target===lb||event.currentTarget?.classList.contains('lightbox-close')){
    lb.classList.remove('open');
    const img=document.getElementById('lightbox-img');
    if(img._blobUrl){URL.revokeObjectURL(img._blobUrl);img._blobUrl=null;}img.src='';
  }
}
async function EJ_loadPhotoThumbnail(id) {
  const rec=await dbGet('blobs',id); if(!rec)return;
  const url=URL.createObjectURL(rec.blob);
  document.querySelectorAll(`img[data-entry-id="${id}"]`).forEach(img=>{img.src=url;});
}
document.addEventListener('keydown',e=>{
  const lb=document.getElementById('lightbox');
  if(lb.classList.contains('open')){
    if(e.key==='ArrowRight')EJ_showLightboxAt((lb._idx+1)%_lightboxEntries.length);
    if(e.key==='ArrowLeft')EJ_showLightboxAt((lb._idx-1+_lightboxEntries.length)%_lightboxEntries.length);
    if(e.key==='Escape')EJ_closeLightbox({target:lb});
    return;
  }
  if(e.key==='Escape'){
    document.querySelectorAll('.modal-overlay.open,.overlay.open').forEach(m=>m.classList.remove('open'));
    EJ_closeAllPanels();
  }
});

// ── Drag & Drop ───────────────────────────────────────────────────────
function EJ_initDragForAllDays() {
  document.querySelectorAll('.pal-day').forEach(pal=>{
    let dragged=null;
    pal.addEventListener('dragstart',e=>{dragged=e.target.closest('.plan-item');if(dragged)setTimeout(()=>dragged.style.opacity='.4',0);});
    pal.addEventListener('dragend',()=>{if(dragged)dragged.style.opacity='1';dragged=null;});
    pal.addEventListener('dragover',e=>{e.preventDefault();const over=e.target.closest('.plan-item');if(over&&over!==dragged)pal.insertBefore(dragged,over);});
    pal.addEventListener('drop',async()=>{
      const items=[...pal.querySelectorAll('.plan-item')];
      for(let i=0;i<items.length;i++){const r=await dbGet('dayPlan',items[i].dataset.piid);if(r){r.order=i;await dbPut('dayPlan',r);}}
    });
  });
}

// ── Export ────────────────────────────────────────────────────────────
function EJ_openExport(){EJ_openModal('modal-export');}
async function EJ_getExportData() {
  const ev=await dbGet('fairs',currentEventId);
  const [entries,companies,meetings,planItems,objectives,links]=await Promise.all([dbGetByIndex('entries','fairId',currentEventId),dbGetByIndex('companies','fairId',currentEventId),dbGetByIndex('meetings','fairId',currentEventId),dbGetByIndex('dayPlan','fairId',currentEventId),dbGetByIndex('visitObjectives','fairId',currentEventId),dbGetByIndex('quickLinks','fairId',currentEventId)]);
  entries.sort((a,b)=>a.timestamp-b.timestamp); planItems.sort((a,b)=>a.day-b.day||a.order-b.order); objectives.sort((a,b)=>a.order-b.order); links.sort((a,b)=>a.order-b.order);
  return{ev,entries,companies,meetings,planItems,objectives,links};
}
async function EJ_exportPDF() {
  EJ_closeModal('modal-export'); EJ_showProgress('Generating PDF','Building content...');
  try {
    const{ev,entries,companies,meetings,planItems,objectives,links}=await EJ_getExportData();
    const colors={note:'#2383e2',contact:'#0f7b6c',photo:'#9065b0',thought:'#cb912f',todo:'#d44c47',link:'#448361'};
    const _pdfFields=(e)=>[esc(e.text),esc(e.name),esc(e.caption),(()=>{try{return new URL(e.url);}catch{return null;}})()];
    let body='';
    const meta=[ev.location,ev.date,ev.endDate&&ev.endDate!==ev.date?'– '+ev.endDate:''].filter(Boolean).map(s=>esc(s)).join(' ');
    if(objectives.length){body+=`<div class="sh">Visit Objectives</div>`;objectives.forEach(o=>{body+=`<div class="orow"><span class="chk">${o.done?'☑':'☐'}</span><span class="${o.done?'done':''}">${esc(o.text)}</span></div>`;});}
    if(links.length){body+=`<div class="sh">Quick Links</div>`;links.forEach(l=>{const safe=(()=>{try{const u=new URL(l.url);return['http:','https:'].includes(u.protocol)?l.url:'';}catch{return'';}})();body+=`<div class="orow"><span style="margin-right:6px">🔗</span>${safe?`<a href="${esc(safe)}">${esc(l.title)}</a>`:`<span>${esc(l.title)}</span>`}</div>`;});}
    if(planItems.length){body+=`<div class="sh">Day Plan</div>`;const days=[...new Set(planItems.map(p=>p.day))].sort((a,b)=>a-b);for(const day of days){const s=new Date(ev.date);s.setDate(s.getDate()+day-1);const lbl=s.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});body+=`<div class="dh">Day ${day} — ${lbl}</div>`;planItems.filter(p=>p.day===day).forEach(p=>{body+=`<div class="orow"><span class="chk">${p.done?'☑':'☐'}</span><span class="${p.done?'done':''}">${esc(p.actName||'')} <span style="color:#9b9a97;font-size:11px">${esc(p.actSub||'')}</span></span></div>`;});}}
    const allActs=[...companies.map(c=>({...c,_t:'company'})),...meetings.map(m=>({...m,_t:'meeting'}))];
    for(const act of allActs){
      const ae=entries.filter(e=>e.activityId===act.id);
      if(!ae.length&&!(act.notes||'').trim()&&!(act.questions||[]).length)continue;
      const isCo=act._t==='company';
      const domStr=(act.domains||[]).join(', ')||(act.domain||'');
      const sub=isCo?(act.location||''):(act.location||'');
      body+=`<div class="act-sec ${isCo?'co':'mt'}"><div class="abh"><span>${isCo?'◎':'🕐'}</span> ${esc(act.name)}${sub?`<span class="as"> · ${esc(sub)}</span>`:''}${domStr?`<span class="as" style="margin-left:auto">${esc(domStr)}</span>`:''}</div><div class="act-body">`;
      if(act.notes)body+=`<div class="an">${esc(act.notes)}</div>`;
      if((act.questions||[]).length){body+=`<div class="qh">Questions</div>`;act.questions.forEach(q=>{body+=`<div class="orow"><span class="chk">${q.done?'☑':'☐'}</span>${esc(q.text||q)}</div>`;});}
      if(ae.length){let ld='';for(const e of ae){const d=new Date(e.timestamp),day=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});if(day!==ld){body+=`<div class="dh">${day}</div>`;ld=day;}body+=await EJ_entryPdfHtml(e,colors[e.type]||'#999',time);}}
      body+=`</div></div>`;
    }
    const sa=entries.filter(e=>!e.activityId);
    if(sa.length){body+=`<div class="sh">General Entries</div>`;let ld='';for(const e of sa){const d=new Date(e.timestamp),day=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});if(day!==ld){body+=`<div class="dh">${day}</div>`;ld=day;}body+=await EJ_entryPdfHtml(e,colors[e.type]||'#999',time);}}
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(ev.name)}</title><style>body{font-family:-apple-system,Arial,sans-serif;max-width:740px;margin:0 auto;padding:40px 30px;color:#37352f;font-size:13px;line-height:1.5}h1{font-size:22px;font-weight:700;margin-bottom:4px}.meta{color:#9b9a97;font-size:12px;font-family:monospace;margin-bottom:28px}.sh{font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9b9a97;border-top:2px solid #e9e9e7;padding-top:14px;margin:20px 0 10px;font-weight:700}.dh{font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9b9a97;border-top:1px solid #e9e9e7;padding-top:12px;margin:12px 0 6px}.orow{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:2px 0}.chk{font-size:12px;flex-shrink:0}.done{text-decoration:line-through;color:#9b9a97}.act-sec{border:1px solid #ccc;border-radius:6px;margin:20px 0 0;overflow:hidden;page-break-inside:avoid}.act-sec.co{border-left:4px solid #9065b0}.act-sec.mt{border-left:4px solid #2383e2}.abh{font-size:14px;font-weight:700;padding:10px 14px;display:flex;align-items:center;gap:8px}.act-sec.co .abh{background:#e8d4f5;border-bottom:1px solid #cfaee8;color:#6b4191}.act-sec.mt .abh{background:#c8e2f6;border-bottom:1px solid #99c4e8;color:#1a5a96}.act-body{padding:2px 14px 14px}.as{font-size:11px;color:#9b9a97;font-family:monospace;margin-left:8px;font-weight:400}.an{font-size:12px;color:#6b6a67;font-style:italic;padding:6px 0 8px}.qh{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9b9a97;font-family:monospace;padding:0 0 4px}.entry{border:1px solid #e9e9e7;border-left-width:3px;border-radius:4px;padding:8px 12px;margin-bottom:6px;page-break-inside:avoid}.eh{display:flex;justify-content:space-between;margin-bottom:5px}.et{font-family:monospace;font-size:9px;font-weight:700;letter-spacing:.06em}.etime{font-family:monospace;font-size:10px;color:#9b9a97}.eb{font-size:13px}.todo-item{display:flex;gap:8px;align-items:flex-start}.todo-box{border:1.5px solid currentColor;width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;flex-shrink:0;margin-top:2px}.pimg{max-width:100%;max-height:360px;object-fit:contain;display:block;border-radius:3px;margin-bottom:4px}.pcap{font-style:italic;color:#9b9a97;font-size:12px}.cn{font-weight:600;margin-bottom:4px}.ct{border-collapse:collapse;font-size:12px}.ct td{padding:1px 8px 1px 0;vertical-align:top}.cl{color:#9b9a97;font-family:monospace;font-size:10px;white-space:nowrap}@media print{body{padding:20px}}</style></head><body><h1>${esc(ev.name)}</h1><div class="meta">${meta}</div>${body}</body></html>`;
    EJ_hideProgress();
    const win=window.open('','_blank'); if(!win){EJ_showToast('Allow popups to export PDF');return;}
    win.document.write(html); win.document.close(); win.onload=()=>{win.focus();win.print();};
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('PDF export failed');}
}
async function EJ_entryPdfHtml(e,col,time) {
  let c='';
  if(e.type==='note'||e.type==='thought')c=`<p>${esc(e.text)}</p>`;
  else if(e.type==='todo'){const items=e.items||[{text:e.text,done:e.done||false}];c=items.map(x=>`<div class="todo-item"><span class="todo-box">${x.done?'✓':''}</span><span class="${x.done?'done':''}">${esc(x.text)}</span></div>`).join('');}
  else if(e.type==='link'){if(e.title)c+=`<div style="font-weight:600;margin-bottom:3px">${esc(e.title)}</div>`;const safe=(()=>{try{const u=new URL(e.url);return['http:','https:'].includes(u.protocol)?e.url:'';}catch{return'';}})();c+=safe?`<a href="${esc(safe)}" style="font-family:monospace;font-size:11px;color:#448361">${esc(safe)}</a>`:`<span style="font-family:monospace;font-size:11px;color:#9b9a97">${esc(e.url)}</span>`;if(e.notes)c+=`<div style="font-size:12px;color:#9b9a97;margin-top:3px">${esc(e.notes)}</div>`;}
  else if(e.type==='contact'){c=`<div class="cn">${esc(e.name)}</div><table class="ct">`;if(e.company)c+=`<tr><td class="cl">Company</td><td>${esc(e.company)}</td></tr>`;if(e.phone)c+=`<tr><td class="cl">Phone</td><td>${esc(e.phone)}</td></tr>`;if(e.email)c+=`<tr><td class="cl">Email</td><td>${esc(e.email)}</td></tr>`;if(e.notes)c+=`<tr><td class="cl">Notes</td><td>${esc(e.notes)}</td></tr>`;c+=`</table>`;}
  else if(e.type==='photo'){const rec=await dbGet('blobs',e.id);if(rec){const b64=await EJ_blobToBase64(rec.blob);c+=`<img src="${b64}" class="pimg">`;}if(e.caption)c+=`<div class="pcap">${esc(e.caption)}</div>`;}
  return `<div class="entry" style="border-left-color:${col}"><div class="eh"><span class="et" style="color:${col}">${e.type.toUpperCase()}</span><span class="etime">${time}</span></div><div class="eb">${c}</div></div>`;
}
async function EJ_exportZIP() {
  EJ_closeModal('modal-export'); EJ_showProgress('Generating ZIP','Loading dependencies...');
  try {
    await EJ_ensureJSZip();
    const{ev,entries,companies,meetings,planItems,objectives,links}=await EJ_getExportData();
    const slug=slugify(ev.name), assetsFolder=slug+'.assets';
    let md=`# ${ev.name}\n`;
    if(ev.location)md+=`**Location:** ${ev.location}  \n`;
    if(ev.date)md+=`**Date:** ${ev.date}${ev.endDate&&ev.endDate!==ev.date?' – '+ev.endDate:''}  \n`;
    md+=`\n---\n\n`;
    if(objectives.length){md+=`## Visit Objectives\n\n`;objectives.forEach(o=>{md+=`- [${o.done?'x':' '}] ${o.text}\n`;});md+='\n';}
    if(links.length){md+=`## Quick Links\n\n`;links.forEach(l=>{md+=`- [${l.title}](${l.url})\n`;});md+='\n';}
    if(planItems.length){md+=`## Day Plan\n\n`;const days=[...new Set(planItems.map(p=>p.day))].sort((a,b)=>a-b);for(const day of days){const s=new Date(ev.date);s.setDate(s.getDate()+day-1);md+=`### Day ${day} — ${s.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}\n\n`;planItems.filter(p=>p.day===day).forEach(p=>{md+=`- [${p.done?'x':' '}] ${p.actName||''}${p.actSub?' ('+p.actSub+')':''}\n`;});md+='\n';}}
    const allActs=[...companies.map(c=>({...c,_t:'company'})),...meetings.map(m=>({...m,_t:'meeting'}))];
    const images=[]; let imgIdx=1;
    for(const act of allActs){
      const ae=entries.filter(e=>e.activityId===act.id);
      if(!ae.length&&!(act.notes||'').trim()&&!(act.questions||[]).length)continue;
      const isCo=act._t==='company';
      const domStr2=(act.domains||[]).join(', ')||(act.domain||'');
      const sub=isCo?(domStr2+(act.location?(domStr2?' · ':'')+act.location:'')):(act.location||'');
      md+=`## ${isCo?'◎':'🕐'} ${act.name}${sub?' — '+sub:''}\n\n`;
      if(act.notes)md+=`_${act.notes}_\n\n`;
      if((act.questions||[]).length){md+=`**Questions:**\n\n`;act.questions.forEach(q=>{md+=`- [${q.done?'x':' '}] ${q.text||q}\n`;});md+='\n';}
      if(ae.length){let ld='';for(const e of ae){const d=new Date(e.timestamp),day=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});if(day!==ld){md+=`### ${day}\n\n`;ld=day;}md+=`#### ${time} — ${e.type.toUpperCase()}\n\n`;md+=await EJ_entryMd(e,assetsFolder,images,imgIdx);if(e.type==='photo')imgIdx++;}}
    }
    const sa=entries.filter(e=>!e.activityId);
    if(sa.length){md+=`## General Entries\n\n`;let ld='';for(const e of sa){const d=new Date(e.timestamp),day=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});if(day!==ld){md+=`### ${day}\n\n`;ld=day;}md+=`#### ${time} — ${e.type.toUpperCase()}\n\n`;md+=await EJ_entryMd(e,assetsFolder,images,imgIdx);if(e.type==='photo')imgIdx++;}}
    const zip=new JSZip(); zip.file(slug+'.md',md);
    for(const img of images){const rec=await dbGet('blobs',img.id);if(rec){const buf=await rec.blob.arrayBuffer();zip.file(`${assetsFolder}/${img.fn}`,buf);}}
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    EJ_hideProgress(); EJ_triggerDownload(blob,slug+'.zip');
    const ev2=await dbGet('fairs',currentEventId); ev2.lastExportedAt=Date.now(); await dbPut('fairs',ev2);
    EJ_showToast('ZIP exported');
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('ZIP export failed');}
}
async function EJ_entryMd(e,af,images,idx) {
  if(e.type==='note'||e.type==='thought')return e.text+'\n\n';
  if(e.type==='todo'){const items=e.items||[{text:e.text,done:e.done||false}];return items.map(x=>`- [${x.done?'x':' '}] ${x.text}\n`).join('')+'\n';}
  if(e.type==='contact'){let s=`**Name:** ${e.name}  \n`;if(e.company)s+=`**Company:** ${e.company}  \n`;if(e.phone)s+=`**Phone:** ${e.phone}  \n`;if(e.email)s+=`**Email:** ${e.email}  \n`;return s+'\n';}
  if(e.type==='link'){return `[${e.title||e.url}](${e.url})\n`+(e.notes?`_${e.notes}_\n`:'')+'\n';}
  if(e.type==='photo'){const fn=`photo-${String(idx).padStart(3,'0')}.jpg`;images.push({id:e.id,fn});return `![${e.caption||'Photo'}](${af}/${fn})\n`+(e.caption?`_${e.caption}_\n`:'')+'\n';}
  return '';
}

// ── Backup / Restore ──────────────────────────────────────────────────
async function EJ_createBackup() {
  EJ_showProgress('Creating Backup','Reading all data...');
  try {
    await EJ_ensureJSZip();
    const [fairs,entries,companies,meetings,planItems,objectives,links]=await Promise.all([dbGetAll('fairs'),dbGetAll('entries'),dbGetAll('companies'),dbGetAll('meetings'),dbGetAll('dayPlan'),dbGetAll('visitObjectives'),dbGetAll('quickLinks')]);
    const manifest={version:1,exportedAt:Date.now(),fairs,entries,companies,meetings,planItems,objectives,links};
    const zip=new JSZip(); zip.file('manifest.json',JSON.stringify(manifest));
    for(const e of entries){if(e.type==='photo'){const rec=await dbGet('blobs',e.id);if(rec){const buf=await rec.blob.arrayBuffer();zip.file(`blobs/${e.id}.jpg`,buf);}}}
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    EJ_hideProgress(); EJ_downloadBlob(blob,`event-journal-backup-${new Date().toISOString().slice(0,10)}.zip`);
    EJ_showToast('Backup created');
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('Backup failed');}
}
function EJ_triggerRestore(){document.getElementById('restore-input').click();}
async function EJ_handleRestoreFile(e) {
  const file=e.target.files[0]; if(!file)return; e.target.value='';
  EJ_showProgress('Reading Backup','Parsing...'); await EJ_ensureJSZip();
  try {
    const zip=await JSZip.loadAsync(file);
    const ms=await zip.file('manifest.json')?.async('string'); if(!ms){EJ_hideProgress();EJ_showToast('Not a valid Event Journal backup');return;}
    const data=JSON.parse(ms);
    if (!data.fairs) {EJ_hideProgress();EJ_showToast('Not a valid Event Journal backup');return;}
    _pendingRestore={manifest:data,zip}; EJ_hideProgress();
    const date=new Date(data.exportedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    document.getElementById('restore-summary-content').innerHTML=`<div class="restore-summary"><div class="restore-summary-row"><span>Events</span><span>${(data.fairs||[]).length}</span></div><div class="restore-summary-row"><span>Entries</span><span>${(data.entries||[]).length}</span></div><div class="restore-summary-row"><span>Companies</span><span>${(data.companies||[]).length}</span></div><div class="restore-summary-row"><span>Meetings</span><span>${(data.meetings||[]).length}</span></div><div class="restore-summary-row"><span>Plan items</span><span>${(data.planItems||[]).length}</span></div><div class="restore-summary-row"><span>Backed up</span><span>${date}</span></div><div class="restore-note">Existing data is merged — duplicate IDs are skipped.</div></div>`;
    EJ_openModal('modal-restore-summary');
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('Failed to read backup');}
}
async function EJ_executeRestore() {
  if(!_pendingRestore)return; EJ_closeModal('modal-restore-summary'); EJ_showProgress('Restoring','Importing...');
  try {
    const{manifest,zip}=_pendingRestore;
    const putAll=async(store,items)=>{for(const x of(items||[])){const ex=await dbGet(store,x.id);if(!ex)await dbPut(store,x);}};
    await putAll('fairs',manifest.fairs); await putAll('entries',manifest.entries); await putAll('companies',manifest.companies);
    await putAll('meetings',manifest.meetings); await putAll('dayPlan',manifest.planItems); await putAll('visitObjectives',manifest.objectives); await putAll('quickLinks',manifest.links);
    for(const path of Object.keys(zip.files).filter(f=>f.startsWith('blobs/'))){
      const id=path.replace('blobs/','').replace('.jpg','');
      const ex=await dbGet('blobs',id); if(!ex){const ab=await zip.file(path)?.async('arraybuffer');if(ab)await dbPut('blobs',{id,blob:new Blob([ab],{type:'image/jpeg'})});}    }
    _pendingRestore=null; EJ_hideProgress(); EJ_renderEventsList(); EJ_showToast('Backup restored');
  } catch(err){console.error(err);EJ_hideProgress();EJ_showToast('Restore failed');}
}

// ── Modal / Overlay helpers ───────────────────────────────────────────
function EJ_openModal(id){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));document.getElementById(id)?.classList.add('open');}
function EJ_closeModal(id){document.getElementById(id)?.classList.remove('open');}
function EJ_openOverlay(id){document.querySelectorAll('.overlay.open').forEach(m=>m.classList.remove('open'));document.getElementById(id)?.classList.add('open');}
function EJ_closeOverlay(id){document.getElementById(id)?.classList.remove('open');}
document.querySelectorAll('.modal-overlay,.overlay').forEach(el=>{el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});});

// ── Toast / Progress ──────────────────────────────────────────────────
function EJ_showToast(msg){clearTimeout(toastTimer);document.getElementById('toast-msg').textContent=msg;document.getElementById('toast-undo-btn').style.display='none';document.getElementById('toast').classList.add('show');toastTimer=setTimeout(()=>document.getElementById('toast').classList.remove('show'),2800);}
function EJ_showProgress(t,m){document.getElementById('progress-title').textContent=t;document.getElementById('progress-msg').textContent=m;document.getElementById('progress-overlay').classList.add('open');}
function EJ_hideProgress(){document.getElementById('progress-overlay').classList.remove('open');}

// ── Utils ─────────────────────────────────────────────────────────────
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function esc(s){if(s==null)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60)||'export';}
function EJ_triggerDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1000);}
function EJ_downloadBlob(blob,name){EJ_triggerDownload(blob,name);}
function EJ_blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
function EJ_base64ToBlob(b64, mime) {
  const parts = b64.split(','), raw = atob(parts[1]||parts[0]);
  const arr = new Uint8Array(raw.length);
  for (let i=0; i<raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], {type: mime||'application/octet-stream'});
}
async function EJ_compressImage(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);const MAX=1600;let{width:w,height:h}=img;if(w>MAX||h>MAX){const sc=Math.min(MAX/w,MAX/h);w=Math.round(w*sc);h=Math.round(h*sc);}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);c.toBlob(b=>b?res(b):rej(new Error('Compress failed')),'image/jpeg',0.82);};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Load failed'));};img.src=url;});}
let _jszipLoaded=false;
function EJ_ensureJSZip(){
  try {
    if(typeof JSZip!=='undefined'){_jszipLoaded=true;return Promise.resolve();}if(_jszipLoaded)return Promise.resolve();return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=()=>{_jszipLoaded=true;res();};s.onerror=()=>rej(new Error('JSZip load failed'));document.head.appendChild(s);});
  } catch(err){return Promise.reject(err);}
}

// ── Service Worker ────────────────────────────────────────────────────
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(reg=>{reg.addEventListener('updatefound',()=>{const nw=reg.installing;nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller){const t=document.createElement('div');t.className='update-toast';t.innerHTML=`<span>Update available</span><button onclick="window.location.reload()">Reload</button>`;document.body.appendChild(t);}});});}).catch(err=>console.log('SW:',err));}
