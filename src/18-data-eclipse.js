/* ==========================================================================
   第二代 Mitsubishi Eclipse（2G, 1995–1999）／ DSM 平台
   主要來源：使用者提供之原廠維修手冊
     《1997 Mitsubishi Eclipse GSX AWD L4-1997cc 2.0L DOHC Turbo MFI》
     Operation CHARM 版本，7,853 頁 HTML，逐頁擷取非 OCR。
   ⚠ 這本手冊是「4G63 渦輪車」的手冊。RS / GS / Spyder GS 用的是 420A 引擎，
     手冊不涵蓋，那些欄位標為社群來源。
   ========================================================================== */
const ECL_SRC = {
  fsm:      ['原廠維修手冊 1997 Eclipse GSX AWD（使用者提供）', ''],
  fsm_cap:  ['原廠維修手冊 — Capacity Specifications', ''],
  fsm_int:  ['原廠維修手冊 — Maintenance / Service Intervals', ''],
  fsm_whl:  ['原廠維修手冊 — Wheels / Tires / Wheel Fastener Torque', ''],
  autocat:  ['automobile-catalog — 1997 Eclipse GSX', 'https://www.automobile-catalog.com/car/1997/2006465/mitsubishi_eclipse_gsx.html'],
  dsmt:     ['DSMtuners 社群彙整', 'https://www.dsmtuners.com/'],
};

/* ---------------- 引擎 ---------------- */
const ECL_ENGINES = [
  {id:'4G63T', name:'4G63T（2.0 DOHC 渦輪・7-bolt）', disp:1997, cyl:4, valves:16, cam:'DOHC',
   ps:213, hp:210, nm:290, cr:8.5, bore:85.0, stroke:88.0, fire:'1-3-4-2',
   yr:[1995,1999], turbo:'TD04-13G（14b）', block:'鑄鐵缸體 · 7 螺栓曲軸', timing:'皮帶（干涉式）',
   src:'fsm', conf:'manual',
   warn:'⚠ 1995–1999 的 4G63 是 7-bolt 曲軸，有著名的 crank walk（曲軸軸向位移）問題。症狀是離合器踏板抖動、離合器難分離，嚴重會整顆報廢。買車前務必檢查。'},
  {id:'420A', name:'420A（2.0 DOHC 自然進氣）', disp:1996, cyl:4, valves:16, cam:'DOHC',
   ps:142, hp:140, nm:176, cr:9.6, yr:[1995,1999], block:'鑄鐵缸體', timing:'鏈條',
   src:'dsmt', conf:'community',
   warn:'420A 是 Chrysler 血統的引擎，你手上這本原廠手冊不涵蓋它，這裡的數據來自社群彙整，請以 420A 專屬手冊為準。'},
];

/* ---------------- 車身 ---------------- */
const ECL_BODIES = [
  {id:'coupe2g',  code:'D30', name:'3門 Coupe',      yr:[1995,1999], L:4390, W:1750, H:1305, wb:2510, kg:[1200,1420]},
  {id:'spyder2g', code:'D32', name:'2門 Spyder 敞篷', yr:[1996,1999], L:4390, W:1750, H:1310, wb:2510, kg:[1330,1470],
   warn:'Spyder 只有 FWD，沒有 AWD 的 GSX 版本。'},
];

/* ---------------- 車型 ---------------- */
const ECL_MODELS = [
  {id:'ecl-rs',      name:'RS',            eng:'420A',  yr:[1995,1998], bodies:['coupe2g'],  drive:'FWD', turbo:false},
  {id:'ecl-gs',      name:'GS',            eng:'420A',  yr:[1995,1999], bodies:['coupe2g'],  drive:'FWD', turbo:false},
  {id:'ecl-gst',     name:'GS-T',          eng:'4G63T', yr:[1995,1999], bodies:['coupe2g'],  drive:'FWD', turbo:true},
  {id:'ecl-gsx',     name:'GSX',           eng:'4G63T', yr:[1995,1999], bodies:['coupe2g'],  drive:'AWD', turbo:true},
  {id:'ecl-spy-gs',  name:'Spyder GS',     eng:'420A',  yr:[1996,1999], bodies:['spyder2g'], drive:'FWD', turbo:false},
  {id:'ecl-spy-gst', name:'Spyder GS-T',   eng:'4G63T', yr:[1996,1999], bodies:['spyder2g'], drive:'FWD', turbo:true},
];
const ECL_TRANS = [
  {id:'F5M42', name:'5 速手排（FWD）', src:'fsm'},
  {id:'W5M33', name:'5 速手排（AWD）', src:'fsm'},
  {id:'F4A42', name:'4 速自排（FWD）', src:'fsm'},
  {id:'W4A33', name:'4 速自排（AWD）', src:'fsm'},
];

