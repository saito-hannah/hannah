const routeNames={dashboard:'経営ダッシュボード',themes:'経営テーマ',review:'月次レビュー',kpi:'KPI一覧',team:'責任者',settings:'設定・バックアップ'};

function ownerName(id){return member(id)?.name||'未設定'}
function kpiDisplay(t,value=t.current){return `${Number(value||0).toLocaleString('ja-JP')}${esc(t.unit||'')}`}
function progressToTarget(t){
  const current=Number(t.current)||0,target=Number(t.target)||0;
  if(!target)return Math.max(0,Math.min(100,Number(t.progress)||0));
  const lowerBetter=String(t.unit||'').includes('以下');
  return Math.max(0,Math.min(100,Math.round(lowerBetter?(target/Math.max(current,.01))*100:(current/target)*100)));
}
function pageHead(eyebrow,title,description,actions=''){
  return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="page-actions">${actions}</div></div>`;
}
function themeCard(t){
  const pct=progressToTarget(t);
  return `<article class="theme-card" data-theme-id="${t.id}" data-health="${t.health}">
    <div class="theme-top"><span class="theme-category">${esc(t.category)}</span><span class="health-pill ${t.health}">${healthLabels[t.health]||'確認中'}</span></div>
    <h3>${esc(t.title)}</h3><p class="theme-purpose">${esc(t.purpose)}</p>
    <div class="kpi-box"><div><span>${esc(t.kpiName)}</span><strong>${kpiDisplay(t)}</strong></div><div class="kpi-target"><span>目標</span><b>${kpiDisplay(t,t.target)}</b></div></div>
    <div class="progress-track"><i style="width:${pct}%"></i></div>
    <div class="theme-footer"><div class="owner-line">${avatar(t.ownerId)}<span>${esc(ownerName(t.ownerId))}</span></div><span class="next-review">次回 ${fmtDate(t.nextReview)}</span></div>
  </article>`;
}
function render(){
  $('#breadcrumb').textContent=`HANNAH / ${routeNames[ui.route]||routeNames.dashboard}`;
  $('#themeCount').textContent=state.themes.length;
  $$('[data-route]').forEach(el=>el.classList.toggle('active',el.dataset.route===ui.route));
  const content=$('#content');
  const views={dashboard:renderDashboard,themes:renderThemes,review:renderReview,kpi:renderKpi,team:renderTeam,settings:renderSettings};
  content.innerHTML=(views[ui.route]||renderDashboard)();
}
function renderDashboard(){
  const active=state.themes.filter(t=>t.status!=='stable').length;
  const risk=state.themes.filter(t=>t.health==='risk').length;
  const avg=Math.round(state.themes.reduce((sum,t)=>sum+progressToTarget(t),0)/Math.max(state.themes.length,1));
  const focus=[...state.themes].filter(t=>t.status==='focus'||t.health==='risk').sort((a,b)=>(a.health==='risk'?-1:1)-(b.health==='risk'?-1:1)).slice(0,5);
  const decisions=[...state.themes].filter(t=>t.decision?.trim()).sort((a,b)=>new Date(a.nextReview)-new Date(b.nextReview)).slice(0,4);
  return `${pageHead('Salon Executive Board','美容室の経営テーマを、一画面で。','細かな作業ではなく、売上・集客・組織・運営に影響する根本課題だけを管理します。','<button class="button dark" data-action="new-theme">＋ 経営テーマを追加</button>')}
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-top"><span>経営テーマ</span><i class="stat-icon">◇</i></div><div class="stat-value">${state.themes.length}</div><div class="stat-sub">現在管理している重要課題</div></div>
    <div class="stat-card"><div class="stat-top"><span>重点改善中</span><i class="stat-icon">↗</i></div><div class="stat-value">${active}</div><div class="stat-sub">今月、方向づけが必要な領域</div></div>
    <div class="stat-card"><div class="stat-top"><span>要改善</span><i class="stat-icon">!</i></div><div class="stat-value">${risk}</div><div class="stat-sub">早めに修正すべきテーマ</div></div>
    <div class="stat-card"><div class="stat-top"><span>KPI達成度</span><i class="stat-icon">◎</i></div><div class="stat-value">${avg}%</div><div class="stat-sub">全テーマの平均達成度</div></div>
  </div>
  <div class="dashboard-grid">
    <section class="panel"><div class="panel-head"><div><h2>今月の重点テーマ</h2><p>経営として優先的に改善する項目</p></div><button class="button ghost" data-route="themes">すべて見る</button></div><div class="panel-body"><div class="focus-list">${focus.map(t=>`<button class="focus-row" data-theme-id="${t.id}"><i class="health-bar ${t.health}"></i><div class="focus-main"><strong>${esc(t.title)}</strong><p>${esc(t.focus)}</p></div><div class="focus-meta"><b>${progressToTarget(t)}%</b><span>${esc(t.kpiName)}</span></div></button>`).join('')||'<div class="empty">重点テーマはありません。</div>'}</div></div></section>
    <section class="panel"><div class="panel-head"><div><h2>次に必要な経営判断</h2><p>会議で決めるべき論点</p></div></div><div class="panel-body"><div class="decision-list">${decisions.map(t=>`<button class="decision-card" data-theme-id="${t.id}"><span class="tag">${fmtDate(t.nextReview)}まで</span><strong>${esc(t.title)}</strong><p>${esc(t.decision)}</p></button>`).join('')||'<div class="empty">判断事項はありません。</div>'}</div></div></section>
  </div>
  <div class="section-title"><h2>経営テーマ一覧</h2><span>カードを開いて目的・KPI・重点施策を確認</span></div>
  <div class="theme-grid">${state.themes.map(themeCard).join('')}</div>`;
}
function renderThemes(){
  const statuses=['planning','focus','testing','stable'];
  const filtered=ui.filter==='all'?state.themes:state.themes.filter(t=>t.category===ui.filter||t.health===ui.filter);
  return `${pageHead('Management Themes','経営テーマ','日々の作業ではなく、継続して改善する根本課題を管理します。','<button class="button dark" data-action="new-theme">＋ 追加</button>')}
  <div class="filters"><button class="filter-btn ${ui.filter==='all'?'active':''}" data-filter="all">すべて</button>${categories.map(c=>`<button class="filter-btn ${ui.filter===c?'active':''}" data-filter="${c}">${c}</button>`).join('')}<button class="filter-btn ${ui.filter==='risk'?'active':''}" data-filter="risk">要改善のみ</button></div>
  <div class="board">${statuses.map(status=>{const list=filtered.filter(t=>t.status===status);return `<section class="board-column" data-status="${status}"><div class="column-head"><strong>${statusLabels[status]}</strong><span>${list.length}</span></div><div class="column-drop">${list.map(t=>`<article class="strategy-card" draggable="true" data-theme-id="${t.id}"><span class="health-pill ${t.health}">${healthLabels[t.health]}</span><h3>${esc(t.title)}</h3><p>${esc(t.focus)}</p><div class="mini-kpi"><span>${esc(t.kpiName)}</span><b>${kpiDisplay(t)}</b></div><div class="strategy-bottom"><div class="owner-line">${avatar(t.ownerId)}<span>${esc(ownerName(t.ownerId))}</span></div><span class="next-review">${fmtDate(t.nextReview)}</span></div></article>`).join('')}</div></section>`}).join('')}</div>`;
}
function renderReview(){
  const avg=Math.round(state.themes.reduce((sum,t)=>sum+progressToTarget(t),0)/Math.max(state.themes.length,1));
  const sorted=[...state.themes].sort((a,b)=>new Date(a.nextReview)-new Date(b.nextReview));
  return `${pageHead('Monthly Review','月次レビュー','数値・現状・経営判断を同じ画面で確認します。','<button class="button" data-action="print">印刷</button>')}
  <section class="review-hero"><div><div class="eyebrow">HANNAH MANAGEMENT REVIEW</div><h2>今月の経営状態</h2><p>細かなToDoの消化率ではなく、店舗の根本課題が改善方向へ進んでいるかを確認します。</p></div><div class="review-score"><strong>${avg}</strong><span>総合KPI<br>達成度</span></div></section>
  <section class="panel"><div class="panel-head"><div><h2>テーマ別レビュー</h2><p>次回レビュー日が近い順</p></div></div><div class="table-wrap"><table class="review-table"><thead><tr><th>テーマ</th><th>状態</th><th>KPI</th><th>達成度</th><th>必要な判断</th><th>次回</th></tr></thead><tbody>${sorted.map(t=>`<tr data-theme-id="${t.id}"><td><div class="table-theme"><i></i><div><strong>${esc(t.title)}</strong><span>${esc(t.category)}・${esc(ownerName(t.ownerId))}</span></div></div></td><td><span class="health-pill ${t.health}">${healthLabels[t.health]}</span></td><td><b>${kpiDisplay(t)}</b><div class="kpi-delta">目標 ${kpiDisplay(t,t.target)}</div></td><td><div class="meter"><i style="width:${progressToTarget(t)}%"></i></div></td><td class="decision-cell">${esc(t.decision||'未設定')}</td><td>${fmtDate(t.nextReview)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function renderKpi(){
  return `${pageHead('Key Performance Indicators','KPI一覧','経営テーマごとに代表指標を1つに絞り、現在値と目標を比較します。')}
  <section class="panel"><div class="panel-head"><div><h2>代表KPI</h2><p>数値だけではなく、目的と責任者まで確認</p></div></div><div class="table-wrap"><table class="kpi-table"><thead><tr><th>経営テーマ</th><th>代表KPI</th><th>現在値</th><th>目標</th><th>達成度</th><th>責任者</th></tr></thead><tbody>${state.themes.map(t=>`<tr data-theme-id="${t.id}"><td><div class="table-theme"><i></i><div><strong>${esc(t.title)}</strong><span>${esc(t.purpose)}</span></div></div></td><td>${esc(t.kpiName)}</td><td class="kpi-value">${kpiDisplay(t)}</td><td>${kpiDisplay(t,t.target)}</td><td><div class="meter"><i style="width:${progressToTarget(t)}%"></i></div><div class="kpi-delta">${progressToTarget(t)}%</div></td><td><div class="owner-line">${avatar(t.ownerId)}<span>${esc(ownerName(t.ownerId))}</span></div></td></tr>`).join('')}</tbody></table></div></section>`;
}
function renderTeam(){
  return `${pageHead('Theme Ownership','責任者','各経営テーマには必ず一人の最終責任者を置きます。','<button class="button dark" data-action="new-member">＋ 責任者を追加</button>')}
  <section class="panel"><div class="panel-head"><div><h2>責任者と担当テーマ</h2><p>人数に依存せず自由に追加・変更できます</p></div></div><div class="table-wrap"><table class="team-table"><thead><tr><th>メンバー</th><th>役割</th><th>最終責任テーマ</th><th>協力テーマ</th><th></th></tr></thead><tbody>${state.members.map(m=>{const owned=state.themes.filter(t=>t.ownerId===m.id);const support=state.themes.filter(t=>(t.supportIds||[]).includes(m.id));return `<tr><td><div class="owner-line">${avatar(m.id)}<strong>${esc(m.name)}</strong></div></td><td>${esc(m.role)}</td><td>${owned.length}<div class="kpi-delta">${owned.map(t=>esc(t.title)).join('・')||'なし'}</div></td><td>${support.length}</td><td><button class="button" data-action="edit-member" data-member-id="${m.id}">編集</button></td></tr>`}).join('')}</tbody></table></div></section>`;
}
function renderSettings(){
  return `${pageHead('System Settings','設定・バックアップ','このブラウザに保存された経営データを書き出し・復元できます。')}
  <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>このサイトに載せる基準</h2><p>根本課題に集中するための運用ルール</p></div></div><div class="panel-body"><div class="principles"><div class="principle"><b>1か月以上追う</b><p>今日だけの作業や個人ToDoは登録しません。</p></div><div class="principle"><b>KPIを1つ決める</b><p>改善したかどうかを判断できる代表指標を設定します。</p></div><div class="principle"><b>責任者を1人置く</b><p>協力者は複数でも、最終責任者は一人にします。</p></div></div></div></section>
  <section class="panel"><div class="panel-head"><div><h2>データ管理</h2><p>端末変更前にバックアップしてください</p></div></div><div class="panel-body"><div class="decision-list"><button class="button dark" data-action="export">JSONバックアップを書き出す</button><button class="button" data-action="import">バックアップを復元する</button><input id="importFile" type="file" accept="application/json" hidden><button class="button danger" data-action="reset">初期データへ戻す</button></div></div></section></div>`;
}
function openDrawer(id){
  const t=theme(id);if(!t)return;ui.drawerId=id;
  $('#drawerBackdrop').hidden=false;$('#drawer').hidden=false;document.body.style.overflow='hidden';
  const helpers=(t.supportIds||[]).map(member).filter(Boolean);
  $('#drawer').innerHTML=`<div class="drawer-head"><div><span class="category">${esc(t.category)} / ${statusLabels[t.status]}</span><h2>${esc(t.title)}</h2></div><button class="icon-btn" data-action="close-drawer">×</button></div><div class="drawer-body">
    <section class="drawer-section"><h3>目的</h3><p class="objective">${esc(t.purpose)}</p></section>
    <section class="drawer-section"><div class="detail-grid"><div class="detail-box"><span>代表KPI</span><strong>${esc(t.kpiName)}</strong></div><div class="detail-box"><span>現在 / 目標</span><strong>${kpiDisplay(t)} / ${kpiDisplay(t,t.target)}</strong></div><div class="detail-box"><span>責任者</span><strong>${esc(ownerName(t.ownerId))}</strong></div><div class="detail-box"><span>次回レビュー</span><strong>${fmtDate(t.nextReview)}</strong></div></div></section>
    <section class="drawer-section"><h3>現在の重点</h3><p class="objective">${esc(t.focus)}</p></section>
    <section class="drawer-section"><div class="decision-highlight"><span>次に必要な経営判断</span><p>${esc(t.decision||'未設定')}</p></div></section>
    <section class="drawer-section"><h3>重点施策</h3><div class="initiative-list">${(t.initiatives||[]).map((x,i)=>`<div class="initiative"><i>${i+1}</i><div>${esc(x)}</div></div>`).join('')||'<div class="empty">未設定</div>'}</div></section>
    <section class="drawer-section"><h3>協力メンバー</h3><div class="owner-line">${helpers.map(m=>avatar(m.id)).join('')}<span>${helpers.map(m=>esc(m.name)).join('・')||'未設定'}</span></div></section>
    <section class="drawer-section"><h3>補足・判断材料</h3><p>${esc(t.notes||'')}</p></section>
  </div><div class="drawer-actions"><button class="button danger" data-action="delete-theme">削除</button><button class="button dark" data-action="edit-theme">テーマを編集</button></div>`;
}
function closeDrawer(){ui.drawerId=null;$('#drawerBackdrop').hidden=true;$('#drawer').hidden=true;$('#drawer').innerHTML='';document.body.style.overflow=''}
function openModal(title,body,footer){$('#modal').innerHTML=`<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close-modal">×</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div>`;$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#modalBackdrop').hidden=true;$('#modal').innerHTML='';if(!ui.drawerId)document.body.style.overflow=''}
function themeModal(id=null){
  const t=id?theme(id):null;
  const d=t||{title:'',category:'集客',purpose:'',ownerId:state.members[0]?.id||'',supportIds:[],status:'planning',health:'watch',kpiName:'',current:'',target:'',unit:'件／月',nextReview:addDays(todayISO(),14),focus:'',decision:'',initiatives:['','',''],notes:''};
  openModal(t?'経営テーマを編集':'経営テーマを追加',`<form id="themeForm" data-id="${t?.id||''}"><div class="form-grid">
    <div class="form-group full"><label>経営テーマ名</label><input name="title" required value="${esc(d.title)}" placeholder="例：SNS集客"><span class="helper">作業名ではなく、1か月以上追う根本課題を入力します。</span></div>
    <div class="form-group"><label>分類</label><select name="category">${categories.map(c=>`<option ${d.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="form-group"><label>責任者</label><select name="ownerId">${state.members.map(m=>`<option value="${m.id}" ${d.ownerId===m.id?'selected':''}>${esc(m.name)}（${esc(m.role)}）</option>`).join('')}</select></div>
    <div class="form-group full"><label>目的</label><textarea name="purpose" required>${esc(d.purpose)}</textarea></div>
    <div class="form-group"><label>進行ステータス</label><select name="status">${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}" ${d.status===k?'selected':''}>${v}</option>`).join('')}</select></div>
    <div class="form-group"><label>経営状態</label><select name="health">${Object.entries(healthLabels).map(([k,v])=>`<option value="${k}" ${d.health===k?'selected':''}>${v}</option>`).join('')}</select></div>
    <div class="form-group"><label>代表KPI</label><input name="kpiName" required value="${esc(d.kpiName)}"></div><div class="form-group"><label>単位</label><input name="unit" value="${esc(d.unit)}"></div>
    <div class="form-group"><label>現在値</label><input type="number" step="0.1" name="current" value="${d.current}"></div><div class="form-group"><label>目標値</label><input type="number" step="0.1" name="target" value="${d.target}"></div>
    <div class="form-group"><label>次回レビュー日</label><input type="date" name="nextReview" value="${d.nextReview}"></div><div class="form-group"><label>協力メンバー</label><select name="supportIds" multiple size="4">${state.members.map(m=>`<option value="${m.id}" ${(d.supportIds||[]).includes(m.id)?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
    <div class="form-group full"><label>現在の重点</label><textarea name="focus" required>${esc(d.focus)}</textarea></div><div class="form-group full"><label>次に必要な経営判断</label><textarea name="decision">${esc(d.decision)}</textarea></div>
    <div class="form-group full"><label>重点施策 1</label><input name="initiative1" value="${esc(d.initiatives?.[0]||'')}"></div><div class="form-group full"><label>重点施策 2</label><input name="initiative2" value="${esc(d.initiatives?.[1]||'')}"></div><div class="form-group full"><label>重点施策 3</label><input name="initiative3" value="${esc(d.initiatives?.[2]||'')}"></div>
    <div class="form-group full"><label>補足・判断材料</label><textarea name="notes">${esc(d.notes||'')}</textarea></div>
  </div></form>`,`<button class="button" data-action="close-modal">キャンセル</button><button class="button dark" data-action="save-theme">保存する</button>`);
}
function saveTheme(){
  const form=$('#themeForm');if(!form?.reportValidity())return;
  const fd=new FormData(form),id=form.dataset.id||uid('th'),existing=theme(id);
  const next={id,title:fd.get('title').trim(),category:fd.get('category'),purpose:fd.get('purpose').trim(),ownerId:fd.get('ownerId'),supportIds:fd.getAll('supportIds'),status:fd.get('status'),health:fd.get('health'),progress:existing?.progress||0,kpiName:fd.get('kpiName').trim(),current:Number(fd.get('current'))||0,target:Number(fd.get('target'))||0,unit:fd.get('unit').trim(),nextReview:fd.get('nextReview'),focus:fd.get('focus').trim(),decision:fd.get('decision').trim(),initiatives:[fd.get('initiative1'),fd.get('initiative2'),fd.get('initiative3')].map(x=>x.trim()).filter(Boolean),notes:fd.get('notes').trim(),updatedAt:new Date().toISOString()};
  if(existing)Object.assign(existing,next);else state.themes.push(next);save();closeModal();render();openDrawer(id);toast(existing?'経営テーマを更新しました':'経営テーマを追加しました');
}
function memberModal(id=null){
  const m=id?member(id):null;
  openModal(m?'責任者を編集':'責任者を追加',`<form id="memberForm" data-id="${m?.id||''}"><div class="form-grid"><div class="form-group"><label>名前</label><input name="name" required value="${esc(m?.name||'')}"></div><div class="form-group"><label>役割</label><input name="role" required value="${esc(m?.role||'')}"></div><div class="form-group"><label>イニシャル</label><input name="initials" maxlength="3" value="${esc(m?.initials||'')}"></div><div class="form-group"><label>色</label><select name="tone">${['gold','blue','pink','green','purple'].map(x=>`<option ${m?.tone===x?'selected':''}>${x}</option>`).join('')}</select></div></div></form>`,`<button class="button" data-action="close-modal">キャンセル</button><button class="button dark" data-action="save-member">保存する</button>`);
}
function saveMember(){
  const form=$('#memberForm');if(!form?.reportValidity())return;const fd=new FormData(form),id=form.dataset.id||uid('m'),existing=member(id),data={id,name:fd.get('name').trim(),role:fd.get('role').trim(),initials:(fd.get('initials')||fd.get('name').slice(0,2)).toUpperCase(),tone:fd.get('tone')};
  if(existing)Object.assign(existing,data);else state.members.push(data);save();closeModal();render();toast('責任者を保存しました');
}
function openSearch(){$('#searchBackdrop').hidden=false;$('#searchInput').value='';renderSearch('');setTimeout(()=>$('#searchInput').focus(),30)}
function closeSearch(){$('#searchBackdrop').hidden=true}
function renderSearch(query){const q=query.toLowerCase().trim(),list=state.themes.filter(t=>!q||[t.title,t.purpose,t.focus,t.decision,...(t.initiatives||[])].join(' ').toLowerCase().includes(q));$('#searchResults').innerHTML=list.map(t=>`<button class="search-result" data-theme-id="${t.id}"><i></i><div><strong>${esc(t.title)}</strong><span>${esc(t.focus)}</span></div></button>`).join('')||'<div class="empty">該当する経営テーマはありません。</div>'}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`HANNAH-management-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);toast('バックアップを書き出しました')}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.themes)||!Array.isArray(data.members))throw new Error('invalid');state=data;save();render();toast('バックアップを復元しました')}catch{toast('読み込みに失敗しました')}};reader.readAsText(file)}
function deleteTheme(){const t=theme(ui.drawerId);if(!t||!confirm(`「${t.title}」を削除しますか？`))return;state.themes=state.themes.filter(x=>x.id!==t.id);save();closeDrawer();render();toast('経営テーマを削除しました')}

let dragId=null;
document.addEventListener('dragstart',e=>{const card=e.target.closest('.strategy-card');if(!card)return;dragId=card.dataset.themeId;card.classList.add('dragging')});
document.addEventListener('dragend',e=>{e.target.closest('.strategy-card')?.classList.remove('dragging');dragId=null});
document.addEventListener('dragover',e=>{if(e.target.closest('.column-drop'))e.preventDefault()});
document.addEventListener('drop',e=>{const column=e.target.closest('.board-column');if(!column||!dragId)return;e.preventDefault();theme(dragId).status=column.dataset.status;save();render();toast('進行ステータスを更新しました')});
document.addEventListener('click',e=>{
  const target=e.target.closest('button,[data-theme-id]');if(!target)return;
  if(target.dataset.route){ui.route=target.dataset.route;$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');render();return}
  if(target.dataset.filter){ui.filter=target.dataset.filter;render();return}
  if(target.dataset.themeId){closeSearch();openDrawer(target.dataset.themeId);return}
  const action=target.dataset.action;if(!action)return;
  if(action==='toggle-sidebar'){$('#sidebar').classList.add('open');$('#mobileOverlay').classList.add('show')}
  if(action==='close-sidebar'){$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show')}
  if(action==='new-theme')themeModal();if(action==='edit-theme')themeModal(ui.drawerId);if(action==='save-theme')saveTheme();if(action==='delete-theme')deleteTheme();
  if(action==='close-drawer')closeDrawer();if(action==='close-modal')closeModal();
  if(action==='new-member')memberModal();if(action==='edit-member')memberModal(target.dataset.memberId);if(action==='save-member')saveMember();
  if(action==='open-search')openSearch();if(action==='export')exportData();if(action==='import')$('#importFile')?.click();
  if(action==='reset'&&confirm('入力した内容を削除し、初期状態に戻しますか？')){state=seed();save();render();toast('初期状態に戻しました')}
  if(action==='print')window.print();
});
document.addEventListener('change',e=>{if(e.target.id==='importFile'&&e.target.files?.[0])importData(e.target.files[0])});
document.addEventListener('input',e=>{if(e.target.id==='searchInput')renderSearch(e.target.value)});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){closeSearch();closeModal();if(ui.drawerId)closeDrawer()}});
document.addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();if(e.target.id==='searchBackdrop')closeSearch()});
render();
