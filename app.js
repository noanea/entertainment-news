const $ = (s) => document.querySelector(s);
const state = { kind: 'all', filter: '', status: 'all', query: '', month: new Date(), view: 'list', favoritesOnly: false, range: 'month', sort: 'date' };
const initialParams = new URLSearchParams(location.search);
if (['all','anime','manga','game'].includes(initialParams.get('kind'))) state.kind = initialParams.get('kind');
if (initialParams.has('q')) state.query = initialParams.get('q').trim().toLocaleLowerCase('ja-JP');
if (['month','7','30','90','all'].includes(initialParams.get('range'))) state.range = initialParams.get('range');
if (state.query) state.range = 'all';
if (['list','calendar'].includes(initialParams.get('view'))) state.view = initialParams.get('view');
if (['date','title','kind'].includes(initialParams.get('sort'))) state.sort = initialParams.get('sort');
if (['all','confirmed','estimate','pending'].includes(initialParams.get('status'))) state.status = initialParams.get('status');
state.filter = initialParams.get('platform') || '';
state.favoritesOnly = initialParams.get('fav') === '1';
let entries = [];
let favoriteSeries = new Set();
try { favoriteSeries = new Set(JSON.parse(localStorage.getItem('tsugiitsu-favorites') || '[]')); } catch {}
const kindNames = { anime: 'アニメ', manga: '漫画', game: 'ゲーム' };
const filtersByKind = { anime: ['TV','Netflix','Prime Video','Disney+','劇場'], manga: ['ジャンプ','マガジン','サンデー','チャンピオン','その他'], game: ['Steam','PS5','PS4','Switch 2','Switch','Xbox','スマホ'] };
const today = new Date(); today.setDate(1); today.setHours(0,0,0,0);
state.month = new Date(today);
const monthParam = initialParams.get('month');
if (/^\d{4}-\d{2}$/.test(monthParam || '')) { const [year,month] = monthParam.split('-').map(Number); if (month >= 1 && month <= 12) state.month = new Date(year, month - 1, 1); }
const safe = (value) => String(value ?? '');
function make(tag, cls, value) { const n = document.createElement(tag); if (cls) n.className = cls; if (value) n.textContent = value; return n; }
function searchable(item) { return [item.title,item.series,item.shortTitle,item.detail,item.dateLabel,item.source,item.basis,...(item.filters||[])].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP'); }
function matches(item, includeStatus=true) { return (!state.favoritesOnly || favoriteSeries.has(item.series)) && (state.kind === 'all' || item.kind === state.kind) && (!state.filter || (item.filters || []).includes(state.filter)) && (!includeStatus || state.status === 'all' || item.status === state.status) && (!state.query || searchable(item).includes(state.query)); }
function isInRange(item) { if(!item.date)return false;if(state.range==='all')return true;const date=new Date(`${item.date}T00:00:00`);if(state.range==='month')return date.getFullYear()===state.month.getFullYear()&&date.getMonth()===state.month.getMonth();if(['7','30','90'].includes(state.range)){const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+Number(state.range)-1);return date>=start&&date<=end;}return true; }
function dayDistance(dateValue) { if(!dateValue)return null;const date=new Date(`${dateValue}T00:00:00`);if(Number.isNaN(date.getTime()))return null;const base=new Date();base.setHours(0,0,0,0);return Math.round((date-base)/86400000); }
function tagLabel(tag) { return ({Netflix:'Netflix','Prime Video':'Prime Video',TV:'テレビ放送',Steam:'Steam',PS5:'PS5',PS4:'PS4',Switch:'Switch','Switch 2':'Switch 2',Xbox:'Xbox',ジャンプ:'ジャンプ',マガジン:'マガジン'})[tag] || tag; }
function card(item) {
  const article = make('article', 'event-card');
  const visual = make('div', `work-art art-${item.kind || 'other'}`, ''); visual.setAttribute('aria-hidden','true');
  const artMark = make('span','art-mark', (item.series || '?').trim().slice(0,1)); visual.append(artMark);
  const date = make('div', 'event-date', item.dateLabel || '未発表');
  const distance=dayDistance(item.date);if(distance!==null){const label=distance< -30?'過去の予定':distance<0?`${Math.abs(distance)}日前`:distance===0?'今日':distance===1?'明日':`あと${distance}日`;date.append(make('small','event-countdown',label));if(distance<0)article.classList.add('is-past');}
  const body = make('div', 'event-body');
  const badges = make('div', 'badges'); badges.append(make('span', `badge ${item.status}`, item.status === 'confirmed' ? '公式発表' : item.status === 'estimate' ? '予想' : '未発表'), make('span', `badge kind-${item.kind}`, kindNames[item.kind]));
  const heading = make('div', 'event-heading');
  heading.append(make('h3', '', item.series));
  const isFavorite = favoriteSeries.has(item.series);
  const favorite = make('button', `favorite-button${isFavorite ? ' is-favorite' : ''}`, isFavorite ? '★ お気に入り' : '☆ お気に入り');
  favorite.type = 'button'; favorite.setAttribute('aria-pressed', String(isFavorite));
  favorite.setAttribute('aria-label', `${item.series}を${isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}`);
  favorite.onclick = () => {
    if (favoriteSeries.has(item.series)) favoriteSeries.delete(item.series); else favoriteSeries.add(item.series);
    try { localStorage.setItem('tsugiitsu-favorites', JSON.stringify([...favoriteSeries])); } catch {}
    render();
  };
  heading.append(favorite);
  body.append(badges, heading, make('p', 'event-title', item.title));
  if (item.detail) body.append(make('p', 'event-detail', item.detail));
  const meta = make('div', 'event-meta'); (item.filters || []).forEach((t) => meta.append(make('span', 'chip', tagLabel(t)))); if (item.basis) meta.append(make('span', 'basis', item.basis));
  const source = document.createElement('a'); source.className = 'source';
  try { const url = new URL(safe(item.url), location.href); if (url.protocol === 'https:') { source.href = url.href; source.target = '_blank'; source.rel = 'noopener noreferrer'; } } catch {}
  source.textContent = `${item.source || '公式情報'}で確認 ↗`;
  body.append(meta, source); article.append(visual,date,body); return article;
}
function renderFilters() {
  const wrap = $('#filters'); wrap.replaceChildren();
  const kinds = state.kind === 'all' ? Object.keys(filtersByKind) : [state.kind];
  const vals = [...new Set(kinds.flatMap(k => filtersByKind[k] || []))]; wrap.hidden = false;
  wrap.append(make('span','filter-label','配信先・機種'));
  const all = make('button', state.filter ? '' : 'selected', 'すべて'); all.setAttribute('aria-pressed',String(!state.filter)); all.onclick = () => { state.filter=''; render(); }; wrap.append(all);
  vals.forEach(v => { const b=make('button', state.filter===v?'selected':'', tagLabel(v));const count=entries.filter(item=>(state.kind==='all'||item.kind===state.kind)&&(item.filters||[]).includes(v)).length;b.title=`登録 ${count}件`;b.append(make('small','filter-count',String(count)));b.setAttribute('aria-pressed',String(state.filter===v)); b.onclick=()=>{state.filter=state.filter===v?'':v; render();}; wrap.append(b); });
}
function renderCalendar() {
  const y=state.month.getFullYear(), m=state.month.getMonth(); $('#month-title').textContent=`${y}年${m+1}月`;
  const grid=$('#calendar'); grid.replaceChildren();grid.setAttribute('role','grid');grid.setAttribute('aria-label',`${y}年${m+1}月の予定`);
  ['日','月','火','水','木','金','土'].forEach((d,i)=>{const label=make('div',`weekday ${i===0?'sun':''} ${i===6?'sat':''}`,d);label.setAttribute('role','columnheader');grid.append(label);});
  const offset=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), total=Math.ceil((offset+days)/7)*7;
  const dated=entries.filter(x=>matches(x)&&x.date && new Date(`${x.date}T00:00:00`).getMonth()===m&&new Date(`${x.date}T00:00:00`).getFullYear()===y);
  for(let i=0;i<total;i++) { const day=i-offset+1, cell=make('div','day');cell.setAttribute('role','gridcell');if(day<1||day>days){cell.classList.add('outside');cell.setAttribute('aria-hidden','true');grid.append(cell);continue;}const key=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;cell.setAttribute('aria-label',`${y}年${m+1}月${day}日`);cell.append(make('span','day-num',String(day)));dated.filter(x=>x.date===key).forEach(item=>{const a=make('a',`calendar-event ${item.status}`,`${item.series} · ${item.shortTitle||item.title}`);try{const url=new URL(safe(item.url),location.href);if(url.protocol==='https:'){a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}a.title=`${item.dateLabel} — ${item.title}（${item.source}）`;a.setAttribute('aria-label',`${item.dateLabel} ${item.series} ${item.title}。${item.source}の公式情報`);cell.append(a);});grid.append(cell); }
  if(!dated.length) grid.append(make('p','no-month-events','この月に日付が決まった予定はありません。未発表の作品は下にまとめています。'));
}
function renderLists() {
  const selected=entries.filter(matches);
  const dateList=$('#date-list'); dateList.replaceChildren();
  const y=state.month.getFullYear(), m=state.month.getMonth();
  const dated=selected.filter(isInRange).sort((a,b)=>a.date.localeCompare(b.date));
  const kindOrder={anime:0,manga:1,game:2};
  const innerSort=(a,b)=>state.sort==='title'?a.series.localeCompare(b.series,'ja'):state.sort==='kind'?(kindOrder[a.kind]??9)-(kindOrder[b.kind]??9)||a.series.localeCompare(b.series,'ja'):0;
  const showYear=state.query||state.range==='all'||new Set(dated.map(item=>item.date.slice(0,4))).size>1;
  const groups=new Map(); dated.forEach(item=>{if(!groups.has(item.date))groups.set(item.date,[]);groups.get(item.date).push(item);});
  for(const [date,items] of groups){
    const section=make('section','release-day'); const dt=new Date(`${date}T00:00:00`);
    const heading=make('div','release-date'); heading.append(make('strong','',String(dt.getDate()).padStart(2,'0')),make('span','',`${showYear?`${dt.getFullYear()}年`:''}${dt.getMonth()+1}月 · ${new Intl.DateTimeFormat('ja-JP',{weekday:'short'}).format(dt)}`));
    const rows=make('div','release-rows'); items.sort(innerSort).forEach(item=>{const row=card(item);row.classList.add('list-event');row.querySelector('.event-date')?.remove();rows.append(row);});
    section.append(heading,rows);dateList.append(section);
  }
  if(!dated.length){const empty=make('div','empty month-empty',state.query?'検索条件に合う予定がありません。':'この期間に日付が決まった予定はありません。');const clear=make('button','utility-button','条件をクリア');clear.type='button';clear.onclick=()=>$('#clear-filters').click();empty.append(clear);dateList.append(empty);}
  const undated=$('#undated'); undated.replaceChildren();
  const pending=selected.filter(x=>!x.date).sort((a,b)=>a.kind.localeCompare(b.kind));
  const count=$('#result-count'); if(count)count.textContent=`表示中：${dated.length}件の日付確定予定 ・ ${pending.length}件の日付未発表`;
  if(!pending.length && !state.query) undated.append(make('p','empty','該当する作品はありません。'));
  pending.forEach(x=>undated.append(card(x)));
}
function renderMonths(){
  const y=state.month.getFullYear();$('#year-title').textContent=`${y}年`;
  const host=$('#month-options');host.replaceChildren();
  for(let m=0;m<12;m++){const b=make('button',m===state.month.getMonth()?'active':'',`${m+1}月`);b.onclick=()=>{state.range='month';state.month.setMonth(m);render();};host.append(b);}
}
function syncUrl(){const p=new URLSearchParams();if(state.kind!=='all')p.set('kind',state.kind);if(state.filter)p.set('platform',state.filter);if(state.status!=='all')p.set('status',state.status);if(state.query)p.set('q',$('#search').value.trim());if(state.range!=='month')p.set('range',state.range);if(state.month.getFullYear()!==today.getFullYear()||state.month.getMonth()!==today.getMonth())p.set('month',`${state.month.getFullYear()}-${String(state.month.getMonth()+1).padStart(2,'0')}`);if(state.view!=='list')p.set('view',state.view);if(state.favoritesOnly)p.set('fav','1');if(state.sort!=='date')p.set('sort',state.sort);const query=p.toString();history.replaceState(null,'',query?`${location.pathname}?${query}`:location.pathname);}
function render(){renderFilters();renderMonths();renderCalendar();renderLists();document.querySelectorAll('[data-range]').forEach(b=>{b.classList.toggle('active',b.dataset.range===state.range);b.setAttribute('aria-pressed',String(b.dataset.range===state.range));});document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===state.kind)));const statusBase=entries.filter(item=>matches(item,false));document.querySelectorAll('[data-status]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.status===state.status));const count=statusBase.filter(item=>b.dataset.status==='all'||item.status===b.dataset.status).length;let badge=b.querySelector('.status-count');if(!badge){badge=make('small','status-count');badge.setAttribute('aria-hidden','true');b.append(badge);}badge.textContent=String(count);});if(state.view==='list')$('#month-title').textContent=state.query?'検索結果':state.range==='all'?'全期間の予定':state.range==='month'?`${state.month.getFullYear()}年${state.month.getMonth()+1}月`:`直近${state.range}日の予定`;$('#favorites-toggle').classList.toggle('selected',state.favoritesOnly);$('#favorites-toggle').setAttribute('aria-pressed',String(state.favoritesOnly));$('#sort-order').value=state.sort;syncUrl();}
$('#favorites-toggle').addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  const button = $('#favorites-toggle');
  button.classList.toggle('selected', state.favoritesOnly);
  button.setAttribute('aria-pressed', String(state.favoritesOnly));
  render();
});
function escapeIcs(value) { return safe(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function foldIcsLine(line) {
  let output = '', part = '', bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 73) { output += part + '\r\n '; part = ''; bytes = 1; }
    part += char; bytes += size;
  }
  return output + part;
}
function exportCalendar() {
  const year = state.month.getFullYear(), month = state.month.getMonth();
  const events = entries.filter(item => matches(item) && isInRange(item)).sort((a,b) => a.date.localeCompare(b.date));
  if (!events.length) { alert('この表示条件には、カレンダーに追加できる日付確定済みの予定がありません。'); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Tsugiitsu//Release Calendar//JA','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for (const item of events) {
    const uid = encodeURIComponent(`${item.kind}-${item.series}-${item.date}-${item.title}`) + '@tsugiitsu';
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${item.date.replace(/-/g, '')}`, `SUMMARY:${escapeIcs(`${item.series} - ${item.title}`)}`, `DESCRIPTION:${escapeIcs([item.dateLabel, item.detail, item.basis, item.source].filter(Boolean).join(' | '))}`);
    try { const url = new URL(safe(item.url), location.href); if (url.protocol === 'https:' || url.protocol === 'http:') lines.push(`URL:${escapeIcs(url.href)}`); } catch {}
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.map(foldIcsLine).join('\r\n') + '\r\n'], {type:'text/calendar;charset=utf-8'});
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = state.range==='month'?`tsugiitsu-${year}-${String(month + 1).padStart(2, '0')}.ics`:`tsugiitsu-${state.range}.ics`;
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
$('#export-calendar').addEventListener('click', exportCalendar);
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.kind;state.filter='';document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));render();}));
document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.kind===state.kind));
$('#search').value=initialParams.get('q')||'';
document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.status;render();}));
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{state.range=b.dataset.range;state.view='list';document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x.dataset.view==='list'));$('#list-view').hidden=false;$('#calendar-view').hidden=true;render();}));
$('#sort-order').addEventListener('change',e=>{state.sort=e.target.value;render();});
$('#clear-filters').addEventListener('click',()=>{state.kind='all';state.filter='';state.status='all';state.query='';state.favoritesOnly=false;state.range='month';state.sort='date';state.month=new Date(today);state.view='list';$('#search').value='';document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x.dataset.kind==='all'));document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x.dataset.view==='list'));$('#list-view').hidden=false;$('#calendar-view').hidden=true;render();});
document.querySelectorAll('.view-switch button').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;if(state.view==='calendar')state.range='month';document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x===b));$('#list-view').hidden=state.view!=='list';$('#calendar-view').hidden=state.view!=='calendar';render();}));
function setTheme(theme){
  const allowed=['sky','lavender','coral','navy'];if(!allowed.includes(theme))theme='sky';
  document.documentElement.dataset.theme=theme;
  const colors={sky:'#f4faff',lavender:'#f7f5ff',coral:'#fff7f3',navy:'#f4f7fb'};const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=colors[theme];
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
$('#search').addEventListener('input',e=>{state.query=e.target.value.trim().toLocaleLowerCase('ja-JP');if(state.query){state.range='all';if(state.view==='calendar'){state.view='list';document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x.dataset.view==='list'));$('#list-view').hidden=false;$('#calendar-view').hidden=true;}}render();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}if(e.key==='Escape'&&document.activeElement===$('#search')&&$('#search').value){$('#search').value='';state.query='';render();}});
$('#share-view').addEventListener('click',async()=>{const url=location.href;try{if(navigator.share&&(!navigator.canShare||navigator.canShare({url})))await navigator.share({title:'つぎいつ？の予定',url});else{await navigator.clipboard.writeText(url);$('#share-view').textContent='リンクをコピーしました';setTimeout(()=>$('#share-view').textContent='この表示を共有',1800);}}catch(error){if(error.name!=='AbortError'){try{await navigator.clipboard.writeText(url);$('#share-view').textContent='リンクをコピーしました';setTimeout(()=>$('#share-view').textContent='この表示を共有',1800);}catch{$('#share-view').textContent='URLをアドレスバーからコピーしてください';}}}});
$('#manage-favorites').addEventListener('click',()=>$('#favorites-dialog').showModal());
$('#export-favorites').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,favorites:[...favoriteSeries],theme:document.documentElement.dataset.theme||'sky'},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='tsugiitsu-settings.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);$('#backup-status').textContent='バックアップを保存しました。';});
$('#import-favorites').addEventListener('click',()=>$('#favorites-file').click());
$('#favorites-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw Error();const data=JSON.parse(await file.text());if(!Array.isArray(data.favorites)||data.favorites.length>200||!data.favorites.every(x=>typeof x==='string'&&x.length<120))throw Error();favoriteSeries=new Set(data.favorites);localStorage.setItem('tsugiitsu-favorites',JSON.stringify([...favoriteSeries]));if(['sky','lavender','coral','navy'].includes(data.theme))setTheme(data.theme);$('#backup-status').textContent=`${favoriteSeries.size}件のお気に入りを復元しました。`;render();}catch{$('#backup-status').textContent='このバックアップファイルを読み込めませんでした。';}e.target.value='';});
$('#prev').onclick=()=>{state.range='month';state.month.setFullYear(state.month.getFullYear()-1);render();}; $('#next').onclick=()=>{state.range='month';state.month.setFullYear(state.month.getFullYear()+1);render();}; $('#today').onclick=()=>{state.range='month';state.month=new Date(today);render();};
fetch('data/schedule.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{entries=Array.isArray(d.items)?d.items:[];$('#last-updated').textContent=d.updatedAt?`予定確認日：${d.updatedAt}`:'予定確認日：未記載';render();}).catch(()=>{$('#last-updated').textContent='予定データを読み込めませんでした';const message=make('div','empty error-state','予定データを読み込めませんでした。通信状態をご確認ください。');const retry=make('button','utility-button','再読み込み');retry.type='button';retry.onclick=()=>location.reload();message.append(retry);$('#date-list').replaceChildren(message);});
$('#list-view').hidden=state.view!=='list';$('#calendar-view').hidden=state.view!=='calendar';document.querySelectorAll('.view-switch button').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));

fetch('data/official-updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{
  const items=Array.isArray(d.items)?d.items:[]; if(!items.length)return;
  const section=$('#official-updates'),host=$('#announcements');host.replaceChildren();
  items.forEach(item=>{const card=make('article','event-card update-card');const body=make('div','event-body');body.append(make('span','badge kind-manga',item.source||'公式RSS'),make('h3','',item.series||'登録作品'),make('p','event-title',item.title));if(item.date)body.append(make('p','event-detail',item.date));const a=document.createElement('a');a.className='source';a.textContent='公式記事を確認 ↗';try{const url=new URL(item.url);if(url.protocol==='https:'&&['www.shueisha.co.jp','shueisha.co.jp'].includes(url.hostname)){a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}if(a.href)body.append(a);card.append(body);host.append(card);});
  $('#updates-checked').textContent=`最終チェック：${d.checkedAt||'不明'}`;section.hidden=false;
}).catch(()=>{});

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));

