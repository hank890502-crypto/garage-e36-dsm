/* ==========================================================================
   傳動系統資料：變速箱齒比 / 終傳比 / 差速器 / 離合器 / 飛輪
   --------------------------------------------------------------------------
   來源分級沿用本專案慣例：
     oem       原廠文件或原廠新聞稿
     trade     專業同業刊物（例如 ATRA GEARS，非原廠但屬業界技術文獻）
     vendor    改裝品製造商或經銷商公布值
     community 論壇／維基共識
     est       ★估算值★ —— 查無公開規格，由物理推算或同級品推估，僅供模擬使用

   ★ 重要原則：查不到就標「查無可靠來源」，不編造看起來合理的數字。★
   幾個常見誤解在下面各自註明（2G 渦輪是 T25 不是 14b、DSM 終傳是多段減速、
   E36 的「可變 M 差速器」是 E46 才有的東西）。
   ========================================================================== */

/* --------------------------------------------------------------------------
   變速箱
   -------------------------------------------------------------------------- */
const GEARBOXES = [
  /* ---- BMW E36 ---- */
  {id:'g-250g', plat:'e36', brand:'Getrag', name:'S5D 250G', type:'手排', gears:[4.23,2.52,1.66,1.22,1.00], rev:4.04,
   nm:250, conf:'community', src:'racegerman',
   fits:'318i（1996–98）／320i／323i／325i',
   note:'S5D 200G（316i／早期 318i）目前查到的所有來源都列出與 250G 完全相同的齒比，差異只在扭力容許值與軸件強度，因此本表併為一項。倒檔另有 3.07 的說法（一個來源），本表採多數的 4.04。'},
  {id:'g-320z', plat:'e36', brand:'ZF', name:'S5D 320Z（S5-31）', type:'手排', gears:[4.21,2.49,1.66,1.24,1.00], rev:3.89,
   nm:320, conf:'community', src:'wiki_zf531', oe:true,
   fits:'328i、M3（1995/09 後）',
   note:'與 310Z 齒比相同，1995/09 起改為強化設計，扭力容許值 310 → 320 Nm。各來源第一檔在 4.20–4.21 之間、倒檔 3.85–3.89，差距 0.5% 以內。'},
  {id:'g-420g', plat:'e36', brand:'Getrag', name:'S6S 420G', type:'手排', gears:[4.227,2.528,1.669,1.226,1.000,0.828], rev:3.746,
   nm:499, conf:'community', src:'wiki_420g',
   fits:'M3 3.2（歐規，北美無此配置）',
   note:'六速。扭力容許值 499 Nm，箱體約 49 kg。第六檔 0.828 是超比檔，巡航轉速明顯下降。'},
  {id:'g-4l30e', plat:'e36', brand:'GM', name:'A4S 310R／270R（4L30-E）', type:'自排', gears:[2.86,1.62,1.00,0.72], rev:2.00,
   nm:350, conf:'community', src:'buildjournal', auto:true,
   fits:'318i／325i／328i（1995/09 前）自排',
   note:'⚠ 齒比有爭議：E36 專屬來源給 2.86/1.62，但 4L30-E 的通用資料把 2.86/1.62 歸給 Isuzu 版、把 2.400/1.467 歸給 Opel/BMW 版。本表採兩個 E36 專屬來源的數字。'},
  {id:'g-5hp18', plat:'e36', brand:'ZF', name:'A5S 310Z（5HP18）', type:'自排', gears:[3.665,1.999,1.407,1.000,0.742], rev:4.096,
   nm:310, conf:'community', src:'gearboxlist', auto:true,
   fits:'328i、M3（北美自排）',
   note:'五速自排。扭力容許值 310 Nm。變矩器失速轉速查無可靠來源。'},
  {id:'g-e36-close', plat:'e36', brand:'—', name:'賽車用密齒比（示意）', type:'手排', gears:[2.99,2.06,1.58,1.25,1.00], rev:3.46,
   nm:450, conf:'est', fits:'賽道用途',
   note:'★估算值★ 這不是特定商品的規格。市售 E36 密齒比套件（Getrag／Drenth／Quaife 等）齒比依訂製而異且多半不公開，本項只是給模擬用的典型密齒比形狀：一檔拉長、檔位落差縮小。要當真實規格用請以廠商實際型錄為準。'},

  /* ---- Mitsubishi Eclipse 2G ---- */
  {id:'g-w5m33', plat:'dsm2g', brand:'Mitsubishi', name:'W5M33', type:'手排', gears:[3.083,1.684,1.115,0.833,0.666], rev:3.166,
   nm:null, conf:'trade', src:'atra_gears', oe:true,
   fits:'GSX／Talon TSi AWD（4G63T AWD）',
   note:'三個獨立來源在二～五檔完全一致。三檔另有 1.160 的說法（一個來源），但該值與 Evo III 的規格相同，研判是跨欄位污染，本表採 1.115。'},
  {id:'g-f5m33', plat:'dsm2g', brand:'Mitsubishi', name:'F5M33', type:'手排', gears:[3.090,1.833,1.217,0.888,0.741], rev:3.166,
   nm:null, conf:'trade', src:'atra_gears', oe:true,
   fits:'GS-T／Talon TSi（4G63T FWD）',
   note:'兩個獨立來源分別以「各檔齒比」與「總減速比 ÷ 終傳」推導，結果完全吻合。'},
  {id:'g-f5mc1', plat:'dsm2g', brand:'New Venture', name:'F5MC1（NVT350）', type:'手排', gears:[3.54,2.13,1.36,1.03,0.81], rev:null,
   nm:null, conf:'community', src:'dsmtuners', fits:'RS／GS（420A 自然進氣）',
   note:'⚠ 低可信度：唯一來源的討論串被版主標註含有錯誤。這組齒比與 Chrysler／Neon 的 T350 相同，與此變速箱的 Chrysler 血統相符，故仍列出但請勿當規格引用。倒檔查無可靠來源。'},
  {id:'g-w4a33', plat:'dsm2g', brand:'Mitsubishi', name:'W4A33／F4A33', type:'自排', gears:[2.551,1.488,1.000,0.685], rev:2.176,
   nm:null, conf:'community', src:'dsmtuners', auto:true, fits:'GSX／GS-T 自排',
   note:'FWD 與 AWD 齒比相同，差別在終傳（FWD 4.422／AWD 3.957）。來源引用原廠銷售型錄。'},
];