/* ---------------- 輪轂 ---------------- */
/* P.C.D. 與 offset 直接來自手冊 Wheels 章節；中心孔手冊沒寫，標為社群數據 */
const ECL_HUB = {
  pcd:'5x114.3', bore:67.1, bolt:'M12×1.5', seat:'錐座', boltLen:0,
  torque:'120–140 N-m（87–101 ft-lb）', et:46,
  note:'手冊 Wheels 章節記載：原廠鋁圈與鋼圈的 P.C.D. 一律 114.3 mm、offset 一律 46 mm。低階 14×5.5JJ、高階 16×6JJ。中心孔 67.1 mm 手冊未載明，為社群通用數值。',
};
const ECL_OEM_WHEEL = [
  {trim:'RS / GS 基本', wheel:'14 × 5.5JJ', et:46, tire:'P185/70R14 87S'},
  {trim:'中階',         wheel:'14 × 5.5JJ', et:46, tire:'P195/70R14 90H'},
  {trim:'GS-T / GSX',   wheel:'16 × 6JJ',   et:46, tire:'P205/55R16 89H'},
  {trim:'備胎（全車系）', wheel:'15 × 4T / 16 × 4T', et:46, tire:'T125/70D15'},
];

/* ---------------- 原廠數據（全部來自手冊，標明章節） ---------------- */
const ECL_SVC = [
  {cat:'fluid', name:'引擎機油容量（不含濾芯）', val:'4.0', unit:'L', conf:'manual', src:'fsm_cap', q:'機油 容量 oil',
   warn:'手冊註明此為「不含濾芯與油冷器」的量。機油濾芯本身另計 0.5 L，換濾芯時總量約 4.5 L。'},
  {cat:'fluid', name:'機油濾芯容量', val:'0.5', unit:'L', conf:'manual', src:'fsm_cap', q:'機油濾芯 容量'},
  {cat:'fluid', name:'建議機油黏度', val:'5W-30（全溫域首選）／10W-30（-23°C 以上）', unit:'', conf:'manual', src:'fsm_cap', q:'機油 黏度 5W30'},
  {cat:'fluid', name:'冷卻系統總容量', val:'7.0', unit:'L（7.4 qt）', conf:'manual', src:'fsm_cap', q:'冷卻液 水箱 容量'},
  {cat:'fluid', name:'手排變速箱油量（AWD）', val:'2.3', unit:'', conf:'manual', src:'fsm_cap', q:'變速箱油 手排 awd',
   warn:'手冊這張表只寫「FWD 2.1 / AWD 2.3」，單位欄在原始檔中遺失。依上下文應為公升，加注前請以油尺或注油孔溢流為準。'},
  {cat:'fluid', name:'手排變速箱油量（FWD）', val:'2.1', unit:'', conf:'manual', src:'fsm_cap', q:'變速箱油 手排 fwd',
   warn:'同上，單位欄在原始檔中遺失。'},
  {cat:'fluid', name:'分動箱油量（AWD）', val:'0.5', unit:'L（0.53 qt）', conf:'manual', src:'fsm_cap', q:'分動箱 transfer case 油'},
  {cat:'fluid', name:'自排變速箱油量', val:'7.1', unit:'qt（約 6.7 L）', conf:'manual', src:'fsm_cap', q:'自排 變速箱油 容量'},
  {cat:'fluid', name:'差速器油量', val:'手冊此頁損毀', unit:'', conf:'unverified', src:'fsm_cap', q:'差速器油 容量',
   warn:'你這份手冊的 Differential Capacity 頁面在原始檔裡就是壞的（顯示 Error parsing unit table），沒有數值可讀。請另尋 AWD 後差資料或以溢流孔為準。'},
  {cat:'fluid', name:'煞車油規格', val:'DOT 3', unit:'', conf:'manual', src:'fsm', q:'煞車油 brake fluid dot'},
  {cat:'fuel',  name:'油箱容量', val:'16.9', unit:'US gal（約 64 L）', conf:'manual', src:'fsm', q:'油箱 容量 fuel tank'},

  {cat:'tq', name:'輪圈螺帽扭力', val:'120–140', unit:'N-m（87–101 ft-lb）', conf:'manual', src:'fsm_whl', q:'輪圈 螺帽 扭力 lug', hl:true},
  {cat:'tq', name:'火星塞扭力', val:'25', unit:'N-m（18 ft-lb）', conf:'manual', src:'fsm', q:'火星塞 扭力 spark plug'},

  {cat:'eng', name:'汽缸壓力（標準）', val:'1,250', unit:'kPa（178 psi）@ 250–400 rpm', conf:'manual', src:'fsm', q:'汽缸壓力 compression'},
  {cat:'eng', name:'汽缸壓力（最低）', val:'935', unit:'kPa（133 psi）', conf:'manual', src:'fsm', q:'汽缸壓力 compression 最低'},
  {cat:'eng', name:'各缸壓力最大差值', val:'100', unit:'kPa（14 psi）', conf:'manual', src:'fsm', q:'汽缸壓力 差值'},
  {cat:'eng', name:'汽油壓力', val:'290–310', unit:'kPa（42–45 psi）', conf:'manual', src:'fsm', q:'汽油壓力 fuel pressure'},
  {cat:'eng', name:'火星塞間隙', val:'0.71–0.78', unit:'mm（0.028–0.031 in）', conf:'manual', src:'fsm', q:'火星塞 間隙 gap'},
  {cat:'eng', name:'基本點火正時', val:'5° BTDC ± 3°', unit:'（實際約 8° BTDC）', conf:'manual', src:'fsm', q:'點火正時 ignition timing'},
  {cat:'eng', name:'進氣歧管真空', val:'60', unit:'kPa（18 inHg）', conf:'manual', src:'fsm', q:'真空 vacuum'},
  {cat:'eng', name:'壓縮比（4G63T）', val:'8.5', unit:':1', conf:'manual', src:'fsm', q:'壓縮比 compression ratio'},
  {cat:'eng', name:'缸徑 × 衝程', val:'85.0 × 88.0', unit:'mm', conf:'manual', src:'fsm', q:'缸徑 衝程 bore stroke'},
  {cat:'eng', name:'點火順序', val:'1-3-4-2', unit:'', conf:'manual', src:'fsm', q:'點火順序 firing order'},
  {cat:'eng', name:'汽門正時', val:'進氣 21°BTDC 開 / 51°ABDC 閉；排氣 57°BBDC 開 / 15°ATDC 閉', unit:'', conf:'manual', src:'fsm', q:'汽門正時 valve timing'},

  {cat:'brake', name:'前碟盤厚度（新品）', val:'23.9', unit:'mm（0.94 in）', conf:'manual', src:'fsm', q:'碟盤 厚度 前 brake disc'},
  {cat:'brake', name:'前碟盤最小厚度', val:'22.4', unit:'mm（0.88 in）', conf:'manual', src:'fsm', q:'碟盤 最小 厚度 前'},
  {cat:'brake', name:'後碟盤厚度（新品）', val:'9.9', unit:'mm（0.39 in）', conf:'manual', src:'fsm', q:'碟盤 厚度 後'},
  {cat:'brake', name:'後碟盤最小厚度', val:'8.4', unit:'mm（0.33 in）', conf:'manual', src:'fsm', q:'碟盤 最小 厚度 後'},
  {cat:'brake', name:'碟盤最大偏擺', val:'0.08', unit:'mm（0.0031 in）前後相同', conf:'manual', src:'fsm', q:'碟盤 偏擺 runout'},

  {cat:'align', name:'前輪 Toe-in', val:'-3 ~ +3', unit:'mm', conf:'manual', src:'fsm', q:'定位 toe 前'},
  {cat:'align', name:'前輪 Camber', val:"-0°35' ~ +0°25'", unit:'（手冊標示為 14 吋輪圈規格）', conf:'manual', src:'fsm', q:'定位 camber 前',
   warn:'手冊這張表只列出「Vehicles With 14-Inch Wheels」的數值。GS-T／GSX 原廠是 16 吋，手冊未另列，做四輪定位時請跟師傅確認。'},
  {cat:'align', name:'前輪 Caster', val:"3°10' ~ 6°10'", unit:'', conf:'manual', src:'fsm', q:'定位 caster'},
  {cat:'align', name:'後輪 Toe-in', val:'0 ~ 6', unit:'mm', conf:'manual', src:'fsm', q:'定位 toe 後'},
  {cat:'align', name:'後輪 Camber', val:"-1°50' ~ -0°50'", unit:'（14 吋輪圈規格）', conf:'manual', src:'fsm', q:'定位 camber 後'},
  {cat:'align', name:'推力角 Thrust Angle', val:"-9' ~ +9'", unit:'', conf:'manual', src:'fsm', q:'推力角 thrust'},

  {cat:'belt', name:'發電機皮帶張力（新品）', val:'490–686', unit:'N（撓度 7.5–9.0 mm）', conf:'manual', src:'fsm', q:'皮帶 張力 發電機'},
  {cat:'belt', name:'動力方向機皮帶張力（新品）', val:'490–686', unit:'N（撓度 4.5–5.5 mm）', conf:'manual', src:'fsm', q:'皮帶 張力 方向機'},
  {cat:'belt', name:'冷氣壓縮機皮帶張力（新品）', val:'382–441', unit:'N', conf:'manual', src:'fsm', q:'皮帶 張力 冷氣'},
];
const ECL_SVC_CATS = [
  {id:'fluid', name:'油品與容量', ic:'droplet'},
  {id:'fuel',  name:'燃油',       ic:'droplet'},
  {id:'tq',    name:'鎖緊扭力',   ic:'wrench'},
  {id:'eng',   name:'引擎數據',   ic:'gauge'},
  {id:'brake', name:'煞車',       ic:'disc'},
  {id:'align', name:'四輪定位',   ic:'target'},
  {id:'belt',  name:'皮帶',       ic:'arrows'},
];

