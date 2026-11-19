(function(){
  'use strict';
  const E=globalThis.IronV2,KEY='iron48-v2', $=id=>document.getElementById(id),h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),n=E.round;
  let storageWarning='',state=load(),page='play',active=0,viewPhoto=null,focus=null,poseRunning=false,poseFrame=0,poseStart=0,posePosition=0,drawer=null,category='撸铁',activityDraft=null,pendingSlot=null,swapMode=false,undoPlan=null,boardScroll=0,sheetKey='',focusReturn=false,growthView='goals',assessmentDraft=null,libraryDraft=null,libraryDate=null;
  const scrolls={play:0,body:0,growth:0},pages={play:'Play',body:'Body',growth:'Log'};
  const avatarMarkup=$('avatar').innerHTML;
  function valid(s){
    const counts=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.entries(x).every(([k,v])=>E.courses.some(c=>c.id===k)&&Number.isInteger(v)&&v>=0);
    const slots=x=>Array.isArray(x)&&x.length===7&&x.every(slot=>slot===null||(slot?.kind==='course'?E.courses.some(c=>c.id===slot.id):slot?.kind==='activity'&&E.activities.some(a=>a.id===slot.id)&&Array.isArray(slot.targets)&&slot.targets.length<=2&&slot.targets.every(k=>E.keys.includes(k))));
    return s&&[2,3,4].includes(s.version)&&Number.isInteger(s.week)&&s.week>=1&&s.week<=48&&Number.isInteger(s.index)&&s.index>=0&&s.index<=7&&['planner','daily','summary','complete'].includes(s.mode)&&!(s.mode==='daily'&&s.index>=7)&&!(s.mode==='complete'&&(s.week!==48||s.index!==7))&&E.keys.every(k=>{const m=s.muscles?.[k];return m&&['dimension','xp','endurance','injury'].every(x=>Number.isFinite(m[x]))&&Number.isInteger(m.dimension)&&Number.isInteger(m.injury)&&m.dimension>=0&&m.xp>=0&&m.endurance>=0&&m.injury>=0&&m.injury<=3;})&&['energy','fatigue','mood','fat','stage'].every(k=>Number.isFinite(s[k]))&&slots(s.plan?.slots)&&E.meals.some(m=>m.id===s.plan.meal)&&Array.isArray(s.logs)&&s.logs.every(r=>Array.isArray(r.changes)&&Array.isArray(r.warnings))&&Array.isArray(s.weeks)&&s.weeks.every(w=>slots(w.plan?.slots)&&Array.isArray(w.dimensions)&&Array.isArray(w.newCourses))&&Array.isArray(s.photos)&&s.photos.every(p=>Number.isFinite(p.week)&&Number.isFinite(p.fat)&&E.keys.every(k=>Number.isFinite(p.muscles?.[k])))&&counts(s.counts)&&counts(s.pendingCounts)&&E.keys.every(k=>Number.isFinite(s.pendingGrowth?.[k]))&&(!s.lastFeedback||(Array.isArray(s.lastFeedback.changes)&&Array.isArray(s.lastFeedback.warnings)))&&(!['summary','complete'].includes(s.mode)||(s.summary&&Array.isArray(s.summary.dimensions)&&Array.isArray(s.summary.upgrades)&&Array.isArray(s.summary.newCourses)));
  }
  function load(){try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(valid(s))return migrate(s,raw);storageWarning='存档内容不完整，已进入临时新档；原存档未覆盖。';}}catch(e){storageWarning='无法读取本地存档。本次可继续试玩，但暂不能保证刷新后保留。';}const s=E.initial();s.photos=[E.snapshot(s,0)];return s;}

  function migrate(s,raw){
    const old=s.version;
    if(old<4){try{if(!localStorage.getItem('iron48-before-v3'))localStorage.setItem('iron48-before-v3',raw);}catch(e){}
      s.version=4;s.rules=s.mode==='daily'?(old===2?2:3):4;s.trainingRoute='balanced';s.profileConfirmed=true;s.seed=7;s.restUsed=0;s.recoveryBuffs={};s.weekChoice=null;s.validationUnlocks={};s.assessment=null;s.retryEnrollment=null;s.retryOffer=null;s.validationHistory=[];s.pendingAssessments=[];
      E.keys.forEach(k=>{const m=s.muscles[k];m.role=m.role||'normal';m.capBonus=m.capBonus||0;m.weakBreakthrough=!!m.weakBreakthrough;});
      s.logs.forEach(l=>{const c=E.courses.find(c=>l.item===c.name||l.item?.startsWith(c.name+' ·'));l.id=l.id||c?.id||null;l.type=l.type||c?.type||'活动';l.level=l.level||0;});
      if(s.weekStart){s.weekStart.week=s.week;s.weekStart.rules=s.rules;s.weekStart.advancedCounts=s.weekStart.advancedCounts||{};}
      s.migrationNote=s.rules<4?'旧档未完周沿用原规则，下周启用 V3；体质保持原样。':'旧档已保留，V3 验证从当前四周周期开始，不追溯判定旧周。';
    }
    s.rules=s.rules||4;s.advancedCounts=s.advancedCounts||{};s.focusHistory=s.focusHistory||[];E.prepareWeek(s);E.ensureFocus(s);
    if(s.mode==='complete'&&!E.endings(s).some(e=>e.id===s.selectedEnding&&e.eligible))s.selectedEnding=E.endings(s).find(e=>e.eligible).id;return s;
  }
  function save(){if(storageWarning)return;try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='已自动保存';}catch(e){storageWarning='保存失败：请保持此页面开启，并导出档案备份。';$('saveStatus').textContent=storageWarning;}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600);}
  function btn(action,text,id='',cls='mini',disabled=false){return '<button type="button" class="'+cls+'" data-action="'+action+'" data-id="'+h(id)+'" '+(disabled?'disabled':'')+'>'+text+'</button>';}
  function item(slot){return slot?(slot.kind==='course'?E.courses:E.activities).find(x=>x.id===slot.id):null;}
  function tags(parts){return '<div class="effects">'+parts.map(t=>'<span class="effect">'+h(t)+'</span>').join('')+'</div>';}
  function injuryLabel(i){return ['健康','轻度伤病','中度伤病','重度伤病'][i];}
  function courseText(c){return c.main.map(k=>E.names[k]).join('、')+'主练 · '+Object.entries(c.cost).map(([k,v])=>E.names[k]+'耐力 −'+v).join(' / ');}
  function mealText(m){return '耐力 +'+m.recovery+'（全身）｜疲劳 '+m.fatigue+'｜心情 '+(m.mood>0?'+':'')+m.mood+'｜体脂 '+(m.fat>0?'+':'')+m.fat+'%/日｜行动体力 +'+m.energy+'；体脂还会逐日向基础平衡回调';}

  function bounded(v){return n(Math.max(0,Math.min(100,v)));}
  function delta(v){return (v>0?'+':'')+n(v);}
  function buffValue(v){return typeof v==='number'?v:v?1.1:1;}
  function liveAssessment(booking=state.assessment){
    const a=E.assessmentProgress(state,booking);if(!a)return a;
    if(Object.values(state.pendingCounts).some(Boolean)||Object.values(state.pendingGrowth).some(Boolean)){
      const settled=E.assessmentProgress(E.settle(E.model(state),state.week).after,booking);
      a.rows=a.rows.map(r=>{const x=settled.rows.find(x=>x.key===r.key);return x&&r.direction!=='max'&&x.value>r.value?{...r,pending:n(x.value-r.value),pendingPassed:x.passed}:r;});
    }return a;
  }
  function courseEffects(source,choice){
    const r=E.simulate(source,choice,state.plan.meal);if(!r.ok)return '<p class="danger-text">'+h(r.reason)+'</p>';
    const buffs=Object.keys(r.gains).filter(k=>source.recoveryBuffs?.[k]);
    return '<em>'+h(Object.entries(r.gains).map(([k,v])=>E.names[k]+'成长 +'+v).join('｜'))+'</em><span>疲劳 '+delta(bounded(r.courseAfter.fatigue)-source.fatigue)+'｜心情 '+delta(bounded(r.courseAfter.mood)-source.mood)+'｜体脂 '+delta(r.item.fat)+'%</span>'+(buffs.length?'<span class="buff-note">本次使用：'+h(buffs.map(k=>E.names[k]+'状态 +'+n((buffValue(source.recoveryBuffs[k])-1)*100)+'%'+(!r.item.main.includes(k)?'（辅助刺激）':'')).join('、'))+'；使用后消耗。</span>':'')+(r.warnings.length?'<span class="danger-text">'+r.warnings.map(h).join('；')+'</span>':'');
  }
  function recoveryPreview(source,choice){
    const a=E.activities.find(a=>a.id===choice.id),r=E.simulate(source,choice,state.plan.meal);
    if(!r.ok)return '<section class="recovery-preview"><p class="danger-text">'+h(r.reason)+'</p></section>';
    const targets=a.targets?choice.targets:E.keys,changed=targets.map(k=>({k,gain:n(r.courseAfter.muscles[k].endurance-source.muscles[k].endurance)})),nominal=a.recovery*(a.id==='rest'&&source.restUsed>=1?.6:1);
    return '<section class="recovery-preview"><b>这次'+h(a.name)+'的效果</b><p>行动体力 '+n(source.energy)+' → '+n(r.courseAfter.energy)+'｜疲劳 '+n(source.fatigue)+' → '+bounded(r.courseAfter.fatigue)+'｜心情 '+n(source.mood)+' → '+bounded(r.courseAfter.mood)+'</p><div class="recovery-parts">'+changed.map(({k,gain})=>'<p>'+E.names[k]+'耐力 '+n(source.muscles[k].endurance)+' → '+n(r.courseAfter.muscles[k].endurance)+' / '+E.cap(source.muscles[k])+'（实得 +'+gain+(gain<nominal?'，达到上限':'')+'）'+(a.repair?'；伤病 '+source.muscles[k].injury+' → '+r.courseAfter.muscles[k].injury:'')+'</p>').join('')+'</div>'+(a.buff?'<p class="buff-note">'+choice.targets.map(k=>E.names[k]+'下次成长 +'+n((buffValue(r.courseAfter.recoveryBuffs[k])-1)*100)+'%').join('、')+'。主练或辅助刺激都会使用一次；已有更高加成会保留。</p>':'')+(r.warnings.length?'<p class="danger-text">'+r.warnings.map(h).join('；')+'</p>':'')+'<small>以上是活动本身的效果；当天餐食随后另行生效。</small></section>';
  }

  function photoStyle(p){const d=p.muscles;return {'--chest':.9+Math.min(d.chest*.045,.65),'--back':.86+Math.min(d.back*.055,.78),'--shoulder':.9+Math.min(d.shoulders*.045,.52),'--arm':.88+Math.min(d.arms*.06,.83),'--trap':.86+Math.min(d.traps*.08,1.1),'--leg':.88+Math.min(d.legs*.05,.67),'--waist':.82+(Math.min(38,Math.max(10,p.fat))-10)/28*.43,'--hipLeft':'20%','--hipRight':'80%','--definition':Math.min(.9,Math.max(.08,(29-p.fat)/22))};}
  function photoHTML(p){return '<div class="photo"><span>'+(p.week?'第 '+p.week+' 周':'入馆照')+'</span><div class="avatar" style="'+Object.entries(photoStyle(p)).map(([k,v])=>k+':'+v).join(';')+'">'+avatarMarkup+'</div></div>';}
  function shape(p){const d=p.muscles,avg=Object.values(d).reduce((a,b)=>a+b,0)/6;if(d.traps>avg+2)return '斜方肌先上台';if(d.legs>avg+2)return '下盘是稳的';if(d.back>avg+1.5)return '背部开始撑衣服';if(d.arms>avg+2)return '袖口压力测试';return p.fat<=17?'线条正在营业':avg>=4?'训练痕迹成型':'新手的倔强';}
  function header(){
    $('cycleLabel').textContent='第 '+String(state.week).padStart(2,'0')+' / 48 周 · '+({planner:'周排程',daily:'按计划训练',summary:'周末复盘',complete:'养成档案'}[state.mode]);
    $('dayLabel').textContent=state.mode==='complete'?'48 周完成':state.mode==='planner'?'本周计划':'第 '+(Math.min(state.index,6)+1)+' 日';
    $('phaseLabel').textContent='第 '+Math.ceil(state.week/4)+' 个四周周期';
    $('dots').innerHTML=Array.from({length:7},(_,i)=>'<i class="'+(i<state.index?'done':'')+'"></i>').join('');
    $('gameLayer').dataset.mode=state.mode;
    $('bodyBrief').innerHTML='<div class="brief-text"><b>'+({strong:'发展强项',weak:'克服弱项',balanced:'均衡发展'}[state.trainingRoute]||'均衡发展')+' · 疲劳 '+n(state.fatigue)+' · '+E.fatigueLabel(state.fatigue,state.rules)+'　心情 '+n(state.mood)+' · '+E.moodLabel(state.mood)+' · 行动力 '+n(state.energy)+'</b><small>'+h(advice())+'</small></div>';
    $('saveStatus').textContent=storageWarning||(state.migrationNote||'已自动保存 · 48 周档案');
  }
  function board(f,readonly=false){return '<div class="week-board seven-board" '+(!readonly?'id="planBoard"':'')+' aria-label="七日排程">'+f.rows.map((r,i)=>{
    const slot=state.plan.slots[i],c=item(slot),bad=slot&&!r.result.ok,hurt=r.result.risk?.overused||[],buffs=slot?.kind==='course'?Object.keys(r.result.gains||{}).filter(k=>r.before.recoveryBuffs?.[k]):[];
    const text=slot?.kind==='course'?(c.type+' · 主练 '+c.main.map(k=>E.names[k]).join('、')+(Object.keys(c.cost).some(k=>!c.main.includes(k))?' · 辅助 '+Object.keys(c.cost).filter(k=>!c.main.includes(k)).map(k=>E.names[k]).join('、'):'')):slot?(slot.id==='rest'?'全身恢复':(slot.targets||[]).map(k=>E.names[k]).join('、')+' · '+(c.energy?'消耗行动体力':'恢复心情')):'点击选择课程或活动';
    const note=bad?r.result.reason:hurt.length?hurt.map(k=>E.names[k]).join('、')+'耐力不足，会新增伤病':buffs.length?'使用'+buffs.map(k=>E.names[k]).join('、')+'专项状态':slot?.id==='rest'&&r.before.restUsed>=1?'本周第二次休息，效果减弱':'';
    return '<button type="button" id="'+(!readonly?'date-':'saved-date-')+i+'" class="week-row '+(active===i&&!readonly?'active ':'')+(bad?'danger':hurt.length?'warn':'')+'" data-action="date" data-id="'+i+'" '+(readonly?'disabled':'')+'><span class="week-day">'+(i+1)+'</span><span class="week-content"><b>'+(c?h(c.name)+(slot.level?' · '+(slot.level===1?'进阶':'专项'):'')+(slot.tech?' · 技术版':''):'选择安排')+'</b><small>'+h(text)+'</small></span><span class="week-risk"><b>'+(bad?'需调整':hurt.length?'过度使用':buffs.length?'专项状态':slot?.kind==='activity'?'活动':slot?'课程':'待安排')+'</b></span>'+(note?'<span class="repeat-hint">'+h(note)+'</span>':'')+'</button>';
  }).join('')+'</div>';}

  function slotEditor(f){
    const source=f.rows[active].before,slot=state.plan.slots[active];
    if(swapMode)return '<p class="daily-note">'+(pendingSlot?'本周'+(pendingSlot.kind==='course'?'课程':'活动')+'已排满，选择要替换的日期；该日将接收原安排。':'选择与第 '+(active+1)+' 日互换的日期。')+'</p><div class="swap-list">'+state.plan.slots.map((s,i)=>i===active?'':btn('swap-to','第 '+(i+1)+' 日 · '+h(item(s)?.name||'未安排'),i,'event-option',!!pendingSlot&&s?.kind!==pendingSlot.kind)).join('')+'</div>';
    let html=(f.rows[active].uncertain?'<p class="danger-text">前面还有未完成的安排，本日效果可能随之改变。</p>':'')+'<div class="drawer-tabs">'+['撸铁','有氧','体育运动','活动'].map(t=>btn('category',t,t,'mini '+(category===t?'active':''))).join('')+'</div>';
    if(category!=='活动'){
      html+='<div class="drawer-courses">'+E.courses.filter(c=>c.type===category).map(c=>{
        if(!c.unlock(source))return '<div class="locked-option"><b>'+c.name+'</b><small>解锁：'+h(c.prereq)+'</small></div>';
        return E.levels(source,c).flatMap(level=>E.weekCondition(source).id==='crowded'&&c.id==='bench'?[{level,tech:false},{level,tech:true}]:[{level,tech:false}]).map(({level,tech})=>{
          const choice={kind:'course',id:c.id,level,tech},actual=E.getCourse(source,choice),r=E.simulate(source,choice,state.plan.meal),pending=state.pendingCounts[c.id]||0;
          return btn('course','<b>'+h(actual.name)+'</b><span>'+h(courseText(actual))+'</span>'+courseEffects(source,choice)+'<span>'+h(c.main.map(k=>E.names[k]+'成长 '+n(state.muscles[k].xp)+'/'+E.requirement(state.muscles[k].dimension)+(state.pendingGrowth[k]?'，本周待结算 +'+n(state.pendingGrowth[k]):'')).join('｜'))+'</span><span>'+h(E.coursePurpose(state,c))+(pending?'；本周待结算 +'+pending+' 次':'')+'</span>',c.id+':'+level+(tech?':tech':''),'choice '+(slot?.id===c.id&&(slot.level||0)===level&&!!slot.tech===tech?'selected':''),!r.ok);
        }).join('');
      }).join('')+'</div>';
    }else if(activityDraft){
      const a=E.activities.find(a=>a.id===activityDraft.id);
      html+=btn('activity-back','‹ 换个活动')+'<h3>'+h(a.name)+'</h3><p class="daily-note">'+h(a.text)+'</p>';
      if(a.targets)html+='<p class="daily-note">选择 '+(a.targets===1?'1':'1–2')+' 个部位</p><div class="target-grid">'+E.keys.map(k=>btn('target',E.names[k]+' '+n(source.muscles[k].endurance)+'/'+E.cap(source.muscles[k])+' · '+injuryLabel(source.muscles[k].injury),k,'mini '+(activityDraft.targets.includes(k)?'active':''),(a.id==='rehab'&&!source.muscles[k].injury)||(a.weakOnly&&source.muscles[k].role!=='weak'))).join('')+'</div>';
      html+=recoveryPreview(source,activityDraft);
    }else{
      html+='<p class="daily-note">行动体力 '+n(source.energy)+'；选择活动后查看本次效果。</p><div class="drawer-courses">'+E.activities.filter(a=>E.activityAvailable(source,a)).map(a=>btn('activity','<b>'+a.name+'</b><span>'+a.text+'</span>'+(a.id==='rest'&&source.restUsed>=1?'<span class="danger-text">本周再次休息，效果为 60%。</span>':''),a.id,'choice',(a.id==='rehab'&&!E.keys.some(k=>source.muscles[k].injury>0))||source.energy<a.energy)).join('')+'</div>';
    }
    return html+'<div class="shortcuts">'+btn('swap','与另一日换位')+btn('clear','清空这一天',active,'mini',!slot)+'</div>';
  }

  function planner(){
    const p=E.profile(state),a=liveAssessment(),condition=E.weekCondition(state);
    if(!state.profileConfirmed)return '<section class="welcome"><span class="sticker">从第一周开始</span><h2>这次想怎么练？</h2><p>强项：'+h(E.names[p.strong]||'中性')+'，成长 +15%、耐力上限 +8。<br>弱项：'+h(E.names[p.weak]||'中性')+'，耐力上限 −8、消耗 +10%；首次升至 1 维后上限额外 +10。</p>'+[['strong','发展强项','更早取得专项成绩，接受比例差距。'],['weak','克服弱项','安排局部恢复，争取第一次弱项突破。'],['balanced','均衡发展','分散刺激，准备综合力量和比例验证。']].map(([id,name,text])=>btn('training-route','<b>'+name+'</b><span>'+text+'</span>',id,'event-option')).join('')+btn('roll-profile','换一组体质')+'<p class="daily-note">培养方式不锁死课程或结局；第 4 周进行首次验证。</p></section>';
    const f=E.forecast(state);
    return '<div class="screen-head compact-head"><h2>七日训练单</h2><span>'+f.courseN+'/5 课程 · '+f.activityN+'/2 活动</span></div><button class="focus-strip" data-action="assessment-open"><b>第 '+a.dueWeek+' 周 · '+h(a.name)+'</b><span>'+a.rows.filter(r=>r.passed).length+'/'+a.rows.length+' 项达标 · 查看条件 ›</span></button><button class="condition-strip" data-action="week-open"><b>'+h(condition.name)+'</b><span>'+h(condition.text)+' ›</span></button>'+board(f)+'<div class="plan-tools">'+btn('meal-open',(E.meals.find(m=>m.id===state.plan.meal)||E.meals[0]).name+' ›')+btn('undo','撤销上次调整','','mini',!undoPlan)+'</div>';
  }

  function feedback(){const r=state.lastFeedback;if(!r)return '';return '<section class="quick-feedback"><b>第 '+r.week+' 周 · 第 '+(r.index+1)+' 日 '+h(r.item)+'完成</b><p>'+r.changes.map(h).join('｜')+'</p><small>'+h(r.food)+' · 疲劳 '+n(r.fatigue)+' · 心情 '+n(r.mood)+'</small>'+(r.warnings.length?'<p class="danger-text">'+r.warnings.map(h).join('；')+'</p>':'')+'</section>';}
  function daily(){const slot=state.plan.slots[state.index],r=E.simulate(state,slot,state.plan.meal),c=r.item||item(slot);return feedback()+'<div class="screen-head"><h2>第 '+(state.index+1)+' 日 · '+h(c?.name)+'</h2><p>'+h(slot?.kind==='course'?c?.type:'活动恢复')+'</p></div><section class="body-growth">'+(slot?.kind==='course'?'<h3>今天的训练</h3><p>'+h(courseText(c))+'</p>'+courseEffects(state,slot):recoveryPreview(state,slot))+'<p class="daily-note">'+h((E.meals.find(m=>m.id===state.plan.meal)||E.meals[0]).name)+'在课程或活动后生效。成长值与有效次数在周末入账。</p></section><details class="plan-details"><summary>查看本周安排</summary>'+board(E.forecast({...state,...state.weekStart}),true)+'</details>';}

  function summary(){
    const s=state.summary,before=s.before||state,next=E.copy(state);if(next.week<48){next.week++;next.mode='planner';next.energy=E.config.energy;E.prepareWeek(next);}
    const gains=E.keys.map(k=>{const m=state.muscles[k],old=before.muscles[k];let gain=s.growth?.[k];if(gain===undefined){gain=m.xp-old.xp;for(let d=old.dimension;d<m.dimension;d++)gain+=E.requirement(d);}return {k,gain:n(gain),m,old};}).sort((a,b)=>b.gain-a.gain);
    const cell=({k,gain,m,old})=>'<article class="growth-cell"><b>'+E.names[k]+'成长 +'+gain+'</b><span>维度 '+old.dimension+' → '+m.dimension+'</span><small>成长 '+n(m.xp)+' / '+E.requirement(m.dimension)+'</small><div class="meter"><i style="width:'+Math.min(100,m.xp/E.requirement(m.dimension)*100)+'%"></i></div></article>';
    const hints=E.breakthroughHints(state),unlocks=E.unlockProgress(state),hurt=E.keys.filter(k=>state.muscles[k].injury>before.muscles[k].injury);
    return '<div class="screen-head"><h2>第 '+state.week+' 周 · '+(state.pendingAssessments.length||state.pendingPhoto?'阶段成长报告':'本周收获')+'</h2></div>'+state.pendingAssessments.map(validationReport).join('')+(state.pendingPhoto?stageReport():'')+'<section class="weekly-report"><h3>本周成果</h3><div class="progress-grid highlights">'+gains.slice(0,2).map(cell).join('')+'</div><p>'+(s.dimensions.length?'维度突破：'+s.dimensions.map(d=>E.names[d.key]+' '+d.from+' → '+d.to).join('、'):'成长正在积累，距离突破又近了一步。')+'</p><p>疲劳 '+n(before.fatigue)+' → '+n(state.fatigue)+'；'+(hurt.length?hurt.map(k=>E.names[k]).join('、')+'新增伤病，记得安排康复。':'本周没有新增伤病。')+'</p>'+((s.breakthroughs||[]).length?'<p class="breakthrough">弱项突破！'+s.breakthroughs.map(k=>E.names[k]).join('、')+'耐力上限额外 +10，开放弱项纠正训练。</p>':'')+((s.newCourses||[]).length?'<p class="breakthrough">新课程：'+s.newCourses.map(id=>E.courses.find(c=>c.id===id).name).join('、')+'</p>':'')+(s.upgrades.length?'<p>熟练度提升：'+s.upgrades.map(x=>h(E.courses.find(c=>c.id===x.id)?.name||x.id)+' '+x.from+' → '+x.to+' 级').join('、')+'</p>':'')+'<h3>下次突破</h3>'+hints.slice(0,2).map(x=>'<p>'+x.name+'成长 '+x.xp+'/'+x.target+'，还差 <b>'+x.remaining+'</b>。</p>').join('')+(unlocks.length?'<p>解锁预告：'+unlocks[0].name+'，'+unlocks[0].label+' '+unlocks[0].value+'/'+unlocks[0].target+'。'+unlocks[0].extra+'</p>':'')+'<details class="report-details"><summary>查看全部成长与课程记录</summary><div class="progress-grid">'+gains.map(cell).join('')+'</div><p>'+E.courses.filter(c=>E.count(state,c.id)>(before.counts[c.id]||0)).map(c=>c.name+' +'+(E.count(state,c.id)-(before.counts[c.id]||0))+' 次（累计 '+E.count(state,c.id)+'）').join('｜')+'</p></details>'+(state.week<48?'<details class="report-details"><summary>下一阶段验证进度 · 第 '+next.assessment.dueWeek+' 周</summary>'+assessmentHTML(E.assessmentProgress(next))+'</details>':'')+'</section>';
  }

  function assessmentHTML(a){
    if(!a)return '<p>下一周期可选择验证方向。</p>';
    return '<section class="assessment-progress"><b>第 '+a.dueWeek+' 周 · '+h(a.name)+'</b><div class="assessment-rows">'+a.rows.map(r=>'<p class="'+(r.passed?'':r.pendingPassed?'pending-text':'danger-text')+'">'+(r.passed?'✓ ':r.pendingPassed?'◷ ':'○ ')+h(r.label)+'：'+r.value+(r.direction==='max'?' / ≤':' / ')+r.target+(r.pending?'（本周待结算 +'+r.pending+(r.pendingPassed?'，周末入账后达标':'')+'）':r.passed?'':'（'+(r.direction==='max'?'需减少 ':'还差 ')+r.remaining+'）')+'</p>').join('')+'</div><small>通过后：'+h(a.reward)+'</small><small>全部条件达到为 A；额外满足疲劳 ≤25、心情 ≥75 为 S。B / C 表示尚未通过。</small></section>';
  }

  function validationReport(a){return '<section class="validation-result"><span class="sticker">'+(a.kind==='retry'?'再次挑战':'阶段验证')+' · '+a.grade+'</span><h3>'+h(a.name)+'</h3><p>'+(a.passed?'通过！'+h(a.reward):'暂未通过，养成继续；两周后可预约重试。')+'</p>'+(!a.passed?a.suggestions.map(x=>'<p class="danger-text">'+h(x)+'</p>').join(''):'')+'<details><summary>查看验证成绩单</summary>'+assessmentHTML(a)+'</details></section>';}

  function stageReport(){const current=state.photos[state.photos.length-1],prev=state.photos[state.photos.length-2]||E.snapshot(E.initial(),0),growth=E.keys.slice().sort((a,b)=>(current.muscles[b]-prev.muscles[b])-(current.muscles[a]-prev.muscles[a]));return '<section class="stage-inline"><span class="sticker">第 '+state.pendingPhoto+' 周 · 体型留影</span><h2>'+shape(current)+'</h2><div class="comparison">'+photoHTML(prev)+photoHTML(current)+'</div><p>变化最明显：'+growth.slice(0,2).map(k=>E.names[k]+'维度 +'+(current.muscles[k]-prev.muscles[k])).join('、')+'。</p><p>'+h(advice())+'</p><p class="daily-note">四周验证独立进行；体型照片每 8 周永久更新。下一周期可在周计划选择验证方向。</p></section>';}

  function advice(){const hurt=E.keys.filter(k=>state.muscles[k].injury>0);if(hurt.length)return '安排康复处理'+hurt.map(k=>E.names[k]).join('、')+'；伤病不会随换周自动清除。';if(state.fatigue>35)return '疲劳已影响成长，完整休息适合全身恢复；局部耐力不足时可选主动恢复。';const weak=E.keys.slice().sort((a,b)=>state.muscles[a].dimension-state.muscles[b].dimension||state.muscles[a].xp-state.muscles[b].xp)[0];return '当前维度弱项：'+E.names[weak]+'。留意对应部位的耐力与恢复。';}

  function endingCards(final=false){return E.endings(state).map(e=>'<article class="ending-card '+(e.eligible?'eligible':'')+' '+(state.selectedEnding===e.id?'chosen':'')+'"><b>'+e.name+(state.selectedEnding===e.id?' · 主档案':'')+'</b><p>'+(e.body?'✓':'○')+' 身体：'+e.bodyText+'</p><p>'+(e.path?'✓':'○')+' 路径：'+e.pathText+'</p>'+(final&&e.eligible?btn('ending',state.selectedEnding===e.id?'当前主档案':'选为主档案',e.id):'<small>'+(e.eligible?'当前条件已满足，完成 48 周后可选':'继续训练可争取')+'</small>')+'</article>').join('');}

  function pathArchive(){const p=E.profile(state),history=state.validationHistory||[];return '<section class="phase-report"><b>培养路径：'+({strong:'发展强项',weak:'克服弱项',balanced:'均衡发展'}[state.trainingRoute]||'均衡发展')+'</b><p>强项 '+h(E.names[p.strong]||'沿用旧档')+'；弱项 '+h(E.names[p.weak]||'沿用旧档')+'。</p><p>验证通过 '+history.filter(a=>a.passed).length+' / '+history.length+' 次；'+Object.entries(state.validationUnlocks||{}).map(([id,tier])=>E.assessmentDefs[id].name+'最高第 '+tier+' 阶').join('、')+'</p><p>弱项突破：'+(E.keys.filter(k=>state.muscles[k].weakBreakthrough).map(k=>E.names[k]).join('、')||'尚未取得')+'。专项成绩会保存在档案中，身体结局仍按身体条件判定。</p></section>';}

  function complete(){return '<div class="screen-head"><h2>48 周 · 养成档案</h2><p>336 天的到场记录</p></div><p class="feedback">所有已达成的专精结局都可选择。训练与身体结果决定结局，展示不改变资格。</p>'+pathArchive()+endingCards(true)+'<section class="body-growth"><h3>纪念展示 · 可选</h3><p>展示等级：'+(state.posePlayed?['','到场留念','稳稳亮相','聚光定格'][state.stage]:'尚未展示')+'</p>'+(poseRunning?'<div class="track"><div class="sweet"></div><div class="marker" id="poseMarker"></div></div>'+btn('pose-stop','定格这张照片','','action'):btn('pose-start',state.posePlayed?'纪念展示已完成':'拍一张姿势纪念照','','mini',state.posePlayed))+'<p class="daily-note">仅增加档案展示等级；不改变维度、伤病与发展结局。随时可以略过。</p></section>';}
  function library(){let out='<header class="tab-heading"><h2>课程手册</h2><p>有效次数在周末入账；3 / 8 / 15 次升至熟练度 1 / 2 / 3 级。</p></header>';for(const type of ['撸铁','有氧','体育运动'])out+='<h3 class="library-type">'+type+'</h3>'+E.courses.filter(c=>c.type===type).map(c=>{const open=c.unlock(state),times=E.count(state,c.id),level=E.mastery(times),actual=E.getCourse(state,{kind:'course',id:c.id,level:0})||c;return '<article class="course-entry '+(open?'':'locked')+'"><header><b>'+c.name+'</b><small>'+ (open?'已开放':'未开放')+' · '+level+' 级</small></header><p>'+courseText(actual)+'</p><p>基础成长：'+Object.entries(c.growth).map(([k,v])=>E.names[k]+' '+v).join(' / ')+'；疲劳 +'+c.fatigue+'，心情 '+(c.mood>0?'+':'')+c.mood+'，体脂 '+actual.fat+'%。</p><p>有效 '+times+' 次'+(state.pendingCounts[c.id]?'（本周待结算 +'+state.pendingCounts[c.id]+'）':'')+' · 当前成长 ×'+E.config.mastery[level]+'</p><small>解锁：'+c.prereq+'</small><p>可选强度：'+E.levels(state,c).map(l=>['基础','进阶','专项'][l]).join(' / ')+'</p>'+btn('library-schedule','选择上课日期',c.id,'mini',!open||state.mode!=='planner')+'</article>';}).join('');$('libraryContent').innerHTML=out;}
  function body(){
    $('energy').textContent=n(state.energy);$('energyHint').textContent='只用于活动与机会 · 每周回到24';$('fatigue').textContent=n(state.fatigue);$('fatigueHint').textContent=E.fatigueLabel(state.fatigue);$('mood').textContent=n(state.mood);$('moodHint').textContent=E.moodLabel(state.mood);$('fat').textContent=n(state.fat)+'%';$('fatHint').textContent='影响线条与发展结局';
    $('bodySummary').textContent=advice();$('muscleMeta').textContent='维度周结算 · 耐力逐日变化';
    $('muscles').innerHTML=E.keys.map(k=>{const m=state.muscles[k];return btn('muscle','<b>'+E.names[k]+' · '+m.dimension+'维'+(m.role==='strong'?' · 强项':m.role==='weak'?' · 弱项':'')+'</b><span>成长 '+n(m.xp)+' / '+E.requirement(m.dimension)+'<br>本周待结算 +'+n(state.pendingGrowth[k]||0)+'</span><span class="meter"><i style="width:'+Math.min(100,m.endurance/E.cap(m)*100)+'%"></i></span><span>耐力 '+n(m.endurance)+' / '+E.cap(m)+'<br>'+injuryLabel(m.injury)+(state.recoveryBuffs[k]?' · 下次成长 +'+n((buffValue(state.recoveryBuffs[k])-1)*100)+'%':'')+'</span>',k,'muscle-button '+(focus===k?'active':''));}).join('');
    const p=state.photos.find(p=>p.week===viewPhoto)||state.photos[state.photos.length-1]||E.snapshot(E.initial(),0);Object.entries(photoStyle(p)).forEach(([k,v])=>$('avatar').style.setProperty(k,v));$('avatar').dataset.focus=focus||'';
    $('snapshotTag').textContent=p.week?'第 '+p.week+' 周':'入馆照';$('snapshotTitle').textContent=shape(p);$('snapshotSub').textContent='阶段留影 · 体脂 '+p.fat+'%';$('snapshotNote').textContent='身体数据持续积累；体型留影每 8 周更新。';
    $('photoTabs').innerHTML=state.photos.map(p=>btn('photo',p.week?'第'+p.week+'周':'入馆照',p.week,'mini '+((viewPhoto??state.photos[state.photos.length-1]?.week)===p.week?'active':''))).join('');
    $('bodyGrowth').innerHTML='<h3>肌肉成长怎么算？</h3><p>课程基础成长 × 熟练度 × 心情 × 疲劳 × 伤病 × 强项与专项状态；过度使用再 ×0.65，耐力严重不足 ×0.45。周末累计转化为维度。</p><p>维度需求 = 10 + 当前维度 ×4；每维度增加 6 点耐力上限。提高上限不会立即补满当前耐力。</p><p>进阶成长 ×1.35 / 耐力消耗 ×1.5；专项成长 ×1.65 / 消耗 ×2.2。基础强度持续可用。</p><h3>伤病与耐力</h3><p>耐力不足仍可选，但会明确产生过度使用、成长折扣与伤病 +1；疲劳越高，所需安全耐力储备越高。</p><p>伤病 1 级成长 ×0.8；2 级 ×0.55 且禁止作为撸铁主练；3 级禁止所有涉及课程。康复每次降低 1 级。</p>';
    $('badgeList').textContent='完成课程 '+Object.values(state.counts).reduce((a,b)=>a+b,0)+' 次 · 已结算 '+state.weeks.length+' 周 · 验证通过 '+(state.validationHistory||[]).filter(x=>x.passed).length+' 次';
    $('endingPreview').innerHTML='<h3>四周验证进度</h3>'+assessmentHTML(liveAssessment())+'<h3>验证记录</h3><p>'+(state.validationHistory||[]).map(a=>'第 '+a.week+' 周 '+a.name+'：'+a.grade).join('｜')+'</p><h3>体型留影</h3><p>每 8 周在身体页留下阶段照。发展结局根据身体与训练记录判定。</p><h3>发展结局条件</h3>'+endingCards(false);
  }
  function logs(){ $('logCount').textContent=state.logs.length+' 天';$('logList').innerHTML=state.logs.slice(-60).reverse().map(r=>'<li><b>W'+r.week+' · D'+(r.index+1)+' '+h(r.item)+'</b><span>'+r.changes.map(h).join('；')+(r.warnings.length?'；'+r.warnings.map(h).join('；'):'')+'</span></li>').join('')||'<li>排好第一周，从第一门课程开始。</li>';$('cycleLogList').innerHTML=state.weeks.slice().reverse().map(w=>'<li><b>第 '+w.week+' 周</b><span>'+w.plan.slots.map(s=>item(s)?.name||'—').join(' / ')+'<br>维度提升：'+(w.dimensions.map(x=>E.names[x.key]+' +'+(x.to-x.from)).join('、')||'积累中')+'；新课：'+(w.newCourses.map(id=>E.courses.find(c=>c.id===id).name).join('、')||'无')+'</span></li>').join('')||'<li>周末会在这里留下完整计划。</li>'; }
  function dock(){let buttons='';
    if(state.pendingAssessments.length||state.pendingPhoto||state.mode==='summary')buttons=btn('report-next',state.week===48?'完成 48 周，查看档案':'进入第 '+(state.week+1)+' 周','','action');
    else if(state.mode==='planner'){const f=E.forecast(state),missing=state.plan.slots.some(s=>!s);const label=!state.profileConfirmed?'先选择培养方式':missing?'还需安排 '+Math.max(0,5-f.courseN)+' 门课、'+Math.max(0,2-f.activityN)+' 次活动':f.courseN!==5||f.activityN!==2?'需安排 5 门课程与 2 次活动':!f.ok?'调整无法执行的日期':'开始本周训练';buttons=btn('begin-week',label,state.week+':plan','action',!state.profileConfirmed||!f.ok);}
    else if(state.mode==='daily')buttons=btn('continue-week','继续本周训练',state.week+':'+state.index,'action')+btn('execute','只执行今天',state.week+':'+state.index,'action secondary');
    else buttons=btn('tab','回看身体与阶段照','body','action');
    $('actionDock').innerHTML=buttons;$('actionDock').hidden=page!=='play';
  }

  function render(){
    const previousBoard=$('planBoard');if(previousBoard)boardScroll=previousBoard.scrollTop;
    header();$('screen').innerHTML=(state.pendingAssessments.length||state.pendingPhoto||state.mode==='summary')?summary():state.mode==='planner'?planner():state.mode==='daily'?daily():complete();
    library();body();logs();
    for(const [p,suffix] of Object.entries(pages)){$('page'+suffix).hidden=p!==page;$('tab'+suffix).classList.toggle('active',p===page);$('tab'+suffix).setAttribute('aria-selected',String(p===page));$('tab'+suffix).setAttribute('tabindex',p===page?'0':'-1');}
    $('endingPreview').hidden=growthView!=='goals';$('libraryContent').hidden=growthView!=='courses';$('growthLogs').hidden=growthView!=='logs';
    $('growthTabs').innerHTML=[['goals','结局与阶段'],['courses','课程手册'],['logs','训练记录']].map(([id,text])=>btn('growth-view',text,id,'mini '+(growthView===id?'active':''))).join('');
    dock();renderSheet();const board=$('planBoard');if(board)board.scrollTop=boardScroll;if(focusReturn&&!drawer){const target=page==='play'&&state.mode==='planner'?$('date-'+active):$('tab'+pages[page]);target?.focus();focusReturn=false;}save();
  }
  function scrollNode(p){return p==='play'?$('screen'):$('page'+pages[p]);}
  function switchPage(next){if(!pages[next])return;scrolls[page]=scrollNode(page).scrollTop;page=next;render();scrollNode(page).scrollTop=scrolls[page];}

  function resetScroll(){scrolls.play=0;$('screen').scrollTop=0;$('pagePlay').scrollTop=0;}

  function poseTick(now){if(!poseRunning)return;posePosition=(Math.sin((now-poseStart)/420)+1)*50;const marker=$('poseMarker');if(marker)marker.style.left=posePosition+'%';poseFrame=requestAnimationFrame(poseTick);}
  function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='铁馆-48周-第'+state.week+'周.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  function checkpoint(){undoPlan=E.copy(state.plan);}
  function putSlot(next){
    const old=state.plan.slots[active],max=next.kind==='course'?5:2,count=state.plan.slots.filter((s,i)=>i!==active&&s?.kind===next.kind).length;
    if(count>=max){pendingSlot=next;swapMode=true;drawer='date';render();return;}
    checkpoint();state.plan.slots[active]=next;closeSheet();render();
  }
  function openDate(i){active=i;drawer='date';swapMode=false;pendingSlot=null;activityDraft=null;category=state.plan.slots[i]?.kind==='activity'?'活动':item(state.plan.slots[i])?.type||'撸铁';render();$('sheetClose').focus();}
  function closeSheet(){drawer=null;swapMode=false;pendingSlot=null;activityDraft=null;assessmentDraft=null;libraryDraft=null;libraryDate=null;sheetKey='';focusReturn=true;$('gameLayer').inert=false;}

  function sheetContent(){
    if(drawer==='date')return slotEditor(E.forecast(state));
    if(drawer==='meal')return '<p class="daily-note">本周每天在课程或活动后吃这份餐，不占排程。</p><div class="drawer-courses">'+E.meals.map(m=>btn('meal','<b>'+m.name+'</b><span>'+mealText(m)+'</span>',m.id,'choice '+(m.id===state.plan.meal?'selected':''))).join('')+'</div>';
    if(drawer==='assessment'){
      const selected=assessmentDraft||state.assessment.id,booking={id:selected,dueWeek:Math.ceil(state.week/4)*4,tier:Math.ceil(state.week/4)};
      return '<p class="daily-note">先查看条件，再确认报名。当前已报名：'+h(E.assessmentDefs[state.assessment.id].name)+'。</p><div class="assessment-choices">'+Object.entries(E.assessmentDefs).filter(([id])=>id!=='specialty'||state.week>4).map(([id,a])=>btn('assessment-select','<b>'+a.name+(id===state.assessment.id?' · 已报名':'')+'</b><span>'+a.reward+'</span>',id,'event-option '+(selected===id?'selected':''))).join('')+'</div>'+assessmentHTML(liveAssessment(booking))+(state.retryOffer?'<p>上次'+E.assessmentDefs[state.retryOffer.id].name+'可于第 '+state.retryOffer.availableWeek+' 周起重试。</p>'+btn('retry-book','预约本周重试','','mini',state.week<state.retryOffer.availableWeek||!!state.retryEnrollment):state.retryEnrollment?'<p>本周已预约重试：'+h(E.assessmentDefs[state.retryEnrollment.id].name)+'。</p>':'');
    }
    if(drawer==='schedule'){
      const c=E.courses.find(c=>c.id===libraryDraft.id),f=E.forecast(state);
      return '<p>把 <b>'+h(c.name)+'</b> 安排在哪一天？</p><div class="schedule-dates">'+f.rows.map((r,i)=>btn('library-date','第 '+(i+1)+' 日 · '+h(item(state.plan.slots[i])?.name||'未安排'),i,'event-option '+(libraryDate===i?'selected':''))).join('')+'</div>'+(libraryDate===null?'':('<section class="recovery-preview"><b>替换第 '+(libraryDate+1)+' 日 · '+h(item(state.plan.slots[libraryDate])?.name||'未安排')+'</b><p>'+h(courseText(E.getCourse(f.rows[libraryDate].before,libraryDraft)))+'</p>'+courseEffects(f.rows[libraryDate].before,libraryDraft)+'</section>'));
    }
    if(drawer==='week'){const w=E.weekCondition(state);return '<h3>'+w.name+'</h3><p>'+w.text+'</p><h3>本周额外机会 · 不占排程</h3>'+E.weekOptions(state).map(o=>btn('week-choice','<b>'+o.name+'</b><span>'+o.text+'</span>',o.id,'event-option',state.weekChoice!==null||state.energy<o.cost)).join('')+'<p class="daily-note">已选择：'+h(E.weekOptions(state).find(o=>o.id===state.weekChoice)?.name||'尚未选择')+'；行动体力 '+n(state.energy)+'。</p>';}
    return '';
  }

  function renderSheet(){
    $('sheet').hidden=!drawer;$('gameLayer').inert=!!drawer;if(!drawer)return;
    $('sheetTitle').textContent=drawer==='date'?(swapMode?'调整日期位置':'第 '+(active+1)+' 日 · 选择安排'):({meal:'本周餐食',assessment:'选择阶段验证',week:'本周条件与机会',schedule:'选择上课日期'}[drawer]);
    const nextKey=drawer+':'+active+':'+category+':'+swapMode+':'+(activityDraft?.id||'');
    const keep=$('sheetContent').scrollTop;$('sheetContent').innerHTML=sheetContent();$('sheetContent').scrollTop=sheetKey!==nextKey?0:keep;sheetKey=nextKey;
    if(document.activeElement&&!$('sheet').contains?.(document.activeElement))$('sheetClose').focus();
    $('sheetNav').innerHTML=drawer==='date'&&!swapMode?btn('drawer-date','上一日',Math.max(0,active-1),'mini',active===0)+btn('drawer-date','下一日',Math.min(6,active+1),'mini',active===6):'';
    let actions='';
    if(drawer==='date'&&activityDraft&&!swapMode){const source=E.forecast(state).rows[active].before,r=E.simulate(source,activityDraft,state.plan.meal);actions=btn('activity-confirm','安排到第 '+(active+1)+' 日','','action',!r.ok);}
    if(drawer==='assessment')actions=btn('enroll-confirm',assessmentDraft===state.assessment.id?'保留当前报名':'报名'+E.assessmentDefs[assessmentDraft||state.assessment.id].name,'','action');
    if(drawer==='schedule'){const r=libraryDate===null?null:E.simulate(E.forecast(state).rows[libraryDate].before,libraryDraft,state.plan.meal);actions=btn('library-confirm',libraryDate===null?'先选择上课日期':'安排到第 '+(libraryDate+1)+' 日','','action',!r?.ok);}
    $('sheetActions').innerHTML=actions;$('sheetActions').hidden=!actions;
  }

  function runWeek(token){
    if(state.mode!=='daily'||token!==state.week+':'+state.index)return;
    if(E.advanceWeek){const result=E.advanceWeek(state,token,{pauseOnThreshold:false});if(result.stopped)toast(result.stopped);}
    else while(state.mode==='daily'&&!state.pendingPhoto){const r=E.execute(state,state.week+':'+state.index);if(!r?.ok)break;}
    resetScroll();
  }

  function action(name,id){
    if(name==='tab'){closeSheet();switchPage(id==='library'||id==='log'?'growth':id);return;}
    if(name==='export'){exportSave();return;}
    if(name==='reset'){if(!confirm('开启新的 48 周档案将替换当前进度。确定重开？'))return;state=E.initial({seed:Date.now()%10000});state.photos=[E.snapshot(state,0)];storageWarning='';poseRunning=false;cancelAnimationFrame(poseFrame);page='play';active=0;viewPhoto=null;undoPlan=null;drawer=null;boardScroll=0;resetScroll();render();return;}
    if(name==='photo'){viewPhoto=Number(id);render();return;}
    if(name==='muscle'){focus=focus===id?null:id;render();return;}
    if(name==='growth-view'){growthView=id;render();return;}
    if(name==='report-next'){
      if(state.mode!=='summary'&&state.mode!=='complete')return;
      while(state.pendingAssessments.length)E.acknowledgeAssessment(state);state.pendingPhoto=null;
      if(state.mode==='summary'&&E.nextWeek(state)){active=0;undoPlan=null;boardScroll=0;}
      resetScroll();render();return;
    }
    if(state.pendingPhoto||state.pendingAssessments.length)return;
    if(name==='execute'){const r=E.execute(state,id);if(r&&!r.ok)toast(r.reason);if(r?.ok)resetScroll();render();return;}
    if(name==='ending'&&state.mode==='complete'){if(E.endings(state).some(e=>e.id===id&&e.eligible))state.selectedEnding=id;render();return;}
    if(name==='pose-start'&&state.mode==='complete'&&!state.posePlayed&&!poseRunning){poseRunning=true;poseStart=performance.now();render();poseFrame=requestAnimationFrame(poseTick);return;}
    if(name==='pose-stop'&&poseRunning&&state.mode==='complete'&&!state.posePlayed){poseRunning=false;cancelAnimationFrame(poseFrame);state.stage=Math.abs(posePosition-50)<10?3:Math.abs(posePosition-50)<25?2:1;state.posePlayed=true;render();return;}
    if(name==='sheet-close'){closeSheet();render();return;}
    if(name==='continue-week'){runWeek(id);render();return;}
    if(state.mode!=='planner')return;
    if(name==='training-route'){E.chooseRoute(state,id);render();return;}
    if(name==='roll-profile'){E.rollProfile(state);render();return;}
    if(name==='begin-week'){if(id===state.week+':plan'&&E.startWeek(state)){closeSheet();runWeek(state.week+':'+state.index);}render();return;}
    if(name==='library-schedule'){
      const c=E.courses.find(c=>c.id===id);if(!c||!c.unlock(state))return;libraryDraft={kind:'course',id,level:0,tech:false};libraryDate=null;drawer='schedule';render();return;
    }
    if(name==='library-date'&&drawer==='schedule'){const i=Number(id);if(Number.isInteger(i)&&i>=0&&i<7)libraryDate=i;render();return;}
    if(name==='library-confirm'&&libraryDraft&&libraryDate!==null){
      const choice=E.copy(libraryDraft),i=libraryDate,r=E.simulate(E.forecast(state).rows[i].before,choice,state.plan.meal);if(r.ok){active=i;page='play';putSlot(choice);}return;
    }
    if(name==='assessment-open'){assessmentDraft=state.assessment.id;drawer='assessment';}
    if(name==='assessment-select'&&drawer==='assessment'&&E.assessmentDefs[id]&&(id!=='specialty'||state.week>4)){assessmentDraft=id;}
    if(name==='enroll-confirm'&&drawer==='assessment'){if(E.enroll(state,assessmentDraft||state.assessment.id)){closeSheet();toast('已报名'+E.assessmentDefs[state.assessment.id].name+'。');}}
    if(name==='retry-book'){if(E.bookRetry(state)){closeSheet();toast('已预约本周重试。');}}
    if(name==='week-open')drawer='week';
    if(name==='week-choice'){if(E.chooseWeekOption(state,id))toast('已选择'+E.weekOptions(state).find(o=>o.id===id).name+'。');render();return;}
    if(name==='date'||name==='drawer-date'){const i=Number(id);if(Number.isInteger(i)&&i>=0&&i<7)openDate(i);return;}
    if(name==='course'){
      const [key,levelText,tech]=String(id).split(':'),choice={kind:'course',id:key,level:Number(levelText||0),tech:tech==='tech'},r=E.simulate(E.forecast(state).rows[active].before,choice,state.plan.meal);if(r.ok)putSlot(choice);return;
    }
    if(name==='activity'){
      const source=E.forecast(state).rows[active].before,a=E.activities.find(x=>x.id===id);if(!a||!E.activityAvailable(source,a))return;
      const candidates=E.keys.filter(k=>(id!=='rehab'||source.muscles[k].injury>0)&&(!a.weakOnly||source.muscles[k].role==='weak')).sort((a,b)=>source.muscles[a].endurance/E.cap(source.muscles[a])-source.muscles[b].endurance/E.cap(source.muscles[b]));
      activityDraft={kind:'activity',id,targets:a.targets?candidates.slice(0,a.targets):[]};category='活动';
    }
    if(name==='activity-back')activityDraft=null;
    if(name==='target'&&activityDraft&&E.keys.includes(id)){const source=E.forecast(state).rows[active].before,settings=E.activities.find(a=>a.id===activityDraft.id);if(activityDraft.id==='rehab'&&!source.muscles[id].injury)return;if(settings.weakOnly&&source.muscles[id].role!=='weak')return;if(activityDraft.targets.includes(id))activityDraft.targets=activityDraft.targets.filter(k=>k!==id);else if(activityDraft.targets.length<settings.targets)activityDraft.targets.push(id);else toast('已达部位上限，请先取消一个。');}
    if(name==='activity-confirm'&&activityDraft){const r=E.simulate(E.forecast(state).rows[active].before,activityDraft,state.plan.meal);if(r.ok){putSlot(E.copy(activityDraft));return;}toast(r.reason);}
    if(name==='swap'){swapMode=true;pendingSlot=null;}
    if(name==='swap-to'){const i=Number(id),old=state.plan.slots[active];if(Number.isInteger(i)&&i>=0&&i<7&&i!==active&&(!pendingSlot||state.plan.slots[i]?.kind===pendingSlot.kind)){checkpoint();state.plan.slots[active]=pendingSlot||state.plan.slots[i];state.plan.slots[i]=old;closeSheet();}}
    if(name==='clear'){checkpoint();state.plan.slots[active]=null;closeSheet();}
    if(name==='undo'&&undoPlan){state.plan=undoPlan;undoPlan=null;}
    if(name==='category'){category=id;activityDraft=null;}
    if(name==='meal-open')drawer='meal';
    if(name==='meal'&&E.meals.some(m=>m.id===id)){checkpoint();state.plan.meal=id;if(drawer==='meal')closeSheet();}
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