/* --------------------------------------------------------------------------
   終傳比
   --------------------------------------------------------------------------
   E36 的「3.45 與 3.46」其實是同一組齒輪：環齒輪代號 H41 = 38:11 = 3.4545，
   不同來源四捨五入方式不同而已。物理計算一律用真實齒數比。
   -------------------------------------------------------------------------- */
const FINAL_DRIVES = [
  /* ---- E36：ratio 用齒數比算出的真值 ---- */
  {id:'fd-279', plat:'e36', ratio:2.7857, label:'2.79', code:'H7（39:14）', case:'188mm', oe:true, conf:'vendor', src:'srs_concept', use:'長腳，極速取向'},
  {id:'fd-293', plat:'e36', ratio:2.93,   label:'2.93', code:'—',          case:'188mm', oe:true, conf:'community', src:'buildjournal', use:'323i／328i 手排'},
  {id:'fd-307', plat:'e36', ratio:3.07,   label:'3.07', code:'—',          case:'188mm', oe:true, conf:'community', src:'buildjournal', use:'328i 自排（歐規）'},
  {id:'fd-315', plat:'e36', ratio:3.15,   label:'3.15', code:'—',          case:'188mm', oe:true, conf:'community', src:'buildjournal', use:'325i、M3 3.0 — 常見 LSD 配置'},
  {id:'fd-323', plat:'e36', ratio:3.23,   label:'3.23', code:'—',          case:'188/210mm', oe:true, conf:'vendor', src:'buildjournal', use:'M3（北美 96–99）、歐規 M3 3.2'},
  {id:'fd-338', plat:'e36', ratio:3.3846, label:'3.38', code:'H17（44:13）', case:'168/188mm', oe:true, conf:'vendor', src:'srs_concept', use:'318is（歐規）、M3 自排'},
  {id:'fd-345', plat:'e36', ratio:3.4545, label:'3.45', code:'H41（38:11）', case:'168mm', oe:true, conf:'vendor', src:'srs_concept', use:'318i／320i。有些資料寫 3.46，是同一組齒輪'},
  {id:'fd-364', plat:'e36', ratio:3.64,   label:'3.64', code:'H9',          case:'188mm', oe:true, conf:'vendor', src:'srs_concept', use:'323i 自排（歐規）'},
  {id:'fd-391', plat:'e36', ratio:3.9091, label:'3.91', code:'H2（43:11）',  case:'188mm', oe:true, conf:'vendor', src:'srs_concept', use:'北美六缸自排 — 常見 LSD 來源'},
  {id:'fd-410', plat:'e36', ratio:4.100,  label:'4.10', code:'H1（41:10）',  case:'188mm', oe:false, conf:'vendor', src:'driftshop', use:'★非原廠★ 188mm 改裝短齒比組（E30 才是原廠配置）'},
  {id:'fd-427', plat:'e36', ratio:4.2727, label:'4.27', code:'H8（47:11）',  case:'168mm', oe:false, conf:'vendor', src:'garagistic', use:'★非原廠★ E30 318ic 的原廠比，E36 需移植'},
  {id:'fd-444', plat:'e36', ratio:4.4444, label:'4.44', code:'H12（40:9）',  case:'168mm', oe:true, conf:'vendor', src:'srs_concept', use:'316i／318i／318ti 自排'},

  /* ---- Eclipse：AWD 是多段減速，這裡的 ratio 是「等效總終傳」---- */
  {id:'fd-4153', plat:'dsm2g', ratio:4.153, label:'4.153', code:'單段', case:'FWD', oe:true, conf:'trade', src:'atra_gears', use:'GS-T（FWD 渦輪）'},
  {id:'fd-4929', plat:'dsm2g', ratio:4.929, label:'4.929', code:'1.275 × 3.866', case:'AWD', oe:true, conf:'community', src:'dsmtuners', use:'GSX（1996/06 前）— 前差速器環齒輪 58 齒',
   stages:{primary:1.275, front:3.866, transfer:1.090, rear:3.545}},
  {id:'fd-4845', plat:'dsm2g', ratio:4.845, label:'4.845', code:'1.275 × 3.800', case:'AWD', oe:true, conf:'community', src:'dsmtuners', use:'GSX（1996/07 後）— 前差速器環齒輪 57 齒',
   stages:{primary:1.275, front:3.800, transfer:1.074, rear:3.545}},
  {id:'fd-3957', plat:'dsm2g', ratio:3.957, label:'3.957', code:'單段', case:'AWD 自排', oe:true, conf:'community', src:'dsmtuners', use:'GSX 自排'},
  {id:'fd-4422', plat:'dsm2g', ratio:4.422, label:'4.422', code:'單段', case:'FWD 自排', oe:true, conf:'community', src:'dsmtuners', use:'GS-T 自排'},
];