/* ---------------- 保養週期（換算自手冊 Normal Service 表） ---------------- */
/* 手冊是英里制，這裡換算成公里並取整。mo 為手冊同時載明的時間週期。 */
const ECL_MAINT = [
  {id:'oil',    name:'引擎機油',      km:8000,  mo:6,  note:'手冊：每 5,000 英里或 6 個月'},
  {id:'oilf',   name:'機油濾芯',      km:16000, mo:12, note:'手冊：每 10,000 英里或 1 年。實務上多數人跟機油一起換'},
  {id:'airf',   name:'空氣濾芯',      km:48000, mo:0,  note:'手冊：每 30,000 英里'},
  {id:'plug',   name:'火星塞',        km:48000, mo:0,  note:'手冊：每 30,000 英里。間隙 0.71–0.78 mm、扭力 25 N-m'},
  {id:'coolant',name:'冷卻液',        km:48000, mo:24, note:'手冊：每 30,000 英里或 2 年'},
  {id:'igncbl', name:'高壓線',        km:96000, mo:60, note:'手冊：每 60,000 英里或 5 年'},
  {id:'tbelt',  name:'正時皮帶',      km:96000, mo:0,  note:'⚠ 手冊兩處說法不同：保養表寫 60,000 英里（加州為建議非強制），規格頁寫 1997 年式一律 100,000 英里。4G63 是干涉式引擎，皮帶斷會頂到汽門。DSM 社群普遍抓 60,000 英里。'},
  {id:'bbelt',  name:'平衡軸皮帶',    km:96000, mo:0,  note:'與正時皮帶同時更換。斷掉可能連帶捲壞正時皮帶，很多人選擇直接移除平衡軸'},
  {id:'brakef', name:'煞車油',        km:48000, mo:24, note:'手冊規格為 DOT 3；台灣高溫多山建議 2 年一換'},
  {id:'pad',    name:'煞車來令片',    km:24000, mo:12, note:'手冊：每 15,000 英里或 1 年檢查一次，非固定更換週期'},
  {id:'cvboot', name:'傳動軸防塵套',  km:24000, mo:12, note:'手冊：每 15,000 英里或 1 年檢查漏油與破損'},
  {id:'mtf',    name:'手排變速箱油',  km:48000, mo:24, note:'手冊只要求每 30,000 英里「檢查油量」，未訂更換週期。實務建議 3–5 萬公里更換'},
  {id:'tcase',  name:'分動箱油（AWD）',km:48000, mo:24, note:'手冊只要求每 30,000 英里檢查。AWD 專有', driveOnly:'AWD'},
  {id:'diff',   name:'差速器油（AWD）',km:48000, mo:24, note:'手冊只要求每 30,000 英里檢查', driveOnly:'AWD'},
  {id:'dbelt',  name:'外皮帶（發電機／方向機／冷氣）', km:48000, mo:24, note:'手冊：每 30,000 英里檢查狀況'},
  {id:'fuelf',  name:'汽油濾清器',    km:96000, mo:60, note:'手冊：每 60,000 英里檢查燃油系統洩漏；濾清器阻塞會限速與難發動'},
  {id:'tire',   name:'輪胎',          km:50000, mo:60, note:'胎紋 <1.6mm 驗車不過；橡膠老化亦需更換'},
  {id:'batt',   name:'電瓶',          km:0,     mo:48, note:'手冊未載明寄生電流規格（Information not supplied by the manufacturer）'},
  {id:'insp',   name:'定期驗車',      km:0,     mo:6,  note:'車齡已滿 10 年 → 每年至少 2 次'},
];

