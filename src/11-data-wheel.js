/* ==========================================================================
   輪圈 / 輪胎 / 幾何
   ========================================================================== */

/* E36 全車系輪轂規格 — 這是本程式最重要的相容性硬事實 */
const HUB = {
  pcd: '5x120',
  bore: 72.56,
  boreLabel: '72.5 – 72.6 mm（同一規格的不同進位）',
  bolt: 'M12 × 1.5',
  seat: '60° 錐面座（Kegelbund）',
  boltLen: 25,
  torque: [100, 120],
  torqueNote: '各來源給出 90 / 100 / 110 / 120 Nm 四種數值，未取得 BMW TIS 原始文件。請以你車上的原廠手冊為準，不要只信單一數字。',
  conf: 'vendor',
  src: 'apex_bolt',
};

const HUB_MYTH = {
  claim: '「E36 小排氣量是 4 孔 4x100」',
  truth: 'E36 全車系（含 316i / 318i / 318is / 318ti Compact / 全部柴油）一律為 5 孔 5x120，沒有任何原廠 4 孔車型。',
  why: '4x100 是前一代 E30 與 E21 的規格（中心孔 57.1mm）。這是最常見的混淆來源。若你的 E36 是 4 孔，代表它已被前手改裝過，或那台其實是 E30。',
  src: 'apex_bolt',
  conf: 'vendor',
};

/* 原廠輪圈樣式 */
const OE_WHEELS = [
  {id:'st5',  no:'Style 5',  name:'BBS 雙輻', sizes:'15×7 / 16×7.5 / 17×7.5', et:'ET20–41', note:'E36 用者為 5x120 版。街車常見的 17×8 ET20 前 / 17×9 ET25 後其實是 E34/E39 規格，裝上 E36 屬大幅外凸，須壓葉子板。', conf:'community', src:'bimmertips_w'},
  {id:'st22', no:'Style 22 (DS1)', name:'雙輻一代', sizes:'17×7.5 前後同', et:'ET41', note:'OBD1 E36 M3 Coupé（1992–95）原廠配置，前後等寬 235/40R17。', conf:'vendor', src:'bimmertips_m3'},
  {id:'st23', no:'Style 23', name:'M Contour（足球）', sizes:'前 17×7.5 / 後 17×8.5', et:'ET41', note:'M3 Sedan 豪華包、98–99 選配。', conf:'vendor', src:'bimmertips_m3'},
  {id:'st24', no:'Style 24', name:'Round Spoke II / LTW', sizes:'前 17×7.5 / 後 17×8.5', et:'ET41', note:'M3 敞篷 / LTW / GT 用，原廠最輕的一款。LTW 版胎為前後同 235/40R17。', conf:'vendor', src:'bimmertips_m3'},
  {id:'st30', no:'Style 30', name:'Double Spoke', sizes:'16×7', et:'ET46', note:'北美 323is / 328is Sport Package 標配。', conf:'community', src:'bimmertips_w'},
  {id:'st39', no:'Style 39 (DS2)', name:'雙輻二代（葵花）', sizes:'前 17×7.5 / 後 17×8.5', et:'ET41', note:'OBD2 M3（1996–99）原廠，前 225/45 後 245/40。', conf:'vendor', src:'bimmertips_m3'},
  {id:'st42', no:'Style 42', name:'十字輻', sizes:'15–18 吋，6.5J–9.5J', et:'ET20–47', note:'16×7 ET46 為 E36 323is 標配。注意：資料庫上常見的中心孔 74.1mm 是 E39/E38 版本，E36 用者為 72.56。', conf:'community', src:'bimmertips_w'},
  {id:'st44', no:'Style 44', name:'十字輻', sizes:'17×8', et:'ET47', note:'料號 36111094506，E36/E46 通用。ET47 偏保守，配寬胎容易內縮干涉避震筒身。', conf:'vendor', src:'bimmertips_w'},
  {id:'st66', no:'Style 66', name:'M Parallel', sizes:'前 17×8 / 後 17×9', et:'前 ET20 / 後 ET26', note:'⚠ 原生是 E39 五系輪圈，不是 E36 Motorsport 款。裝 E36 從 ET46–47 掉到 ET20，幾乎必壓葉子板＋調負外傾。', conf:'community', src:'bimmertips_w'},
];

/* 原廠輪圈胎規（依車型群組） */
const OE_FITMENT = [
  {grp:'歐規 316i/318i/320i/323i/325i/328i/325td/325tds', wheel:'7J × 15', et:47, tire:'205/60 R15 91H', conf:'vendor', src:'wheelsize'},
  {grp:'歐規 318tds', wheel:'6.5J × 15', et:47, tire:'205/60 R15 91H', conf:'vendor', src:'wheelsize'},
  {grp:'北美 318i / 318ti 基本配備', wheel:'6J × 15', et:42, tire:'185/65 R15 87H', conf:'vendor', src:'wheelsize'},
  {grp:'E36 M3（Style 22 / LTW）', wheel:'17×7.5 前後同', et:41, tire:'235/40 R17 前後同', conf:'vendor', src:'bimmertips_m3'},
  {grp:'E36 M3（Style 23 / 39）', wheel:'前 17×7.5 / 後 17×8.5', et:41, tire:'前 225/45 R17 / 後 245/40 R17', conf:'vendor', src:'bimmertips_m3'},
];

