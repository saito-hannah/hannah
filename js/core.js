'use strict';
const STORAGE_KEY='hannah-salon-management-os-v1';
const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const pad=n=>String(n).padStart(2,'0');const localISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;const todayISO=()=>localISO(new Date());
const addDays=(date,n)=>{const d=new Date(`${date}T00:00:00`);d.setDate(d.getDate()+n);return localISO(d)};
const fmtDate=s=>{if(!s)return'未設定';const d=new Date(`${s}T00:00:00`);return `${d.getMonth()+1}/${d.getDate()}`};
const healthLabels={good:'順調',watch:'要確認',risk:'要改善'};
const statusLabels={planning:'方針決定前',focus:'重点改善中',testing:'検証中',stable:'定着・継続'};
const categories=['集客','売上','顧客','組織','運営','品質'];
function seed(){
 const today=todayISO();
 const members=[
  {id:'m1',name:'ハンナ',role:'経営管理者',initials:'HM',tone:'gold'},
  {id:'m2',name:'Ai',role:'店長・スタイリスト',initials:'AI',tone:'pink'},
  {id:'m3',name:'齊藤 将哉',role:'マネージャー',initials:'MS',tone:'blue'},
  {id:'m4',name:'Mio',role:'スタイリスト',initials:'MI',tone:'green'}
 ];
 const themes=[
  {id:'th1',title:'SNS集客',category:'集客',purpose:'Instagram・TikTokから毎月安定して新規予約を獲得できる状態をつくる。',ownerId:'m1',supportIds:['m2','m3'],status:'focus',health:'watch',progress:58,kpiName:'SNS経由の新規予約',current:62,target:90,unit:'件／月',nextReview:addDays(today,7),focus:'投稿本数を増やす段階から、予約につながる企画と導線を強くする段階へ移行する。',decision:'スタッフ全員の投稿量を優先するか、伸びる出演者と企画に集中するかを決める。',initiatives:['ショート動画の勝ちパターンを3種類に絞る','プロフィール→LINE→予約までの導線を改善する','スタッフ別の発信役割と最低投稿基準を決める'],notes:'再生数だけではなく、プロフィールアクセス・LINE登録・予約数まで毎月確認する。',updatedAt:new Date().toISOString()},
  {id:'th2',title:'クーポン改善',category:'売上',purpose:'お客様が料金と違いを理解し、自分に合うメニューを迷わず予約できる状態をつくる。',ownerId:'m2',supportIds:['m1','m4'],status:'testing',health:'risk',progress:41,kpiName:'クーポン閲覧→予約率',current:6.8,target:10,unit:'％',nextReview:addDays(today,5),focus:'価格訴求だけでなく、毛質・本数・仕上がりの違いが一目で分かる構成へ変更する。',decision:'つけ放題を入口商品にするか、本数別クーポンを主軸にするかを決める。',initiatives:['人気クーポンを上位3つに整理する','料金込み・追加料金の表記を統一する','クーポン画像と説明文の訴求をAB比較する'],notes:'予約後の料金認識違いが起きないことも改善基準に含める。',updatedAt:new Date().toISOString()},
  {id:'th3',title:'売上・客単価改善',category:'売上',purpose:'無理な値上げや押し売りをせず、提案力とメニュー設計で店舗売上を安定させる。',ownerId:'m3',supportIds:['m1','m2'],status:'focus',health:'watch',progress:52,kpiName:'平均客単価',current:31800,target:35000,unit:'円',nextReview:addDays(today,12),focus:'毛質アップ・限定カラー・ケア商品の提案が自然に伝わる接客設計へ統一する。',decision:'売上を伸ばす優先順位を、単価・客数・再来のどこに置くか決める。',initiatives:['カウンセリング時の提案順を標準化する','毛質アップ率をスタッフ別に確認する','店販商品を施術履歴に合わせて提案する'],notes:'売上だけでなく、提案後の満足度と再来率もセットで確認する。',updatedAt:new Date().toISOString()},
  {id:'th4',title:'リピート・顧客満足',category:'顧客',purpose:'一度来店したお客様が不安なく再来し、長くHANNAHを選び続ける状態をつくる。',ownerId:'m2',supportIds:['m4'],status:'planning',health:'watch',progress:35,kpiName:'3か月以内再来率',current:47,target:60,unit:'％',nextReview:addDays(today,16),focus:'施術後のホームケア、保証、次回来店目安の伝え方を統一する。',decision:'LINEでの来店後フォローを全員に行うか、対象を絞るか決める。',initiatives:['来店後フォローの基準を決める','保証・お直し案内を統一する','失客理由を月1回分類する'],notes:'口コミ点数だけではなく、再来しなかった理由を把握する。',updatedAt:new Date().toISOString()},
  {id:'th5',title:'スタッフ教育・評価',category:'組織',purpose:'技術だけでなく、接客・提案・発信・店舗への貢献まで含めて成長できる仕組みをつくる。',ownerId:'m2',supportIds:['m1','m3'],status:'focus',health:'good',progress:69,kpiName:'月間カリキュラム達成率',current:78,target:90,unit:'％',nextReview:addDays(today,9),focus:'10段階ランク制と日々の教育内容がつながる評価方法へ整理する。',decision:'昇格基準にSNS・接客・チーム貢献をどの割合で含めるか決める。',initiatives:['ランク別の合格条件を明文化する','教育担当と最終チェック者を分ける','月1回の個人レビューを定着させる'],notes:'できるスタッフだけに教育が集中しない状態をつくる。',updatedAt:new Date().toISOString()},
  {id:'th6',title:'店舗生産性・運営',category:'運営',purpose:'待ち時間・指示待ち・締め作業の偏りを減らし、少ない負担で高品質な営業を実現する。',ownerId:'m3',supportIds:['m1','m2'],status:'testing',health:'risk',progress:46,kpiName:'予約時間どおりの案内率',current:82,target:95,unit:'％',nextReview:addDays(today,4),focus:'11時台の待合放置と、営業中のヘルプ忘れを店舗構造として防ぐ。',decision:'受付専任時間を設けるか、当番制で運用するか決める。',initiatives:['時間帯別のフロア責任者を決める','営業中の優先順位ルールを統一する','締め作業を当番制で公平にする'],notes:'個人の気づきや善意に依存しない運営にする。',updatedAt:new Date().toISOString()},
  {id:'th7',title:'原価・在庫管理',category:'運営',purpose:'在庫切れと過剰在庫を防ぎ、エクステの原価率を適正に保つ。',ownerId:'m3',supportIds:['m2'],status:'stable',health:'good',progress:81,kpiName:'エクステ原価率',current:36,target:34,unit:'％',nextReview:addDays(today,21),focus:'色・毛質別の使用数を記録し、発注点を自動で判断できる状態にする。',decision:'限定色の常備在庫を増やすか、都度取り寄せにするか決める。',initiatives:['毛質・色別の最低在庫数を決める','使いかけ優先ルールを徹底する','月次で廃棄・不明在庫を確認する'],notes:'売上金額ではなく、本数ベースでも原価を追う。',updatedAt:new Date().toISOString()},
  {id:'th8',title:'ブランド・技術品質',category:'品質',purpose:'どのスタッフが担当してもHANNAHらしい仕上がりと接客品質を提供する。',ownerId:'m1',supportIds:['m2','m4'],status:'stable',health:'good',progress:76,kpiName:'7日以内のお直し率',current:2.8,target:2,unit:'％以下',nextReview:addDays(today,18),focus:'エクステの馴染み・装着時間・カウンセリング説明の基準を統一する。',decision:'品質チェックを全施術に行うか、新人・高難度施術に絞るか決める。',initiatives:['仕上がりの合格基準を写真で共有する','クレーム事例を教育に反映する','技術チェックの対象と頻度を決める'],notes:'問題が起きてから直すのではなく、基準で予防する。',updatedAt:new Date().toISOString()}
 ];
 return{version:1,members,themes,settings:{defaultRoute:'dashboard',managementRule:'1か月以上追う経営課題だけを登録する'}};
}
let state;try{state=JSON.parse(localStorage.getItem(STORAGE_KEY))||seed()}catch(e){state=seed()}
const ui={route:'dashboard',filter:'all',drawerId:null};
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const member=id=>state.members.find(m=>m.id===id);const theme=id=>state.themes.find(t=>t.id===id);
const avatar=(id,size='')=>{const m=member(id);return `<div class="avatar ${m?.tone||'gold'} ${size}">${esc(m?.initials||'?')}</div>`};
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function route(name){ui.route=name;$$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===name));$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('show');render()}