/* ---------------- 已知弱點（社群彙整，手冊不會寫這些） ---------------- */
const ECL_WEAK = [
  {name:'Crank walk（曲軸軸向位移）', lv:'r',
   what:'1995–1999 的 7-bolt 4G63 最有名的問題。曲軸推力軸承磨損後，曲軸開始前後移動。',
   sign:'離合器踏板會抖／脈動、離合器難分離、皮帶盤明顯前後晃動。用千分表頂曲軸皮帶盤、踩放離合器量軸向位移最準。',
   fix:'沒有便宜的修法，通常要拆下引擎換曲軸與軸承，很多人直接換 6-bolt 曲軸總成。買車前一定要量。'},
  {name:'正時皮帶斷裂（干涉式引擎）', lv:'r',
   what:'4G63 是干涉式設計，正時皮帶一斷，活塞會撞到汽門。',
   sign:'沒有前兆。只能靠里程與外觀檢查（龜裂、缺齒、滲油）預防。',
   fix:'手冊說法在 60,000 與 100,000 英里之間有出入，社群普遍抓 60,000 英里（約 96,000 km），並同時換水泵、惰輪、張力器與平衡軸皮帶。'},
  {name:'平衡軸皮帶斷裂', lv:'y',
   what:'平衡軸皮帶位在正時皮帶內側，斷掉後可能纏進正時皮帶。',
   sign:'異常震動或異音，但常常沒有徵兆。',
   fix:'與正時皮帶同時更換。部分玩家選擇移除平衡軸（balance shaft delete），代價是引擎震動變大。'},
  {name:'排氣歧管龜裂', lv:'y',
   what:'渦輪車的鑄鐵排氣歧管長期熱循環後容易在管口處裂開。',
   sign:'冷車時引擎室有排氣洩漏聲，加速時更明顯；渦輪遲滯變嚴重。',
   fix:'補焊或換社外歧管。'},
  {name:'後主油封與凸輪軸油封滲油', lv:'y',
   what:'年份久遠的橡膠油封硬化。',
   sign:'離合器殼下方或正時蓋內側積油。',
   fix:'凸輪軸油封可趁換正時皮帶時一起換，工資幾乎不用另外算。'},
  {name:'AWD 分動箱與傳動軸支撐軸承（僅 GSX）', lv:'y',
   what:'AWD 系統的分動箱與中間軸承是 GSX 專有的耗材。',
   sign:'行駛中低頻嗡嗡聲隨車速變化、起步有異音。',
   fix:'手冊有分動箱油量（0.5 L）但沒訂更換週期，建議跟變速箱油一起處理。'},
  {name:'曲軸位置感知器（CAS）失效', lv:'y',
   what:'熱車後訊號不穩會直接熄火。',
   sign:'熱車熄火、無預警失去點火與噴油、重新發動後又正常。',
   fix:'屬於常見耗材，出問題就換整顆。'},
];
const ECL_WEAK_NOTE = '這一頁的內容不是從你那本原廠手冊來的。原廠手冊寫的是「怎麼修」，不會寫「哪裡容易壞」。以下是 DSM 社群長年累積的共識，屬於二手資訊，請當作檢查方向而不是診斷結論。';