/* --------------------------------------------------------------------------
   差速器（LSD）
   --------------------------------------------------------------------------
   模擬用的三個數字：
     lockA  加速側鎖定率（0–1）—— 可跨傳到有抓地力那一輪的扭力比例
     lockD  減速側鎖定率（0–1）—— 1-way 為 0，2-way 與加速側相同
     pre    預壓／脫離扭力（Nm）—— 直線行駛時就存在的基本鎖定

   ★ 鎖定率的定義陷阱（來源明確指出）★
   「25% 鎖定」是相對於「輸入扭力」而非固定值：同一顆 25% 差速器裝在 240 Nm 的
   引擎上，跨傳能力就比裝在 360 Nm 引擎上更顯著。物理模型已照這個定義實作。

   ★ 常見誤解 ★ BMW 的「可變 M 差速器」（能把近乎 100% 扭力送到單輪的
   剪切泵式差速器）是 2000 年 6 月發表、給 E46 M3 用的。E36 M3 是傳統的
   25% 多片式 LSD。
   -------------------------------------------------------------------------- */
const DIFFS = [
  /* ---- E36 ---- */
  {id:'d-open', plat:'e36', brand:'原廠', name:'開放式差速器', kind:'open', lockA:0, lockD:0, pre:0,
   ways:0, conf:'community', src:'racegerman',
   desc:'非 M 車系的基本配置。單邊失去抓地力時扭力全部流失，出彎內輪容易空轉。'},
  {id:'d-oem25', plat:'e36', brand:'BMW', name:'原廠 LSD（25%）', kind:'clutch', lockA:.25, lockD:.25, pre:40,
   ways:2, conf:'oem', src:'bmw_mdiff',
   desc:'多片式（Salisbury），2 片摩擦片、45° 斜坡，加減速對稱。BMW 官方新聞稿描述為「最高 25%」。M3 全車系標配，325i 等亦有選配。'},
  {id:'d-40', plat:'e36', brand:'RacingDiffs', name:'40% 升級（3 片）', kind:'clutch', lockA:.40, lockD:.40, pre:47,
   ways:2, conf:'vendor', src:'racingdiffs',
   desc:'原廠殼體內加到 3 片摩擦片、維持 45° 斜坡，鎖定率 25% → 40%。不需更換整顆差速器。'},
  {id:'d-95', plat:'e36', brand:'RacingDiffs', name:'95% 強鎖（4 片／30°）', kind:'clutch', lockA:.95, lockD:.95, pre:90,
   ways:2, conf:'vendor', src:'racingdiffs',
   desc:'4 片摩擦片配 30° 斜坡。斜坡角越小 → 壓環軸向推力越大 → 鎖定越強。接近直結，市區低速會有明顯的內外輪拉扯。'},
  {id:'d-kaaz15', plat:'e36', brand:'Kaaz', name:'Kaaz 1.5way（12 片）', kind:'clutch', lockA:.40, lockD:.25, pre:100,
   ways:1.5, conf:'vendor', src:'kaaz_dbw3010',
   desc:'E36 六缸專用（DBW3010），12 片摩擦片。原廠未公布鎖定率與斜坡角，此處採用同業公開的通用對照：1.5way 約 35°/45° → 加速 40%、減速 25%。預壓取賽道用途的典型值。',
   est:true},
  {id:'d-quaife', plat:'e36', brand:'Quaife', name:'Quaife ATB（扭力感應）', kind:'helical', lockA:.60, lockD:.60, pre:0,
   ways:2, conf:'est', src:'quaife_tech',
   desc:'★鎖定率為估算★ Quaife 官方明文拒絕公布扭力偏壓比（TBR），理由是螺旋角、齒形、行星齒數與車型都會影響表現。本模型採 TBR 2.5:1（換算約 60%），是同型螺旋齒差速器的常見區間，不是 Quaife 的規格。特性：無摩擦片、免保養、單輪完全離地時失效。',
   est:true},
  {id:'d-osgiken', plat:'e36', brand:'OS Giken', name:'OS Giken Super Lock', kind:'clutch', lockA:.90, lockD:.60, pre:60,
   ways:1.5, conf:'est', src:'osgiken',
   desc:'★數值為估算★ 原廠只公布「可達 100% 鎖定但作動線性」與最多 28 片的結構，未公布斜坡角、初期扭力與 way 數對照。此處以其宣稱特性推估。多片結構的漸進性是其賣點，鎖定強但不像純機械鎖那樣突兀。',
   est:true},

  /* ---- Eclipse 2G ---- */
  {id:'d-ecl-open', plat:'dsm2g', brand:'原廠', name:'開放式（前軸）', kind:'open', lockA:0, lockD:0, pre:0,
   ways:0, conf:'community', src:'dsmtuners',
   desc:'DSM 全車系、全年份的前差速器都是開放式，原廠從未提供前 LSD。FWD 的 GS-T 出彎內輪空轉（扭力轉向）就是這個原因。'},
  {id:'d-ecl-vlsd', plat:'dsm2g', brand:'Mitsubishi', name:'原廠黏性 LSD（後軸）', kind:'viscous', lockA:.20, lockD:.20, pre:25,
   ways:2, conf:'est', src:'dsmtuners',
   desc:'★數值為估算★ 僅 AWD 車型的後軸，且配備與否依車輛個體而定（門柱橘色貼紙或差速器上的 Viscous LSD 銘板可判別）。原廠未公布黏性接合的鎖定曲線，此處以黏性式的一般行為推估：需要轉速差才產生鎖定，反應偏慢。',
   est:true},
  {id:'d-ecl-quaife', plat:'dsm2g', brand:'Quaife', name:'Quaife ATB（前軸）', kind:'helical', lockA:.60, lockD:.60, pre:0,
   ways:2, conf:'est', src:'quaife_tech',
   desc:'★鎖定率為估算★ AWD 用 QDH8B（25 齒花鍵）、FWD 用 QDH7B（27 齒花鍵）。同樣地，Quaife 不公布 TBR，60% 是通用估算。裝在前軸能大幅改善 4G63T 出彎的內輪空轉。',
   est:true},
  {id:'d-ecl-kaaz', plat:'dsm2g', brand:'Kaaz', name:'Kaaz SuperQ 1.5way（前軸）', kind:'clutch', lockA:.40, lockD:.25, pre:60,
   ways:1.5, conf:'vendor', src:'kaaz_dbm2010',
   desc:'DBM2010，前差速器用。這是資料最完整的一顆：原廠公布初期扭力 5.0–7.5 kg·m（約 49–74 Nm）、凸輪角 45°×20°、12 片摩擦片。鎖定率未公布，依 1.5way 通用對照推估。DSM 用的 Kaaz 已停產。'},
  {id:'d-ecl-cusco', plat:'dsm2g', brand:'Cusco', name:'Cusco Type-RS 1.5way（後軸）', kind:'clutch', lockA:.40, lockD:.25, pre:35,
   ways:1.5, conf:'est', src:'cusco_141',
   desc:'★預壓為估算★ LSD 141 L15，後差速器用，另有 2way 版本。原廠只說明「RS 設計的初期扭力比傳統錐盤式低 50–70%」，未給絕對值，故預壓取低值。',
   est:true},
];

