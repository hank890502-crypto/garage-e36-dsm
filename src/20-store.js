/* ==========================================================================
   狀態與儲存
   優先用 localStorage；若不可用（例如在沙箱 iframe 中開啟）則自動退回記憶體，
   並提示使用者用「匯出備份」保存資料。
   ========================================================================== */
const LSKEY = 'e36garage.v1';
let LS_OK = true;
try {
  const t='__e36t__'; localStorage.setItem(t,'1'); localStorage.removeItem(t);
} catch(e){ LS_OK = false; }
let MEM = null;

const blankCar = () => ({
  id: uid(), plat:'e36', name:'', modelId:'', bodyId:'', year:1996, trans:'', mkt:'EU',
  color:'', vin:'', km:0, plate:'',
  wheelW:7, wheelET:47, tire:'205/60R15',
  lastSvcKm:0, lastSvcDate:'',
  photos:{}, notes:'',
  build:{ paint:'alpine', wheel:'st42', finish:'silver', size:17, tireW:245, tireAR:40,
          tireProduct:'street', suspension:'stock', brakeKit:'stock', tintProduct:'none', aeroKit:'stock',
          drop:0, dropF:0, dropR:0, camberF:-1.0, camberR:-1.5, toeF:0.00, toeR:0.10,
          caster:7.0, trackF:0, trackR:0, pressureF:34, pressureR:36,
          caliper:'stock', tint:0, lip:false, skirt:false, wing:'none',
          diffuser:false, wide:false, tips:'single', shadow:false, hood:false },
  parts:[], logs:[], fuelLogs:[], plans:[], project:[],
});

/* tracks 為後加欄位：舊備份沒有這個鍵時，Object.assign 會補上空陣列，不影響既有資料 */
const DEF = { cars:[], cur:null, ver:1, savedAt:null, tracks:[] };

function normalizeCarData(c){
  if(!Array.isArray(c.fuelLogs)) c.fuelLogs=[];
  const old=c.build||{},fresh=blankCar();
  c.build=Object.assign(structuredClone(fresh.build),old);
  if(c.build.dropF===0&&c.build.drop)c.build.dropF=c.build.drop;
  if(c.build.dropR===0&&c.build.drop)c.build.dropR=c.build.drop;
  if(!Object.hasOwn(old,'suspension')&&c.build.drop>0)c.build.suspension='b14';
  if(!Object.hasOwn(old,'brakeKit')&&c.build.caliper!=='stock')c.build.brakeKit=c.build.caliper==='red'?'brembo':'m3';
  if(!Object.hasOwn(old,'tintProduct')&&c.build.tint>0)c.build.tintProduct=c.build.tint>=50?'3m-ma40':'3m-ma70';
  if(!Object.hasOwn(old,'aeroKit')&&(c.build.lip||c.build.skirt||c.build.wing!=='none'))c.build.aeroKit=platOf(c)==='dsm2g'?'gsx-oem':'mtech';
  const aliases={mesh:'bbs-lm',dish:'arc8'};
  if(aliases[c.build.wheel])c.build.wheel=aliases[c.build.wheel];
  const wheelSet=platOf(c)==='dsm2g'?ECL_WHEEL_STYLES:WHEEL_STYLES;
  if(!wheelSet.some(x=>x.id===c.build.wheel))c.build.wheel=platOf(c)==='dsm2g'?'ecl-oem':'st42';
  const eclipse=platOf(c)==='dsm2g',paintSet=eclipse?ECL_PAINTS:PAINTS;
  if(!paintSet.some(x=>x.id===c.build.paint)){
    const eclipsePaintAlias={alpine:'ecl-white',schwarz:'ecl-black',cosmos:'ecl-black',arktis:'ecl-silver',nardo:'ecl-silver',
      hellrot:'ecl-red',mugello:'ecl-maroon',boston:'ecl-green',britgrn:'ecl-green'};
    c.build.paint=eclipse?(eclipsePaintAlias[c.build.paint]||'ecl-white'):'alpine';
  }
  const exactAero=aeroProductsOf(c).filter(x=>x.preview3d);
  if(!exactAero.some(x=>x.id===c.build.aeroKit)){
    Object.assign(c.build,{aeroKit:'stock',lip:false,skirt:false,diffuser:false,wing:'none',hood:false,wide:false,tips:'none'});
  }else{
    const aero=exactAero.find(x=>x.id===c.build.aeroKit);
    ['lip','skirt','diffuser','wing'].forEach(k=>c.build[k]=aero[k]);
  }
  if(eclipse)c.build.shadow=false;
  return c;
}

function loadDB(){
  if(!LS_OK) return MEM || (MEM = structuredClone(DEF));
  try{
    const r = localStorage.getItem(LSKEY);
    if(!r) return structuredClone(DEF);
    const d = JSON.parse(r);
    const out = Object.assign(structuredClone(DEF), d);
    (out.cars||[]).forEach(normalizeCarData);
    return out;
  }catch(e){ return structuredClone(DEF); }
}
function saveDB(){
  DB.savedAt = new Date().toISOString();
  if(!LS_OK){ MEM = DB; return false; }
  try{ localStorage.setItem(LSKEY, JSON.stringify(DB)); return true; }
  catch(e){ toast('儲存失敗：瀏覽器空間不足或權限受限，請用「匯出備份」保存','bad'); return false; }
}
let DB = loadDB();

function car(){ return DB.cars.find(c=>c.id===DB.cur) || null; }
function uid(){ return 'x'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }

/* ---- 查詢輔助（跨平台：id 不重複，兩邊都找） ---- */
const engById  = id => ENGINES.find(e=>e.id===id) || ECL_ENGINES.find(e=>e.id===id);
const mdlById  = id => MODELS.find(m=>m.id===id)  || ECL_MODELS.find(m=>m.id===id);
const bodyById = id => BODIES.find(b=>b.id===id)  || ECL_BODIES.find(b=>b.id===id);
function carEngine(c){ const m = mdlById(c?.modelId); return m ? engById(m.eng) : null; }
function carLabel(c){
  if(!c) return '';
  if(c.name) return c.name;
  const m = mdlById(c.modelId);
  const b = bodyById(c.bodyId);
  return [c.year||'', m?m.name:'E36', b?b.name:''].filter(Boolean).join(' ');
}

/* ---- 匯出 / 匯入 ---- */
function exportJSON(){
  const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `e36-garage-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  toast('已匯出備份','ok');
}
function importJSON(file){
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(!d || !Array.isArray(d.cars)) throw new Error('格式不符');
      DB = Object.assign(structuredClone(DEF), d);
      DB.cars.forEach(normalizeCarData);
      saveDB(); render();
      toast(`已匯入 ${DB.cars.length} 台車`,'ok');
    }catch(e){ toast('匯入失敗：'+e.message,'bad'); }
  };
  r.readAsText(file);
}

/* ---- 保養提醒週期（公里 / 月） ---- */
const MAINT_ITEMS = [
  {id:'oil',    name:'機油＋機油濾芯', km:12000, mo:6,  note:'原廠 Oil Service：約 7,500 miles（12,000 km）或 6 個月'},
  {id:'airf',   name:'空氣濾芯',       km:20000, mo:12, note:'來源分歧 30,000 miles vs 每年；台灣多灰塵建議取每年或 20,000 km'},
  {id:'cabin',  name:'冷氣濾網',       km:24000, mo:12, note:'零件號 64119069895'},
  {id:'plug',   name:'火星塞',         km:50000, mo:48, note:'銅極 30,000–60,000 km；白金／銥 60,000–100,000 km'},
  {id:'fuelf',  name:'汽油濾清器',     km:58000, mo:48, note:'約 36,000 miles，隨 Inspection II'},
  {id:'coolant',name:'冷卻液',         km:60000, mo:30, note:'BMW 對 G48 稱 4 年／64,000 km；台灣高溫建議 2–3 年'},
  {id:'brakef', name:'煞車油',         km:48000, mo:24, note:'原廠列於 Inspection II，每 2 年'},
  {id:'trans',  name:'變速箱油',       km:60000, mo:60, note:'原廠稱 lifetime；實務建議 50,000–60,000 km'},
  {id:'diff',   name:'差速器油',       km:70000, mo:60, note:'BimmerWorld 建議 40,000–50,000 miles，賽道更短'},
  {id:'belt',   name:'正時皮帶（僅 M40）', km:70000, mo:48, note:'⚠ 只有 M40 是皮帶；M42/M43/M44/M50/M52/S50/S52 都是鏈條', engOnly:['M40B16','M40B18']},
  {id:'psf',    name:'動力方向機油',   km:58000, mo:48, note:'完整方式每 36,000 miles'},
  {id:'tire',   name:'輪胎',           km:50000, mo:60, note:'胎紋 <1.6mm 驗車不過；橡膠老化亦需更換'},
  {id:'pad',    name:'煞車來令片',     km:40000, mo:0,  note:'依駕駛習慣差異極大，請以厚度檢查為準'},
  {id:'batt',   name:'電瓶',           km:0,     mo:48, note:'手冊規格：M43 50~75 AH／M44 75 AH／M52 12V 65~75 AH'},
  {id:'insp',   name:'定期驗車',       km:0,     mo:6,  note:'E36 已滿 10 年 → 每年至少 2 次；辦理期限為指定日期前後 1 個月內'},
];

/* 依保養紀錄計算下次到期 */
function maintStatus(c){
  if(!c) return [];
  const eng = carEngine(c);
  const now = new Date();
  return maintItemsOf(c).filter(it=>!it.engOnly || (eng && it.engOnly.includes(eng.id))).map(it=>{
    const last = (c.logs||[]).filter(l=>(l.items||[]).includes(it.id))
                   .sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
    let dueKm=null, dueMo=null, pctKm=0, pctMo=0;
    if(last){
      if(it.km && last.km) { dueKm = last.km + it.km; pctKm = Math.min(1,(c.km-last.km)/it.km); }
      if(it.mo && last.date){
        const d = new Date(last.date); d.setMonth(d.getMonth()+it.mo);
        dueMo = d.toISOString().slice(0,10);
        const span = it.mo*30.44*86400000;
        pctMo = Math.min(1, (now - new Date(last.date))/span);
      }
    }
    const pct = Math.max(pctKm,pctMo);
    const st = !last ? 'none' : pct>=1 ? 'over' : pct>=0.85 ? 'due' : 'ok';
    /* ---- 以下為顯示用的衍生欄位，不影響上面既有的判斷 ---- */
    const remKm  = dueKm!=null ? dueKm - (c.km||0) : null;               // 還可以跑幾公里（負數＝已超過）
    const remDay = dueMo ? Math.round((new Date(dueMo+'T00:00:00') - now)/86400000) : null; // 還有幾天
    const left   = Math.max(0, Math.round((1-pct)*100));                 // 剩餘百分比
    const by     = (dueKm==null) ? 'mo' : (dueMo==null) ? 'km' : (pctKm>=pctMo ? 'km' : 'mo'); // 先到的是哪一個
    return {...it, last, dueKm, dueMo, pct, st, pctKm, pctMo, remKm, remDay, left, by};
  });
}