/* ---------------- 手冊索引 ---------------- */
const ECL_MANUAL = {
  title: '1997 Mitsubishi Eclipse GSX AWD L4-1997cc 2.0L DOHC Turbo MFI Service Manual',
  pub: 'Operation CHARM（charm.li）',
  lang: '英文',
  pages: 7853,
  covers: ['4G63T'],
  note: '這是 GSX AWD 渦輪車的手冊，內容同時涵蓋 FWD 版本的部分資料（例如輪圈規格與變速箱油量都分別列出 FWD／AWD）。420A 自然進氣引擎不在涵蓋範圍。',
  sections: [
    {code:'PM', name:'Powertrain Management',        n:396},
    {code:'SP', name:'Specifications',               n:319},
    {code:'TD', name:'Transmission and Drivetrain',  n:239},
    {code:'EN', name:'Engine, Cooling and Exhaust',  n:214},
    {code:'DG', name:'Diagrams',                     n:177},
    {code:'MA', name:'Maintenance',                  n:165},
    {code:'LH', name:'Lighting and Horns',           n:116},
    {code:'SS', name:'Steering and Suspension',      n:85},
    {code:'SC', name:'Starting and Charging',        n:77},
    {code:'BR', name:'Brakes and Traction Control',  n:73},
    {code:'AC', name:'Heating and Air Conditioning', n:62},
    {code:'BF', name:'Body and Frame',               n:60},
  ],
};
const ECL_MANUAL_RESOLVES = [
  {topic:'正時皮帶更換週期',
   before:'社群說法從 60,000 到 100,000 英里都有',
   after:'手冊自己就有兩種說法：保養排程寫 60,000 英里（加州車建議非強制），規格頁寫 1997 年式一律 100,000 英里',
   why:'兩處都是原廠文件。考慮到 4G63 是干涉式引擎、皮帶斷就傷汽門，取短的比較安全。'},
  {topic:'輪圈孔距',
   before:'常被誤傳成 5x100 或 4x114.3',
   after:'5x114.3（P.C.D. 114.3 mm），offset 一律 46 mm',
   why:'手冊 Wheels 章節對鋼圈、鋁圈、備胎都明確寫出 P.C.D. 114.3 mm 與 offset 46 mm。'},
  {topic:'輪圈螺帽扭力',
   before:'—',
   after:'120–140 N-m（87–101 ft-lb）',
   why:'手冊 Wheel Fastener Torque 章節直接載明，範圍比一般日系車高不少。'},
];