/* --------------------------------------------------------------------------
   離合器
   -------------------------------------------------------------------------- */
const CLUTCHES = [
  /* ---- E36 ---- */
  {id:'c-oem', plat:'e36', brand:'原廠', name:'原廠離合器', nm:350, kind:'single', conf:'est', src:'turner_spec',
   desc:'★容許扭力為推估★ BMW／Sachs／LuK 都未公布原廠件的扭力容許值。此處取 350 Nm，理由是 Sachs 的強化替換品標示 480 Nm、SPEC 入門的 Stage 1 為 386 Nm，原廠應在其下。改裝店的經驗是 S52 上到 300 hp 仍只偶爾打滑。',
   est:true},
  {id:'c-sachs', plat:'e36', brand:'Sachs', name:'Sachs Performance 240mm', nm:480, kind:'single', conf:'vendor', src:'sachs_perf',
   desc:'單片強化，原廠等級的操作手感，接合線性。適合原廠動力到輕度改裝。'},
  {id:'c-spec2', plat:'e36', brand:'SPEC', name:'SPEC Stage 2', nm:454, kind:'single', conf:'vendor', src:'spec_e36',
   desc:'街道／直線兼用。SPEC 的 E36 M3 全階梯：Stage 1 386 / 2 454 / 2+ 502 / 3 569 / 3+ 633 / 4 569 / 5 752 Nm。'},
  {id:'c-spec3', plat:'e36', brand:'SPEC', name:'SPEC Stage 3', nm:569, kind:'single', conf:'vendor', src:'spec_e36',
   desc:'街道可用的上限。踏板變重、接合行程縮短。'},
  {id:'c-osgiken', plat:'e36', brand:'OS Giken', name:'OS Giken GT 雙片', nm:881, kind:'twin', conf:'vendor', src:'osgiken_bm156',
   desc:'雙片式（GT2CD）。慣量大幅降低，升轉極快，但低速接合難度高、噪音明顯，純街道車不建議。'},

  /* ---- Eclipse ---- */
  {id:'c-ecl-oem', plat:'dsm2g', brand:'原廠', name:'原廠離合器', nm:343, kind:'single', conf:'est', src:'act_dsm',
   desc:'★容許扭力為推算★ 無來源直接公布。由 ACT 三款產品各自標示的「較原廠增加 27% / 64% / 109%」反推，三者得到 252／253／254 lb-ft，一致性極高，換算約 343 Nm。'},
  {id:'c-ecl-act', plat:'dsm2g', brand:'ACT', name:'ACT HD 街道用', nm:434, kind:'single', conf:'vendor', src:'act_dsm',
   desc:'MB1-HDSS，較原廠 +27%。彈簧式從動盤，街道行駛品質接近原廠。'},
  {id:'c-ecl-spec2', plat:'dsm2g', brand:'SPEC', name:'SPEC Stage 2', nm:542, kind:'single', conf:'vendor', src:'spec_dsm',
   desc:'SPEC 的 4G63 全階梯：Stage 1 475 / 2 542 / 2+ 607 / 3 645 / 3+ 751 / 4 637 / 5 907 Nm。（Stage 4 低於 3+ 不是筆誤，是不同摩擦材料。）'},
  {id:'c-ecl-spec3', plat:'dsm2g', brand:'SPEC', name:'SPEC Stage 3', nm:645, kind:'single', conf:'vendor', src:'spec_dsm',
   desc:'陶瓷材質，接合突兀，適合已上大渦輪的車。'},
  {id:'c-ecl-twin', plat:'dsm2g', brand:'ACT', name:'ACT T1R 雙片', nm:1044, kind:'twin', conf:'vendor', src:'act_twin',
   desc:'雙片式競技用。4G63T 大馬力的常見選擇。'},
];

