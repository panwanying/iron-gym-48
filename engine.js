/* 铁馆 V2 — deterministic rules shared by preview, execution and tests. */
(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),round=x=>Math.round(x*100)/100;
  const names={chest:'胸',back:'背',shoulders:'肩',arms:'手臂',legs:'腿',traps:'斜方肌'},keys=Object.keys(names);
  const config={weeks:48,energy:60,endurance:64,endurancePerDimension:6,growthBase:10,growthStep:4,mastery:[1,1.15,1.32,1.5],overuse:.65,stageWeeks:[8,16,24,32,40,48],
    endings:{mass:{total:45,maxFat:28},classic:{gap:4,minimum:4,path:12,maxFat:26},lean:{minFat:12,maxFat:18,total:24,strength:20},sport:{cap:88,parts:4,minFat:13,maxFat:25}},
    phases:['基础适应','弱项调整','进阶探索','比例打磨','专项发展','收官巩固']};
  const course=(id,name,type,main,growth,cost,fatigue,mood,fat,prereq,unlock)=>({id,name,type,main,growth,cost,fatigue,mood,fat,prereq,unlock});
  const courses=[
    course('bench','卧推','撸铁',['chest'],{chest:4.8,shoulders:1.3,arms:1.1},{chest:22,shoulders:9,arms:8},12,0,0,'初始开放',()=>true),
    course('row','杠铃划船','撸铁',['back'],{back:4.8,arms:1.2,traps:2},{back:22,arms:8,traps:12},12,0,0,'初始开放',()=>true),
    course('squat','深蹲','撸铁',['legs'],{legs:6},{legs:28},15,-1,0,'初始开放',()=>true),
    course('press','哑铃推举','撸铁',['shoulders'],{shoulders:4.8,chest:1,arms:1.2},{shoulders:22,chest:7,arms:8},11,1,0,'卧推完成 3 次',s=>count(s,'bench')>=3),
    course('pulldown','高位下拉','撸铁',['back'],{back:4.4,arms:1.2},{back:20,arms:8},10,1,0,'杠铃划船完成 3 次',s=>count(s,'row')>=3),
    course('curl','二头弯举','撸铁',['arms'],{arms:4.5},{arms:20},9,1,0,'推 / 拉课程合计 5 次',s=>['bench','row','press','pulldown'].reduce((n,id)=>n+count(s,id),0)>=5),
    course('lateral','侧平举','撸铁',['shoulders'],{shoulders:4.6,arms:.8},{shoulders:19,arms:5},9,1,0,'哑铃推举熟练度 1 级',s=>mastery(count(s,'press'))>=1),
    course('deadlift','硬拉','撸铁',['legs','back','traps'],{legs:3.8,back:3.8,traps:4},{legs:25,back:25,traps:25},19,-1,0,'深蹲熟练度 1 级，腿维度 ≥1',s=>mastery(count(s,'squat'))>=1&&s.muscles.legs.dimension>=1),
    course('run','跑步','有氧',['legs'],{legs:.7},{legs:10},6,3,-.6,'初始开放',()=>true),
    course('stairs','爬楼','有氧',['legs'],{legs:1.4},{legs:17},9,3,-.9,'跑步完成 3 次',s=>count(s,'run')>=3),
    course('swim','游泳','有氧',['shoulders','back','legs'],{shoulders:1,back:1,legs:.7},{shoulders:8,back:8,legs:7},7,5,-.7,'有氧课程合计 5 次',s=>typeCount(s,'有氧')>=5),
    course('hike','爬山','有氧',['legs'],{legs:1.8},{legs:21},11,9,-1,'爬楼熟练度 1 级，腿耐力上限 ≥76',s=>mastery(count(s,'stairs'))>=1&&cap(s.muscles.legs)>=76),
    course('pingpong','乒乓球','体育运动',['shoulders','arms'],{shoulders:1.3,arms:1.3},{shoulders:7,arms:7},5,8,-.025,'初始开放',()=>true),
    course('basketball','篮球','体育运动',['legs'],{legs:2.4,shoulders:1,arms:1},{legs:15,shoulders:6,arms:6},8,7,-.06,'深蹲完成 3 次',s=>count(s,'squat')>=3),
    course('tennis','网球','体育运动',['shoulders','arms'],{shoulders:2,arms:2,legs:1},{shoulders:12,arms:12,legs:7},8,8,-.04,'乒乓球完成 3 次，肩维度 ≥1',s=>count(s,'pingpong')>=3&&s.muscles.shoulders.dimension>=1)
  ];
  const activities=[
    {id:'rest',name:'完整休息',energy:0,fatigue:-32,mood:8,recovery:24,targets:0,text:'全身耐力 +24，疲劳 −32，心情 +8，行动体力 +12。适合全身疲劳。'},
    {id:'active',name:'主动恢复',energy:8,fatigue:-10,mood:3,recovery:54,targets:2,text:'选择 1–2 个部位：耐力 +54；疲劳 −10，心情 +3。消耗 8 行动体力。适合局部高负荷。'},
    {id:'rehab',name:'康复训练',energy:12,fatigue:-10,mood:3,recovery:24,targets:2,text:'选择 1–2 个受伤部位：伤病 −1、耐力 +24；疲劳 −10。消耗 12 行动体力。'}
  ];
  // Food remains auxiliary: no recipes, inventory, economy or growth multiplier.
  const meals=[
    {id:'balanced',name:'日常均衡餐',energy:3,fatigue:-3,mood:1,fat:0,recovery:3},
    {id:'recovery',name:'恢复加餐',energy:5,fatigue:-6,mood:3,fat:.035,recovery:6},
    {id:'light',name:'清淡餐',energy:2,fatigue:-1,mood:-2,fat:-.045,recovery:1}
  ];
  function mastery(n){return n>=15?3:n>=8?2:n>=3?1:0;}
  function count(s,id){return s.counts[id]||0;}
  function typeCount(s,type){return courses.filter(c=>c.type===type).reduce((n,c)=>n+count(s,c.id),0);}
  function cap(m){return config.endurance+m.dimension*config.endurancePerDimension;}
  function requirement(d){return config.growthBase+d*config.growthStep;}
  function blankPlan(){return {slots:Array.from({length:7},()=>null),meal:'balanced'};}
  function initial(){return {version:3,rules:3,week:1,index:0,mode:'planner',energy:config.energy,fatigue:18,mood:60,fat:25,stage:0,
    muscles:Object.fromEntries(keys.map(k=>[k,{dimension:0,xp:0,endurance:config.endurance,injury:0}])),counts:{},pendingCounts:{},pendingGrowth:Object.fromEntries(keys.map(k=>[k,0])),advancedCounts:{},plan:blankPlan(),lastPlan:null,logs:[],weeks:[],photos:[],pendingPhoto:null,selectedEnding:null,posePlayed:false,lastFeedback:null,focusState:null,focusHistory:[],preferredRoute:'classic'};}
  function model(s){return copy({week:s.week||1,rules:s.rules||3,energy:s.energy,fatigue:s.fatigue,mood:s.mood,fat:s.fat,stage:s.stage,muscles:s.muscles,counts:s.counts,pendingCounts:s.pendingCounts,pendingGrowth:s.pendingGrowth,advancedCounts:s.advancedCounts||{}});}
  function levels(s,c){const a=[0];if(s.rules===2)return a;if(s.week>=17&&mastery(count(s,c.id))>=2&&c.main.every(k=>s.muscles[k].dimension>=3))a.push(1);if(s.week>=33&&mastery(count(s,c.id))>=3&&c.main.every(k=>s.muscles[k].dimension>=6))a.push(2);return a;}
  function getCourse(s,slot){
    const c=courses.find(c=>c.id===slot?.id);if(!c)return null;const level=Number(slot.level||0);if(!levels(s,c).includes(level))return null;
    if(s.rules===2)return c;
    const growth=[1,1.35,1.65][level],cost=[1,1.5,2.2][level],load=[1,1.3,1.6][level];
    return {...c,level,name:c.name+(level?' · '+(level===1?'进阶':'专项'):''),growth:Object.fromEntries(Object.entries(c.growth).map(([k,v])=>[k,round(v*growth)])),cost:Object.fromEntries(Object.entries(c.cost).map(([k,v])=>[k,Math.ceil(v*cost)])),fatigue:Math.ceil(c.fatigue*load),fat:c.type==='有氧'?({run:-.16,stairs:-.23,swim:-.18,hike:-.28}[c.id])*(1+level*.08):c.fat};
  }
  function fatigueLabel(n){return n>=75?'需要恢复':n>=50?'成长效率下降':'状态良好';}
  function moodLabel(n){return n<=30?'训练意愿低':n>=75?'干劲十足':'稳定';}
  function unlocked(s){return courses.filter(c=>c.unlock(s));}
  function risk(s,c){
    const blocked=[],overused=[],injured=[];
    if(!c||!c.unlock(s))return {ok:false,blocked:['课程尚未解锁'],overused,injured};
    for(const [k,cost] of Object.entries(c.cost)){
      const m=s.muscles[k];
      if(m.injury>=3)blocked.push(names[k]+'重度伤病，禁止所有涉及课程');
      else if(m.injury>=2&&c.type==='撸铁'&&c.main.includes(k))blocked.push(names[k]+'中度伤病，不能作为撸铁主练');
      if(m.endurance<cost/2)blocked.push(names[k]+'耐力 '+round(m.endurance)+' < '+cost/2+'，无法训练');
      else if(m.endurance<cost)overused.push(k);
      if(m.injury>0)injured.push(k);
    }
    return {ok:blocked.length===0,blocked,overused,injured};
  }
  function simulate(s,slot,mealId='balanced'){
    const after=model(s),warnings=[],gains={},changes=[],before=model(s);let food=meals.find(m=>m.id===mealId)||meals[0];
    if(s.rules===2){const old={balanced:{energy:3,fatigue:-3,mood:1,fat:0,recovery:3},recovery:{energy:5,fatigue:-5,mood:2,fat:.06,recovery:5},light:{energy:2,fatigue:-2,mood:-1,fat:-.08,recovery:2}};food={...food,...old[food.id]};}
    const fail=reason=>({ok:false,reason,before,after:before,warnings:[],gains:{},changes:[]});
    if(!slot)return fail('尚未安排');
    let item,r=null;
    if(slot.kind==='course'){
      item=getCourse(s,slot);r=risk(s,item);if(!r.ok)return fail(r.blocked.join('；'));
      const ff=s.fatigue>=75?.64:s.fatigue>=50?.82:1,mf=s.mood<=30?.82:s.mood>=75?1.08:1,level=mastery(count(s,item.id));
      for(const [k,base] of Object.entries(item.growth)){
        const injury=s.muscles[k].injury,injuryFactor=injury===0?1:injury===1?.8:.55,over=r.overused.includes(k)?config.overuse:1;
        const value=round(base*config.mastery[level]*mf*ff*injuryFactor*over);
        gains[k]=value;after.pendingGrowth[k]=round((after.pendingGrowth[k]||0)+value);
        changes.push(names[k]+'成长 +'+value+(over<1?'（过度使用 ×0.65）':'')+(injury?'（伤病 ×'+injuryFactor+'）':''));
      }
      for(const [k,cost] of Object.entries(item.cost))after.muscles[k].endurance=Math.max(0,s.muscles[k].endurance-cost);
      for(const k of r.overused){after.muscles[k].injury=clamp(after.muscles[k].injury+1,0,3);warnings.push(names[k]+'过度使用：成长降低、疲劳 +4、伤病 +1');}
      if(s.fatigue>=50)warnings.push('疲劳 '+s.fatigue+'：本课成长 ×'+ff);
      if(s.mood<=30)warnings.push('低心情：本课成长 ×0.82');
      after.fatigue+=item.fatigue+r.overused.length*4+r.injured.length*2;
      after.mood+=item.mood-(s.fatigue>=75?2:0)-r.injured.length;
      after.fat+=item.fat;after.pendingCounts[item.id]=(after.pendingCounts[item.id]||0)+1;
      if(item.level)after.advancedCounts[item.id]=(after.advancedCounts[item.id]||0)+1;
    }else if(slot.kind==='activity'){
      item=activities.find(a=>a.id===slot.id);if(!item)return fail('活动不存在');
      if(s.rules===2){item={...item,...({rest:{fatigue:-38,mood:10,recovery:46},active:{fatigue:-14,mood:5,recovery:48},rehab:{recovery:18}}[item.id])};item.text=item.id==='rest'?'原规则：全身耐力 +46，疲劳 −38，心情 +10，行动体力 +12。':item.id==='active'?'原规则：指定部位耐力 +48，疲劳 −14，心情 +5，消耗 8 行动体力。':'原规则：指定伤病 −1、耐力 +18，疲劳 −10，消耗 12 行动体力。';}
      const targets=[...new Set(slot.targets||[])];
      if(item.targets&&(targets.length<1||targets.length>item.targets||targets.some(k=>!keys.includes(k))))return fail('请选择 1–2 个有效部位');
      if(item.id==='rehab'&&targets.some(k=>s.muscles[k].injury<1))return fail('康复只能选择受伤部位');
      if(s.energy<item.energy)return fail('行动体力不足，活动需要 '+item.energy);
      after.energy-=item.energy;after.fatigue+=item.fatigue;after.mood+=item.mood;
      for(const k of item.id==='rest'?keys:targets){after.muscles[k].endurance=Math.min(cap(after.muscles[k]),after.muscles[k].endurance+item.recovery);if(item.id==='rehab')after.muscles[k].injury--;}
      if(item.id==='rest')after.energy+=12;
      changes.push(item.text);
    }else return fail('未知排程类型');
    const courseAfter=copy(after);
    after.energy=clamp(after.energy+food.energy,0,100);after.fatigue=round(clamp(after.fatigue+food.fatigue,0,100));after.mood=round(clamp(after.mood+food.mood,0,100));
    after.fat=round(clamp(after.fat+food.fat+(s.rules===2?0:(22-s.fat)*.025),10,38));
    for(const k of keys)after.muscles[k].endurance=round(Math.min(cap(after.muscles[k]),after.muscles[k].endurance+food.recovery));
    return {ok:true,before,after,courseAfter,item,food,risk:r,warnings,gains,changes};
  }
  function settle(s,week=0){
    const after=model(s),dimensions=[],upgrades=[];
    for(const k of keys){const m=after.muscles[k],old=m.dimension;m.xp=round(m.xp+(after.pendingGrowth[k]||0));while(m.xp+1e-8>=requirement(m.dimension)){m.xp=round(m.xp-requirement(m.dimension));m.dimension++;}if(m.dimension>old)dimensions.push({key:k,from:old,to:m.dimension});after.pendingGrowth[k]=0;}
    for(const [id,n] of Object.entries(after.pendingCounts)){const old=mastery(count(after,id));after.counts[id]=(after.counts[id]||0)+n;const next=mastery(count(after,id));if(next>old)upgrades.push({id,from:old,to:next});}
    after.pendingCounts={};after.mood=clamp(after.mood+dimensions.length*2+upgrades.length*2+(config.stageWeeks.includes(week)?4:0),0,100);
    const newCourses=unlocked(after).filter(c=>!unlocked(s).some(old=>old.id===c.id)).map(c=>c.id);
    return {after,dimensions,upgrades,newCourses};
  }
  function forecast(s,plan=s.plan){
    let current=model(s),rows=[];const slots=plan.slots||[],courseN=slots.filter(x=>x&&x.kind==='course').length,activityN=slots.filter(x=>x&&x.kind==='activity').length;
    let uncertain=false;for(let i=0;i<7;i++){const before=copy(current),result=simulate(current,slots[i],plan.meal);rows.push({index:i,before,result,uncertain});if(result.ok)current=result.after;else uncertain=true;}
    const settlement=settle(current,s.week),errors=rows.filter(r=>!r.result.ok).map(r=>'D'+(r.index+1)+'：'+r.result.reason);
    if(slots.length!==7||courseN!==5||activityN!==2)errors.unshift('必须排满 5 门课程、2 次活动（当前 '+courseN+'＋'+activityN+'）');
    return {ok:errors.length===0,rows,errors,after:current,settlement,courseN,activityN};
  }
  function snapshot(s,week){return {week,fat:s.fat,muscles:Object.fromEntries(keys.map(k=>[k,s.muscles[k].dimension]))};}
  function recentType(s,type,weeks=8){const start=Math.max(1,(s.week||48)-weeks+1);return (s.logs||[]).filter(l=>l.week>=start&&l.type===type).length;}
  function endings(s){
    const d=Object.fromEntries(keys.map(k=>[k,s.muscles[k].dimension])),total=Object.values(d).reduce((a,b)=>a+b,0),gap=Math.max(...Object.values(d))-Math.min(...Object.values(d)),heavy=keys.some(k=>s.muscles[k].injury>=3),ec=config.endings;
    const masteryN=type=>courses.filter(c=>c.type===type&&mastery(count(s,c.id))>=2).length;
    const result=[
      {id:'mass',name:'厚重增肌者',body:total>=ec.mass.total&&s.fat<=ec.mass.maxFat&&['chest','back','legs'].every(k=>d[k]>=3)&&d.arms>=2,path:masteryN('撸铁')>=2&&!heavy,bodyText:'总维度 '+total+'/'+ec.mass.total+'；胸 / 背 / 腿各 ≥3；手臂 ≥2；体脂 ≤28%',pathText:'熟练撸铁 '+masteryN('撸铁')+'/2 门；无重度伤病'},
      {id:'classic',name:'古典比例者',body:gap<=ec.classic.gap&&['shoulders','back','legs'].every(k=>d[k]>=ec.classic.minimum)&&d.chest>=2&&d.arms>=2&&s.fat<=ec.classic.maxFat,path:['bench','row','squat'].every(id=>count(s,id)>=ec.classic.path)&&['press','pulldown','lateral','row'].some(id=>mastery(count(s,id))>=2),bodyText:'维度极差 '+gap+'/4；肩 / 背 / 腿各 ≥4；胸 / 臂各 ≥2；体脂 ≤26%',pathText:'卧推 '+count(s,'bench')+'/12，划船 '+count(s,'row')+'/12，深蹲 '+count(s,'squat')+'/12；肩背课熟练度 ≥2'},
      {id:'lean',name:'干净线条者',body:s.fat>=ec.lean.minFat&&s.fat<=ec.lean.maxFat&&total>=ec.lean.total&&['chest','back','shoulders','arms','legs'].every(k=>d[k]>=2),path:masteryN('有氧')>=2&&s.muscles.legs.injury<3&&typeCount(s,'撸铁')>=ec.lean.strength&&recentType(s,'撸铁')>=2,bodyText:'体脂 12–18%；总维度 '+total+'/24；胸 / 背 / 肩 / 臂 / 腿各 ≥2',pathText:'熟练有氧 '+masteryN('有氧')+'/2 门；力量 '+typeCount(s,'撸铁')+'/20 次，最近 8 周 '+recentType(s,'撸铁')+'/2 次；无重度腿伤'},
      {id:'sport',name:'运动表现者',body:keys.filter(k=>cap(s.muscles[k])>=ec.sport.cap).length>=ec.sport.parts&&s.fat>=ec.sport.minFat&&s.fat<=ec.sport.maxFat,path:masteryN('体育运动')>=2&&typeCount(s,'撸铁')>=8&&typeCount(s,'有氧')>=8&&typeCount(s,'体育运动')>=40&&recentType(s,'体育运动')>=8,bodyText:'耐力上限 ≥88 的部位 '+keys.filter(k=>cap(s.muscles[k])>=88).length+'/4；体脂 13–25%',pathText:'熟练体育 '+masteryN('体育运动')+'/2 项；力量 '+typeCount(s,'撸铁')+'/8，有氧 '+typeCount(s,'有氧')+'/8，体育 '+typeCount(s,'体育运动')+'/40；近 8 周体育 '+recentType(s,'体育运动')+'/8 次'},
      {id:'basic',name:'四十八周训练者',body:true,path:true,bodyText:'完成全部 48 周',pathText:'记录每一次认真到场'}
    ];const specialized=result.slice(0,4).some(r=>r.body&&r.path);return result.map(r=>({...r,eligible:!!r.body&&!!r.path&&(r.id!=='basic'||!specialized)}));
  }
  function startWeek(s){const f=forecast(s);if(s.mode!=='planner'||s.week>config.weeks||!f.ok)return false;ensureFocus(s);s.mode='daily';s.index=0;s.lastPlan=copy(s.plan);s.weekStart=model(s);return true;}
  function execute(s,expected){
    const token=s.week+':'+s.index;if(s.mode!=='daily'||s.pendingPhoto||expected!==token)return null;
    const result=simulate(s,s.plan.slots[s.index],s.plan.meal);if(!result.ok)return result;
    Object.assign(s,result.after);s.lastFeedback={week:s.week,index:s.index,item:result.item.name,id:result.item.id,type:s.plan.slots[s.index].kind==='course'?result.item.type:'活动',level:result.item.level||0,changes:result.changes,warnings:result.warnings,food:result.food.name,fatigue:s.fatigue,mood:s.mood};
    s.logs.push(copy(s.lastFeedback));s.index++;
    if(s.index===7){const settled=settle(s,s.week);Object.assign(s,settled.after);const summary={week:s.week,dimensions:settled.dimensions,upgrades:settled.upgrades,newCourses:settled.newCourses,plan:copy(s.plan),before:copy(s.weekStart),after:model(s)};s.weeks.push(summary);s.summary=summary;s.mode=s.week===config.weeks?'complete':'summary';
      ensureFocus(s);if(!keys.some(k=>s.muscles[k].injury)&&s.fatigue<50)s.focusState.goodWeeks++;
      if(config.stageWeeks.includes(s.week)){const progress=focusProgress(s);s.focusHistory.push({...progress,week:s.week});const photo=snapshot(s,s.week);s.photos.push(photo);s.pendingPhoto=s.week;}if(s.mode==='complete')s.selectedEnding=endings(s).find(e=>e.eligible).id;
    }
    return result;
  }
  function nextWeek(s){if(s.mode!=='summary'||s.pendingPhoto||s.week>=config.weeks)return false;s.week++;s.rules=3;if(s.migrationNote)s.migrationNote='旧档已启用新规则，更新前的备份已保留。';s.index=0;s.energy=config.energy;s.plan=s.lastPlan?copy(s.lastPlan):blankPlan();s.mode='planner';s.lastFeedback=null;s.summary=null;ensureFocus(s);return true;}
  function advanceWeek(s,expected,options={}){if(s.mode!=='daily'||expected!==s.week+':'+s.index)return {processed:0,stopped:null};let processed=0,stopped=null;while(s.mode==='daily'&&!s.pendingPhoto){const beforeFatigue=s.fatigue,beforeMood=s.mood,r=execute(s,s.week+':'+s.index);if(!r?.ok){stopped=r?.reason||'执行暂停';break;}processed++;const threshold=(beforeFatigue<50&&s.fatigue>=50)||(beforeFatigue<75&&s.fatigue>=75)||(beforeMood>30&&s.mood<=30);if(s.mode==='daily'&&(r.risk?.overused.length||(options.pauseOnThreshold!==false&&threshold))){stopped=r.risk?.overused.length?'出现伤病变化，请查看后继续':'状态跨入效率区间，已暂停';break;}}return {processed,stopped};}
  const focusDefs={
    strength:{name:'积累基础块头',text:'本阶段总维度增加 8，保留分化与恢复。'},weak:{name:'补足当前弱项',text:'本阶段起始最弱部位增加 2 维，阶段内目标保持固定。'},
    balance:{name:'收紧体型差距',text:'将肌群极差减少 2；起始已均衡时保持极差不超过 2。'},mastery:{name:'练熟一门课程',text:'本阶段至少一门课程完成 8 次，深化熟练度。'},
    intensity:{name:'尝试进阶刺激',text:'本阶段完成 6 次进阶或专项课；留意局部耐力。'},lines:{name:'调整舞台线条',text:'阶段末体脂处于 14–18%，保留力量基础。'},
    recovery:{name:'掌握训练恢复',text:'本阶段至少 6 周末无伤病、疲劳低于 50。'},maintain:{name:'巩固发展路线',text:'阶段结束满足当前关注路线的结局条件。'}
  };
  function phaseInfo(s){const phase=Math.min(5,Math.floor(((s.week||1)-1)/8));return {index:phase,start:phase*8+1,end:phase*8+8,name:config.phases[phase]};}
  function focusChoices(s){return [['strength','balance'],['weak','mastery'],['intensity','lines'],['balance','mastery'],['intensity','recovery'],['maintain','balance']][phaseInfo(s).index].map(id=>({id,...focusDefs[id]}));}
  function ensureFocus(s){const phase=phaseInfo(s);if(s.focusState?.phase===phase.index)return;s.focusState={phase:phase.index,choice:focusChoices(s)[0].id,baseline:model(s),weak:keys.slice().sort((a,b)=>s.muscles[a].dimension-s.muscles[b].dimension||s.muscles[a].xp-s.muscles[b].xp)[0],goodWeeks:0};s.focusHistory=s.focusHistory||[];}
  function canChooseFocus(s){return s.mode==='planner'&&(!s.focusState||s.focusState.phase!==phaseInfo(s).index||s.week===phaseInfo(s).start);}
  function setFocus(s,id){if(!canChooseFocus(s)||!focusChoices(s).some(f=>f.id===id))return false;ensureFocus(s);s.focusState.choice=id;return true;}
  function focusProgress(s){
    ensureFocus(s);const f=s.focusState,b=f.baseline,id=f.choice,sum=x=>keys.reduce((n,k)=>n+x.muscles[k].dimension,0),gap=x=>Math.max(...keys.map(k=>x.muscles[k].dimension))-Math.min(...keys.map(k=>x.muscles[k].dimension));let value=0,target=1,label='';
    if(id==='strength'){value=sum(s)-sum(b);target=8;label='总维度新增 '+value+'/8';}
    if(id==='weak'){value=s.muscles[f.weak].dimension-b.muscles[f.weak].dimension;target=2;label=names[f.weak]+'新增 '+value+'/2 维';}
    if(id==='balance'){target=1;value=gap(s)<=Math.max(2,gap(b)-2)?1:0;label='肌群极差 '+gap(s)+'，目标 ≤'+Math.max(2,gap(b)-2);}
    if(id==='mastery'){value=Math.max(0,...courses.map(c=>count(s,c.id)-count(b,c.id)));target=8;label='单课本期最多 '+value+'/8 次';}
    if(id==='intensity'){value=Object.values(s.advancedCounts||{}).reduce((a,v)=>a+v,0)-Object.values(b.advancedCounts||{}).reduce((a,v)=>a+v,0);target=6;label='进阶 / 专项 '+value+'/6 次';}
    if(id==='lines'){value=s.fat>=14&&s.fat<=18?1:0;label='体脂 '+s.fat+'%，目标 14–18%';}
    if(id==='recovery'){value=f.goodWeeks;target=6;label='恢复良好 '+value+'/6 周';}
    if(id==='maintain'){const e=endings(s).find(e=>e.id===(s.preferredRoute||'classic'));value=e?.eligible?1:0;label=(e?.name||'本期路线')+'：'+(value?'当前满足':'继续调整');}
    return {id,name:focusDefs[id].name,label,value,target,complete:value>=target,phase:f.phase};
  }
  function autoPlan(s,route='classic'){
    // Beam search uses exactly the same deterministic per-date forecast as execution.
    const available=unlocked(s),injuryCost=x=>keys.reduce((n,k)=>n+x.muscles[k].injury*14,0);
    let beam=[{state:model(s),slots:[],c:0,a:0,score:0}];
    for(let day=0;day<7;day++){
      const candidates=[];
      for(const node of beam){
        const options=[];
        if(node.c<5)for(const c of available)for(const level of levels(s,c))options.push({kind:'course',id:c.id,level});
        if(node.a<2){options.push({kind:'activity',id:'rest',targets:[]});
          const hurt=keys.filter(k=>node.state.muscles[k].injury>0).sort((a,b)=>node.state.muscles[b].injury-node.state.muscles[a].injury);
          if(hurt.length)options.push({kind:'activity',id:'rehab',targets:hurt.slice(0,2)});
          const low=keys.slice().sort((a,b)=>node.state.muscles[a].endurance/cap(node.state.muscles[a])-node.state.muscles[b].endurance/cap(node.state.muscles[b]));
          options.push({kind:'activity',id:'active',targets:low.slice(0,2)});
        }
        for(const slot of options){const cN=node.c+(slot.kind==='course'),aN=node.a+(slot.kind==='activity');if(5-cN+2-aN>6-day)continue;const r=simulate(node.state,slot,s.plan.meal);if(!r.ok)continue;
          let reward=0;
          if(slot.kind==='course'){
            const c=r.item,total=Object.values(r.gains).reduce((a,b)=>a+b,0),seen=node.slots.filter(x=>x.id===c.id).length;
            reward=total*.45+1.5-seen*3;
            if(route==='mass'){reward=total*.8+1.5-seen*1.8;reward+=c.type==='撸铁'?5:0;}
            if(route==='lean')reward+=c.type==='有氧'?11:0;
            if(route==='lean'&&c.type==='撸铁'){
              const deficient=c.main.some(k=>s.muscles[k].dimension<2),needsCounts=typeCount(s,'撸铁')<20;
              if(deficient||needsCounts)reward+=14;
              if(!node.slots.some(x=>courses.find(y=>y.id===x.id)?.type==='撸铁'))reward+=9;
            }
            if(route==='sport'){
              reward+=c.type==='体育运动'?12:0;
              if(typeCount(s,c.type)<8&&!node.slots.some(x=>courses.find(y=>y.id===x.id)?.type===c.type))reward+=22;
              if(c.id==='squat'&&count(s,'squat')<3)reward+=12;
              if(keys.filter(k=>cap(s.muscles[k])>=config.endings.sport.cap).length<4&&c.type==='撸铁'&&c.main.some(k=>s.muscles[k].dimension<4&&['back','chest','traps'].includes(k)))reward+=10;
            }
            if(route==='classic'){
              const effective=k=>node.state.muscles[k].dimension+(node.state.muscles[k].xp+(node.state.pendingGrowth[k]||0))/requirement(node.state.muscles[k].dimension),min=Math.min(...keys.map(effective));
              reward=Object.entries(r.gains).reduce((n,[k,v])=>n+v/(1+Math.max(0,effective(k)-min)*1.3),0)*1.2+1-seen*3;
              if(['bench','row','squat'].includes(c.id)&&count(s,c.id)<12)reward+=8;
            }
            const focus=s.focusState;
            if(focus?.choice==='weak'&&c.growth[focus.weak])reward+=Math.min(3,c.growth[focus.weak]*.6);
            if(focus?.choice==='intensity'&&slot.level)reward+=1;
            if(focus?.choice==='mastery'&&mastery(count(s,c.id))<3)reward+=1.5;
            if(focus?.choice==='balance'){
              const min=Math.min(...keys.map(k=>s.muscles[k].dimension));reward+=c.main.some(k=>s.muscles[k].dimension===min)?1.5:0;
            }
          }
          const restored=slot.kind==='activity'?keys.reduce((n,k)=>n+Math.max(0,r.courseAfter.muscles[k].endurance-node.state.muscles[k].endurance),0):0;
          const score=node.score+reward-(injuryCost(r.after)-injuryCost(node.state))-.035*Math.max(0,r.after.fatigue-45)+.012*(r.after.mood-node.state.mood)+restored*.025;
          candidates.push({state:r.after,slots:node.slots.concat([slot]),c:cN,a:aN,score});
        }
      }
      candidates.sort((a,b)=>b.score-a.score);beam=candidates.slice(0,28);if(!beam.length)return null;
    }
    return {slots:beam[0].slots,meal:s.plan.meal};
  }
  root.IronV2={config,names,keys,courses,activities,meals,initial,blankPlan,model,copy,round,cap,requirement,mastery,count,typeCount,risk,simulate,settle,forecast,snapshot,endings,unlocked,startWeek,execute,nextWeek,autoPlan,fatigueLabel,moodLabel,getCourse,levels,advanceWeek,phaseInfo,focusChoices,focusProgress,setFocus,canChooseFocus,ensureFocus};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.IronV2;
})(globalThis);