/* 實務 ET 建議範圍（Apex Wheels 實測建檔） */
const FITMENT_GUIDE = [
  {car:'nonm', size:15, w:7,   et:47, tire:'205/60R15', lvl:'oem',  need:[], note:'原廠值'},
  {car:'nonm', size:16, w:7,   et:46, tire:'205/55R16', lvl:'oem',  need:[], note:'原廠 Style 30/32/42 皆 ET46'},
  {car:'nonm', size:17, w:8.5, et:40, tire:'245/40R17', lvl:'oem+', need:['前輪需 5mm 墊片'], note:'配社外避震可能需更厚墊片'},
  {car:'nonm', size:17, w:9,   et:30, tire:'245/40R17', lvl:'agg',  need:['後葉子板壓平','負外傾至少 -1.8°','前輪 5mm 墊片（配 KW 避震需 12mm 以上）'], note:'街道激進'},
  {car:'nonm', size:18, w:8.5, et:37, tire:'225/40R18', lvl:'oem+', need:[], note:'方形配置可直上（ET35–38）'},
  {car:'nonm', size:18, w:9,   et:42, tire:'245/35R18', lvl:'oem+', need:[], note:'前後配後輪'},
  {car:'m3',   size:17, w:8.5, et:40, tire:'235/40R17', lvl:'oem+', need:['配 245 胎需前 5mm 墊片'], note:''},
  {car:'m3',   size:17, w:9,   et:30, tire:'245/40R17', lvl:'agg',  need:['負外傾','後葉子板壓平'], note:'街道激進'},
  {car:'m3',   size:17, w:9.5, et:35, tire:'255/40R17', lvl:'trk',  need:['前墊片 12mm（最多 15–20mm）','負外傾'], note:'賽道'},
  {car:'m3',   size:18, w:8.5, et:38, tire:'225/40R18', lvl:'oem+', need:[], note:'方形直上'},
  {car:'m3',   size:18, w:9.5, et:35, tire:'255/35R18', lvl:'agg',  need:['負外傾','壓葉子板'], note:''},
  {car:'m3',   size:17, w:10,  et:25, tire:'275/35R17', lvl:'wide', need:['寬體／暴龜'], note:'賽道極限'},
];

/* 輪圈樣式：spoke 幾何與 face profile 會直接驅動 3D 輪圈。 */
const WHEEL_STYLES = [
  {id:'st5',   brand:'BMW',name:'Style 5',  cat:'五雙輻',spokes:10,pair:true,pairSpread:.034,innerW:.040,outerW:.052},
  {id:'st42',  brand:'BMW',name:'Style 42', cat:'交叉輻',spokes:20,mesh:true,spokeSweep:.030,innerW:.026,outerW:.038},
  {id:'st39',  brand:'BMW M',name:'Style 39 DS2',cat:'五雙輻',spokes:10,pair:true,pairSpread:.042,innerW:.050,outerW:.071},
  {id:'st24',  brand:'BMW M',name:'Style 24 LTW',cat:'五雙輻',spokes:10,pair:true,pairSpread:.030,innerW:.040,outerW:.064},
  {id:'bbs-lm',brand:'BBS',name:'LM',cat:'交叉輻鍛造二片式',spokes:20,mesh:true,dish:true,spokeSweep:.034,innerW:.022,outerW:.032,
   img:'https://bbs-japan.co.jp/en/wp-content/uploads/sites/2/2016/10/newLM.jpg',src:'bbs_lm'},
  {id:'arc8',brand:'APEX',name:'ARC-8',cat:'十輻 Flow Formed',spokes:10,thin:true,concave:true,innerW:.030,outerW:.048,src:'apex_arc8'},
  {id:'rpf1',brand:'Enkei',name:'RPF1',cat:'六雙輻 MAT',spokes:12,pair:true,thin:true,pairSpread:.052,innerW:.026,outerW:.039,spokeSweep:.010,hubScale:.88,
   img:'https://enkei.com/wp-content/uploads/2019/12/ENKEI-RPF1-SP-144-WEB-510x510.jpg',src:'enkei_rpf1'},
  {id:'st66', brand:'BMW M',name:'Style 66',cat:'五雙輻',spokes:10,pair:true,wide:true,pairSpread:.037,innerW:.055,outerW:.086},
  {id:'steel',brand:'BMW',name:'原廠鋼圈',cat:'鋼圈',spokes:12,steel:true},
];