/* --------------------------------------------------------------------------
   飛輪
   --------------------------------------------------------------------------
   慣量 I 由質量推算：I ≈ k · m · r²，離合器面半徑取 0.12 m，
   k 取 0.55（實心圓盤 0.5，外緣加厚的齒圈使其略高）。★推算值★
   沒有任何廠商公布轉動慣量，但飛輪的「質量」才是使用者看得到的規格，
   慣量只是模型內部用的中間值，故以推算處理並標明。
   -------------------------------------------------------------------------- */
const FLYWHEELS = [
  {id:'f-oem-e36', plat:'e36', brand:'原廠', name:'原廠雙質量飛輪', kg:11.34, kind:'dual', conf:'vendor', src:'turner_fw',
   desc:'E36 六缸全車系原廠皆為雙質量（DMF）。吸震好、怠速安靜，但慣量大、升轉慢。另有 25.5 lb（11.57 kg）的標示版本。'},
  {id:'f-ecs', plat:'e36', brand:'ECS', name:'ECS 輕量鋼製', kg:7.51, kind:'single', conf:'vendor', src:'turner_fw',
   desc:'較原廠輕約 34%。單質量，換檔時會多出一些齒輪敲擊聲。'},
  {id:'f-act-e36', plat:'e36', brand:'ACT', name:'ACT XACT Streetlite', kg:6.89, kind:'single', conf:'vendor', src:'turner_fw',
   desc:'鋼製輕量化，街道與賽道折衷。'},
  {id:'f-jbr', plat:'e36', brand:'JB Racing', name:'JB Racing 鋁合金', kg:4.54, kind:'single', conf:'vendor', src:'jbracing',
   desc:'較原廠輕 60%，鋁合金本體配可更換的鋼製摩擦面。空車補油的升轉速度差異非常明顯，但低速換檔要更用心。'},

  {id:'f-oem-ecl', plat:'dsm2g', brand:'原廠', name:'原廠飛輪', kg:8.6, kind:'single', conf:'community', src:'dsmtuners_fw',
   desc:'實測值 18–20 lb（8.2–9.1 kg），此處取中間值。原廠即為單質量。'},
  {id:'f-act-ecl', plat:'dsm2g', brand:'ACT', name:'ACT StreetLite 鉻鉬鋼', kg:5.26, kind:'single', conf:'vendor', src:'act_fw',
   desc:'AWD 用 11.6 lb；FWD 版本略重（12.3–12.5 lb）。'},
  {id:'f-fidanza', plat:'dsm2g', brand:'Fidanza', name:'Fidanza 鋁合金', kg:3.63, kind:'single', conf:'vendor', src:'fidanza_dsm',
   desc:'AWD 六螺栓與七螺栓皆為 8.0 lb，FWD 七螺栓 8.5 lb。4G63T 常見的輕量化選擇。'},
];

