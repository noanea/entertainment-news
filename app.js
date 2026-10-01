const $ = (s) => document.querySelector(s);
const state = { kind: 'all', filter: '', query: '', month: new Date(), view: 'list' };
let entries = [];
const kindNames = { anime: 'アニメ', manga: '漫画', game: 'ゲーム' };
const filtersByKind = { anime: ['TV','Netflix','Prime Video','Disney+','劇場'], manga: ['ジャンプ','マガジン','サンデー','チャンピオン','その他'], game: ['Steam','PS5','PS4','Switch 2','Switch','Xbox','スマホ'] };
const today = new Date(); today.setDate(1); today.setHours(0,0,0,0);
state.month = new Date(today);
const safe = (value) => String(value ?? '');
function make(tag, cls, value) { const n = document.createElement(tag); if (cls) n.className = cls; if (value) n.textContent = value; return n; }
function matches(item) { return (state.kind === 'all' || item.kind === state.kind) && (!state.filter || (item.filters || []).includes(state.filter)) && (!state.query || `${item.title} ${item.series} ${item.detail || ''}`.toLocaleLowerCase('ja-JP').includes(state.query)); }
function tagLabel(tag) { return ({Netflix:'Netflix','Prime Video':'Prime Video',TV:'テレビ放送',Steam:'Steam',PS5:'PS5',PS4:'PS4',Switch:'Switch','Switch 2':'Switch 2',Xbox:'Xbox',ジャンプ:'ジャンプ',マガジン:'マガジン'})[tag] || tag; }
function card(item) {
  const article = make('article', 'event-card');
  const visual = make('div', `work-art art-${item.kind || 'other'}`, ''); visual.setAttribute('aria-hidden','true');
  const artMark = make('span','art-mark', (item.series || '?').trim().slice(0,1)); visual.append(artMark);
  const date = make('div', 'event-date', item.dateLabel || '未発表');
  const body = make('div', 'event-body');
  const badges = make('div', 'badges'); badges.append(make('span', `badge ${item.status}`, item.status === 'confirmed' ? '公式発表' : item.status === 'estimate' ? '予想' : '未発表'), make('span', `badge kind-${item.kind}`, kindNames[item.kind]));
  body.append(badges, make('h3', '', item.series), make('p', 'event-title', item.title));
  if (item.detail) body.append(make('p', 'event-detail', item.detail));
  const meta = make('div', 'event-meta'); (item.filters || []).forEach((t) => meta.append(make('span', 'chip', tagLabel(t)))); if (item.basis) meta.append(make('span', 'basis', item.basis));
  const source = document.createElement('a'); source.className = 'source';
  try { const url = new URL(safe(item.url), location.href); if (url.protocol === 'http:' || url.protocol === 'https:') { source.href = url.href; source.target = '_blank'; source.rel = 'noopener noreferrer'; } } catch {}
  source.textContent = `${item.source || '公式情報'}で確認 ↗`;
  body.append(meta, source); article.append(visual,date,body); return article;
}
function renderFilters() {
  const wrap = $('#filters'); wrap.replaceChildren();
  const kinds = state.kind === 'all' ? Object.keys(filtersByKind) : [state.kind];
  const vals = [...new Set(kinds.flatMap(k => filtersByKind[k] || []))]; wrap.hidden = false;
  wrap.append(make('span','filter-label','配信先・機種'));
  const all = make('button', state.filter ? '' : 'selected', 'すべて'); all.onclick = () => { state.filter=''; render(); }; wrap.append(all);
  vals.forEach(v => { const b=make('button', state.filter===v?'selected':'', tagLabel(v)); b.onclick=()=>{state.filter=state.filter===v?'':v; render();}; wrap.append(b); });
}
function renderCalendar() {
  const y=state.month.getFullYear(), m=state.month.getMonth(); $('#month-title').textContent=`${y}年${m+1}月`;
  const grid=$('#calendar'); grid.replaceChildren();
  ['日','月','火','水','木','金','土'].forEach((d,i)=>grid.append(make('div',`weekday ${i===0?'sun':''} ${i===6?'sat':''}`,d)));
  const offset=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), total=Math.ceil((offset+days)/7)*7;
  const dated=entries.filter(x=>matches(x)&&x.date && new Date(`${x.date}T00:00:00`).getMonth()===m&&new Date(`${x.date}T00:00:00`).getFullYear()===y);
  for(let i=0;i<total;i++) { const day=i-offset+1, cell=make('div','day'); if(day<1||day>days){cell.classList.add('outside'); grid.append(cell); continue;} cell.append(make('span','day-num',String(day))); const key=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; dated.filter(x=>x.date===key).forEach(item=>{const a=make('a',`calendar-event ${item.status}`,`${item.series} · ${item.shortTitle || item.title}`);try{const url=new URL(safe(item.url),location.href);if(url.protocol==='http:'||url.protocol==='https:'){a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}a.title=`${item.dateLabel} — ${item.title}（${item.source}）`;cell.append(a);}); grid.append(cell); }
  if(!dated.length) grid.append(make('p','no-month-events','この月に日付が決まった予定はありません。未発表の作品は下にまとめています。'));
}
function renderLists() {
  const selected=entries.filter(matches);
  const dateList=$('#date-list'); dateList.replaceChildren();
  const y=state.month.getFullYear(), m=state.month.getMonth();
  const dated=selected.filter(x=>x.date && (state.query || (new Date(`${x.date}T00:00:00`).getFullYear()===y && new Date(`${x.date}T00:00:00`).getMonth()===m))).sort((a,b)=>a.date.localeCompare(b.date));
  const groups=new Map(); dated.forEach(item=>{if(!groups.has(item.date))groups.set(item.date,[]);groups.get(item.date).push(item);});
  for(const [date,items] of groups){
    const section=make('section','release-day'); const dt=new Date(`${date}T00:00:00`);
    const heading=make('div','release-date'); heading.append(make('strong','',String(dt.getDate()).padStart(2,'0')),make('span','',`${state.query?`${dt.getFullYear()}年`:''}${dt.getMonth()+1}月 · ${new Intl.DateTimeFormat('ja-JP',{weekday:'short'}).format(dt)}`));
    const rows=make('div','release-rows'); items.forEach(item=>{const row=card(item);row.classList.add('list-event');row.querySelector('.event-date')?.remove();rows.append(row);});
    section.append(heading,rows);dateList.append(section);
  }
  if(!dated.length && !state.query) dateList.append(make('p','empty month-empty','この月に日付が決まった予定はありません。別の月を選ぶか、下の「日付未発表」をご覧ください。'));
  if(!dated.length && state.query && !selected.length) dateList.append(make('p','empty month-empty','検索結果がありません。'));
  const undated=$('#undated'); undated.replaceChildren();
  const pending=selected.filter(x=>!x.date).sort((a,b)=>a.kind.localeCompare(b.kind));
  if(!pending.length && !state.query) undated.append(make('p','empty','該当する作品はありません。'));
  pending.forEach(x=>undated.append(card(x)));
}
function renderMonths(){
  const y=state.month.getFullYear();$('#year-title').textContent=`${y}年`;
  const host=$('#month-options');host.replaceChildren();
  for(let m=0;m<12;m++){const b=make('button',m===state.month.getMonth()?'active':'',`${m+1}月`);b.onclick=()=>{state.month.setMonth(m);render();};host.append(b);}
}
function render(){renderFilters();renderMonths();renderCalendar();renderLists();}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.kind;state.filter='';document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));render();}));
document.querySelectorAll('.view-switch button').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x===b));$('#list-view').hidden=state.view!=='list';$('#calendar-view').hidden=state.view!=='calendar';}));
function setTheme(theme){
  const allowed=['sky','lavender','coral','navy'];if(!allowed.includes(theme))theme='sky';
  document.documentElement.dataset.theme=theme;
  document.querySelectorAll('.theme-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));
  try{localStorage.setItem('tsugiitsu-theme',theme);}catch{}
}
const themeToggle=$('#theme-toggle'),themePopover=$('#theme-popover');
function closeThemeMenu(){themePopover.hidden=true;themeToggle.setAttribute('aria-expanded','false');}
themeToggle.addEventListener('click',()=>{themePopover.hidden=!themePopover.hidden;themeToggle.setAttribute('aria-expanded',String(!themePopover.hidden));if(!themePopover.hidden)themePopover.querySelector('button[aria-pressed="true"]')?.focus();});
document.querySelectorAll('.theme-choice').forEach(b=>b.addEventListener('click',()=>{setTheme(b.dataset.themeChoice);closeThemeMenu();themeToggle.focus();}));
document.addEventListener('click',e=>{if(!e.target.closest('.theme-menu'))closeThemeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!themePopover.hidden){closeThemeMenu();themeToggle.focus();}});
try{setTheme(localStorage.getItem('tsugiitsu-theme')||'sky');}catch{setTheme('sky');}
$('#search').addEventListener('input',e=>{state.query=e.target.value.trim().toLocaleLowerCase('ja-JP');if(state.query&&state.view==='calendar'){state.view='list';document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x.dataset.view==='list'));$('#list-view').hidden=false;$('#calendar-view').hidden=true;}render();});
$('#prev').onclick=()=>{state.month.setFullYear(state.month.getFullYear()-1);render();}; $('#next').onclick=()=>{state.month.setFullYear(state.month.getFullYear()+1);render();}; $('#today').onclick=()=>{state.month=new Date(today);render();};
fetch('data/schedule.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{entries=Array.isArray(d.items)?d.items:[];$('#last-updated').textContent=d.updatedAt?`予定確認日：${d.updatedAt}`:'予定確認日：未記載';render();}).catch(()=>{$('#last-updated').textContent='予定データを読み込めませんでした';$('#undated').append(make('p','empty','予定データを読み込めませんでした。'));});

fetch('data/official-updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{
  const items=Array.isArray(d.items)?d.items:[]; if(!items.length)return;
  const section=$('#official-updates'),host=$('#announcements');host.replaceChildren();
  items.forEach(item=>{const card=make('article','event-card update-card');const body=make('div','event-body');body.append(make('span','badge kind-manga',item.source||'公式RSS'),make('h3','',item.series||'登録作品'),make('p','event-title',item.title));if(item.date)body.append(make('p','event-detail',item.date));const a=document.createElement('a');a.className='source';a.textContent='公式記事を確認 ↗';try{const url=new URL(item.url);if(url.protocol==='https:'&&['www.shueisha.co.jp','shueisha.co.jp'].includes(url.hostname)){a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}if(a.href)body.append(a);card.append(body);host.append(card);});
  $('#updates-checked').textContent=`最終チェック：${d.checkedAt||'不明'}`;section.hidden=false;
}).catch(()=>{});