/* 輪圈顏色：以 multiply 疊在銀色素材上（輪胎為黑，multiply 後仍是黑，不受影響）
   淺於原素材的顏色改用 brightness 提亮 */
const WHEEL_FINISHES = [
  {id:'silver', name:'亮銀',     face:'#c9ced6', mul:'#ffffff'},
  {id:'hyper',  name:'鈦灰',     face:'#7d848e', mul:'#8f959e'},
  {id:'satblk', name:'霧黑',     face:'#2a2d33', mul:'#3a3e45'},
  {id:'globlk', name:'亮黑',     face:'#141619', mul:'#212429'},
  {id:'bronze', name:'古銅',     face:'#8a6234', mul:'#b07a3c'},
  {id:'gold',   name:'金色',     face:'#b99341', mul:'#dcae4c'},
  {id:'white',  name:'白色',     face:'#e8eaec', mul:'#ffffff', br:1.14},
  {id:'poliss', name:'鏡面拋光', face:'#dfe6ee', mul:'#f2f7fc', br:1.07},
];

/* E36 原廠與經典車色（示意色值，非原廠色號比對） */
const PAINTS = [
  {id:'alpine',  name:'Alpinweiss III', code:'300', hex:'#eef1f3'},
  {id:'schwarz', name:'Schwarz II',     code:'668', hex:'#15171a'},
  {id:'estoril', name:'Estoril Blau',   code:'335', hex:'#1b4f9c'},
  {id:'avus',    name:'Avusblau',       code:'276', hex:'#0f5fb5'},
  {id:'daytona', name:'Daytona Violett',code:'302', hex:'#6b4a86'},
  {id:'techno',  name:'Technoviolett',  code:'297', hex:'#5b4478'},
  {id:'dakar',   name:'Dakargelb II',   code:'337', hex:'#e8b21c'},
  {id:'hellrot', name:'Hellrot',        code:'314', hex:'#c1242b'},
  {id:'boston',  name:'Boston Grün',    code:'275', hex:'#1c3f34'},
  {id:'arktis',  name:'Arktissilber',   code:'309', hex:'#b7bdc4'},
  {id:'cosmos',  name:'Cosmosschwarz',  code:'303', hex:'#22252c'},
  {id:'mugello', name:'Mugello Rot',    code:'—',   hex:'#8e1621'},
  {id:'britgrn', name:'British Racing', code:'—',   hex:'#12402c'},
  {id:'nardo',   name:'Nardo 灰（改色）',code:'—',   hex:'#8f9295'},
];

const CALIPER_COLORS = [
  {id:'stock',  name:'原廠黑', hex:'#3a3d43'},
  {id:'red',    name:'紅',    hex:'#c8202a'},
  {id:'yellow', name:'黃',    hex:'#e0b019'},
  {id:'blue',   name:'藍',    hex:'#1f5fbb'},
  {id:'gold',   name:'金',    hex:'#b08c3a'},
  {id:'silver', name:'銀',    hex:'#aab0b8'},
  {id:'green',  name:'綠',    hex:'#2b8a4a'},
  {id:'orange', name:'橘',    hex:'#d9691f'},
];

/* 輪胎規格解析與幾何計算 */
function parseTire(s){
  const m = String(s||'').match(/(\d{3})\s*\/\s*(\d{2})\s*[Rr]?\s*(\d{2})/);
  if(!m) return null;
  return {w:+m[1], ar:+m[2], rim:+m[3]};
}
function tireOD(t){ // mm
  if(!t) return 0;
  return t.rim*25.4 + 2*(t.w*t.ar/100);
}
function fmtTire(t){ return t ? `${t.w}/${t.ar}R${t.rim}` : '—'; }

/* 輪圈幾何：回傳外緣/內緣相對原廠的位移（mm，正值＝往外/往內更多） */
function wheelGeom(base, mod){
  // base/mod: {width(J), et, tire}
  const bw = base.width*25.4, mw = mod.width*25.4;
  const outerDelta = (mw/2 - mod.et) - (bw/2 - base.et);  // 正 = 更外凸
  const innerDelta = (mw/2 + mod.et) - (bw/2 + base.et);  // 正 = 更往內
  const bt = parseTire(base.tire), mt = parseTire(mod.tire);
  const bod = tireOD(bt), mod_od = tireOD(mt);
  const odDelta = mod_od - bod;
  const odPct = bod ? odDelta/bod*100 : 0;
  // 速度表：外徑變大 → 實際車速比表速高 → 表速偏低
  return {
    outerDelta, innerDelta, odDelta, odPct,
    baseOD: bod, modOD: mod_od,
    speedoErrPct: -odPct,           // 表速相對實速的誤差（負=表速低於實速）
    trackDelta: outerDelta*2,        // 單軸輪距變化
  };
}

/* 台灣法規：輪胎外徑誤差 2% 門檻 */
const TIRE_OD_LIMIT_PCT = 2.0;
