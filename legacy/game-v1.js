/* 铁馆百日记 V1 · 目标体型、五日计划与阶段体检。 */
(() => {
  "use strict";
  const KEY="iron100-v2",VERSION=5;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const round=v=>Math.round(v*10)/10;
  const signed=v=>(v>=0?"+":"")+round(v);
  const muscleNames={chest:"胸",back:"背",shoulders:"肩",arms:"手臂",legs:"腿",traps:"斜方肌"};
  const blankDraft=()=>({protein:null,carb:null,method:null});
  const newPlan=()=>({courses:Array(5).fill(null),recipes:[],batches:[null,null],batchDrafts:[blankDraft(),blankDraft()],activeBatch:0,meals:Array(5).fill(null),activeDay:0});
  const initialMuscles={chest:10,back:10,shoulders:9,arms:9,legs:10,traps:8};
  const entryPhoto={day:0,fat:25,stage:6,muscles:clone(initialMuscles)};
  const initial={version:VERSION,goal:null,day:1,mode:"planner",plannerStep:0,energy:52,fatigue:18,mood:60,fat:25,stage:6,muscles:clone(initialMuscles),shown:clone(entryPhoto),photos:[clone(entryPhoto)],plan:newPlan(),recentTargets:[],history:[],dailyLog:[],pendingOpportunity:null,pendingStage:null,report:null,lastQuick:null,summary:null,lastExecuted:0,lastPlan:null,cycleBefore:null,finalResult:null,opportunityHistory:[],opportunityCounts:{},badges:[],foodBuff:null,trainingCounts:{},unlocked:[],recommendation:null,selectedMuscle:null};
  const goals={
    mass:{name:"厚实增肌",icon:"🏋",weights:{mass:.70,balance:.20,lines:.10},text:"块头优先，基础比例与恢复也要顾上。",hint:"优先安排力量与恢复，适量有氧管理体脂。",title:"铁馆厚实派"},
    classic:{name:"均衡古典",icon:"⚖",weights:{mass:.25,balance:.65,lines:.10},text:"关注肌群差距，练出协调的整体比例。",hint:"看预测弱项是否改善，再决定补强哪一天。",title:"比例雕刻师"},
    lean:{name:"干净线条",icon:"✦",weights:{mass:.15,balance:.15,lines:.70},text:"控制体脂，同时保留能被灯光看见的肌肉。",hint:"力量保肌、有氧调脂，低心情时留好恢复。",title:"聚光线条派"}
  };
  const ingredients={
    protein:[
      {id:"chicken",name:"鸡胸",icon:"🍗",unlock:1,growth:.17,fatigue:-2,energy:0,mood:0,fat:.1},
      {id:"beef",name:"牛肉",icon:"🥩",unlock:1,growth:.18,fatigue:-3,energy:1,mood:1,fat:.45},
      {id:"fish",name:"白鱼",icon:"🐟",unlock:1,growth:.13,fatigue:-2,energy:0,mood:-1,fat:-.35},
      {id:"egg",name:"鸡蛋",icon:"🥚",unlock:1,growth:.11,fatigue:-1,energy:0,mood:2,fat:.2}],
    carb:[
      {id:"rice",name:"米饭",unlock:1,energy:5,fat:.3},
      {id:"noodles",name:"面条",unlock:1,energy:8,fat:.7},
      {id:"oats",name:"燕麦",unlock:1,energy:4,fat:.1,fatigue:-1},
      {id:"sweet",name:"红薯",unlock:41,energy:3,fat:-.25}],
    method:[
      {id:"plain",name:"清淡",unlock:1,mood:0,fatigue:-1,fat:-.1},
      {id:"salad",name:"沙拉",unlock:1,mood:-1,fatigue:-2,fat:-.35},
      {id:"spicy",name:"香辣",unlock:21,mood:6,fatigue:0,fat:.2},
      {id:"stew",name:"炖煮",unlock:61,mood:3,energy:2,fatigue:-6,fat:.2}]
  };
  const presets={
    muscle:{name:"增肌组合",draft:{protein:"chicken",carb:"rice",method:"plain"}},
    happy:{name:"快乐组合",draft:{protein:"beef",carb:"noodles",method:"spicy"}},
    line:{name:"线条组合",draft:{protein:"fish",carb:"sweet",method:"plain"}},
    recovery:{name:"恢复组合",draft:{protein:"beef",carb:"rice",method:"stew"}}
  };
      const courses = [
        { id:"push", icon:"🫸", name:"推日", unlock:1, type:"力量", targets:{ chest:3.0, shoulders:1.4, arms:.8 }, fatigue:14, mood:1, text:"胸肩手臂一起上班。" },
        { id:"pull", icon:"🪝", name:"拉日", unlock:1, type:"力量", targets:{ back:3.1, arms:1.2, traps:1.8 }, fatigue:14, mood:1, text:"背阔肌终于被点名。" },
        { id:"legs", icon:"🦵", name:"腿日", unlock:1, type:"力量", targets:{ legs:4.1, traps:.4 }, fatigue:18, mood:-1, text:"楼梯从此有了你的名字。" },
        { id:"treadmill", icon:"🏃", name:"跑步机", unlock:1, type:"有氧", targets:{}, fatigue:7, mood:2, fat:-.9, text:"原地赶路，心肺点赞。" },
        { id:"rest", icon:"🛋️", name:"休息恢复", unlock:1, type:"恢复", targets:{}, fatigue:-15, mood:7, energy:6, text:"肌肉今天自己施工。" },
        { id:"arms", icon:"💪", name:"肩臂日", unlock:21, type:"力量", targets:{ shoulders:2.0, arms:3.5, chest:.5 }, fatigue:12, mood:2, text:"袖口压力开始测试。" },
        { id:"bike", icon:"🚴", name:"动感单车", unlock:21, type:"有氧", targets:{ legs:.5 }, fatigue:5, mood:5, fat:-.65, text:"假装自己在环法。" },
        { id:"full", icon:"🏋️", name:"全身训练", unlock:41, type:"力量", targets:{ chest:1.1, back:1.1, shoulders:1, arms:1, legs:1.2, traps:.6 }, fatigue:16, mood:2, text:"效率很高，表情管理很难。" },
        { id:"stairs", icon:"🪜", name:"爬楼机", unlock:41, type:"有氧", targets:{ legs:.9 }, fatigue:10, mood:1, fat:-1.3, text:"台阶不多，灵魂很多。" }
      ];

  courses.push(
    {id:"weak",icon:"🎯",name:"弱项补强",unlock:61,type:"力量",targets:{},fatigue:11,mood:2,text:"今天让最落后的肌群领一次工资。"},
    {id:"precision",icon:"📐",name:"肩背专项",unlock:81,type:"力量",targets:{shoulders:2,back:1.8,traps:.3},fatigue:10,mood:2,text:"肩线展开，背阔别再装睡。"}
  );
      const legacyRecipes = [
        { id:"chicken", icon:"🍗", name:"鸡胸米饭盒", unlock:1, servings:3, ingredients:"鸡胸 · 米饭 · 西兰花", growth:.18, fatigue:-3, energy:4, mood:0, fat:.35, text:"朴素，但身体听得懂。" },
        { id:"balanced", icon:"🥗", name:"均衡沙拉碗", unlock:1, servings:3, ingredients:"鸡蛋 · 土豆 · 时蔬", growth:.08, fatigue:-5, energy:3, mood:2, fat:-.5, text:"稳定发挥，不走极端。" },
        { id:"oats", icon:"🥣", name:"蛋白燕麦杯", unlock:1, servings:3, ingredients:"燕麦 · 酸奶 · 蛋白粉", growth:.14, fatigue:-1, energy:6, mood:1, fat:.2, text:"摇匀之前先摇醒自己。" },
        { id:"noodle", icon:"🍜", name:"快乐牛肉面", unlock:21, servings:3, ingredients:"牛肉 · 面条 · 汤底", growth:.07, fatigue:-2, energy:9, mood:7, fat:1.1, text:"心情和体脂都知道它好吃。" },
        { id:"cut", icon:"🐟", name:"赛前鱼薯餐", unlock:41, servings:3, ingredients:"白鱼 · 红薯 · 绿叶菜", growth:.11, fatigue:-2, energy:2, mood:-1, fat:-1.05, text:"线条上线，快乐稍后再说。" },
        { id:"steak", icon:"🥩", name:"牛排恢复餐", unlock:61, servings:3, ingredients:"牛排 · 米饭 · 芦笋", growth:.22, fatigue:-6, energy:6, mood:3, fat:.65, text:"恢复速度让教练闭嘴。" }
      ];

  const opportunities={
    coach:{title:"教练留了一个训练空档",texts:["阿铁愿意盯住你的弱项：别又把弱项练成了盲区。","教练拿出小本子，准备把‘下次一定’改成今天执行。","教练问：今天补短板，还是先学会安排恢复？"],options:[
      {id:"focus",name:"接受弱项指导",cost:13,weak:1.6,fatigue:5,text:"最弱肌群 +1.6，疲劳 +5"},
      {id:"advice",name:"复盘恢复安排",cost:5,fatigue:-6,mood:3,text:"疲劳 −6，心情 +3；保留体力"}]},
    buddy:{title:"搭子发来邀约",texts:["搭子说今天不卷重量，先把训练热情找回来。","搭子带来了新的歌单，前奏听起来就很重。","有人愿意陪你练，但请先说清楚练什么。"],options:[
      {id:"chat",name:"散步聊训练",cost:5,mood:10,fatigue:-2,text:"心情 +10，疲劳 −2"},
      {id:"pose",name:"互拍舞台动作",cost:10,stage:5,mood:2,text:"舞台表现 +5，心情 +2"}]},
    rack:{title:"器械位空出来了",texts:["深蹲架前的人终于讲完电话。机会来了，要加练吗？","最顺手的器械突然没人用，杠铃看起来很有诚意。","搭子挥手：这台机器今天没有排队的故事。"],options:[
      {id:"train",name:"抢主训练位",cost:14,main:1.5,fatigue:8,text:"当前主肌群 +1.5，疲劳 +8"},
      {id:"share",name:"和搭子轮流练",cost:5,mood:6,stage:2,text:"心情 +6，舞台表现 +2；不额外增肌"}]},
    recovery:{title:"恢复区有人招手",texts:["泡沫轴已经就位，今天的酸痛终于有人管了。","恢复区没有人抢重量，只抢最后一个舒适的垫子。","搭子说你下楼的姿势，很适合来这里坐一下。"],options:[
      {id:"deep",name:"完整恢复一轮",cost:12,fatigue:-18,mood:1,text:"疲劳 −18，心情 +1"},
      {id:"light",name:"轻松拉伸聊天",cost:4,fatigue:-5,mood:7,text:"疲劳 −5，心情 +7"}]},
    market:{title:"新口味试吃",texts:["试吃员端来两杯补给：没有隐藏付费，只有口味取舍。","食材商说这是新品，摇杯底部目前还没有化石。","训练后的小桌上，多了两种恢复路线。"],options:[
      {id:"protein",name:"尝试增肌补给",cost:8,buff:{growth:.08,recovery:0,remaining:2},fat:.2,text:"未来 2 天餐食成长加成额外 +8%，体脂 +0.2"},
      {id:"soup",name:"尝试恢复汤",cost:4,buff:{growth:0,recovery:4,remaining:2},mood:3,text:"未来 2 天餐食额外降低疲劳 4，心情 +3"}]},
    stage:{title:"小舞台缺一个示范",texts:["主持人缺人展示动作。你可以练气场，也可以做气氛组。","灯亮了。今天的观众只有三个人和一台饮水机。","教练说：把尴尬也练成肌肉记忆。"],options:[
      {id:"solo",name:"上台完整示范",cost:12,stage:7,mood:1,text:"舞台表现 +7，心情 +1"},
      {id:"support",name:"协助搭子示范",cost:4,mood:5,badge:"最佳搭台人",text:"心情 +5，获得纪念标签；不增加舞台分"}]}
  };
  const $=selector=>document.querySelector(selector);
  const el={};
  ["cycleLabel","dayLabel","phaseLabel","dots","avatar","snapshotTag","snapshotTitle","snapshotSub","snapshotNote","energy","fatigue","mood","fat","muscles","muscleMeta","screen","logList","logCount","toast","opportunityModal","stageModal","stageTitle","stageSticker","stageText","stageEffects","poseModal","poseMarker","poseScore","poseResult","poseStop","finaleModal","finaleText","finaleEffects"].forEach(id=>el[id]=$("#"+id));
  let state=load(),toastTimer,poseFrame,poseStart=0,poseRunning=false,viewingPhoto=null,currentPage="play",lastFlowKey=null;
  const pageScroll={play:0,body:0,log:0},pageIds={play:"Play",body:"Body",log:"Log"};
  const avatarMarkup=el.avatar.innerHTML;
  function weakest(s=state){const key=Object.keys(s.muscles).sort((a,b)=>s.muscles[a]-s.muscles[b])[0];return {key,value:s.muscles[key]};}
  function avg(m=state.muscles){return Object.values(m).reduce((a,b)=>a+b,0)/6;}
  function capture(s=state){return {muscles:clone(s.muscles),energy:s.energy,fatigue:s.fatigue,mood:s.mood,fat:s.fat,stage:s.stage};}
  function getCourse(id,s=state){const c=courses.find(item=>item.id===id);if(!c)return null;return id==="weak"?Object.assign({},c,{targets:{[weakest(s).key]:3.6}}):c;}
  function ingredient(group,id){return ingredients[group].find(item=>item.id===id);}
  function validDraft(draft,day=state.day){return draft&&["protein","carb","method"].every(g=>{const item=ingredient(g,draft[g]);return item&&item.unlock<=day;});}
  function composeBatch(draft,index){
    if(!draft)return null;
    if(draft.legacy){const r=legacyRecipes.find(item=>item.id===draft.legacy);if(r)return Object.assign({},r,{id:"batch"+index,servings:index===0?3:2});}
    const p=ingredient("protein",draft.protein),c=ingredient("carb",draft.carb),m=ingredient("method",draft.method);
    if(!p||!c||!m)return null;
    const food={id:"batch"+index,name:p.name+c.name+m.name+"餐",icon:p.icon,servings:index===0?3:2,ingredients:[p.name,c.name,m.name].join(" · "),growth:0,fatigue:0,energy:0,mood:0,fat:0};
    for(const key of ["growth","fatigue","energy","mood","fat"])food[key]=round([p,c,m].reduce((sum,item)=>sum+(item[key]||0),0)*(key==="growth"?100:1))/(key==="growth"?100:1);
    food.tag=food.mood>=5?"快乐恢复":food.fat<0?"线条餐":food.fatigue<=-7?"恢复餐":"增肌餐";
    food.text=food.tag+" · 训练和餐食一起安排";
    return food;
  }
  function getRecipe(id,p=state.plan){if(id==="batch0"||id==="batch1")return composeBatch(p.batches[Number(id.slice(-1))],Number(id.slice(-1)));return legacyRecipes.find(r=>r.id===id)||null;}
  const basicMeal={id:"basic",name:"基础餐",growth:0,fatigue:0,energy:0,mood:0,fat:0,text:"无特殊增益，无额外惩罚。"};
  function normalizeMeals(p){
    const usage={batch0:0,batch1:0};
    p.meals=p.meals.map(id=>{
      if(!p.recipes.includes(id)||!getRecipe(id,p))return "basic";
      usage[id]++;return usage[id]<=getRecipe(id,p).servings?id:"basic";
    });
  }
  function migratePlan(raw,day){
    const p=Object.assign(newPlan(),clone(raw||{}));
    if(!raw||!raw.batches){
      const oldIds=(raw&&raw.recipes)||[];
      p.batches=[0,1].map(i=>oldIds[i]?{protein:"chicken",carb:"rice",method:"plain",legacy:oldIds[i]}:null);
      p.batchDrafts=p.batches.map(b=>b?{protein:b.protein,carb:b.carb,method:b.method}:blankDraft());
      p.recipes=p.batches.map((b,i)=>b?"batch"+i:null).filter(Boolean);
      p.meals=p.meals.map(id=>id==="basic"||!id?id:oldIds.indexOf(id)>=0?"batch"+oldIds.indexOf(id):"basic");
      normalizeMeals(p);
    }
    return p;
  }
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY));if(!raw||!raw.plan||!raw.shown)return clone(initial);
      const s=Object.assign(clone(initial),raw);s.version=VERSION;
      s.plan=migratePlan(raw.plan,s.day);s.lastPlan=raw.lastPlan?migratePlan(raw.lastPlan,s.day):null;
      s.photos=raw.photos||[clone(entryPhoto)].concat(raw.shown.day?[clone(raw.shown)]:[]);
      if(raw.version!==VERSION){
        s.plannerStep=raw.plannerStep===3?2:raw.plannerStep===2?1:raw.plannerStep||0;
        s.foodBuff=null;s.goal=raw.goal||null;s.finalResult=null;
        if(raw.pendingOpportunity){const id=typeof raw.pendingOpportunity==="string"?raw.pendingOpportunity:raw.pendingOpportunity.id;
          s.pendingOpportunity={id,variant:0,day:s.day};
          s.opportunityCounts[String(Math.ceil(s.day/5))]=Math.min(2,Math.max(1,s.opportunityCounts[String(Math.ceil(s.day/5))]||0));
        }
        if((!raw.version||raw.version<3)&&raw.pendingOpportunity){s.lastExecuted=s.day;s.mode="report";s.report={day:s.day,course:raw.pendingCourse?raw.pendingCourse.id:s.plan.courses[(s.day-1)%5],meal:s.plan.meals[(s.day-1)%5]||"basic",before:null,efficiency:[],legacy:true};}
      }
      if(s.pendingStage&&!s.pendingStage.step)s.pendingStage.step="review";
      if(s.pendingStage&&s.pendingStage.day<100&&s.pendingStage.step==="pose")s.pendingStage.step="review";
      if(s.day>100){s.day=100;s.lastExecuted=100;s.mode=s.pendingStage?"finishing":"complete";}
      if(s.mode==="daily"&&s.lastExecuted===s.day&&s.report)s.mode="report";
      return s;
    }catch{return clone(initial);}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{notice("本次进度暂未保存，请检查浏览器是否允许本地存储。");}}
  function notice(text){el.toast.textContent=text;el.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.toast.classList.remove("show"),2400);}
  function effects(items){return '<div class="effects">'+items.map(x=>'<span class="effect '+(x.type||"good")+'">'+x.label+'</span>').join("")+'</div>';}
  function phase(){return state.day>95?"登台冲刺":state.day>75?"备赛雕刻期":state.day>35?"比例调整期":state.day>20?"稳定增肌期":"入馆适应期";}
  function nextStage(){return [20,40,60,80,100].find(d=>d>state.shown.day)||100;}
  function goal(){return goals[state.goal]||goals.classic;}
  function bodyEvaluation(s=state,id=state.goal||"classic"){
    const values=Object.values(s.muscles),average=avg(s.muscles),base=avg(initialMuscles);
    const cv=Math.sqrt(values.reduce((sum,v)=>sum+(v-average)**2,0)/6)/Math.max(1,average);
    const mass=100*(1-Math.exp(-Math.max(0,average-base)/36));
    const preservation=clamp((average-base)/26,0,1);
    const balance=clamp(100-cv*125,0,100)*(.25+.75*preservation);
    const lines=clamp((32-s.fat)/20*100,0,100)*(.25+.75*preservation);
    const weights=goals[id].weights,bodyScore=mass*weights.mass+balance*weights.balance+lines*weights.lines;
    return {mass:round(mass),balance:round(balance),lines:round(lines),bodyScore:round(bodyScore)};
  }
  function resultData(){
    const body=bodyEvaluation(),stageBonus=Math.floor(body.bodyScore*clamp(state.stage,0,100)/100*.05*10)/10,score=round(body.bodyScore+stageBonus);
    const tier=body.bodyScore>=80?"成型":body.bodyScore>=60?"进阶":"成长";
    return Object.assign(body,{score,stageBonus,stage:round(state.stage),goal:state.goal,title:goal().title+" · "+tier,shape:photoTitle(state.shown)});
  }
  function advice(s=state){
    const weak=weakest(s),f=fatigueStatus(s.fatigue);
    if(s.fatigue>=50)return {issue:"疲劳 "+round(s.fatigue)+"，后续力量成长会打折。",next:"下轮优先留一门休息恢复，或增加恢复餐。"};
    if(s.mood<=40)return {issue:"心情偏低，低于或等于 30 时成长效率下降。",next:"试试快乐餐、休息或低成本搭子机会。"};
    if(state.goal==="lean"&&s.fat>=20)return {issue:"体脂 "+round(s.fat)+"% 仍在遮挡线条。",next:"保留力量课，搭配有氧与白鱼清淡餐，避免只做有氧。"};
    if(state.goal==="mass")return {issue:"当前弱项："+muscleNames[weak.key]+"，块头增长还需要稳定恢复。",next:"力量日配增肌餐，疲劳偏高时替换一天恢复。"};
    return {issue:muscleNames[weak.key]+"仍是当前弱项。",next:"用周览核对"+muscleNames[weak.key]+"与平均肌群的差距是否缩小。"};
  }

  function photoTitle(photo){const m=photo.muscles,a=avg(m);if(!photo.day)return "新手的倔强";if(m.traps>a*1.2+2)return "斜方肌先到赛场";if(m.legs>a*1.25+2)return "下盘领先";if(m.arms>a*1.2+2)return "袖口压力测试";if(m.back>a*1.2+2)return "倒三角初现";return photo.fat<18?"线条正在营业":"训练痕迹已显现";}
  function bodyStyle(photo){
    const m=photo.muscles,base=initialMuscles;
    const growth=(key,range)=>range*(1-Math.exp(-Math.max(0,m[key]-base[key])/85));
    return {"--chest":.9+growth("chest",.65),"--shoulder":.9+growth("shoulders",.52),
      "--arm":.88+growth("arms",.83),"--trap":.86+growth("traps",1.1),"--leg":.88+growth("legs",.67),
      "--back":.86+growth("back",.78),"--waist":.82+(clamp(photo.fat,10,38)-10)/28*.43,
      "--hipLeft":(25-(clamp(photo.fat,10,38)-10)/28*12)+"%","--hipRight":(75+(clamp(photo.fat,10,38)-10)/28*12)+"%",
      "--definition":clamp((29-photo.fat)/22,.08,.9)};
  }
  function styleAvatar(node,photo){Object.entries(bodyStyle(photo)).forEach(([key,value])=>node.style.setProperty(key,value));}
  function photoHTML(photo){
    const css=Object.entries(bodyStyle(photo)).map(([k,v])=>k+":"+v).join(";");
    return '<div class="photo"><span>'+(photo.day?'DAY '+photo.day:"入馆照")+'</span><div class="avatar" style="'+css+'">'+avatarMarkup+'</div></div>';
  }
  function fatigueStatus(value){return value>=75?{label:"需要恢复",tone:"danger",hint:"≥75：力量效率 64%"}:value>=50?{label:"效率下降",tone:"warn",hint:"50–74：力量效率 82%"}:{label:"状态良好",tone:"good",hint:"<50：力量效率 100%"};}
  function moodStatus(value){return value<=30?{label:"训练意愿低",tone:"warn",hint:"≤30：成长效率 82%"}:value>=75?{label:"干劲十足",tone:"good",hint:"≥75：成长效率 108%"}:{label:"稳定",tone:"good",hint:"31–74：成长效率 100%"};}
  function mainTargets(c){return c.type==="力量"?Object.entries(c.targets).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>muscleNames[k]).join("、"):c.type==="恢复"?"降低疲劳、恢复心情":"体脂调整"+(c.targets.legs?"、腿部":"");}
  function weekBoard(preview,review=false){
    return '<div class="week-board" aria-label="五日课表总览">'+preview.rows.map((row,i)=>{
      const c=row.course,res=row.result,f=res?fatigueStatus(res.after.fatigue):null;
      const repeat=res&&c.type==="力量"&&res.repeated.length?(res.previous.length?"与前一天重叠："+res.previous.map(k=>muscleNames[k]).join("、"):"近两日重复："+res.repeated.map(k=>muscleNames[k]).join("、")):"";
      const active=!review&&state.plan.activeDay===i;
      return '<button type="button" class="week-row '+(active?"active ":"")+(f?f.tone:"empty")+'" data-action="'+(review?"edit-course":"active-day")+'" data-id="'+i+'" aria-label="编辑 DAY '+row.day+' 课程"><span class="week-day">D'+row.day+'</span><span class="week-content"><b>'+(c?c.icon+" "+c.name:"选择课程")+'</b><small>'+(c?c.type+" · "+mainTargets(c):"点此安排当天课程")+'</small><span class="week-meal">餐盒：'+row.meal.name+'</span></span><span class="week-risk">'+(res?'<b>疲劳 '+round(res.before.fatigue)+' → '+round(res.after.fatigue)+'</b><small>'+f.label+(row.uncertain?" · 暂估":"")+'</small><small>心情 '+round(res.after.mood)+' · '+moodStatus(res.after.mood).label+'</small>':'<b>等待排课</b>')+'</span>'+(repeat?'<span class="repeat-hint">'+repeat+'</span>':"")+'</button>';
    }).join("")+'</div>';
  }
  function deltaItems(before,after){
    const list=[];Object.keys(muscleNames).forEach(k=>{const v=after.muscles[k]-before.muscles[k];if(Math.abs(v)>.005)list.push({label:muscleNames[k]+" "+signed(v)});});
    ["energy","fatigue","mood","fat","stage"].forEach(k=>{const label={energy:"体力",fatigue:"疲劳",mood:"心情",fat:"体脂",stage:"舞台"}[k];const v=after[k]-before[k];if(Math.abs(v)>.005)list.push({label:label+" "+round(before[k])+" → "+round(after[k]),type:(k==="fatigue"?v>0:v<0)?"bad":"good"});});return list;
  }
  function boundState(s){s.energy=clamp(s.energy,0,100);s.fatigue=clamp(s.fatigue,0,100);s.mood=clamp(s.mood,0,100);s.fat=clamp(s.fat,10,38);s.stage=clamp(s.stage,0,100);}
  function fatigueFactor(s=state){return s.fatigue>=75?.64:s.fatigue>=50?.82:1;}
  function moodFactor(s=state){return s.mood<=30?.82:s.mood>=75?1.08:1;}
  function simulateDay(source,c,r){
    const before=capture(source),recent=clone(source.recentTargets||[]),keys=Object.keys(c.targets);
    const overlap=keys.reduce((n,k)=>n+recent.filter(a=>a.includes(k)).length,0),repeated=keys.filter(k=>recent.some(a=>a.includes(k))),previous=keys.filter(k=>(recent[recent.length-1]||[]).includes(k));
    const ff=fatigueFactor(source),mf=moodFactor(source),of=c.type==="力量"?clamp(1-overlap*.11,.62,1):1;
    const courseAfter=clone(before);
    Object.entries(c.targets).forEach(([k,v])=>courseAfter.muscles[k]+=v*ff*mf*of);
    courseAfter.fatigue+=c.fatigue+(overlap?overlap*2:0);courseAfter.mood+=c.mood;courseAfter.energy+=c.energy||0;courseAfter.fat+=c.fat||0;
    const mealAfter=clone(courseAfter),buff=source.foodBuff&&source.foodBuff.remaining>0?source.foodBuff:null;
    Object.keys(c.targets).forEach(k=>mealAfter.muscles[k]+=(courseAfter.muscles[k]-before.muscles[k])*(r.growth+(buff?buff.growth:0)));
    mealAfter.fatigue+=r.fatigue-(buff?buff.recovery:0);mealAfter.mood+=r.mood;mealAfter.energy+=r.energy;mealAfter.fat+=r.fat;
    const after=clone(mealAfter);boundState(after);
    if(c.type==="恢复")recent.length=0;else{recent.push(keys);if(recent.length>2)recent.shift();}
    after.recentTargets=recent;after.foodBuff=buff&&buff.remaining>1?Object.assign({},buff,{remaining:buff.remaining-1}):null;
    return {before,courseAfter,mealAfter,after,ff,mf,overlapFactor:of,repeated,previous,overlap,buff};
  }
  function projectPlan(){
    let model=Object.assign(capture(),{recentTargets:clone(state.recentTargets),foodBuff:clone(state.foodBuff)}),incomplete=false;
    const rows=state.plan.courses.map((id,i)=>{
      const c=getCourse(id,model),r=getRecipe(state.plan.meals[i])||basicMeal;
      if(!c){incomplete=true;return {day:state.day+i,course:null,meal:r,uncertain:true};}
      const result=simulateDay(model,c,r),row={day:state.day+i,course:c,meal:r,uncertain:incomplete,result};model=result.after;return row;
    });
    const weak=weakest(),afterWeak=weakest(model),beforeGap=avg()-weak.value,afterGap=avg(model.muscles)-model.muscles[weak.key];
    const worsening=Object.keys(muscleNames).filter(k=>Math.abs(model.muscles[k]/avg(model.muscles)-1)>Math.abs(state.muscles[k]/avg()-1)+.025);
    const beforeScore=bodyEvaluation(),score=bodyEvaluation(model),notes=[];
    if(incomplete)notes.push("尚未排满课程，后续预测仅供暂估。");
    notes.push("五天后预计最弱："+muscleNames[afterWeak.key]+" "+round(afterWeak.value)+"。");
    notes.push("当前弱项"+muscleNames[weak.key]+"与平均肌群的差距 "+round(beforeGap)+" → "+round(afterGap)+"："+(afterGap<beforeGap-.1?"预计改善":afterGap>beforeGap+.1?"差距继续拉大":"基本持平")+"。");
    notes.push(worsening.length?"比例差距扩大："+worsening.map(k=>muscleNames[k]).join("、")+"。":"未预测到明显拉大的肌群比例差距。");
    const risk=rows.filter(row=>row.result&&(row.result.ff<1||row.result.mf<1||row.result.overlapFactor<1));
    notes.push(risk.length?"成长折扣日期："+risk.map(row=>"D"+row.day+(row.result.ff<1?"疲劳 ":"")+(row.result.mf<1?"心情 ":"")+(row.result.overlapFactor<1?"重复刺激":"")).join("、")+"。":"本周未触发疲劳、低心情或重复刺激折扣。");
    notes.push("周期末：疲劳 "+round(model.fatigue)+"｜"+fatigueStatus(model.fatigue).label+"；心情 "+round(model.mood)+"｜"+moodStatus(model.mood).label+"。");
    notes.push(goal().name+"匹配度："+beforeScore.bodyScore+" → "+score.bodyScore+"（按目标权重估算，不含课外机会）。");
    return {rows,after:model,notes,afterWeak,beforeGap,afterGap,worsening,score,beforeScore};
  }
  function renderHeader(){
    $("#gameLayer").dataset.mode=state.mode;
    const f=fatigueStatus(state.fatigue),m=moodStatus(state.mood),g=goal();
    el.cycleLabel.textContent=!state.goal?"第一步 · 选择上台目标":state.mode==="complete"?"百日档案 · 已完成":"目标："+g.name;
    el.dayLabel.textContent="DAY "+String(state.day).padStart(2,"0");el.phaseLabel.textContent=phase();
    el.dots.innerHTML=[20,40,60,80,100].map(d=>'<i class="'+(state.shown.day>=d?"done":"")+'"></i>').join("");
    $("#bodyBrief").innerHTML='<div class="brief-text"><b>当前弱项：'+muscleNames[weakest().key]+'</b><span>体力 '+round(state.energy)+'｜仅用于课外机会</span><span>疲劳 '+round(state.fatigue)+'｜'+f.label+' · 心情 '+round(state.mood)+'｜'+m.label+'</span><small>目标：'+(state.goal?g.name:"待选择")+' · 下次阶段照 D'+nextStage()+'</small></div>';
    $("#energyHint").textContent="仅用于课外机会";$("#fatigueHint").textContent=f.label;$("#moodHint").textContent=m.label;$("#fatHint").textContent=state.goal==="lean"?"线条目标·保留肌肉":"结合目标观察变化";
    $("#bodySummary").textContent="目标："+(state.goal?g.name:"待选择")+" · 疲劳 "+round(state.fatigue)+"｜"+f.label;
    const shown=state.photos.find(p=>p.day===viewingPhoto)||state.shown;
    el.snapshotTag.textContent=shown.day?"DAY "+shown.day+" 阶段照":"入馆照";el.snapshotTitle.textContent=photoTitle(shown);el.snapshotSub.textContent=state.shown.day===100?"最终阶段照":"下次永久更新：DAY "+nextStage();el.snapshotNote.textContent="点下方肌群查看对应部位。体型只在阶段体检时更新。";
    styleAvatar(el.avatar,shown);el.avatar.dataset.focus=state.selectedMuscle||"";
    el.energy.textContent=round(state.energy);el.fatigue.textContent=round(state.fatigue);el.mood.textContent=round(state.mood);el.fat.textContent=round(state.fat)+"%";el.muscleMeta.textContent="舞台表现 "+round(state.stage)+" · 仅额外加分";
    el.muscles.innerHTML=Object.entries(state.muscles).map(([k,v])=>'<button class="muscle-item muscle-button '+(state.selectedMuscle===k?"active":"")+'" data-action="muscle" data-id="'+k+'"><span class="muscle-label"><span>'+muscleNames[k]+'</span><b>'+round(v)+'</b></span><span class="meter"><i style="width:'+clamp(100*(1-Math.exp(-v/80)),3,100)+'%"></i></span></button>').join("");
    $("#photoTabs").innerHTML=state.photos.map(p=>'<button class="mini '+(shown.day===p.day?"active":"")+'" data-action="photo" data-id="'+p.day+'">'+(p.day?"D"+p.day:"入馆")+'</button>').join("");
    const before=state.photos.filter(p=>p.day<shown.day).slice(-1)[0]||entryPhoto;
    const top=Object.entries(shown.muscles).map(([k,v])=>({k,gain:v-before.muscles[k]})).sort((a,b)=>b.gain-a.gain).slice(0,2);
    const body=bodyEvaluation();
    $("#bodyGrowth").innerHTML='<h3>本阶段成长最多</h3><p>'+(shown.day?top.map(row=>muscleNames[row.k]+" "+signed(row.gain)).join(" · "):"尚未完成首次阶段体检")+'</p><h3>目标体型对比</h3><p>'+g.name+'：块头 '+Math.round(g.weights.mass*100)+'% / 比例 '+Math.round(g.weights.balance*100)+'% / 线条 '+Math.round(g.weights.lines*100)+'%</p>'+effects([{label:"当前身体评价 "+body.bodyScore},{label:"块头 "+body.mass},{label:"比例 "+body.balance},{label:"线条 "+body.lines}])+'<p>'+g.hint+'</p>';
    $("#badgeList").textContent=state.badges.length?"纪念标签："+state.badges.join("、"):"纪念标签会记录在这里，不影响登台资格。";
  }
  function renderLog(){el.logCount.textContent=state.dailyLog.length+" 天 · "+state.history.length+" 个微周期";el.logList.innerHTML=state.dailyLog.length?state.dailyLog.map(r=>'<li><b>D'+r.day+'</b> '+r.course+'；'+r.text+'</li>').join(""):"<li>从第一张五日课表开始记录。</li>";$("#cycleLogList").innerHTML=state.history.length?state.history.map(r=>'<li><b>D'+r.start+'–D'+r.end+'</b> '+r.text+'</li>').join(""):"<li>五天后，在这里回看计划与目标匹配度。</li>";}
  function recipeEffect(r){return "成长 +"+Math.round(r.growth*100)+"% · 体脂 "+signed(r.fat)+"<br>体力 "+signed(r.energy)+" · 疲劳 "+signed(r.fatigue)+" · 心情 "+signed(r.mood);}
  function courseEffect(c){return c.type==="力量"?Object.entries(c.targets).map(([k,v])=>muscleNames[k]+" +"+v).join(" · "):c.type==="有氧"?"体脂 "+c.fat+" · 疲劳 +"+c.fatigue:"疲劳 "+c.fatigue+" · 体力 +"+c.energy;}
  function renderGoals(){el.screen.innerHTML='<div class="screen-head"><h2>选一种你想练成的体型</h2></div><p class="daily-note">目标只改变建议和身体评价权重，不锁课表，也没有失败路线。旧档会保留进度，选好目标后继续。</p><div class="goal-grid">'+Object.entries(goals).map(([id,g])=>'<button class="goal-card" data-action="goal" data-id="'+id+'"><b>'+g.icon+' '+g.name+'</b><span>'+g.text+'</span><small>'+g.hint+'</small></button>').join("")+'</div>';}
  function courseCard(c){const locked=state.day<c.unlock,selected=state.plan.courses[state.plan.activeDay]===c.id;return '<button class="choice '+(selected?"selected":"")+'" data-action="course" data-id="'+c.id+'" '+(locked?"disabled":"")+'><b>'+c.icon+" "+c.name+'</b><span>'+(locked?"DAY "+c.unlock+" 解锁":c.text)+'</span><em>'+(locked?"尚未解锁":courseEffect(c))+'</em></button>';}
  function plannerTabs(){return '<div class="steps v1-steps">'+["课表","备餐","周览"].map((label,i)=>'<button class="step '+(state.plannerStep===i?"active":"")+'" data-action="step" data-id="'+i+'" '+(i>0&&!state.plan.courses.every(Boolean)||i===2&&!batchesReady()?"disabled":"")+'>'+label+'</button>').join("")+'</div>';}
  function batchesReady(){return state.plan.batches.every(Boolean);}
  function shortcuts(){return '<div class="shortcuts"><button class="mini" data-action="reuse" '+(!state.lastPlan?"disabled":"")+'>沿用上周</button><button class="mini" data-action="template" data-id="split">三分化初稿</button><button class="mini" data-action="template" data-id="balanced">均衡初稿</button><button class="mini" data-action="template" data-id="recovery">恢复初稿</button></div>';}
  function batchEditor(){
    const p=state.plan,b=p.activeBatch,d=p.batchDrafts[b];
    return '<div class="batch-tabs">'+[0,1].map(i=>'<button class="mini '+(b===i?"active":"")+'" data-action="batch" data-id="'+i+'">第 '+(i+1)+' 批 · '+(i===0?3:2)+' 份'+(p.batches[i]?" ✓":"")+'</button>').join("")+'</div><div class="shortcuts">'+Object.entries(presets).map(([id,item])=>'<button class="mini" data-action="preset" data-id="'+id+'">'+item.name+'</button>').join("")+'</div>'+["protein","carb","method"].map(g=>'<div class="ingredient-group"><b>'+({protein:"蛋白主食",carb:"碳水来源",method:"口味 / 做法"}[g])+'</b><div class="ingredient-options">'+ingredients[g].map(item=>'<button class="mini '+(d[g]===item.id?"active":"")+'" data-action="ingredient" data-id="'+g+":"+item.id+'" '+(item.unlock>state.day?"disabled":"")+'>'+item.name+(item.unlock>state.day?" · D"+item.unlock:"")+'</button>').join("")+'</div></div>').join("")+(validDraft(d)?'<div class="recipe-preview"><b>'+composeBatch(d,b).name+' · '+(b===0?3:2)+' 份</b><p>'+recipeEffect(composeBatch(d,b))+'</p><button class="mini" data-action="prepare-batch">制作 / 更新这一批</button></div>':'<p class="daily-note">每批选齐三类内容后制作；不消耗体力。</p>')+(batchesReady()?mealAllocator():"");
  }
  function recipeUsage(id,exclude=-1){return state.plan.meals.filter((x,i)=>x===id&&i!==exclude).length;}
  function mealAllocator(){const p=state.plan;return '<div class="allocation"><h3>把 5 份餐分到 5 天</h3><button class="mini" data-action="auto-meals">按当前目标匹配餐位</button><div class="day-tabs">'+p.meals.map((id,i)=>'<button class="day-tab '+(p.activeDay===i?"active":"")+'" data-action="active-day" data-id="'+i+'">D'+(state.day+i)+'<small>'+(getRecipe(id)||basicMeal).name+'</small></button>').join("")+'</div><div class="choice-grid">'+p.recipes.concat("basic").map(id=>{const r=getRecipe(id)||basicMeal,left=id==="basic"?"不限":r.servings-recipeUsage(id),selected=p.meals[p.activeDay]===id;return '<button class="choice '+(selected?"selected":"")+'" data-action="meal" data-id="'+id+'" '+(id!=="basic"&&!selected&&left<=0?"disabled":"")+'><b>'+r.name+'</b><span>未分配 '+left+' 份'+(selected?" · 今日已留 1 份":"")+'</span><em>'+recipeEffect(r)+'</em></button>';}).join("")+'</div></div>';}
  function renderPlanner(){
    const p=state.plan,step=state.plannerStep,preview=projectPlan();let title,content;
    if(step===0){title="五日训练课表";content='<p class="daily-note">'+(state.lastPlan?"已带入上一周期计划，直接修改想调整的日期。":goal().hint)+'</p>'+weekBoard(preview)+shortcuts()+'<div class="subhead"><strong>修改 DAY '+(state.day+p.activeDay)+'</strong><span>模板只填初稿</span></div><div class="choice-grid">'+courses.map(c=>courseCard(getCourse(c.id))).join("")+'</div>';}
    if(step===1){title="周备餐台";content='<p class="daily-note">两批固定 3 + 2 份，共五餐。制作后可就地分配餐位。</p>'+batchEditor();}
    if(step===2){title="本周训练单";content=weekBoard(preview,true)+'<div class="forecast-notes"><b>五天后的身体风险与目标</b><ul>'+preview.notes.map(note=>'<li>'+note+'</li>').join("")+'</ul></div><div class="shortcuts"><button class="mini" data-action="step" data-id="0">调整课表</button><button class="mini" data-action="step" data-id="1">调整备餐与餐位</button></div><p class="daily-note">仅预测课程、餐食与已获得的短期补给，不包含未来机会。</p>';}
    el.screen.innerHTML='<div class="screen-head"><h2>'+title+'</h2><p>DAY '+state.day+'–'+(state.day+4)+'</p></div><section class="panel">'+plannerTabs()+'<div class="planner-content">'+content+'</div></section>';
  }

  function contributionItems(a,b){
    const names={energy:"体力",fatigue:"疲劳",mood:"心情",fat:"体脂",stage:"舞台"};
    return Object.keys(muscleNames).map(k=>({label:muscleNames[k]+" "+signed(b.muscles[k]-a.muscles[k]),value:b.muscles[k]-a.muscles[k]})).concat(Object.keys(names).map(k=>({label:names[k]+" "+signed(b[k]-a[k]),value:b[k]-a[k],type:k==="fatigue"&&b[k]>a[k]?"bad":"good"}))).filter(item=>Math.abs(item.value)>.005);
  }
  function reportBody(r){
    const c=getCourse(r.course)||{name:"课程"},after=r.after||capture(),food=r.food||getRecipe(r.meal)||basicMeal;
    const part=(kind,title,body)=>'<section class="result-part '+kind+'"><h4>'+title+'</h4>'+body+'</section>';
    let result='<span class="summary-stamp">DAY '+r.day+' · 已完成</span>';
    if(r.breakdown){
      const b=r.breakdown;
      result+=part("course-result","课程结果 · "+c.name,effects(contributionItems(b.course.before,b.course.after))+'<p class="feedback">'+r.efficiency.join("；")+'</p>');
      result+=part("meal-result","餐食影响 · "+food.name,'<p>'+recipeEffect(food)+(r.buff?'<br>短期试吃：额外成长 +'+Math.round(r.buff.growth*100)+'%，额外降疲劳 '+r.buff.recovery:"")+'</p>'+effects(contributionItems(b.meal.before,b.meal.after)));
    }else result+=part("course-result","旧档结算",'<p>当天课程已完成。旧档未记录分项来源，以合计为准。</p>');
    if(r.opportunityBreakdown){const e=r.opportunityBreakdown;result+=part("opportunity-result","额外机会",'<p>'+e.text+'</p>'+effects(contributionItems(e.before,e.after)));}
    else if(!state.pendingOpportunity)result+=part("opportunity-result","额外机会",'<p>'+(r.opportunityText||"今天按课表完成，没有额外机会。")+'</p>');
    result+='<div class="day-total"><h4>今日合计</h4>'+(r.before?effects(deltaItems(r.before,after)):"已恢复当天结算")+'</div><p class="daily-note">状态达到上下限时，以今日合计的实际值为准。</p>';
    return result;
  }
  function quickText(r){const after=r.after||capture();return r.before?Object.keys(muscleNames).filter(k=>after.muscles[k]-r.before.muscles[k]>.005).map(k=>muscleNames[k]+" "+signed(after.muscles[k]-r.before.muscles[k])).join("｜")||"恢复与身体状态已更新":"当天训练已完成";}
  function renderDaily(){
    const i=(state.day-1)%5,c=getCourse(state.plan.courses[i]),r=getRecipe(state.plan.meals[i])||basicMeal,q=state.lastQuick;
    el.screen.innerHTML=(q?'<section class="quick-feedback"><b>DAY '+q.day+' '+(getCourse(q.course)||{}).name+'完成</b><p>'+quickText(q)+'</p><small>'+(q.food||basicMeal).name+'：成长加成 +'+Math.round((q.food||basicMeal).growth*100)+'%，疲劳 '+(q.food||basicMeal).fatigue+'</small><details><summary>查看这一天的完整结算</summary>'+reportBody(q)+'</details></section>':"")+
      '<div class="screen-head"><h2>执行 DAY '+state.day+'</h2><p>目标：'+goal().name+'</p></div><section class="panel daily"><article class="course-card"><span class="card-label">'+c.type+' · '+fatigueStatus(state.fatigue).label+'</span><b>'+c.icon+' '+c.name+'</b><p>'+courseEffect(c)+'</p></article><article class="meal-summary"><span class="card-label">今日餐位 · '+moodStatus(state.mood).label+'</span><b>'+r.name+'</b><p>'+recipeEffect(r)+'</p></article><p class="daily-note">普通日执行后直接进入下一天，简短反馈保留在上方。出现机会或状态跨阈值时会停下来复盘。</p></section>';
  }
  function eventChoices(){
    const p=state.pendingOpportunity;if(!p)return "";const o=opportunities[p.id];if(!o)return "";
    return '<section class="event-choices"><span class="sticker">课外机会 · 本周期 '+(state.opportunityCounts[String(Math.ceil(state.day/5))]||0)+'/2</span><h3>'+o.title+'</h3><p>'+o.texts[p.variant||0]+'</p>'+o.options.map(option=>'<button class="event-option" data-action="opportunity" data-id="'+option.id+'" '+(state.energy<option.cost?"disabled":"")+'><b>'+option.name+' · '+option.cost+' 体力</b><span>'+option.text+(state.energy<option.cost?" · 体力不足":"")+'</span></button>').join("")+'<button class="mini" data-action="opportunity" data-id="reject">按原计划离开 · 无消耗无惩罚</button></section>';
  }
  function renderReport(){el.screen.innerHTML='<div class="screen-head"><h2>DAY '+state.day+' 训练复盘</h2><p>课程已完成</p></div><section class="panel summary">'+reportBody(state.report)+eventChoices()+'</section>';}
  function renderSummary(){
    const s=state.summary;
    el.screen.innerHTML='<div class="screen-head"><h2>五日总结</h2><p>D'+s.start+'–D'+s.end+'</p></div><section class="panel summary"><h3>'+s.headline+'</h3><p>'+s.text+'</p>'+effects(s.effects||[])+'<div class="forecast-notes"><b>下轮建议</b><p>'+advice().next+'</p></div><p class="daily-note">下周期会自动带入本周课表和备餐，按需要修改。</p></section>';
  }
  function resultHTML(){const r=state.finalResult;return '<span class="summary-stamp">'+goal().name+' · 百日完成</span><h3>'+r.title+'</h3><p>'+r.shape+'</p>'+effects([{label:"身体评价 "+r.bodyScore},{label:"舞台额外 +"+r.stageBonus},{label:"展示总评 "+r.score}])+'<p class="daily-note">身体评价：块头 '+r.mass+'、比例 '+r.balance+'、线条 '+r.lines+'，按目标权重计算。舞台额外加分不超过身体评价的 5%。</p>';}
  function renderComplete(){if(!state.finalResult)state.finalResult=resultData();el.screen.innerHTML='<div class="screen-head"><h2>DAY 100 · 百日档案</h2></div><section class="panel summary">'+resultHTML()+'<p class="feedback">身体结果已经定格。切换身体页回看阶段照与纪念标签。</p></section>';}
  function renderActions(){
    let buttons="",button=(action,label,disabled=false,id)=>'<button class="action" data-action="'+action+'" '+(id!==undefined?'data-id="'+id+'"':"")+' '+(disabled?"disabled":"")+'>'+label+'</button>';
    if(!state.goal)buttons=button("none","先选择一张目标体型卡",true);
    else if(state.mode==="planner"){
      const p=state.plan,missing=p.courses.filter(id=>!id).length;
      if(state.plannerStep===0)buttons=button("next",missing?"还需安排 "+missing+" 天课程":batchesReady()?"查看本周风险":"制作两批周备餐",!!missing);
      if(state.plannerStep===1){
        const dirty=JSON.stringify(p.batchDrafts[p.activeBatch])!==JSON.stringify(p.batches[p.activeBatch]);
        if(!batchesReady()||dirty){const i=dirty?p.activeBatch:p.batches.findIndex(b=>!b),valid=validDraft(p.batchDrafts[i]);buttons=button("prepare-next",valid?(p.batches[i]?"更新":"制作")+"第 "+(i+1)+" 批 · "+(i===0?3:2)+" 份":"请选择第 "+(i+1)+" 批的三类配料",!valid,i);}
        else buttons=button("next","查看本周风险");
      }
      if(state.plannerStep===2)buttons=button("next","确认并开始五日计划");
    }
    else if(state.mode==="daily")buttons=button("execute-day","执行 DAY "+state.day+" 课程",false,state.day);
    else if(state.mode==="report")buttons=button("continue-day",state.pendingOpportunity?"先决定是否参与课外机会":state.day%20===0?"查看阶段体检":state.day%5===0?"查看五日总结":"继续明日计划",!!state.pendingOpportunity);
    else if(state.mode==="summary")buttons=button("new-cycle","沿用本周，安排下一轮");
    else if(state.mode==="complete")buttons=button("view-result","查看登台结果");
    $("#actionDock").innerHTML=buttons;$("#actionDock").hidden=currentPage!=="play"||!buttons;
  }
  function syncNavigation(){
    Object.entries(pageIds).forEach(([key,suffix])=>{
      const selected=key===currentPage,page=$("#page"+suffix),tab=$("#tab"+suffix);
      page.hidden=!selected;tab.setAttribute("aria-selected",String(selected));tab.setAttribute("tabindex",selected?"0":"-1");
      if(selected)tab.classList.add("active");else tab.classList.remove("active");
    });
    $("#gameLayer").dataset.page=currentPage;
    renderActions();
  }
  function selectPage(next){
    if(!Object.hasOwn(pageIds,next)||next===currentPage)return;
    pageScroll[currentPage]=$("#page"+pageIds[currentPage]).scrollTop||0;
    currentPage=next;syncNavigation();
    $("#page"+pageIds[next]).scrollTop=pageScroll[next];
  }
  function render(){
    renderHeader();
    if(!state.goal)renderGoals();
    else if(state.mode==="planner")renderPlanner();
    else if(state.mode==="daily")renderDaily();
    else if(state.mode==="report")renderReport();
    else if(state.mode==="summary")renderSummary();
    else if(state.mode==="complete")renderComplete();
    else el.screen.innerHTML='<section class="panel summary"><h3>百日课程完成</h3><p>体检结束后进行登台展示。</p></section>';
    renderLog();const key=state.mode+":"+state.day+":"+state.plannerStep+":"+state.goal;
    if(key!==lastFlowKey){$("#pagePlay").scrollTop=0;pageScroll.play=0;lastFlowKey=key;}
    syncNavigation();save();
  }
  function canPlan(){return !!state.goal&&state.mode==="planner"&&state.day<=96&&!state.pendingStage;}
  function setActiveDay(i){i=Number(i);if(!canPlan()||i<0||i>4)return;state.plan.activeDay=i;render();}
  function setCourse(id){const c=getCourse(id);if(!canPlan()||!c||c.unlock>state.day)return;state.plan.courses[state.plan.activeDay]=id;const i=state.plan.courses.findIndex((c,i)=>!c&&i>state.plan.activeDay);if(i>=0)state.plan.activeDay=i;render();}
  function setIngredient(group,id){const item=ingredient(group,id);if(!canPlan()||!item||item.unlock>state.day)return;state.plan.batchDrafts[state.plan.activeBatch][group]=id;render();}
  function prepareBatch(index=state.plan.activeBatch){
    if(!canPlan())return;const d=state.plan.batchDrafts[index];if(!validDraft(d))return;
    state.plan.batches[index]=clone(d);state.plan.recipes=[0,1].filter(i=>state.plan.batches[i]).map(i=>"batch"+i);
    if(batchesReady()){
      const supply=Object.fromEntries(state.plan.recipes.map(id=>[id,getRecipe(id).servings-recipeUsage(id)]));
      state.plan.meals=state.plan.meals.map(id=>{if(id)return id;const next=state.plan.recipes.find(key=>supply[key]>0);if(next){supply[next]--;return next;}return "basic";});
    }
    if(!state.plan.batches[1])state.plan.activeBatch=1;
    render();
  }
  function applyPreset(id){if(!canPlan()||!presets[id])return;const draft=clone(presets[id].draft);
    for(const g of ["protein","carb","method"])if(ingredient(g,draft[g]).unlock>state.day)draft[g]=g==="carb"?"oats":"plain";
    state.plan.batchDrafts[state.plan.activeBatch]=draft;render();
  }
  function setMeal(id){if(!canPlan())return;const i=state.plan.activeDay,r=getRecipe(id);
    if(id!=="basic"&&(!r||!state.plan.recipes.includes(id)||recipeUsage(id,i)>=r.servings))return notice("这一批餐的份数已分配完。");
    state.plan.meals[i]=id;const next=state.plan.meals.findIndex((x,j)=>!x&&j>i);if(next>=0)state.plan.activeDay=next;render();
  }
  function template(id){if(!canPlan())return;const templates={split:["push","pull","legs","rest","treadmill"],balanced:["push","rest","pull","legs","treadmill"],recovery:["rest","push","rest","treadmill","rest"]};if(!templates[id])return;state.plan.courses=clone(templates[id]);state.plan.activeDay=0;render();}
  function reuse(){if(!canPlan()||!state.lastPlan)return;state.plan=clone(state.lastPlan);state.plan.activeDay=0;state.plan.activeBatch=0;state.plannerStep=0;render();}
  function autoMeals(){
    if(!canPlan()||!batchesReady())return;
    const supply=Object.fromEntries(state.plan.recipes.map(id=>[id,getRecipe(id).servings]));
    const days=state.plan.courses.map((id,i)=>({c:getCourse(id),i})).sort((a,b)=>(b.c.type==="力量")-(a.c.type==="力量"));
    state.plan.meals=Array(5).fill("basic");
    for(const {c,i} of days){
      const score=r=>state.goal==="lean"?-r.fat*8+r.growth*18:state.goal==="mass"?r.growth*100-r.fatigue*.4:r.growth*60-r.fatigue*.5-r.fat;
      const ranked=state.plan.recipes.filter(id=>supply[id]>0).sort((a,b)=>score(getRecipe(b))-score(getRecipe(a)));
      if(ranked.length){state.plan.meals[i]=ranked[0];supply[ranked[0]]--;}
    }render();
  }
  function nextPlanner(){
    if(!canPlan()||!state.plan.courses.every(id=>getCourse(id)&&getCourse(id).unlock<=state.day))return;
    if(state.plannerStep===0)state.plannerStep=batchesReady()?2:1;
    else if(state.plannerStep===1){if(!batchesReady())return;state.plannerStep=2;}
    else{if(!batchesReady())return;normalizeMeals(state.plan);state.mode="daily";state.cycleBefore=capture();state.lastPlan=clone(state.plan);state.lastQuick=null;}
    state.plan.activeDay=0;render();
  }
  function pickOpportunity(){
    const cycle=String(Math.ceil(state.day/5));if((state.opportunityCounts[cycle]||0)>=2)return null;
    let id=null;
    if(state.day%20===3)id="coach";
    else if(Math.random()<.4){if(state.fatigue>=65)id="recovery";else if(state.mood<=40)id="buddy";else{const pool=Object.keys(opportunities).filter(k=>!state.opportunityHistory.slice(-2).some(h=>h.id===k));id=pool[Math.floor(Math.random()*pool.length)];}}
    if(!id)return null;
    if(state.opportunityHistory.some(h=>h.id===id&&h.day>=state.day-2))return null;
    const p={id,variant:Math.floor(Math.random()*3),day:state.day};
    state.opportunityCounts[cycle]=(state.opportunityCounts[cycle]||0)+1;state.opportunityHistory.push(clone(p));return p;
  }
  function executeDay(expectedDay=state.day){
    if(!state.goal||state.mode!=="daily"||Number(expectedDay)!==state.day||state.lastExecuted>=state.day||state.pendingOpportunity||state.pendingStage)return;
    const i=(state.day-1)%5,c=getCourse(state.plan.courses[i]),food=getRecipe(state.plan.meals[i])||basicMeal;if(!c)return;
    const calc=simulateDay(state,c,food);Object.assign(state,calc.after);
    state.trainingCounts[c.id]=(state.trainingCounts[c.id]||0)+1;
    const efficiency=c.type==="力量"?["疲劳效率 "+Math.round(calc.ff*100)+"%","心情效率 "+Math.round(calc.mf*100)+"%","重复刺激效率 "+Math.round(calc.overlapFactor*100)+"%"]:["课程状态收益已结算"];
    state.report={day:state.day,course:c.id,courseTargets:clone(c.targets),meal:food.id,food:clone(food),buff:calc.buff?clone(calc.buff):null,before:calc.before,after:capture(),efficiency,opportunityText:"",breakdown:{course:{before:calc.before,after:calc.courseAfter},meal:{before:calc.courseAfter,after:calc.mealAfter}}};
    state.lastExecuted=state.day;state.mode="report";state.pendingCourse=c;state.pendingOpportunity=pickOpportunity();
    const crossed=fatigueStatus(calc.before.fatigue).label!==fatigueStatus(state.fatigue).label||moodStatus(calc.before.mood).label!==moodStatus(state.mood).label;
    const full=!!state.pendingOpportunity||crossed||state.day%5===0;
    if(!full){state.lastQuick=clone(state.report);continueDay();}
    else render();
  }
  function resolveOpportunity(choice){
    if(state.mode!=="report"||!state.pendingOpportunity)return;
    if(choice===false)choice="reject";
    const o=opportunities[state.pendingOpportunity.id],option=o.options.find(x=>x.id===choice);
    if(choice!=="reject"&&!option)return;
    if(option&&state.energy<option.cost)return notice("体力不足，可以选择另一项或拒绝。");
    const before=capture();let text="已拒绝："+o.title+"，无惩罚。";
    if(option){
      state.energy-=option.cost;
      if(option.weak)state.muscles[weakest().key]+=option.weak;
      if(option.main){const key=Object.keys(state.pendingCourse.targets).sort((a,b)=>state.pendingCourse.targets[b]-state.pendingCourse.targets[a])[0]||weakest().key;state.muscles[key]+=option.main;}
      for(const k of ["fatigue","mood","stage","fat","energy"])state[k]+=option[k]||0;
      if(option.buff)state.foodBuff=clone(option.buff);
      if(option.badge&&!state.badges.includes(option.badge))state.badges.push(option.badge);
      text=o.title+" · "+option.name+"；"+option.text+"。";
    }
    boundState(state);state.report.opportunityText=text;state.report.opportunityBreakdown={before,after:capture(),text};state.report.after=capture();state.pendingOpportunity=null;render();
  }
  function continueDay(){
    if(state.mode!=="report"||state.pendingOpportunity||!state.report||state.lastExecuted!==state.day)return;
    const day=state.day,r=state.report;r.after=capture();
    state.dailyLog.unshift({day,course:(getCourse(r.course)||{}).name,text:quickText(r)+(r.opportunityText?"；"+r.opportunityText:"")});
    state.report=null;state.pendingCourse=null;
    if(day%5===0){
      const before=state.cycleBefore,body=bodyEvaluation();
      state.summary={start:day-4,end:day,headline:goal().name+" · 本轮完成",text:advice().issue,effects:(before?deltaItems(before,capture()):[]).concat([{label:"目标身体评价 "+body.bodyScore}])};
      state.history.unshift({start:day-4,end:day,text:state.plan.courses.map(id=>getCourse(id).name).join(" / ")+"；两批餐 3+2 份；"+goal().name+"评价 "+body.bodyScore});
      state.mode=day===100?"finishing":"summary";
    }else state.mode="daily";
    state.day=Math.min(100,day+1);if(day%20===0)triggerStage(day);render();if(state.pendingStage)showStage();
  }
  function newCycle(){if(state.mode!=="summary"||state.day>96||state.pendingStage)return;state.plan=state.lastPlan?clone(state.lastPlan):newPlan();state.plan.activeDay=0;state.plan.activeBatch=0;state.plannerStep=0;state.mode="planner";state.summary=null;state.cycleBefore=null;state.lastQuick=null;render();}

  function triggerStage(day){
    const before=clone(state.shown);state.shown={day,fat:state.fat,stage:state.stage,muscles:clone(state.muscles)};
    state.photos=state.photos.filter(p=>p.day!==day);state.photos.push(clone(state.shown));viewingPhoto=null;
    const content={20:["肩臂日","动感单车","香辣做法"],40:["全身训练","爬楼机","红薯"],60:["弱项补强课程","炖煮做法"],80:["肩背专项课程"],100:["百日档案与登台纪念"]}[day];
    state.unlocked=Array.from(new Set(state.unlocked.concat(content)));
    const growth=Object.keys(muscleNames).map(k=>({k,delta:state.muscles[k]-before.muscles[k]})).sort((a,b)=>b.delta-a.delta);
    const suggestion=advice();
    let adapted=state.mood<45?"适配推荐：牛肉 + 面条 + 香辣，兼顾心情。":state.fat>23?"适配推荐：保留力量，搭配白鱼清淡餐与有氧。":state.muscles.back<avg()?"适配推荐：拉日补足背部展开。":"适配推荐：继续核对"+muscleNames[weakest().key]+"的比例改善。";
    state.recommendation={day,text:adapted};
    state.pendingStage={day,before,unlocks:content,step:"review",poseResult:null,change:muscleNames[growth[0].k]+"成长 "+signed(growth[0].delta)+"，"+muscleNames[growth[1].k]+"成长 "+signed(growth[1].delta),issue:suggestion.issue,next:suggestion.next,adapted};save();
  }
  function showStage(){
    const p=state.pendingStage;if(!p)return;
    el.stageTitle.textContent="DAY "+p.day+" · 阶段体检";el.stageSticker.textContent=photoTitle(state.shown);
    el.stageText.innerHTML='<b>本期最明显变化</b><br>'+(p.change||"阶段体型已更新")+'<br><br><b>当前问题</b><br>'+(p.issue||advice().issue)+'<br><br><b>下一阶段建议</b><br>'+(p.next||advice().next);
    $("#stagePhotos").innerHTML=photoHTML(p.before)+photoHTML(state.shown);
    el.stageEffects.innerHTML=effects((p.unlocks||[]).map(label=>({label:"固定解锁："+label})))+'<div class="forecast-notes">'+(p.adapted||"按当前体型调整下一张课表。")+'</div>';
    $("#closeStage").textContent=p.day===100?"进入 DAY 100 登台展示":"收下体检，继续养成";el.stageModal.classList.add("open");
  }
  function closeStage(){
    const p=state.pendingStage;if(!p||p.step!=="review")return;
    el.stageModal.classList.remove("open");
    if(p.day<100){state.pendingStage=null;render();return;}
    p.step="pose";save();startPose();
  }
  function startPose(){
    if(!state.pendingStage||state.pendingStage.day!==100)return;
    el.poseModal.classList.add("open");const r=state.pendingStage.poseResult;el.poseStop.disabled=!!r;
    if(r){el.poseScore.textContent="本次 "+r.score+" 分";el.poseResult.textContent=r.text;el.poseMarker.style.left=r.position+"%";return;}
    el.poseScore.textContent="准备定格";el.poseResult.textContent="操作只增加舞台表现，身体评价已经由百日养成决定。";poseStart=performance.now();poseRunning=true;tickPose(poseStart);
  }
  function tickPose(now){if(!poseRunning)return;el.poseMarker.style.left=((Math.sin((now-poseStart)/350)+1)*50)+"%";poseFrame=requestAnimationFrame(tickPose);}
  function stopPose(){
    const p=state.pendingStage;if(!p||p.step!=="pose"||p.poseResult||!poseRunning)return;
    poseRunning=false;cancelAnimationFrame(poseFrame);
    const position=parseFloat(el.poseMarker.style.left||"0"),score=Math.round(clamp(100-Math.abs(position-50)*4.2,0,100)),bonus=score>=90?8:score>=70?5:score>=45?3:1,before=state.stage;
    state.stage=clamp(state.stage+bonus,0,100);const gain=round(state.stage-before);
    p.poseResult={score,position,text:(score>=90?"完美定格！评委的笔差点写冒烟。":"姿势已记录。")+" 舞台表现 +"+gain+"。"};
    save();renderHeader();startPose();
  }
  function closePose(){
    if(!state.pendingStage||state.pendingStage.day!==100||state.pendingStage.step!=="pose")return;
    poseRunning=false;cancelAnimationFrame(poseFrame);state.pendingStage=null;el.poseModal.classList.remove("open");state.mode="complete";state.finalResult=resultData();
    const badge=goal().title+" · 百日登台";if(!state.badges.includes(badge))state.badges.push(badge);render();showFinale();
  }
  function showFinale(){if(!state.goal||state.mode!=="complete")return;state.finalResult=state.finalResult||resultData();const r=state.finalResult;el.finaleText.textContent=goal().name+" · "+r.title+"。身体评价 "+r.bodyScore+"；舞台额外 +"+r.stageBonus+"；展示总评 "+r.score+"。";el.finaleEffects.innerHTML=effects([{label:"块头 "+r.mass},{label:"比例 "+r.balance},{label:"线条 "+r.lines},{label:"舞台增幅 ≤5%"}]);el.finaleModal.classList.add("open");save();}
  function restart(){if(!confirm("开启新档案将清空当前百日进度，确定吗？"))return;poseRunning=false;cancelAnimationFrame(poseFrame);["opportunityModal","stageModal","poseModal","finaleModal"].forEach(id=>el[id].classList.remove("open"));state=clone(initial);viewingPhoto=null;currentPage="play";Object.keys(pageScroll).forEach(k=>pageScroll[k]=0);render();}
  function restore(){if(!state.goal)return;if(state.pendingOpportunity){state.mode="report";state.pendingCourse=state.pendingCourse||Object.assign({},getCourse(state.report.course),state.report.courseTargets?{targets:clone(state.report.courseTargets)}:{});render();}else if(state.pendingStage){if(state.pendingStage.step==="pose")startPose();else showStage();}}
  function action(name,id){
    if(name==="tab"){selectPage(id);return;}if(name==="body-details"){selectPage("body");return;}
    if(name==="restart"){restart();return;}
    if(name==="goal"&&!state.goal&&goals[id]){state.goal=id;state.finalResult=null;render();restore();return;}
    if(name==="photo"){viewingPhoto=Number(id);renderHeader();return;}
    if(name==="muscle"&&Object.hasOwn(muscleNames,id)){state.selectedMuscle=state.selectedMuscle===id?null:id;renderHeader();save();return;}
    if(name==="view-result"){showFinale();return;}
    if(name==="opportunity"){resolveOpportunity(id);return;}
    if(!state.goal||state.pendingStage||state.pendingOpportunity)return;
    if(name==="active-day")setActiveDay(id);
    if(name==="course")setCourse(id);
    if(name==="meal")setMeal(id);
    if(name==="next")nextPlanner();
    if(name==="batch"&&canPlan()&&[0,1].includes(Number(id))){state.plan.activeBatch=Number(id);render();}
    if(name==="ingredient"&&canPlan()){const [group,item]=id.split(":");if(ingredients[group])setIngredient(group,item);}
    if(name==="preset")applyPreset(id);
    if(name==="prepare-batch")prepareBatch();
    if(name==="prepare-next"){const i=id===undefined?state.plan.batches.findIndex(b=>!b):Number(id);if(i===0||i===1)prepareBatch(i);}
    if(name==="auto-meals")autoMeals();
    if(name==="template")template(id);
    if(name==="reuse")reuse();
    if(name==="edit-course"&&canPlan()){state.plannerStep=0;setActiveDay(id);}
    if(name==="step"&&canPlan()){const i=Number(id);if(i>=0&&i<=2&&(i===0||state.plan.courses.every(Boolean))&&(i!==2||batchesReady())){state.plannerStep=i;render();}}
    if(name==="execute-day")executeDay(id===undefined?state.day:Number(id));
    if(name==="continue-day")continueDay();
    if(name==="new-cycle")newCycle();
  }
  document.addEventListener("click",event=>{const t=event.target.closest("[data-action]");if(t&&!t.disabled)action(t.dataset.action,t.dataset.id);});
  document.addEventListener("keydown",event=>{const t=event.target.closest?.('[role="tab"]');if(!t)return;const keys=Object.keys(pageIds),i=keys.indexOf(currentPage);let next;if(event.key==="ArrowRight")next=keys[(i+1)%3];if(event.key==="ArrowLeft")next=keys[(i+2)%3];if(event.key==="Home")next="play";if(event.key==="End")next="log";if(next){event.preventDefault();selectPage(next);$("#tab"+pageIds[next]).focus();}});
  $("#closeStage").addEventListener("click",closeStage);el.poseStop.addEventListener("click",stopPose);$("#closePose").addEventListener("click",closePose);$("#reset").addEventListener("click",restart);$("#restartFinale").addEventListener("click",restart);$("#keepFinale").addEventListener("click",()=>el.finaleModal.classList.remove("open"));
  render();restore();
})();