/* 飛輪慣量推算（kg·m²）：I ≈ 0.55 · m · r²，r = 0.12 m */
function flywheelInertia(kg){ return 0.55*(+kg||9)*0.12*0.12; }

/* --------------------------------------------------------------------------
   查詢函式
   -------------------------------------------------------------------------- */
const gearboxesOf = c => GEARBOXES.filter(x=>x.plat===platOf(c));
const finalDrivesOf = c => FINAL_DRIVES.filter(x=>x.plat===platOf(c));
const diffsOf = c => DIFFS.filter(x=>x.plat===platOf(c));
const clutchesOf = c => CLUTCHES.filter(x=>x.plat===platOf(c));
const flywheelsOf = c => FLYWHEELS.filter(x=>x.plat===platOf(c));
const gearboxById = id => GEARBOXES.find(x=>x.id===id);
const finalDriveById = id => FINAL_DRIVES.find(x=>x.id===id);
const diffById = id => DIFFS.find(x=>x.id===id);
const clutchById = id => CLUTCHES.find(x=>x.id===id);
const flywheelById = id => FLYWHEELS.find(x=>x.id===id);

/* 這台車的原廠傳動組合 */
function stockDrivetrain(c){
  const plat = platOf(c);
  if(plat==='dsm2g'){
    const m = typeof mdlById==='function' ? mdlById(c?.modelId) : null;
    const awd = m && m.drive==='AWD';
    const turbo = !m || m.turbo;
    return {
      gearbox: awd?'g-w5m33':(turbo?'g-f5m33':'g-f5mc1'),
      /* 1996/07 起前差速器環齒輪由 58 齒改 57 齒 */
      finalDrive: awd ? (+c?.year>=1997?'fd-4845':'fd-4929') : 'fd-4153',
      diff: awd?'d-ecl-vlsd':'d-ecl-open',
      clutch:'c-ecl-oem', flywheel:'f-oem-ecl',
    };
  }
  const m = typeof mdlById==='function' ? mdlById(c?.modelId) : null;
  const six = !!(m && m.six), isM = !!(m && m.m);
  const euroM32 = m && m.id==='m3-s50b32';
  return {
    gearbox: euroM32?'g-420g':(six||isM?'g-320z':'g-250g'),
    finalDrive: isM?(euroM32?'fd-323':'fd-315'):(six?'fd-293':'fd-345'),
    diff: isM?'d-oem25':'d-open',
    clutch:'c-oem', flywheel:'f-oem-e36',
  };
}