/* ==========================================================================
   平台切換
   ========================================================================== */
const PLATFORMS = [
  {id:'e36',   name:'BMW E36',            sub:'1990–2000 3 系列', studio:true},
  {id:'dsm2g', name:'Mitsubishi Eclipse 2G', sub:'1995–1999 / DSM', studio:false},
];
const platOf   = c => (c && c.plat) || 'e36';
const platName = id => (PLATFORMS.find(p=>p.id===id)||PLATFORMS[0]).name;
const isE36    = c => platOf(c)==='e36';

const enginesOf = p => p==='dsm2g' ? ECL_ENGINES : ENGINES;
const modelsOf  = p => p==='dsm2g' ? ECL_MODELS  : MODELS;
const bodiesOf  = p => p==='dsm2g' ? ECL_BODIES  : BODIES;
const transOf   = p => p==='dsm2g' ? ECL_TRANS   : TRANS;
const hubOf     = c => platOf(c)==='dsm2g' ? ECL_HUB : HUB;
const svcOf     = p => p==='dsm2g' ? ECL_SVC : SVC;
const svcCatsOf = p => p==='dsm2g' ? ECL_SVC_CATS : SVC_CATS;
/* 保養項目：Eclipse 的分動箱與差速器只有 AWD 才列 */
function maintItemsOf(c){
  if(platOf(c)!=='dsm2g') return MAINT_ITEMS;
  const m = modelsOf('dsm2g').find(x=>x.id===(c&&c.modelId));
  const drive = m ? m.drive : null;
  return ECL_MAINT.filter(it=>!it.driveOnly || it.driveOnly===drive);
}
/* 保養履歷要能顯示任何平台的項目名稱 */
const ALL_MAINT = () => [...MAINT_ITEMS, ...ECL_MAINT];

