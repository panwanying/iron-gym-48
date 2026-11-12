/* 铁馆 V2 — deterministic rules shared by preview, execution and tests. */
(function(root){
  'use strict';
  const Legacy=typeof module!=='undefined'&&module.exports?require('./legacy/engine-v21.js'):root.IronV21;
  const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),round=x=>Math.round(x*100)/100;
  const names={chest:'胸',back:'背',shoulders:'肩',arms:'手臂',legs:'腿',traps:'斜方肌'},keys=Object.keys(names);
  const config={weeks:48,energy:24,endurance:64,endurancePerDimension:6,growthBase:10,growthStep:4,mastery:[1,1.15,1.32,1.5],overuse:.65,stageWeeks:[8,16,24,32,40,48],
    endings:{mass:{total:45,maxFat:28},classic:{gap:4,minimum:4,path:12,maxFat:26},lean:{minFat:12,maxFat:18,total:24,strength:20},sport:{cap:88,parts:4,minFat:13,maxFat:25}},
    phases:['基础适应','弱项调整','进阶探索','比例打磨','专项发展','收官巩固']};
  const course=(id,name,type,main,growth,cost,fatigue,mood,fat,prereq,unlock)=>({id,name,type,main,growth,cost,fatigue,mood,fat,prereq,unlock});
  const courses=[
    course('bench','卧推','撸铁',['chest'],{chest:4.8,shoulders:1.3,arms:1.1},{chest:22,shoulders:9,arms:8},12,0,0,'初始开放',()=>true),
    course('row','杠铃划船','撸铁',['back'],{back:4.8,arms:1.2,traps:2},{back:22,arms:8,traps:12},12,0,0,'初始开放',()=>true),
    course('squat','深蹲','撸铁',['legs'],{legs:6},{legs:28},15,-1,0,'初始开放',()=>true),
    course('press','哑铃推举','撸铁',['shoulders'],{shoulders:4.8,chest:1,arms:1.2},{shoulders:22,chest:7,arms:8},11,1,0,'卧推完成 3 次，或通过力量评估',s=>count(s,'bench')>=3||passed(s,'strength')),
    course('pulldown','高位下拉','撸铁',['back'],{back:4.4,arms:1.2},{back:20,arms:8},10,1,0,'杠铃划船完成 3 次',s=>count(s,'row')>=3),
    course('curl','二头弯举','撸铁',['arms'],{arms:4.5},{arms:20},9,1,0,'推 / 拉课程合计 5 次',s=>['bench','row','press','pulldown'].reduce((n,id)=>n+count(s,id),0)>=5),
    course('lateral','侧平举','撸铁',['shoulders'],{shoulders:4.6,arms:.8},{shoulders:19,arms:5},9,1,0,'哑铃推举熟练度 1 级',s=>mastery(count(s,'press'))>=1),
    course('deadlift','硬拉','撸铁',['legs','back','traps'],{legs:3.8,back:3.8,traps:4},{legs:25,back:25,traps:25},19,-1,0,'深蹲熟练度 1 级，腿维度 ≥1',s=>mastery(count(s,'squat'))>=1&&s.muscles.legs.dimension>=1),
    course('run','跑步','有氧',['legs'],{legs:.7},{legs:10},6,3,-.6,'初始开放',()=>true),
    course('stairs','爬楼','有氧',['legs'],{legs:1.4},{legs:17},9,3,-.9,'跑步完成 3 次，或通过体能测试',s=>count(s,'run')>=3||passed(s,'cardio')),
    course('swim','游泳','有氧',['shoulders','back','legs'],{shoulders:1,back:1,legs:.7},{shoulders:8,back:8,legs:7},7,5,-.7,'有氧合计 5 次，或通过体能测试',s=>typeCount(s,'有氧')>=5||passed(s,'cardio')),
    course('hike','爬山','有氧',['legs'],{legs:1.8},{legs:21},11,9,-1,'爬楼熟练度 1 级，腿耐力上限 ≥76',s=>mastery(count(s,'stairs'))>=1&&cap(s.muscles.legs)>=76),
    course('pingpong','乒乓球','体育运动',['shoulders','arms'],{shoulders:1.3,arms:1.3},{shoulders:7,arms:7},5,8,-.025,'初始开放',()=>true),
    course('basketball','篮球','体育运动',['legs'],{legs:2.4,shoulders:1,arms:1},{legs:15,shoulders:6,arms:6},8,7,-.06,'深蹲完成 3 次，或通过校队观察',s=>count(s,'squat')>=3||passed(s,'team')),
    course('tennis','网球','体育运动',['shoulders','arms'],{shoulders:2,arms:2,legs:1},{shoulders:12,arms:12,legs:7},8,8,-.04,'乒乓球完成 3 次，肩维度 ≥1',s=>count(s,'pingpong')>=3&&s.muscles.shoulders.dimension>=1)
    ,course('hinge','硬拉准备课','撸铁',['legs','back'],{legs:2,back:2,traps:1},{legs:13,back:13,traps:7},9,2,0,'通过基础力量评估',s=>passed(s,'strength')),
    course('agility','灵敏协调课','体育运动',['legs','shoulders'],{legs:1.8,shoulders:1,arms:.8},{legs:10,shoulders:6,arms:5},7,7,-.03,'通过第 2 阶校队观察',s=>passed(s,'team',2))
  ];
  const activities=[
    {id:'rest',name:'完整休息',energy:0,fatigue:-32,mood:8,recovery:24,targets:0,text:'全身耐力 +24，疲劳 −32，心情 +8；同周第二次仅 60%，不恢复行动体力。'},
    {id:'active',name:'主动恢复',energy:8,fatigue:-10,mood:3,recovery:54,targets:2,buff:true,text:'选择 1–2 个部位：耐力 +54；疲劳 −10，心情 +3。消耗 8 行动体力；所选部位下次训练成长加成。'},
    {id:'rehab',name:'康复训练',energy:12,fatigue:-10,mood:3,recovery:24,targets:2,repair:1,text:'选择 1–2 个受伤部位：伤病 −1、耐力 +24；疲劳 −10。消耗 12 行动体力。'}
    ,{id:'social',name:'运动搭子社交',energy:10,fatigue:-5,mood:18,recovery:3,targets:0,unlock:s=>passed(s,'team'),text:'心情 +18，疲劳 −5，全身耐力 +3，消耗 10 行动体力；通过校队观察后开放。'},
    {id:'outdoor',name:'户外放松',energy:8,fatigue:-8,mood:14,recovery:5,targets:0,unlock:s=>passed(s,'cardio'),text:'心情 +14，疲劳 −8，全身耐力 +5，消耗 8 行动体力；通过体能测试后开放。'},
    {id:'corrective',name:'弱项纠正训练',energy:10,fatigue:-12,mood:3,recovery:40,targets:1,repair:1,buff:true,weakOnly:true,unlock:s=>keys.some(k=>s.muscles[k].weakBreakthrough),text:'选择弱项：耐力 +40、伤病 −1，下次成长 +10%；消耗 10 行动体力，首次弱项突破后开放。'}
    ,{id:'specialist',name:'专项状态准备',energy:10,fatigue:-8,mood:3,recovery:45,targets:1,buff:1.15,unlock:s=>passed(s,'specialty'),text:'单部位耐力 +45，下次成长 +15%；疲劳 −8，消耗 10 行动力；专项验证通过后开放。'}
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
  function cap(m){return config.endurance+m.dimension*config.endurancePerDimension+(m.capBonus||0);}
  function requirement(d){return config.growthBase+d*config.growthStep;}
  function blankPlan(){return {slots:Array.from({length:7},()=>null),meal:'balanced'};}
  function initial(options={}){
    const seed=Number.isFinite(options.seed)?options.seed:7,strong=options.strong||keys[((seed%6)+6)%6],weak=options.weak||keys[(keys.indexOf(strong)+1)%6];
    const s={version:4,rules:4,week:1,index:0,mode:'planner',energy:config.energy,fatigue:18,mood:60,fat:25,stage:0,
      muscles:Object.fromEntries(keys.map(k=>[k,{dimension:0,xp:0,endurance:64,injury:0,role:k===strong?'strong':k===weak?'weak':'normal',capBonus:k===strong?8:k===weak?-8:0,weakBreakthrough:false}])),
      counts:{},pendingCounts:{},pendingGrowth:Object.fromEntries(keys.map(k=>[k,0])),advancedCounts:{},plan:blankPlan(),lastPlan:null,logs:[],weeks:[],photos:[],pendingPhoto:null,selectedEnding:null,posePlayed:false,lastFeedback:null,focusState:null,focusHistory:[],preferredRoute:'classic',
      seed,trainingRoute:options.trainingRoute||'balanced',profileConfirmed:!!options.profileConfirmed,restUsed:0,recoveryBuffs:{},weekChoice:null,validationUnlocks:{},assessment:null,retryEnrollment:null,retryOffer:null,validationHistory:[],pendingAssessments:[]};
    keys.forEach(k=>s.muscles[k].endurance=cap(s.muscles[k]));prepareWeek(s);return s;
  }
  function model(s){if(s.rules&&s.rules<4)return Legacy.model(s);return copy({week:s.week||1,rules:4,energy:s.energy,fatigue:s.fatigue,mood:s.mood,fat:s.fat,stage:s.stage,muscles:s.muscles,counts:s.counts,pendingCounts:s.pendingCounts,pendingGrowth:s.pendingGrowth,advancedCounts:s.advancedCounts||{},seed:s.seed??7,trainingRoute:s.trainingRoute||'balanced',restUsed:s.restUsed||0,recoveryBuffs:s.recoveryBuffs||{},validationUnlocks:s.validationUnlocks||{},assessment:s.assessment||null,retryEnrollment:s.retryEnrollment||null});}
  function levels(s,c){const a=[0];if(s.rules&&s.rules<4)return Legacy.levels(s,c);if(s.week>=17&&mastery(count(s,c.id))>=2&&c.main.every(k=>s.muscles[k].dimension>=3))a.push(1);if(s.week>=33&&mastery(count(s,c.id))>=3&&c.main.every(k=>s.muscles[k].dimension>=6))a.push(2);return a;}
  function getCourse(s,slot){
    const c=courses.find(c=>c.id===slot?.id);if(!c)return null;const level=Number(slot.level||0);if(!levels(s,c).includes(level))return null;
    if(s.rules&&s.rules<4)return Legacy.getCourse(s,slot);
    const growth=[1,1.35,1.65][level],cost=[1,1.5,2.2][level],load=[1,1.3,1.6][level];
    const actual={...c,level,name:c.name+(level?' · '+(level===1?'进阶':'专项'):''),growth:Object.fromEntries(Object.entries(c.growth).map(([k,v])=>[k,round(v*growth)])),cost:Object.fromEntries(Object.entries(c.cost).map(([k,v])=>[k,Math.ceil(v*cost)])),fatigue:Math.ceil(c.fatigue*load),fat:c.type==='有氧'?({run:-.16,stairs:-.23,swim:-.18,hike:-.28}[c.id])*(1+level*.08):c.fat};;
    const condition=weekCondition(s),tech=!!slot.tech;
    if(tech&&!(condition.id==='crowded'&&c.id==='bench'))return null;
    if(tech){actual.name+=' · 技术版';actual.growth=Object.fromEntries(Object.entries(actual.growth).map(([k,v])=>[k,round(v*.7)]));actual.cost=Object.fromEntries(Object.entries(actual.cost).map(([k,v])=>[k,Math.ceil(v*.65)]));actual.fatigue=Math.ceil(actual.fatigue*.7);}
    if(condition.id==='crowded'&&c.id==='bench'&&!tech)actual.fatigue+=3;
    if(condition.id==='outdoor'&&['run','hike'].includes(c.id))actual.mood+=3;
    if(condition.id==='buddy'&&c.type==='体育运动')actual.mood+=2;
    if(condition.id==='heat'&&['run','hike'].includes(c.id))actual.fatigue+=2;
    actual.cost=Object.fromEntries(Object.entries(actual.cost).map(([k,v])=>[k,Math.ceil(v*(s.muscles[k].role==='weak'?1.1:1))]));
    return actual;
  }
  function fatigueLabel(n,rules=4){return rules<4?Legacy.fatigueLabel(n):n>60?'明显过载':n>35?'成长效率下降':'状态良好';}
  function moodLabel(n){return n<=30?'训练意愿低':n>=75?'干劲十足':'稳定';}
  function unlocked(s){return courses.filter(c=>c.unlock(s));}
  function risk(s,c){
    if(s.rules&&s.rules<4)return Legacy.risk(s,c);
    const blocked=[],overused=[],injured=[],severe=[],reserve=s.fatigue>60?1.25:s.fatigue>35?1.1:1;
    if(!c||!c.unlock(s))return {ok:false,blocked:['课程或强度尚未解锁'],overused,injured,severe};
    for(const [k,cost] of Object.entries(c.cost)){const m=s.muscles[k];
      if(m.injury>=3)blocked.push(names[k]+'重度伤病，禁止涉及课程');
      else if(m.injury>=2&&c.type==='撸铁'&&c.main.includes(k))blocked.push(names[k]+'中度伤病，不能作为撸铁主练');
      if(m.endurance<cost*reserve)overused.push(k);if(m.endurance<cost/2)severe.push(k);if(m.injury>0)injured.push(k);
    }
    return {ok:blocked.length===0,blocked,overused,injured,severe,reserve};
  }
  function simulate(s,slot,mealId='balanced'){
    if(s.rules&&s.rules<4)return Legacy.simulate(s,slot,mealId);
    const before=model(s),after=model(s),food=meals.find(m=>m.id===mealId)||meals[0],warnings=[],gains={},changes=[];
    const fail=reason=>({ok:false,reason,before,after:before,warnings:[],gains:{},changes:[]});if(!slot)return fail('尚未安排');
    let item,r=null;
    if(slot.kind==='course'){
      item=getCourse(s,slot);r=risk(s,item);if(!r.ok)return fail(r.blocked.join('；'));
      const ff=s.fatigue>60?.6:s.fatigue>35?.82:1,mf=s.mood<=30?.82:s.mood>=75?1.08:1,level=mastery(count(s,item.id));
      for(const [k,base] of Object.entries(item.growth)){
        const injury=s.muscles[k].injury,injuryFactor=injury===0?1:injury===1?.8:.55,over=r.severe.includes(k)?.45:r.overused.includes(k)?.65:1,trait=s.muscles[k].role==='strong'?1.15:1,buff=s.recoveryBuffs?.[k]?(typeof s.recoveryBuffs[k]==='number'?s.recoveryBuffs[k]:1.1):1;
        const value=round(base*config.mastery[level]*mf*ff*injuryFactor*over*trait*buff);gains[k]=value;after.pendingGrowth[k]=round((after.pendingGrowth[k]||0)+value);
        changes.push(names[k]+'成长 +'+value+(trait>1?'（强项 +15%）':'')+(buff>1?'（专项状态加成）':'')+(over<1?'（过度使用 ×'+over+'）':'')+(injury?'（伤病 ×'+injuryFactor+'）':''));
        if(buff>1)delete after.recoveryBuffs[k];
      }
      for(const [k,cost] of Object.entries(item.cost))after.muscles[k].endurance=Math.max(0,s.muscles[k].endurance-cost);
      for(const k of r.overused){after.muscles[k].injury=clamp(after.muscles[k].injury+1,0,3);warnings.push(names[k]+(r.severe.includes(k)?'耐力严重不足':'耐力储备不足')+'：成长降低、伤病 +1'+(r.reserve>1?'（当前疲劳提高安全储备要求）':''));}
      if(ff<1)warnings.push('疲劳 '+s.fatigue+'：本课成长 ×'+ff);if(mf<1)warnings.push('低心情：本课成长 ×0.82');
      after.fatigue+=item.fatigue+r.overused.length*4+r.injured.length*2+(item.main.some(k=>s.muscles[k].role==='weak')?2:0);
      after.mood+=item.mood-(s.fatigue>60?2:0)-r.injured.length;after.fat+=item.fat;
      after.pendingCounts[item.id]=(after.pendingCounts[item.id]||0)+1;if(item.level)after.advancedCounts[item.id]=(after.advancedCounts[item.id]||0)+1;
    }else if(slot.kind==='activity'){
      const base=activities.find(a=>a.id===slot.id);if(!base||!activityAvailable(s,base))return fail('活动尚未解锁');
      item={...base};const targets=[...new Set(slot.targets||[])];
      if(item.targets&&(targets.length<1||targets.length>item.targets||targets.some(k=>!keys.includes(k))))return fail('请选择 '+(item.targets===1?'1':'1–2')+' 个有效部位');
      if(item.weakOnly&&targets.some(k=>s.muscles[k].role!=='weak'))return fail('纠正训练仅针对先天弱项');
      if(item.id==='rehab'&&targets.some(k=>s.muscles[k].injury<1))return fail('康复只能选择受伤部位');
      if(s.energy<item.energy)return fail('行动体力不足，需要 '+item.energy);
      const factor=item.id==='rest'&&after.restUsed>=1?.6:1;
      if(item.id==='rest'){after.restUsed++;if(factor<1)warnings.push('同周第二次完整休息：恢复效果为 60%');}
      after.energy-=item.energy;after.fatigue+=item.fatigue*factor;after.mood+=item.mood*factor;
      for(const k of item.id==='rest'||!item.targets?keys:targets){
        after.muscles[k].endurance=Math.min(cap(after.muscles[k]),after.muscles[k].endurance+item.recovery*factor);
        if(item.repair)after.muscles[k].injury=Math.max(0,after.muscles[k].injury-item.repair);
        if(item.buff)after.recoveryBuffs[k]=item.buff===true?1.1:item.buff;
      }
      changes.push(item.name+(factor<1?'（本周重复 ×0.6）':'')+'：耐力 +'+round(item.recovery*factor)+'，疲劳 '+round(item.fatigue*factor)+'，心情 +'+round(item.mood*factor)+(item.buff?'；所选部位下次训练成长 +10%':'')+(item.repair?'；伤病 −1':''));
    }else return fail('未知排程类型');
    const courseAfter=copy(after);
    after.energy=clamp(after.energy+food.energy,0,100);after.fatigue=round(clamp(after.fatigue+food.fatigue,0,100));after.mood=round(clamp(after.mood+food.mood,0,100));
    after.fat=round(clamp(after.fat+food.fat+(22-s.fat)*.025,10,38));
    for(const k of keys)after.muscles[k].endurance=round(Math.min(cap(after.muscles[k]),after.muscles[k].endurance+food.recovery));
    return {ok:true,before,after,courseAfter,item,food,risk:r,warnings,gains,changes};
  }
  function settle(s,week=0){
    if(s.rules&&s.rules<4)return Legacy.settle(s,week);
    const after=model(s),dimensions=[],upgrades=[],breakthroughs=[],growthTotals=copy(after.pendingGrowth),weekCounts=copy(after.pendingCounts);
    for(const k of keys){const m=after.muscles[k],old=m.dimension;m.xp=round(m.xp+(after.pendingGrowth[k]||0));while(m.xp+1e-8>=requirement(m.dimension)){m.xp=round(m.xp-requirement(m.dimension));m.dimension++;}if(m.dimension>old)dimensions.push({key:k,from:old,to:m.dimension});if(m.role==='weak'&&!m.weakBreakthrough&&m.dimension>=1){m.weakBreakthrough=true;m.capBonus=(m.capBonus||0)+10;breakthroughs.push(k);}after.pendingGrowth[k]=0;}
    for(const [id,n] of Object.entries(after.pendingCounts)){const old=mastery(count(after,id));after.counts[id]=(after.counts[id]||0)+n;const next=mastery(count(after,id));if(next>old)upgrades.push({id,from:old,to:next});}
    after.pendingCounts={};after.mood=clamp(after.mood+dimensions.length*2+upgrades.length*2+(config.stageWeeks.includes(week)?4:0),0,100);
    const validationResults=[];if(week&&after.assessment?.dueWeek===week)validationResults.push(evaluateAssessment(after,after.assessment,'regular'));if(week&&after.retryEnrollment?.dueWeek===week){validationResults.push(evaluateAssessment(after,after.retryEnrollment,'retry'));after.retryEnrollment=null;}for(const result of validationResults)if(result.passed){after.validationUnlocks[result.id]=Math.max(after.validationUnlocks[result.id]||0,result.tier);after.mood=clamp(after.mood+3,0,100);}
    const newCourses=unlocked(after).filter(c=>!unlocked(s).some(old=>old.id===c.id)).map(c=>c.id);
    return {after,dimensions,upgrades,newCourses,breakthroughs,validationResults,growthTotals,weekCounts};
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
  function startWeek(s){const f=forecast(s);if(s.mode!=='planner'||s.week>config.weeks||!f.ok||(s.rules>=4&&!s.profileConfirmed))return false;ensureFocus(s);s.mode='daily';s.index=0;s.lastPlan=copy(s.plan);s.weekStart=model(s);return true;}
  function execute(s,expected){
    const token=s.week+':'+s.index;if(s.mode!=='daily'||s.pendingPhoto||s.pendingAssessments?.length||expected!==token)return null;
    const result=simulate(s,s.plan.slots[s.index],s.plan.meal);if(!result.ok)return result;
    Object.assign(s,result.after);s.lastFeedback={week:s.week,index:s.index,item:result.item.name,id:result.item.id,type:s.plan.slots[s.index].kind==='course'?result.item.type:'活动',level:result.item.level||0,changes:result.changes,warnings:result.warnings,food:result.food.name,fatigue:s.fatigue,mood:s.mood};
    s.logs.push(copy(s.lastFeedback));s.index++;
    if(s.index===7){const settled=settle(s,s.week);Object.assign(s,settled.after);const summary={week:s.week,dimensions:settled.dimensions,upgrades:settled.upgrades,newCourses:settled.newCourses,breakthroughs:settled.breakthroughs||[],validations:settled.validationResults||[],growth:settled.growthTotals||{},weekCounts:settled.weekCounts||{},plan:copy(s.plan),before:copy(s.weekStart),after:model(s)};s.weeks.push(summary);s.summary=summary;for(const result of settled.validationResults||[]){s.validationHistory.push(copy(result));s.pendingAssessments.push(copy(result));if(result.passed&&s.retryOffer?.id===result.id&&result.tier>=s.retryOffer.tier)s.retryOffer=null;else if(!result.passed&&(!s.retryOffer||result.kind==='regular'||result.tier>=s.retryOffer.tier))s.retryOffer={id:result.id,tier:result.tier,availableWeek:s.week+2,originWeek:s.week};}s.mode=s.week===config.weeks?'complete':'summary';
      ensureFocus(s);if(!keys.some(k=>s.muscles[k].injury)&&s.fatigue<=35)s.focusState.goodWeeks++;
      if(config.stageWeeks.includes(s.week)){const progress=focusProgress(s);s.focusHistory.push({...progress,week:s.week});const photo=snapshot(s,s.week);s.photos.push(photo);s.pendingPhoto=s.week;}if(s.mode==='complete')s.selectedEnding=endings(s).find(e=>e.eligible).id;
    }
    return result;
  }
  function nextWeek(s){if(s.mode!=='summary'||s.pendingPhoto||s.pendingAssessments?.length||s.week>=config.weeks)return false;s.week++;s.rules=4;prepareWeek(s);if(s.migrationNote)s.migrationNote='旧档已启用新规则，更新前的备份已保留。';s.index=0;s.energy=config.energy;s.plan=s.lastPlan?copy(s.lastPlan):blankPlan();s.mode='planner';s.lastFeedback=null;s.summary=null;ensureFocus(s);return true;}
  function advanceWeek(s,expected,options={}){if(s.mode!=='daily'||expected!==s.week+':'+s.index)return {processed:0,stopped:null};let processed=0,stopped=null;while(s.mode==='daily'&&!s.pendingPhoto&&!s.pendingAssessments?.length){const beforeFatigue=s.fatigue,beforeMood=s.mood,r=execute(s,s.week+':'+s.index);if(!r?.ok){stopped=r?.reason||'执行暂停';break;}processed++;const threshold=(beforeFatigue<=35&&s.fatigue>35)||(beforeFatigue<=60&&s.fatigue>60)||(beforeMood>30&&s.mood<=30);if(s.mode==='daily'&&(r.risk?.overused.length||(options.pauseOnThreshold!==false&&threshold))){stopped=r.risk?.overused.length?'出现伤病变化，请查看后继续':'状态跨入效率区间，已暂停';break;}}return {processed,stopped};}

  const conditions=[{id:'normal',name:'常规训练周',text:'按基础效果执行。'},{id:'outdoor',name:'户外条件良好',text:'跑步、爬山心情额外 +3，已计入预览。'},{id:'crowded',name:'卧推区拥挤',text:'普通卧推疲劳 +3；技术版成长 70%、消耗 65%、基础疲劳 70%。'},{id:'buddy',name:'搭子到馆',text:'体育运动心情额外 +2。'},{id:'heat',name:'户外偏闷热',text:'跑步、爬山疲劳额外 +2，可改室内课程。'}];
  const assessmentDefs={specialty:{name:'专项突破检验',reward:'开放专项状态准备活动：单部位下次成长 +15%。'},strength:{name:'基础力量评估',reward:'开放硬拉准备课与力量路线。'},cardio:{name:'基础体能测试',reward:'开放爬楼、游泳与户外放松。'},team:{name:'校队观察日',reward:'开放篮球、搭子社交，后续开放灵敏协调。'}};
  function passed(s,id,tier=1){return (s.validationUnlocks?.[id]||0)>=tier;}
  function weekCondition(s){return conditions[((Math.trunc(Number(s.seed??7))+Number(s.week||1)-1)%5+5)%5];}
  function activityAvailable(s,a){return !!a&&(!a.unlock||a.unlock(s));}
  function defaultAssessment(s){return s.week>4&&s.trainingRoute!=='balanced'?'specialty':s.preferredRoute==='lean'?'cardio':s.preferredRoute==='sport'?'team':'strength';}
  function prepareWeek(s){
    s.seed=s.seed??7;s.trainingRoute=s.trainingRoute||'balanced';s.validationUnlocks=s.validationUnlocks||{};s.validationHistory=s.validationHistory||[];s.pendingAssessments=s.pendingAssessments||[];s.recoveryBuffs=s.recoveryBuffs||{};
    if(s.preparedWeek!==s.week){s.restUsed=0;s.weekChoice=null;s.preparedWeek=s.week;for(const p of [s.plan,s.lastPlan])if(p?.slots)p.slots=p.slots.map(x=>x?.tech?{...x,tech:false}:x);}
    if(!s.assessment||s.assessment.dueWeek<s.week)s.assessment={id:defaultAssessment(s),dueWeek:Math.ceil(s.week/4)*4,tier:Math.ceil(s.week/4),manual:false};
    else if(!s.assessment.manual&&s.mode==='planner')s.assessment.id=defaultAssessment(s);
  }
  function chooseRoute(s,id){if(s.mode!=='planner'||s.week!==1||s.logs.length||!['strong','weak','balanced'].includes(id))return false;s.trainingRoute=id;s.profileConfirmed=true;return true;}
  function rollProfile(s){if(s.mode!=='planner'||s.week!==1||s.logs.length)return false;const sn=(keys.findIndex(k=>s.muscles[k].role==='strong')+1)%6,wn=(sn+2)%6;keys.forEach((k,i)=>{Object.assign(s.muscles[k],{role:i===sn?'strong':i===wn?'weak':'normal',capBonus:i===sn?8:i===wn?-8:0,weakBreakthrough:false});s.muscles[k].endurance=cap(s.muscles[k]);});return true;}
  function profile(s){return {strong:keys.find(k=>s.muscles[k].role==='strong')||null,weak:keys.find(k=>s.muscles[k].role==='weak')||null,route:s.trainingRoute||'balanced'};}
  function enroll(s,id){if(s.mode!=='planner'||!assessmentDefs[id]||(id==='specialty'&&s.week<=4))return false;prepareWeek(s);s.assessment={id,dueWeek:Math.ceil(s.week/4)*4,tier:Math.ceil(s.week/4),manual:true};return true;}
  function assessmentProgress(s,booking=s.assessment){
    if(!booking)return null;const tier=booking.tier||1,rows=[];
    const need=(key,label,value,target)=>rows.push({key,label,value:round(value),target,passed:value>=target,remaining:round(Math.max(0,target-value))});
    const max=(key,label,value,target)=>rows.push({key,label,value:round(value),target,passed:value<=target,remaining:round(Math.max(0,value-target)),direction:'max'});
    if(booking.id==='specialty'){
      const p=profile(s),target=booking.target||(s.trainingRoute==='weak'?p.weak:p.strong)||'chest';need('dimension',names[target]+'维度',s.muscles[target].dimension,1+Math.floor((tier-1)/2));need('specific',names[target]+'主练课次数',courses.filter(c=>c.main.includes(target)).reduce((n,c)=>n+count(s,c.id),0),4+Math.max(0,tier-2)*3);max('injury',names[target]+'伤病',s.muscles[target].injury,1);max('fatigue','疲劳',s.fatigue,50);
    }else if(booking.id==='strength'){
      for(const k of ['chest','back','legs'])need(k,names[k]+'维度',s.muscles[k].dimension,1+Math.floor((tier-1)/2));
      for(const id of ['bench','row','squat'])need(id,courses.find(c=>c.id===id).name+'有效次数',count(s,id),2+(tier-1)*2);
      max('injury','最高伤病等级',Math.max(...keys.map(k=>s.muscles[k].injury)),2);
    }else if(booking.id==='cardio'){
      need('run','跑步有效次数',count(s,'run'),3+(tier-1)*2);
      if(tier>1){need('aerobic','有氧合计次数',typeCount(s,'有氧'),6+(tier-2)*5);need('legs','腿维度',s.muscles.legs.dimension,Math.ceil(tier/2));}
      need('endurance','腿当前耐力',s.muscles.legs.endurance,Math.ceil(Math.min(40+(tier-1)*3,cap(s.muscles.legs)*.7)));
      max('fatigue','疲劳',s.fatigue,45);max('injury','腿伤病',s.muscles.legs.injury,1);
    }else{
      need('sport','单项体育有效次数',Math.max(...courses.filter(c=>c.type==='体育运动').map(c=>count(s,c.id))),tier===1?3:6+(tier-2)*3);
      need('mood','心情',s.mood,tier===1?70:65);max('shoulder-injury','肩伤病',s.muscles.shoulders.injury,0);max('leg-injury','腿伤病',s.muscles.legs.injury,0);
      if(tier>1)need('legs','腿维度',s.muscles.legs.dimension,Math.ceil((tier-1)/3));
      if(tier>=3)need('variety','完成至少 3 次的体育项目',courses.filter(c=>c.type==='体育运动'&&count(s,c.id)>=3).length,2);
    }
    const def=assessmentDefs[booking.id],complete=rows.every(r=>r.passed),score=Math.round(rows.reduce((n,r)=>n+(r.direction==='max'?(r.passed?1:(r.target+1)/(r.value+1)):Math.min(1,r.value/r.target)),0)/rows.length*100);
    return {...booking,name:def.name+(tier>1?' · 第 '+tier+' 阶':''),reward:def.reward,rows,complete,score};
  }
  function evaluateAssessment(s,booking,kind){const p=assessmentProgress(s,booking);return {...p,attemptId:booking.dueWeek+':'+kind+':'+booking.id+':'+booking.tier,week:booking.dueWeek,kind,passed:p.complete,grade:p.complete?(s.fatigue<=25&&s.mood>=75?'S':'A'):p.score>=75?'B':'C',suggestions:p.rows.filter(r=>!r.passed).slice(0,3).map(r=>r.label+(r.direction==='max'?'需降至 ≤':'还差 ')+(r.direction==='max'?r.target:r.remaining))};}
  function bookRetry(s){const o=s.retryOffer;if(s.mode!=='planner'||!o||s.week<o.availableWeek||s.retryEnrollment)return false;s.retryEnrollment={id:o.id,tier:o.tier,dueWeek:s.week,originWeek:o.originWeek};s.retryOffer=null;return true;}
  function acknowledgeAssessment(s){if(!s.pendingAssessments?.length)return false;s.pendingAssessments.shift();return true;}
  function weekOptions(s){const weak=profile(s).weak||keys[0];return [{id:'weak',name:'教练陪练弱项',cost:10,text:names[weak]+'下次成长 +10%，消耗 10 行动力',target:weak},{id:'buddy',name:'和搭子聊一会儿',cost:8,text:'心情 +10，消耗 8 行动力'},{id:'decline',name:'按原计划准备',cost:0,text:'无消耗，不改变状态'}];}
  function chooseWeekOption(s,id){if(s.mode!=='planner'||s.weekChoice!==null)return false;const o=weekOptions(s).find(o=>o.id===id);if(!o||s.energy<o.cost)return false;s.energy-=o.cost;if(o.target)s.recoveryBuffs[o.target]=true;if(id==='buddy')s.mood=clamp(s.mood+10,0,100);s.weekChoice=id;return true;}
  function unlockProgress(s){
    const entries=[['press','卧推',count(s,'bench'),3],['pulldown','杠铃划船',count(s,'row'),3],['curl','推拉课合计',['bench','row','press','pulldown'].reduce((n,id)=>n+count(s,id),0),5],['lateral','哑铃推举',count(s,'press'),3],['deadlift','深蹲',count(s,'squat'),3],['stairs','跑步',count(s,'run'),3],['swim','有氧合计',typeCount(s,'有氧'),5],['hike','爬楼',count(s,'stairs'),3],['basketball','深蹲',count(s,'squat'),3],['tennis','乒乓球',count(s,'pingpong'),3]];
    return entries.map(([id,label,value,target])=>({id,name:courses.find(c=>c.id===id).name,label,value,target,remaining:Math.max(0,target-value),extra:id==='deadlift'?'另需腿维度 ≥1':id==='hike'?'另需腿耐力上限 ≥76':id==='tennis'?'另需肩维度 ≥1':''})).filter(x=>!courses.find(c=>c.id===x.id).unlock(s)).sort((a,b)=>a.remaining-b.remaining);
  }
  function breakthroughHints(s){return keys.map(k=>{const m=s.muscles[k],remaining=round(requirement(m.dimension)-m.xp);const best=unlocked(s).map(c=>({c,r:simulate(s,{kind:'course',id:c.id},s.plan.meal)})).filter(x=>x.r.ok&&x.r.gains[k]>0).sort((a,b)=>b.r.gains[k]-a.r.gains[k])[0];return {key:k,name:names[k],xp:m.xp,target:requirement(m.dimension),dimension:m.dimension,remaining,course:best?.c.name||null,estimated:best?Math.ceil(remaining/best.r.gains[k]):null};}).sort((a,b)=>a.remaining-b.remaining);}
  function coursePurpose(s,c){const a=assessmentProgress(s),related=!!a&&(a?.id==='specialty'?c.main.includes((s.trainingRoute==='weak'?profile(s).weak:profile(s).strong)||'chest'):a?.id==='strength'?c.type==='撸铁':a?.id==='cardio'?c.type==='有氧':c.type==='体育运动'),next=unlockProgress(s).find(x=>x.label===c.name);return (related?'服务第 '+a.dueWeek+' 周'+a.name:'补充'+c.type+'记录')+(next?'；'+c.name+' '+next.value+'/'+next.target+'，推进'+next.name:'');}
  function suggestions(s,p=s.plan){
    const f=forecast(s,p),list=[];if(p.slots.some(x=>!x))return [{text:'先补齐 '+Math.max(0,5-f.courseN)+' 门课程和 '+Math.max(0,2-f.activityN)+' 次活动，再检查后续日期。'}];
    const risky=f.rows.find(r=>!r.result.ok||r.result.risk?.overused.length),tired=f.rows.find(r=>r.result.ok&&r.before.fatigue>35);
    if(risky){
      const source=risky.before,c=getCourse(source,p.slots[risky.index]),targets=(!risky.result.ok?Object.keys(c?.cost||{}).filter(k=>source.muscles[k].injury>0):risky.result.risk.overused).slice(0,2),kind=targets.some(k=>source.muscles[k].injury>=2)?'rehab':'active';
      for(let j=0;j<7&&targets.length;j++)if(p.slots[j]?.kind==='activity'){const trial=copy(p);trial.slots[j]={kind:'activity',id:kind,targets};if(j>risky.index){const moved=trial.slots.splice(j,1)[0];trial.slots.splice(risky.index,0,moved);}const test=forecast(s,trial),sum=x=>x.rows.reduce((n,r)=>n+(r.result.risk?.overused.length||0),0);if(test.ok&&(!f.ok||sum(test)<sum(f))){list.push({text:'把一次'+(kind==='rehab'?'康复':'主动恢复')+'移到第 '+(risky.index+1)+' 日训练前，针对'+targets.map(k=>names[k]).join('、')+'；已重新预测，可减少当前伤病风险。',plan:trial});break;}}
      if(!list.length)list.push({text:'第 '+(risky.index+1)+' 日'+(risky.result.reason||risky.result.warnings.join('；'))+'，优先恢复该部位，或改练未受影响肌群。',date:risky.index});
    }
    if(tired&&list.length<3)list.push({text:'第 '+(tired.index+1)+' 日前疲劳 '+round(tired.before.fatigue)+'，可将完整休息前移；局部耐力不足时优先主动恢复。',date:tired.index});
    const goal=assessmentProgress(f.settlement.after,s.assessment),gap=goal?.rows.find(r=>!r.passed);
    if(goal?.rows.some(r=>r.key==='fatigue'&&!r.passed)&&list.length<3){for(let j=0;j<7;j++)if(p.slots[j]?.kind==='activity'){const trial=copy(p),moved={kind:'activity',id:'rest',targets:[]};trial.slots.splice(j,1);trial.slots.push(moved);const check=forecast(s,trial);if(check.ok&&check.settlement.after.fatigue<f.settlement.after.fatigue){list.push({text:'把一次完整休息放到周末，预计疲劳 '+f.settlement.after.fatigue+' → '+check.settlement.after.fatigue+'；其他验证条件仍按周览检查。',plan:trial});break;}}}if(gap&&list.length<3)list.push({text:'本周后距离'+goal.name+'：'+gap.label+(gap.direction==='max'?'需降到 '+gap.target:'还差 '+gap.remaining)+'，调整相关课程或周末恢复。'});
    const next=unlockProgress(s)[0];if(next&&list.length<3)list.push({text:next.name+'解锁：'+next.label+' '+next.value+'/'+next.target+'。'+(next.extra||'下周可优先安排相关课程。')});
    if(!list.length)list.push({text:'本周未发现硬性阻碍，可继续推进已报名验证，保留重点部位的恢复。'});return list.slice(0,3);
  }

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
    prepareWeek(s);
    // Beam search uses exactly the same deterministic per-date forecast as execution.
    const available=unlocked(s),injuryCost=x=>keys.reduce((n,k)=>n+x.muscles[k].injury*14,0);
    let beam=[{state:model(s),slots:[],c:0,a:0,score:0}];
    for(let day=0;day<7;day++){
      const candidates=[];
      for(const node of beam){
        const options=[];
        if(node.c<5)for(const c of available)for(const level of levels(s,c)){options.push({kind:'course',id:c.id,level});if(weekCondition(s).id==='crowded'&&c.id==='bench')options.push({kind:'course',id:c.id,level,tech:true});}
        if(node.a<2){options.push({kind:'activity',id:'rest',targets:[]});
          const hurt=keys.filter(k=>node.state.muscles[k].injury>0).sort((a,b)=>node.state.muscles[b].injury-node.state.muscles[a].injury);
          if(hurt.length)options.push({kind:'activity',id:'rehab',targets:hurt.slice(0,2)});
          const low=keys.slice().sort((a,b)=>node.state.muscles[a].endurance/cap(node.state.muscles[a])-node.state.muscles[b].endurance/cap(node.state.muscles[b]));
          options.push({kind:'activity',id:'active',targets:low.slice(0,2)});
          const chosen=profile(s),target=s.trainingRoute==='weak'?chosen.weak:chosen.strong;if(target)for(const id of ['corrective','specialist']){const a=activities.find(a=>a.id===id);if(activityAvailable(s,a)&&(!a.weakOnly||target===chosen.weak))options.push({kind:'activity',id,targets:[target]});}
          for(const id of ['social','outdoor'])if(activityAvailable(s,activities.find(a=>a.id===id))&&node.state.mood<65)options.push({kind:'activity',id,targets:[]});
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
            const p=profile(s);if(s.trainingRoute==='strong'&&p.strong&&c.growth[p.strong])reward+=Math.min(4,c.growth[p.strong]*.7);if(s.trainingRoute==='weak'&&p.weak&&c.growth[p.weak])reward+=Math.min(5,c.growth[p.weak]);
            const goal=assessmentProgress(node.state,s.assessment);if(goal){const related=goal.id==='strength'?['bench','row','squat'].includes(c.id):goal.id==='cardio'?c.id==='run':c.type==='体育运动';if(related&&!goal.complete)reward+=1.5;const needed=goal.rows.find(r=>r.key===c.id&&r.direction!=='max'&&count(node.state,c.id)+(node.state.pendingCounts[c.id]||0)<r.target);if(needed)reward+=9;}
            const focus=s.focusState;
            if(focus?.choice==='weak'&&c.growth[focus.weak])reward+=Math.min(3,c.growth[focus.weak]*.6);
            if(focus?.choice==='intensity'&&slot.level)reward+=1;
            if(focus?.choice==='mastery'&&mastery(count(s,c.id))<3)reward+=1.5;
            if(focus?.choice==='balance'){
              const min=Math.min(...keys.map(k=>s.muscles[k].dimension));reward+=c.main.some(k=>s.muscles[k].dimension===min)?1.5:0;
            }
          }
          const restored=slot.kind==='activity'?keys.reduce((n,k)=>n+Math.max(0,r.courseAfter.muscles[k].endurance-node.state.muscles[k].endurance),0):0;
          let score=node.score+reward-(injuryCost(r.after)-injuryCost(node.state))-.035*Math.max(0,r.after.fatigue-30)+.012*(r.after.mood-node.state.mood)+restored*.025;
          if(day===6&&s.assessment?.dueWeek===s.week){const progress=assessmentProgress(settle(r.after,s.week).after,s.assessment);score+=progress.complete?6:progress.score/100*2;}
          candidates.push({state:r.after,slots:node.slots.concat([slot]),c:cN,a:aN,score});
        }
      }
      candidates.sort((a,b)=>b.score-a.score);beam=candidates.slice(0,28);if(!beam.length)return null;
    }
    return {slots:beam[0].slots,meal:s.plan.meal};
  }
  root.IronV2={config,names,keys,courses,activities,meals,initial,blankPlan,model,copy,round,cap,requirement,mastery,count,typeCount,risk,simulate,settle,forecast,snapshot,endings,unlocked,startWeek,execute,nextWeek,autoPlan,fatigueLabel,moodLabel,getCourse,levels,advanceWeek,phaseInfo,weekCondition,activityAvailable,prepareWeek,chooseRoute,rollProfile,profile,enroll,assessmentProgress,evaluateAssessment,assessmentDefs,bookRetry,acknowledgeAssessment,weekOptions,chooseWeekOption,unlockProgress,breakthroughHints,coursePurpose,suggestions,passed,focusChoices,focusProgress,setFocus,canChooseFocus,ensureFocus};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.IronV2;
})(globalThis);