/* --------------------------------------------------------------------------
   引擎扭力曲線
   --------------------------------------------------------------------------
   ★這是「模型曲線」，不是實測資料。★
   查無任何可靠的多點扭力對轉速資料：所有引擎資料庫都只公布兩個峰值點，
   automobile-catalog 的曲線頁是付費牆且其曲線本身也是該站模擬產生的，
   論壇上的則是個別改裝車的輪上馬力圖，不能當規格。

   因此本函式用四個「查得到、可引用」的錨點合成曲線：
   怠速、峰值扭力點、峰值馬力點、紅線。渦輪車另外加上增壓建立的區段。
   -------------------------------------------------------------------------- */
const ENGINE_CURVE = {
  /* nm：峰值扭力, nmRpm：峰值扭力轉速, psRpm：峰值馬力轉速, red：紅線, cut：斷油 */
  '4G63T':   {nm:290, nmRpm:3000, psRpm:6000, red:7000, cut:7500, turbo:true, spool:2400, conf:'oem'},
  '420A':    {nm:180, nmRpm:4800, psRpm:6000, red:6500, cut:6800, turbo:false, conf:'community'},
  'M52B28':  {nm:280, nmRpm:3950, psRpm:5300, red:6500, cut:6700, turbo:false, conf:'community'},
  'M52B25':  {nm:245, nmRpm:3950, psRpm:5500, red:6500, cut:6700, turbo:false, conf:'community'},
  'M52B20':  {nm:190, nmRpm:4200, psRpm:5900, red:6500, cut:6700, turbo:false, conf:'community'},
  'M50B25':  {nm:245, nmRpm:4700, psRpm:5900, red:6500, cut:6700, turbo:false, conf:'community'},
  'M50B25TU':{nm:245, nmRpm:4200, psRpm:5900, red:6500, cut:6700, turbo:false, conf:'community'},
  'M50B20':  {nm:190, nmRpm:4700, psRpm:6000, red:6500, cut:6700, turbo:false, conf:'community'},
  'M50B20TU':{nm:190, nmRpm:4200, psRpm:6000, red:6500, cut:6700, turbo:false, conf:'community'},
  'S50B30':  {nm:320, nmRpm:3600, psRpm:7000, red:7200, cut:7400, turbo:false, conf:'community',
              warn:'扭力另有 329 Nm @ 3500 的說法（維基），本表採兩個來源一致的 320 Nm @ 3600。紅線另有 7600 的說法，研判是與 3.2 混淆。'},
  'S50B32':  {nm:350, nmRpm:3250, psRpm:7400, red:7600, cut:7800, turbo:false, conf:'community'},
  'S50B30US':{nm:305, nmRpm:4250, psRpm:6000, red:6500, cut:6700, turbo:false, conf:'community'},
  'S52B32':  {nm:322, nmRpm:3800, psRpm:6000, red:7000, cut:7200, turbo:false, conf:'community',
              warn:'扭力來源分歧於 320–325 Nm 之間（換算不一致所致），本表取中間值 322。'},
  'M44B19':  {nm:180, nmRpm:4300, psRpm:6000, red:6500, cut:6700, turbo:false, conf:'community'},
  'M42B18':  {nm:175, nmRpm:4600, psRpm:6000, red:6500, cut:6700, turbo:false, conf:'community'},
  'M43B18':  {nm:168, nmRpm:3900, psRpm:5500, red:6000, cut:6200, turbo:false, conf:'community'},
  'M43B16':  {nm:150, nmRpm:4250, psRpm:5500, red:6000, cut:6200, turbo:false, conf:'community'},
  'M40B18':  {nm:162, nmRpm:4250, psRpm:5500, red:6000, cut:6200, turbo:false, conf:'community'},
  'M40B16':  {nm:141, nmRpm:4250, psRpm:5500, red:6000, cut:6200, turbo:false, conf:'community'},
  'M41D17':  {nm:190, nmRpm:2000, psRpm:4400, red:4800, cut:5000, turbo:true, spool:1600, diesel:true, conf:'community'},
  'M51D25':  {nm:222, nmRpm:1900, psRpm:4600, red:4800, cut:5000, turbo:true, spool:1500, diesel:true, conf:'community'},
  'M51D25OL':{nm:280, nmRpm:2200, psRpm:4600, red:4800, cut:5000, turbo:true, spool:1600, diesel:true, conf:'community'},
};
function engineCurve(engId){
  return ENGINE_CURVE[engId] || {nm:200, nmRpm:4000, psRpm:5800, red:6500, cut:6700, turbo:false, conf:'est'};
}
/* 正規化扭力（0–1，1 = 峰值）。渦輪車在 spool 之前扭力明顯不足。 */
function torqueFactor(cv, rpm){
  const {nmRpm, psRpm, red} = cv;
  let t;
  if(rpm<=nmRpm){
    /* 低轉：從怠速的 0.42 爬到峰值。渦輪車用較陡的曲線表現增壓建立 */
    const lo = 700, u = Math.max(0, (rpm-lo)/Math.max(1,nmRpm-lo));
    if(cv.turbo){
      const s = Math.max(0, Math.min(1,(rpm-(cv.spool||2200))/Math.max(1,nmRpm-(cv.spool||2200))));
      t = .30 + .22*u + .48*(s*s*(3-2*s));           // 增壓建立前後的落差
    }else{
      t = .42 + .58*(u*u*(3-2*u));
    }
  }else if(rpm<=psRpm){
    /* 峰值扭力 → 峰值馬力：緩降 */
    const u=(rpm-nmRpm)/Math.max(1,psRpm-nmRpm);
    t = 1 - .12*u*u;
  }else{
    /* 峰值馬力 → 紅線：明顯掉落 */
    const u=Math.max(0,Math.min(1.4,(rpm-psRpm)/Math.max(1,red-psRpm)));
    t = .88 - .34*u;
  }
  return Math.max(.05, Math.min(1, t));
}