/* ---------------- Eclipse 輪圈款式 ---------------- */
const ECL_WHEEL_STYLES = [
  {id:'ecl-oem',brand:'Mitsubishi',name:'2G GS-T / GSX 原廠六輻',cat:'六輻',spokes:6,wide:true},
  {id:'ecl-mesh6',brand:'Mitsubishi',name:'原廠六雙輻',cat:'六雙輻',spokes:12,pair:true,thin:true},
  {id:'ecl-gold',brand:'Rally',name:'六輻競技款',cat:'六輻',spokes:6,wide:true,dish:true},
];
/* E36 的鋁圈素材造型通用，兩個平台都可以選 */
const wheelStylesOf = c => platOf(c)==='dsm2g'
  ? [...ECL_WHEEL_STYLES, ...WHEEL_STYLES] : WHEEL_STYLES;

/* ---------------- 保養項目分類（給紀錄編輯用的選單分組） ---------------- */
const MAINT_GROUPS = [
  {id:'fluid', name:'油品',     ic:'droplet', ids:['oil','oilf','coolant','brakef','trans','mtf','atf','diff','tcase','psf']},
  {id:'filter',name:'濾芯',     ic:'airfilter',ids:['airf','cabin','fuelf']},
  {id:'ign',   name:'點火',     ic:'spark',    ids:['plug','igncbl']},
  {id:'belt',  name:'皮帶',     ic:'belt',     ids:['belt','tbelt','bbelt','dbelt']},
  {id:'brake', name:'煞車',     ic:'disc',    ids:['pad']},
  {id:'chas',  name:'底盤耗材', ic:'suspension',ids:['tire','cvboot']},
  {id:'other', name:'其他',     ic:'box',     ids:['batt','insp']},
];
/* 把某台車適用的保養項目分好組；沒被歸類的自動落到「其他」 */
function maintGrouped(c){
  const items = maintItemsOf(c);
  const used = new Set();
  const out = MAINT_GROUPS.map(g=>{
    const list = items.filter(it=>g.ids.includes(it.id));
    list.forEach(it=>used.add(it.id));
    return {...g, list};
  }).filter(g=>g.list.length);
  const rest = items.filter(it=>!used.has(it.id));
  if(rest.length){
    const o = out.find(g=>g.id==='other');
    if(o) o.list = o.list.concat(rest);
    else out.push({id:'other', name:'其他', ic:'box', list:rest});
  }
  return out;
}
