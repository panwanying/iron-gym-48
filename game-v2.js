(function(){
  'use strict';
  const E=globalThis.IronV2,KEY='iron48-v2', $=id=>document.getElementById(id),h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),n=E.round;
  let storageWarning='',state=load(),page='play',active=0,review=false,viewPhoto=null,focus=null,poseRunning=false,poseFrame=0,poseStart=0,posePosition=0,drawer=null,category='撸铁',activityDraft=null,pendingSlot=null,swapMode=false,undoPlan=null,boardScroll=0,sheetKey='',focusReturn=false,growthView='goals';
  const scrolls={play:0,body:0,growth:0},pages={play:'Play',body:'Body',growth:'Log'};
  const avatarMarkup=$('avatar').innerHTML;
  function valid(s){
    const counts=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.entries(x).every(([k,v])=>E.courses.some(c=>c.id===k)&&Number.isInteger(v)&&v>=0);
    const slots=x=>Array.isArray(x)&&x.length===7&&x.every(slot=>slot===null||(slot?.kind==='course'?E.courses.some(c=>c.id===slot.id):slot?.kind==='activity'&&E.activities.some(a=>a.id===slot.id)&&Array.isArray(slot.targets)&&slot.targets.length<=2&&slot.targets.every(k=>E.keys.includes(k))));
    return s&&[2,3].includes(s.version)&&Number.isInteger(s.week)&&s.week>=1&&s.week<=48&&Number.isInteger(s.index)&&s.index>=0&&s.index<=7&&['planner','daily','summary','complete'].includes(s.mode)&&!(s.mode==='daily'&&s.index>=7)&&!(s.mode==='complete'&&(s.week!==48||s.index!==7))&&E.keys.every(k=>{const m=s.muscles?.[k];return m&&['dimension','xp','endurance','injury'].every(x=>Number.isFinite(m[x]))&&Number.isInteger(m.dimension)&&Number.isInteger(m.injury)&&m.dimension>=0&&m.xp>=0&&m.endurance>=0&&m.injury>=0&&m.injury<=3;})&&['energy','fatigue','mood','fat','stage'].every(k=>Number.isFinite(s[k]))&&slots(s.plan?.slots)&&E.meals.some(m=>m.id===s.plan.meal)&&Array.isArray(s.logs)&&s.logs.every(r=>Array.isArray(r.changes)&&Array.isArray(r.warnings))&&Array.isArray(s.weeks)&&s.weeks.every(w=>slots(w.plan?.slots)&&Array.isArray(w.dimensions)&&Array.isArray(w.newCourses))&&Array.isArray(s.photos)&&s.photos.every(p=>Number.isFinite(p.week)&&Number.isFinite(p.fat)&&E.keys.every(k=>Number.isFinite(p.muscles?.[k])))&&counts(s.counts)&&counts(s.pendingCounts)&&E.keys.every(k=>Number.isFinite(s.pendingGrowth?.[k]))&&(!s.lastFeedback||(Array.isArray(s.lastFeedback.changes)&&Array.isArray(s.lastFeedback.warnings)))&&(!['summary','complete'].includes(s.mode)||(s.summary&&Array.isArray(s.summary.dimensions)&&Array.isArray(s.summary.upgrades)&&Array.isArray(s.summary.newCourses)));
  }
  function load(){try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(valid(s))return migrate(s,raw);storageWarning='存档内容不完整，已进入临时新档；原存档未覆盖。';}}catch(e){storageWarning='无法读取本地存档。本次可继续试玩，但暂不能保证刷新后保留。';}const s=E.initial();s.photos=[E.snapshot(s,0)];return s;}

  function migrate(s,raw){
    if(s.version===2){
      try{if(!localStorage.getItem('iron48-before-v21'))localStorage.setItem('iron48-before-v21',raw);}catch(e){}
      s.version=3;s.rules=s.mode==='daily'?2:3;s.advancedCounts={};s.focusState=null;s.focusHistory=[];s.preferredRoute='classic';
      s.logs.forEach(l=>{const c=E.courses.find(c=>l.item===c.name||l.item.startsWith(c.name+' ·'));l.id=c?.id||null;l.type=c?.type||'活动';l.level=0;});
      if(s.weekStart){s.weekStart.week=s.week;s.weekStart.rules=s.rules;s.weekStart.advancedCounts={};}
      s.migrationNote=s.rules===2?'旧档本周按原规则完成，下周启用新恢复与餐食。':'旧档进度已保留，现按更新后的条件继续。';
    }
    s.rules=s.rules||3;s.advancedCounts=s.advancedCounts||{};s.focusHistory=s.focusHistory||[];E.ensureFocus(s);if(s.mode==='complete'&&!E.endings(s).some(e=>e.id===s.selectedEnding&&e.eligible))s.selectedEnding=E.endings(s).find(e=>e.eligible).id;return s;
  }

  function save(){if(storageWarning)return;try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='已自动保存';}catch(e){storageWarning='保存失败：请保持此页面开启，并导出档案备份。';$('saveStatus').textContent=storageWarning;}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600);}
  function btn(action,text,id='',cls='mini',disabled=false){return '<button type="button" class="'+cls+'" data-action="'+action+'" data-id="'+h(id)+'" '+(disabled?'disabled':'')+'>'+text+'</button>';}
  function item(slot){return slot?(slot.kind==='course'?E.courses:E.activities).find(x=>x.id===slot.id):null;}
  function tags(parts){return '<div class="effects">'+parts.map(t=>'<span class="effect">'+h(t)+'</span>').join('')+'</div>';}
  function injuryLabel(i){return ['健康','轻度伤病','中度伤病','重度伤病'][i];}
  function courseText(c){return c.main.map(k=>E.names[k]).join('、')+'主练 · '+Object.entries(c.cost).map(([k,v])=>E.names[k]+'耐力 −'+v).join(' / ');}
  function mealText(m){return '耐力 +'+m.recovery+'（全身）｜疲劳 '+m.fatigue+'｜心情 '+(m.mood>0?'+':'')+m.mood+'｜体脂 '+(m.fat>0?'+':'')+m.fat+'%/日｜行动体力 +'+m.energy+'；体脂还会逐日向基础平衡回调';}
  function photoStyle(p){const d=p.muscles;return {'--chest':.9+Math.min(d.chest*.045,.65),'--back':.86+Math.min(d.back*.055,.78),'--shoulder':.9+Math.min(d.shoulders*.045,.52),'--arm':.88+Math.min(d.arms*.06,.83),'--trap':.86+Math.min(d.traps*.08,1.1),'--leg':.88+Math.min(d.legs*.05,.67),'--waist':.82+(Math.min(38,Math.max(10,p.fat))-10)/28*.43,'--hipLeft':'20%','--hipRight':'80%','--definition':Math.min(.9,Math.max(.08,(29-p.fat)/22))};}
  function photoHTML(p){return '<div class="photo"><span>'+(p.week?'第 '+p.week+' 周':'入馆照')+'</span><div class="avatar" style="'+Object.entries(photoStyle(p)).map(([k,v])=>k+':'+v).join(';')+'">'+avatarMarkup+'</div></div>';}
  function shape(p){const d=p.muscles,avg=Object.values(d).reduce((a,b)=>a+b,0)/6;if(d.traps>avg+2)return '斜方肌先上台';if(d.legs>avg+2)return '下盘是稳的';if(d.back>avg+1.5)return '背部开始撑衣服';if(d.arms>avg+2)return '袖口压力测试';return p.fat<=17?'线条正在营业':avg>=4?'训练痕迹成型':'新手的倔强';}
  function header(){
    $('cycleLabel').textContent='第 '+String(state.week).padStart(2,'0')+' / 48 周 · '+({planner:'周排程',daily:'按计划训练',summary:'周末复盘',complete:'养成档案'}[state.mode]);
    $('dayLabel').textContent=state.mode==='complete'?'48 周完成':state.mode==='planner'?'本周计划':'第 '+(Math.min(state.index,6)+1)+' 日';
    $('phaseLabel').textContent=E.phaseInfo?E.phaseInfo(state).name:'5 门课程 · 2 次活动';
    $('dots').innerHTML=Array.from({length:7},(_,i)=>'<i class="'+(i<state.index?'done':'')+'"></i>').join('');
    $('gameLayer').dataset.mode=state.mode;
    $('bodyBrief').innerHTML='<div class="brief-text"><b>疲劳 '+n(state.fatigue)+' · '+E.fatigueLabel(state.fatigue)+'　心情 '+n(state.mood)+' · '+E.moodLabel(state.mood)+'</b><small>'+h(advice())+'</small></div>';
    $('saveStatus').textContent=storageWarning||(state.migrationNote||'已自动保存 · 48 周档案');
  }
  function board(f,readonly=false){return '<div class="week-board seven-board" '+(!readonly?'id="planBoard"':'')+' aria-label="七日排程">'+f.rows.map((r,i)=>{
    const slot=state.plan.slots[i],c=item(slot),valid=r.result.ok,warn=r.result.warnings||[],main=slot?.kind==='course'?(E.getCourse?E.getCourse(r.before,slot):c):null;
    const stamina=main?main.main.map(k=>E.names[k]+' '+n(r.before.muscles[k].endurance)+'→'+n(r.result.courseAfter?.muscles[k].endurance??r.before.muscles[k].endurance)).join(' / '):slot?.id==='rest'?'全身耐力恢复':(slot?.targets||[]).map(k=>E.names[k]).join('、')+'恢复';
    return '<button type="button" id="'+(!readonly?'date-':'saved-date-')+i+'" class="week-row '+(active===i&&!readonly?'active ':'')+(!valid&&slot?'danger':warn.length?'warn':'')+'" data-action="date" data-id="'+i+'" '+(readonly?'disabled':'')+'><span class="week-day">'+(i+1)+'</span><span class="week-content"><b>'+(c?h(c.name)+(slot.level?' · '+(slot.level===1?'进阶':'专项'):''):'选择课程或活动')+'</b><small>'+h(slot?stamina:'点击安排当天内容')+'</small></span><span class="week-risk"><b>'+(r.uncertain?'暂估':slot&&!valid?'需调整':warn.length?'有风险':slot?'正常':'待安排')+'</b><small>'+(valid?'疲劳 '+n(r.result.after.fatigue):'')+'</small></span>'+(slot&&!valid?'<span class="repeat-hint">'+h(r.result.reason)+'</span>':warn.length?'<span class="repeat-hint">'+h(warn.join('；'))+'</span>':'')+'</button>';
    }).join('')+'</div>';}
  function forecastNotes(f){const end=f.settlement.after,dim=E.keys.reduce((a,k)=>a+end.muscles[k].dimension,0),weak=E.keys.slice().sort((a,b)=>end.muscles[a].dimension-end.muscles[b].dimension||end.muscles[a].xp-end.muscles[b].xp)[0];return '<div class="forecast-notes"><b>本周结束，预计会怎样？</b><ul>'+f.errors.map(e=>'<li class="danger-text">'+h(e)+'</li>').join('')+'<li>总维度 '+dim+'；预计弱项：'+E.names[weak]+'。'+(f.ok?'':'未安排和无效日期尚未计入。')+'</li><li>疲劳 '+n(end.fatigue)+' / '+E.fatigueLabel(end.fatigue)+'；心情 '+n(end.mood)+' / '+E.moodLabel(end.mood)+'。</li><li>'+E.keys.map(k=>E.names[k]+'耐力 '+n(end.muscles[k].endurance)+'/'+E.cap(end.muscles[k])+(end.muscles[k].injury?'（'+injuryLabel(end.muscles[k].injury)+'）':'')).join('；')+'。</li><li>维度提升 '+(f.settlement.dimensions.map(d=>E.names[d.key]+' '+d.from+'→'+d.to).join('、')||'尚未达到升级需求')+'。</li><li>伤病是确定后果，预览不含随机判定；课程解锁在周末生效。</li></ul></div>';}
  function slotEditor(f){
    const source=f.rows[active].before,slot=state.plan.slots[active],uncertain=f.rows[active].uncertain;
    if(swapMode)return '<p class="daily-note">'+(pendingSlot?'选择要调走的'+(pendingSlot.kind==='course'?'课程':'活动')+'日期，原安排将同时移入该日。':'选择与第 '+(active+1)+' 日互换的日期。')+'</p><div class="swap-list">'+state.plan.slots.map((s,i)=>i===active?'':btn('swap-to','第 '+(i+1)+' 日 · '+h(item(s)?.name||'未安排'),i,'event-option',!!pendingSlot&&s?.kind!==pendingSlot.kind)).join('')+'</div>';
    let html=(uncertain?'<p class="danger-text">前面的日期尚未有效，以下是暂估；请优先修复第一个问题。</p>':'')+'<div class="drawer-tabs">'+['撸铁','有氧','体育运动','活动'].map(t=>btn('category',t,t,'mini '+(category===t?'active':''))).join('')+'</div>';
    if(category!=='活动'){
      html+='<div class="drawer-courses">'+E.courses.filter(c=>c.type===category).map(c=>{
        if(!c.unlock(source))return '<div class="locked-option"><b>'+c.name+'</b><small>解锁：'+h(c.prereq)+'</small></div>';
        const levels=E.levels?E.levels(source,c):[0];
        return levels.map(level=>{const choice={kind:'course',id:c.id,level},actual=E.getCourse?E.getCourse(source,choice):c,r=E.simulate(source,choice,state.plan.meal);
          return btn('course','<b>'+h(actual.name)+'</b><span>'+h(courseText(actual))+'</span><em>'+h(r.ok?Object.entries(r.gains).map(([k,v])=>E.names[k]+' +'+v).join(' / '):r.reason)+'</em>'+(r.warnings?.length?'<span class="danger-text">'+h(r.warnings.join('；'))+'</span>':''),c.id+':'+level,'choice '+(slot?.id===c.id&&(slot.level||0)===level?'selected':''),!r.ok);
        }).join('');
      }).join('')+'</div>';
    }else{
      html+='<div class="drawer-courses">'+E.activities.map(a=>btn('activity','<b>'+a.name+'</b><span>'+a.text+'</span>',a.id,'choice '+(activityDraft?.id===a.id?'selected':''),a.id==='rehab'&&!E.keys.some(k=>source.muscles[k].injury>0))).join('')+'</div>';
      if(activityDraft&&activityDraft.id!=='rest')html+='<p class="daily-note">选择 1–2 个部位；行动体力 '+n(source.energy)+'</p><div class="target-grid">'+E.keys.map(k=>btn('target',E.names[k]+' '+n(source.muscles[k].endurance)+'/'+E.cap(source.muscles[k])+' · '+injuryLabel(source.muscles[k].injury),k,'mini '+(activityDraft.targets.includes(k)?'active':''),activityDraft.id==='rehab'&&!source.muscles[k].injury)).join('')+'</div>';
    }
    return html+'<div class="shortcuts">'+btn('swap','与另一日换位')+btn('clear','清空这一天',active,'mini',!slot)+'</div>';
  }
  function planner(){const f=E.forecast(state),riskN=f.errors.length+f.rows.filter(r=>r.result.warnings?.length).length,focus=E.focusProgress?E.focusProgress(state):null;
    return '<div class="screen-head compact-head"><h2>七日训练单</h2><span>'+f.courseN+'/5 课程 · '+f.activityN+'/2 活动</span></div>'+
    (focus?'<button class="focus-strip" data-action="focus-open"><b>'+h(focus.name)+'</b><span>'+h(focus.label)+'　›</span></button>':'')+
    board(f)+'<div class="plan-tools">'+btn('template-open','快速填入')+btn('meal-open',(E.meals.find(m=>m.id===state.plan.meal)||E.meals[0]).name+' ›')+btn('risk-open','风险 '+riskN+' 项 ›','','mini '+(riskN?'risk-button':''))+btn('undo','撤销','','mini',!undoPlan)+'</div>';
  }
  function feedback(){const r=state.lastFeedback;if(!r)return '';return '<section class="quick-feedback"><b>第 '+r.week+' 周 · 第 '+(r.index+1)+' 日 '+h(r.item)+'完成</b><p>'+r.changes.map(h).join('｜')+'</p><small>'+h(r.food)+' · 疲劳 '+n(r.fatigue)+' · 心情 '+n(r.mood)+'</small>'+(r.warnings.length?'<p class="danger-text">'+r.warnings.map(h).join('；')+'</p>':'')+'</section>';}
  function daily(){const slot=state.plan.slots[state.index],r=E.simulate(state,slot,state.plan.meal),c=r.item||E.getCourse(state,slot)||item(slot);return feedback()+'<div class="screen-head"><h2>第 '+(state.index+1)+' 日 · '+h(c?.name)+'</h2><p>'+h(slot?.kind==='course'?c?.type:'活动恢复')+'</p></div><section class="body-growth"><h3>执行前你会知道</h3><p>'+h(slot?.kind==='course'?courseText(c):c?.text)+'</p>'+tags(r.ok?[...Object.entries(r.gains).map(([k,v])=>E.names[k]+'成长 +'+v),'疲劳 '+n(state.fatigue)+'→'+n(r.after.fatigue),'心情 '+n(state.mood)+'→'+n(r.after.mood)]:[r.reason])+'<p>'+h(r.warnings.join('；')||'耐力条件允许，按计划执行。')+'</p><p class="daily-note">'+h((E.meals.find(m=>m.id===state.plan.meal)||E.meals[0]).name)+'在课程或活动后生效。成长值暂存，周末转化为维度与熟练度。</p></section><details class="plan-details"><summary>查看已确认的七日计划</summary>'+board(E.forecast({...state,...state.weekStart}),true)+'</details>';}
  function summary(){const s=state.summary;return feedback()+'<div class="screen-head"><h2>第 '+state.week+' 周结算</h2><p>这一周没有白来</p></div><section class="body-growth"><h3>肌肉维度</h3><p>'+(s.dimensions.map(x=>E.names[x.key]+' '+x.from+'→'+x.to).join('｜')||'成长值已保留，继续积累后升级。')+'</p><h3>课程熟练度</h3><p>'+(s.upgrades.map(x=>E.courses.find(c=>c.id===x.id).name+' '+x.from+'→'+x.to+'级').join('｜')||'有效课程次数已结算。')+'</p><h3>新开放的课程</h3><p>'+(s.newCourses.map(id=>E.courses.find(c=>c.id===id).name).join('、')||'前往课程页查看下一项解锁条件。')+'</p><h3>下周值得调整的地方</h3><p>'+h(advice())+'</p><p class="daily-note">下一周行动体力恢复至 '+E.config.energy+'；耐力、疲劳与伤病继续保留。</p></section>';}
  function stageReport(){const current=state.photos[state.photos.length-1],prev=state.photos[state.photos.length-2]||E.snapshot(E.initial(),0),growth=E.keys.slice().sort((a,b)=>(current.muscles[b]-prev.muscles[b])-(current.muscles[a]-prev.muscles[a]));return '<section class="stage-inline"><span class="sticker">第 '+state.pendingPhoto+' 周 · 阶段体检</span><h2>'+shape(current)+'</h2><div class="comparison">'+photoHTML(prev)+photoHTML(current)+'</div><p>变化最明显：'+growth.slice(0,2).map(k=>E.names[k]+'维度 +'+(current.muscles[k]-prev.muscles[k])).join('、')+'。</p><p>'+h(advice())+'</p><div class="phase-report"><b>'+h(state.focusHistory?.at(-1)?.name||'本期关注')+' · '+(state.focusHistory?.at(-1)?.complete?'已完成':'继续成长')+'</b><p>'+h(state.focusHistory?.at(-1)?.label||'阶段记录已保存')+'</p>'+(state.week<48?'<p>下一阶段：'+h(E.phaseInfo({...state,week:state.week+1}).name)+'；可选 '+E.focusChoices({...state,week:state.week+1}).map(x=>h(x.name)).join(' / ')+'。</p>':'')+'</div><p class="daily-note">外形每 8 周永久更新。第 17 周开放进阶、第 33 周开放专项，需满足课程熟练度与部位维度。</p></section>';}
  function advice(){const hurt=E.keys.filter(k=>state.muscles[k].injury>0);if(hurt.length)return '先安排康复处理'+hurt.map(k=>E.names[k]).join('、')+'，伤病不会随换周自动清除。';if(state.fatigue>=50)return '下周把完整休息插在高负荷课程之间，先恢复再练。';const weak=E.keys.slice().sort((a,b)=>state.muscles[a].dimension-state.muscles[b].dimension)[0];return '当前维度弱项：'+E.names[weak]+'。用周览检查补强是否会耗尽耐力。';}
  function endingCards(final=false){return E.endings(state).map(e=>'<article class="ending-card '+(e.eligible?'eligible':'')+' '+(state.selectedEnding===e.id?'chosen':'')+'"><b>'+e.name+(state.selectedEnding===e.id?' · 主档案':'')+'</b><p>'+(e.body?'✓':'○')+' 身体：'+e.bodyText+'</p><p>'+(e.path?'✓':'○')+' 路径：'+e.pathText+'</p>'+(final&&e.eligible?btn('ending',state.selectedEnding===e.id?'当前主档案':'选为主档案',e.id):'<small>'+(e.eligible?'当前条件已满足，完成 48 周后可选':'继续训练可争取')+'</small>')+'</article>').join('');}
  function complete(){return '<div class="screen-head"><h2>48 周 · 养成档案</h2><p>336 天的到场记录</p></div><p class="feedback">所有已达成的专精结局都可选择。训练与身体结果决定结局，展示不改变资格。</p>'+endingCards(true)+'<section class="body-growth"><h3>纪念展示 · 可选</h3><p>展示等级：'+(state.posePlayed?['','到场留念','稳稳亮相','聚光定格'][state.stage]:'尚未展示')+'</p>'+(poseRunning?'<div class="track"><div class="sweet"></div><div class="marker" id="poseMarker"></div></div>'+btn('pose-stop','定格这张照片','','action'):btn('pose-start',state.posePlayed?'纪念展示已完成':'拍一张姿势纪念照','','mini',state.posePlayed))+'<p class="daily-note">仅增加档案展示等级；不改变维度、伤病与发展结局。随时可以略过。</p></section>';}
  function library(){let out='<header class="tab-heading"><h2>课程手册</h2><p>有效次数在周末入账；3 / 8 / 15 次升至熟练度 1 / 2 / 3 级。</p></header>';for(const type of ['撸铁','有氧','体育运动'])out+='<h3 class="library-type">'+type+'</h3>'+E.courses.filter(c=>c.type===type).map(c=>{const open=c.unlock(state),times=E.count(state,c.id),level=E.mastery(times),actual=E.getCourse(state,{kind:'course',id:c.id,level:0})||c;return '<article class="course-entry '+(open?'':'locked')+'"><header><b>'+c.name+'</b><small>'+ (open?'已开放':'未开放')+' · '+level+' 级</small></header><p>'+courseText(actual)+'</p><p>基础成长：'+Object.entries(c.growth).map(([k,v])=>E.names[k]+' '+v).join(' / ')+'；疲劳 +'+c.fatigue+'，心情 '+(c.mood>0?'+':'')+c.mood+'，体脂 '+actual.fat+'%。</p><p>有效 '+times+' 次'+(state.pendingCounts[c.id]?'（本周待结算 +'+state.pendingCounts[c.id]+'）':'')+' · 当前成长 ×'+E.config.mastery[level]+'</p><small>解锁：'+c.prereq+'</small><p>可选强度：'+E.levels(state,c).map(l=>['基础','进阶','专项'][l]).join(' / ')+'</p>'+btn('library-schedule','安排到本周',c.id,'mini',!open||state.mode!=='planner')+'</article>';}).join('');$('libraryContent').innerHTML=out;}
  function body(){
    $('energy').textContent=n(state.energy);$('energyHint').textContent='只用于活动 · 每周回到60';$('fatigue').textContent=n(state.fatigue);$('fatigueHint').textContent=E.fatigueLabel(state.fatigue);$('mood').textContent=n(state.mood);$('moodHint').textContent=E.moodLabel(state.mood);$('fat').textContent=n(state.fat)+'%';$('fatHint').textContent='影响线条与发展结局';
    $('bodySummary').textContent=advice();$('muscleMeta').textContent='维度周结算 · 耐力逐日变化';
    $('muscles').innerHTML=E.keys.map(k=>{const m=state.muscles[k];return btn('muscle','<b>'+E.names[k]+' · '+m.dimension+'维</b><span>成长 '+n(m.xp)+' / '+E.requirement(m.dimension)+'<br>本周待结算 +'+n(state.pendingGrowth[k]||0)+'</span><span class="meter"><i style="width:'+Math.min(100,m.endurance/E.cap(m)*100)+'%"></i></span><span>耐力 '+n(m.endurance)+' / '+E.cap(m)+'<br>'+injuryLabel(m.injury)+'</span>',k,'muscle-button '+(focus===k?'active':''));}).join('');
    const p=state.photos.find(p=>p.week===viewPhoto)||state.photos[state.photos.length-1]||E.snapshot(E.initial(),0);Object.entries(photoStyle(p)).forEach(([k,v])=>$('avatar').style.setProperty(k,v));$('avatar').dataset.focus=focus||'';
    $('snapshotTag').textContent=p.week?'第 '+p.week+' 周':'入馆照';$('snapshotTitle').textContent=shape(p);$('snapshotSub').textContent='阶段留影 · 体脂 '+p.fat+'%';$('snapshotNote').textContent='实时数值在上方；永久外形每 8 周更新。';
    $('photoTabs').innerHTML=state.photos.map(p=>btn('photo',p.week?'第'+p.week+'周':'入馆照',p.week,'mini '+(viewPhoto===p.week?'active':''))).join('');
    $('bodyGrowth').innerHTML='<h3>肌肉成长怎么算？</h3><p>课程基础成长 × 熟练度 × 心情 × 疲劳 × 部位伤病；过度使用再 ×0.65。周末累计转化为维度。</p><p>维度需求 = 10 + 当前维度 ×4；每维度增加 6 点耐力上限。提高上限不会立即补满当前耐力。</p><p>进阶成长 ×1.35 / 耐力消耗 ×1.5；专项成长 ×1.65 / 消耗 ×2.2。基础强度持续可用。</p><h3>伤病与耐力</h3><p>耐力 ≥消耗：正常；消耗的一半 ≤耐力 &lt;消耗：过度使用；耐力 &lt;一半：无法训练。</p><p>伤病 1 级成长 ×0.8；2 级 ×0.55 且禁止作为撸铁主练；3 级禁止所有涉及课程。康复每次降低 1 级。</p>';
    $('badgeList').textContent='完成课程 '+Object.values(state.counts).reduce((a,b)=>a+b,0)+' 次 · 已结算 '+state.weeks.length+' 周 · 阶段纪念 '+(state.focusHistory||[]).filter(x=>x.complete).length+'/6';
    $('endingPreview').innerHTML='<h3>本阶段关注</h3><p>'+h(E.focusProgress(state).name)+' · '+h(E.focusProgress(state).label)+'</p><p class="daily-note">阶段纪念不限制发展结局；资格会根据当前身体重新判定。</p><h3>发展结局条件</h3>'+endingCards(false);
  }
  function logs(){ $('logCount').textContent=state.logs.length+' 天';$('logList').innerHTML=state.logs.slice(-60).reverse().map(r=>'<li><b>W'+r.week+' · D'+(r.index+1)+' '+h(r.item)+'</b><span>'+r.changes.map(h).join('；')+(r.warnings.length?'；'+r.warnings.map(h).join('；'):'')+'</span></li>').join('')||'<li>排好第一周，从第一门课程开始。</li>';$('cycleLogList').innerHTML=state.weeks.slice().reverse().map(w=>'<li><b>第 '+w.week+' 周</b><span>'+w.plan.slots.map(s=>item(s)?.name||'—').join(' / ')+'<br>维度提升：'+(w.dimensions.map(x=>E.names[x.key]+' +'+(x.to-x.from)).join('、')||'积累中')+'；新课：'+(w.newCourses.map(id=>E.courses.find(c=>c.id===id).name).join('、')||'无')+'</span></li>').join('')||'<li>周末会在这里留下完整计划。</li>'; }
  function dock(){let buttons='';
    if(state.pendingPhoto)buttons=btn('photo-close','收下第 '+state.pendingPhoto+' 周体检','','action');
    else if(state.mode==='planner')buttons=btn('review','检查并执行本周','','action');
    else if(state.mode==='daily')buttons=btn('fast','继续至本周末',state.week+':'+state.index,'action')+btn('execute','只执行今天',state.week+':'+state.index,'action secondary');
    else if(state.mode==='summary')buttons=btn('next-week','进入第 '+(state.week+1)+' 周 · 沿用计划','','action');
    else buttons=btn('tab','回看身体与阶段照','body','action');
    $('actionDock').innerHTML=buttons;$('actionDock').hidden=page!=='play';
  }
  function render(){
    const previousBoard=$('planBoard');if(previousBoard)boardScroll=previousBoard.scrollTop;
    header();$('screen').innerHTML=state.pendingPhoto?stageReport():state.mode==='planner'?planner():state.mode==='daily'?daily():state.mode==='summary'?summary():complete();
    library();body();logs();
    for(const [p,suffix] of Object.entries(pages)){$('page'+suffix).hidden=p!==page;$('tab'+suffix).classList.toggle('active',p===page);$('tab'+suffix).setAttribute('aria-selected',String(p===page));$('tab'+suffix).setAttribute('tabindex',p===page?'0':'-1');}
    $('endingPreview').hidden=growthView!=='goals';$('libraryContent').hidden=growthView!=='courses';$('growthLogs').hidden=growthView!=='logs';
    $('growthTabs').innerHTML=[['goals','结局与阶段'],['courses','课程手册'],['logs','训练记录']].map(([id,text])=>btn('growth-view',text,id,'mini '+(growthView===id?'active':''))).join('');
    dock();renderSheet();const board=$('planBoard');if(board)board.scrollTop=boardScroll;if(focusReturn&&!drawer){const target=page==='play'&&state.mode==='planner'?$('date-'+active):$('tab'+pages[page]);target?.focus();focusReturn=false;}save();
  }
  function switchPage(next){if(!pages[next])return;scrolls[page]=$('page'+pages[page]).scrollTop;page=next;render();$('page'+pages[page]).scrollTop=scrolls[page];}
  function resetScroll(){scrolls.play=0;$('pagePlay').scrollTop=0;}
  function poseTick(now){if(!poseRunning)return;posePosition=(Math.sin((now-poseStart)/420)+1)*50;const marker=$('poseMarker');if(marker)marker.style.left=posePosition+'%';poseFrame=requestAnimationFrame(poseTick);}
  function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='铁馆-48周-第'+state.week+'周.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  function checkpoint(){undoPlan=E.copy(state.plan);}
  function putSlot(next){
    const old=state.plan.slots[active],max=next.kind==='course'?5:2,count=state.plan.slots.filter((s,i)=>i!==active&&s?.kind===next.kind).length;
    if(count>=max){pendingSlot=next;swapMode=true;drawer='date';render();return;}
    checkpoint();state.plan.slots[active]=next;closeSheet();render();
  }
  function openDate(i){active=i;drawer='date';swapMode=false;pendingSlot=null;activityDraft=null;category=state.plan.slots[i]?.kind==='activity'?'活动':item(state.plan.slots[i])?.type||'撸铁';render();$('sheetClose').focus();}
  function closeSheet(){drawer=null;swapMode=false;pendingSlot=null;activityDraft=null;sheetKey='';focusReturn=true;$('gameLayer').inert=false;}
  function sheetContent(){
    if(drawer==='date')return slotEditor(E.forecast(state));
    if(drawer==='meal')return '<p class="daily-note">只调整本周餐食，不占课程或活动位。</p><div class="drawer-courses">'+E.meals.map(m=>btn('meal','<b>'+m.name+'</b><span>'+mealText(m)+'</span>',m.id,'choice '+(m.id===state.plan.meal?'selected':''))).join('')+'</div>';
    if(drawer==='templates')return '<p class="daily-note">填入的是可修改初稿。课程强度、恢复和本期关注都会影响建议。</p><div class="drawer-courses">'+[['classic','比例初稿'],['mass','增肌初稿'],['lean','线条初稿'],['sport','运动初稿']].map(([id,name])=>btn('template',name,id,'event-option')).join('')+btn('reuse','沿用上周','','event-option',!state.lastPlan)+'</div>';
    if(drawer==='focus')return E.focusChoices?'<p class="daily-note">关注方向影响建议与阶段纪念，不限制训练或结局。每个阶段首周可调整。</p>'+E.focusChoices(state).map(x=>btn('focus','<b>'+x.name+'</b><span>'+x.text+'</span>',x.id,'event-option',!E.canChooseFocus(state))).join(''):'';
    const f=E.forecast(state);return '<div class="risk-list">'+f.rows.map((r,i)=>!r.result.ok||r.result.warnings.length?btn('date','<b>第 '+(i+1)+' 日 · '+h(item(state.plan.slots[i])?.name||'待安排')+'</b><span>'+h(r.result.ok?r.result.warnings.join('；'):r.result.reason)+(r.uncertain?'（暂估）':'')+'</span>',i,'event-option'):'').join('')+'</div>'+forecastNotes(f);
  }
  function renderSheet(){
    $('sheet').hidden=!drawer;$('gameLayer').inert=!!drawer;
    if(!drawer)return;
    $('sheetTitle').textContent=drawer==='date'?(swapMode?'调整日期位置':'第 '+(active+1)+' 日 · 选择安排'):({meal:'本周餐食',templates:'快速填入课表',focus:'本阶段关注方向',risk:'检查七日计划',review:'确认本周计划'}[drawer]);
    const nextKey=drawer+':'+active+':'+category+':'+swapMode;$('sheetContent').innerHTML=sheetContent();if(sheetKey!==nextKey)$('sheetContent').scrollTop=0;sheetKey=nextKey;if(document.activeElement&&!$('sheet').contains?.(document.activeElement))$('sheetClose').focus();
    $('sheetNav').innerHTML=drawer==='date'&&!swapMode?btn('drawer-date','上一日',Math.max(0,active-1),'mini',active===0)+btn('drawer-date','下一日',Math.min(6,active+1),'mini',active===6):'';
    let actions='';
    if(drawer==='date'&&activityDraft&&!swapMode)actions=btn('activity-confirm','安排到第 '+(active+1)+' 日','','action',activityDraft.targets.length<1);
    if(drawer==='review'){const f=E.forecast(state);actions=btn('start-fast',f.ok?'确认并执行本周':'请先调整课表',state.week+':plan','action',!f.ok)+btn('start','逐日查看','','mini',!f.ok);}
    $('sheetActions').innerHTML=actions;$('sheetActions').hidden=!actions;
  }
  function runWeek(token){
    if(state.mode!=='daily'||token!==state.week+':'+state.index)return;
    if(E.advanceWeek){const result=E.advanceWeek(state,token,{pauseOnThreshold:false});if(result.stopped)toast(result.stopped);}
    else while(state.mode==='daily'&&!state.pendingPhoto){const r=E.execute(state,state.week+':'+state.index);if(!r?.ok)break;}
    resetScroll();
  }

  function action(name,id){
    if(name==='tab'){closeSheet();switchPage(id==='library'?'growth':id==='log'?'growth':id);return;}
    if(name==='export'){exportSave();return;}
    if(name==='reset'){if(!confirm('开启新的 48 周档案将替换当前 V2 进度。旧版 V1 存档不受影响。确定重开？'))return;state=E.initial();state.photos=[E.snapshot(state,0)];storageWarning='';poseRunning=false;cancelAnimationFrame(poseFrame);page='play';active=0;review=false;viewPhoto=null;undoPlan=null;drawer=null;boardScroll=0;resetScroll();render();return;}
    if(name==='photo'){viewPhoto=Number(id);render();return;}
    if(name==='muscle'){focus=focus===id?null:id;render();return;}
    if(name==='photo-close'&&state.pendingPhoto){state.pendingPhoto=null;resetScroll();render();return;}
    if(name==='growth-view'){growthView=id;render();return;}
    if(state.pendingPhoto)return;
    if(name==='execute'){const r=E.execute(state,id);if(r&&!r.ok)toast(r.reason);if(r?.ok)resetScroll();render();return;}
    if(name==='next-week'){if(E.nextWeek(state)){review=false;active=0;undoPlan=null;boardScroll=0;resetScroll();}render();return;}
    if(name==='ending'&&state.mode==='complete'){if(E.endings(state).some(e=>e.id===id&&e.eligible))state.selectedEnding=id;render();return;}
    if(name==='pose-start'&&state.mode==='complete'&&!state.posePlayed&&!poseRunning){poseRunning=true;poseStart=performance.now();render();poseFrame=requestAnimationFrame(poseTick);return;}
    if(name==='pose-stop'&&poseRunning&&state.mode==='complete'&&!state.posePlayed){poseRunning=false;cancelAnimationFrame(poseFrame);state.stage=Math.abs(posePosition-50)<10?3:Math.abs(posePosition-50)<25?2:1;state.posePlayed=true;render();return;}

    if(name==='growth-view'){growthView=id;render();return;}
    if(name==='library-schedule'){if(state.mode==='planner'){page='play';const c=E.courses.find(c=>c.id===id);openDate(active);if(c)category=c.type;render();}return;}
    if(name==='sheet-close'){closeSheet();render();return;}
    if(name==='fast'){runWeek(id);render();return;}
    if(name==='start-fast'){if(id===state.week+':plan'&&E.startWeek(state)){closeSheet();runWeek(state.week+':'+state.index);}render();return;}
    if(state.mode!=='planner')return;
    if(name==='date'||name==='drawer-date'){const i=Number(id);if(Number.isInteger(i)&&i>=0&&i<7)openDate(i);return;}
    if(name==='course'){const [key,levelText]=String(id).split(':'),choice={kind:'course',id:key,level:Number(levelText||0)},r=E.simulate(E.forecast(state).rows[active].before,choice,state.plan.meal);if(r.ok)putSlot(choice);return;}
    if(name==='activity'){const a=E.activities.find(x=>x.id===id);if(!a)return;if(id==='rest'){putSlot({kind:'activity',id,targets:[]});return;}const source=E.forecast(state).rows[active].before,candidates=E.keys.filter(k=>id!=='rehab'||source.muscles[k].injury>0).sort((a,b)=>source.muscles[a].endurance/E.cap(source.muscles[a])-source.muscles[b].endurance/E.cap(source.muscles[b]));activityDraft={kind:'activity',id,targets:candidates.slice(0,2)};category='活动';}
    if(name==='target'&&activityDraft&&E.keys.includes(id)){const source=E.forecast(state).rows[active].before;if(activityDraft.id==='rehab'&&!source.muscles[id].injury)return;if(activityDraft.targets.includes(id))activityDraft.targets=activityDraft.targets.filter(k=>k!==id);else if(activityDraft.targets.length<2)activityDraft.targets.push(id);else toast('最多两个部位，请先取消一个。');}
    if(name==='activity-confirm'&&activityDraft){const r=E.simulate(E.forecast(state).rows[active].before,activityDraft,state.plan.meal);if(r.ok){putSlot(E.copy(activityDraft));return;}toast(r.reason);}
    if(name==='swap'){swapMode=true;pendingSlot=null;}
    if(name==='swap-to'){const i=Number(id),old=state.plan.slots[active];if(Number.isInteger(i)&&i>=0&&i<7&&i!==active&&(!pendingSlot||state.plan.slots[i]?.kind===pendingSlot.kind)){checkpoint();state.plan.slots[active]=pendingSlot||state.plan.slots[i];state.plan.slots[i]=old;closeSheet();}}
    if(name==='clear'){checkpoint();state.plan.slots[active]=null;closeSheet();}
    if(name==='undo'&&undoPlan){state.plan=undoPlan;undoPlan=null;}
    if(name==='category'){category=id;activityDraft=null;}
    if(name==='meal-open')drawer='meal';
    if(name==='template-open')drawer='templates';
    if(name==='risk-open')drawer='risk';
    if(name==='focus-open')drawer='focus';
    if(name==='focus'&&E.setFocus){E.setFocus(state,id);closeSheet();}
    if(name==='meal'&&E.meals.some(m=>m.id===id)){checkpoint();state.plan.meal=id;if(drawer==='meal')closeSheet();}
    if(name==='template'&&['classic','mass','lean','sport'].includes(id)){const p=E.autoPlan(state,id);if(p){checkpoint();state.plan=p;state.preferredRoute=id;active=0;boardScroll=0;const board=$('planBoard');if(board)board.scrollTop=0;closeSheet();}else toast('恢复条件不足，请先安排康复与休息。');}
    if(name==='reuse'&&state.lastPlan){checkpoint();state.plan=E.copy(state.lastPlan);active=0;closeSheet();}
    if(name==='review')drawer='review';
    if(name==='start'&&E.startWeek(state)){closeSheet();resetScroll();}

    render();
  }
  document.addEventListener('click',e=>{const t=e.target.closest('[data-action]');if(t&&!t.disabled)action(t.dataset.action,t.dataset.id);});
  document.addEventListener('keydown',e=>{if(drawer){if(e.key==='Escape'){e.preventDefault();closeSheet();render();}else if(e.key==='Tab'){const nodes=$('sheet').querySelectorAll?.('button:not([disabled])');if(nodes?.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}return;}if(!e.target.closest?.('[role="tab"]'))return;const list=Object.keys(pages),i=list.indexOf(page),next=e.key==='ArrowRight'?list[(i+1)%3]:e.key==='ArrowLeft'?list[(i+2)%3]:e.key==='Home'?list[0]:e.key==='End'?list[2]:null;if(next){e.preventDefault();switchPage(next);$('tab'+pages[next]).focus();}});
  $('sheetClose').addEventListener('click',()=>{closeSheet();render();});
  $('sheetBackdrop').addEventListener('click',()=>{closeSheet();render();});
  $('reset').addEventListener('click',()=>action('reset'));
  render();
  // Test harness injects its adapter at this marker without exposing mutable state in the game.
})();
