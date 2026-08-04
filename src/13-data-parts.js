/* ==========================================================================
   改裝零件資料庫
   price: [低, 高] 新台幣估算。標 pconf:'est' 者為依國外定價換算的粗估（約 1 USD ≈ 32 TWD），
   不是報價；請以實際詢價為準，並可在「改裝專案」中自行覆寫。
   fit: 適用條件；留空表示該欄不限制
   ========================================================================== */
const FX_NOTE = '零件價格為參考估算（國外定價約以 1 USD ≈ 32 TWD 換算，未含運費、關稅、工資差異），非實際報價。請在改裝專案中依實際詢價覆寫。';

const PART_CATS = [
  {id:'wheel',   grp:'外觀', name:'輪圈輪胎'},
  {id:'aero',    grp:'外觀', name:'空力外觀'},
  {id:'light',   grp:'外觀', name:'燈具'},
  {id:'finish',  grp:'外觀', name:'烤漆包膜隔熱紙'},
  {id:'susp',    grp:'性能', name:'避震懸吊'},
  {id:'chassis', grp:'性能', name:'底盤強化'},
  {id:'brake',   grp:'性能', name:'煞車系統'},
  {id:'intake',  grp:'性能', name:'進氣'},
  {id:'exhaust', grp:'性能', name:'排氣'},
  {id:'engine',  grp:'性能', name:'引擎動力'},
  {id:'drive',   grp:'性能', name:'傳動'},
  {id:'int',     grp:'內裝', name:'內裝'},
];

const PARTS = [
/* ============ 輪圈輪胎 ============ */
{id:'w-oem17', cat:'wheel', brand:'BMW 原廠', name:'Style 42 / 44 十字輻 17 吋', pn:'36111094506（Style 44）',
 spec:{'尺寸':'17×8','ET':'ET47','PCD':'5x120','中心孔':'72.56 mm'}, fit:{}, price:[18000,32000], pconf:'est', labor:[1000,2000],
 req:[], conf:'vendor', src:'bimmertips_w',
 impact:{look:['原廠風格、與車體線條協調'],perf:['簧下重量略增，加速與煞車反應略鈍'],comfort:['扁平比降低，路感變硬'],dura:['輪胎成本提高'],legal:['外徑變化須在 2% 內']},
 note:'ET47 屬保守值，配寬胎容易內縮干涉避震筒身。'},

{id:'w-17-85-40', cat:'wheel', brand:'社外通用', name:'17×8.5 ET40 前後同（OEM+ 街道）',
 spec:{'尺寸':'17×8.5','ET':'ET40','建議胎':'245/40R17'}, fit:{}, price:[24000,60000], pconf:'est', labor:[1200,2400],
 req:['前輪需 5mm 墊片','配社外避震（尤其 KW）可能需更厚墊片'], conf:'vendor', src:'apex_e36',
 impact:{look:['填滿輪拱，外觀明顯升級'],perf:['接地面積增加，抓地提升；簧下重量增加'],comfort:['路噪與硬度增加'],safety:['需確認不干涉避震筒身'],dura:['胎耗成本提高'],legal:['245/40R17 外徑與原廠 205/60R15 幾乎相同（+0.13%），法規上最理想']},
 note:'Apex Wheels 對 E36 的主推規格：245/40R17 外徑 627.8mm vs 原廠 627.0mm，速度表幾乎零誤差。'},

{id:'w-17-9-30', cat:'wheel', brand:'社外通用', name:'17×9 ET30（街道激進）',
 spec:{'尺寸':'17×9','ET':'ET30','建議胎':'245/40R17'}, fit:{}, price:[28000,72000], pconf:'est', labor:[1500,3000],
 req:['後葉子板必須壓平（fender roll）','負外傾至少 -1.8°','前輪 5mm 墊片；配 KW 避震需 12mm 以上'], conf:'vendor', src:'apex_e36', grade:'y',
 impact:{look:['大幅外凸、視覺張力最強'],perf:['抓地明顯提升'],comfort:['硬、吵'],safety:['未壓葉子板會磨胎，高速有失壓風險'],dura:['胎肩偏磨；輪胎壽命縮短'],legal:['⚠ 台灣規定輪胎不得超出車身；壓葉子板後若仍外露仍屬違規']},
 warn:'這組配置與台灣「輪胎不得超出車身」的規定直接衝突，請先確認你的葉子板覆蓋範圍。'},

{id:'w-18-85', cat:'wheel', brand:'社外通用', name:'18×8.5 ET35–38（方形配置）',
 spec:{'尺寸':'18×8.5','ET':'ET35–38','建議胎':'225/40R18'}, fit:{}, price:[30000,80000], pconf:'est', labor:[1500,3000],
 req:[], conf:'vendor', src:'apex_e36',
 impact:{look:['最大輪圈視覺'],perf:['簧下重量明顯增加，加速與油耗變差'],comfort:['舒適度明顯下降，扁平比僅 40'],dura:['輪圈易受路面坑洞損傷'],legal:['225/40R18 外徑 +1.63%，逼近 2% 上限']},
 note:'18 吋請避開 235/40R18（外徑 +2.90%，超出台灣 2% 門檻）。'},

{id:'w-spacer', cat:'wheel', brand:'社外通用', name:'輪距墊片 Hub-centric（10/12/15/20mm）',
 spec:{'螺紋':'M12×1.5','最小咬合':'約 10mm（約 6.5 圈）','加長螺絲':'原廠 25mm ＋ 墊片厚度'}, fit:{}, price:[2500,9000], pconf:'est', labor:[500,1200],
 req:['必須使用 hub-centric（帶導引環）','必須同步換加長螺絲','厚度 <10mm 的平板墊片需搭配 hub extender'], conf:'vendor', src:'turner_sp', grade:'y',
 impact:{look:['填滿輪拱'],perf:['輪距加寬，側向支撐略增'],safety:['⚠ 螺絲咬合不足是嚴重安全風險；務必換加長螺絲'],dura:['輪轂軸承負荷增加']},
 warn:'加長螺絲公式：原廠長度（25mm）＋ 墊片厚度。10mm 墊片 → 35mm 螺絲。'},

/* ============ 空力外觀 ============ */
{id:'a-mtech', cat:'aero', brand:'BMW 原廠', name:'M-Technic / M Sport 保桿組（前後＋側裙）',
 spec:{'材質':'PU / ABS'}, fit:{}, price:[25000,70000], pconf:'est', labor:[8000,20000],
 req:['需烤漆'], conf:'unverified', src:null,
 impact:{look:['原廠 M 外觀，接受度最高'],legal:['空力套件在台灣免辦變更登記，但列為檢驗項目；不得突出車身兩側及前後方']},
 note:'E36 圈內慣用語是「M-Technic / M Sport 保桿」與「M3 保桿」。網路上常見的「M-Tech I / II」比較多半在講 E46，不要直接套用。'},

{id:'a-lip', cat:'aero', brand:'社外通用', name:'前下巴 / 前下擾流',
 spec:{'材質':'PU / 碳纖 / FRP'}, fit:{}, price:[3000,18000], pconf:'est', labor:[1500,5000],
 req:[], conf:'unverified', src:'reg_att15',
 impact:{look:['降低視覺重心'],perf:['高速前軸升力略降（社外品多數無實測數據）'],comfort:['離地更低，進出斜坡容易刮傷'],legal:['免辦變更登記，但前延伸不得超過 30cm、不得有銳利邊角']}},

{id:'a-skirt', cat:'aero', brand:'社外通用', name:'側裙',
 spec:{}, fit:{}, price:[4000,20000], pconf:'est', labor:[2000,6000], req:[], conf:'unverified', src:'reg_att15',
 impact:{look:['拉長車身線條、視覺更低趴'],legal:['不得突出車身兩側']}},

{id:'a-duck', cat:'aero', brand:'社外通用', name:'鴨尾 / 小尾翼',
 spec:{}, fit:{body:['coupe','sedan']}, price:[2500,12000], pconf:'est', labor:[1000,4000], req:[], conf:'unverified', src:'reg_att15',
 impact:{look:['尾部線條收束'],legal:['後延伸不得超過 25cm；免辦變更登記但列檢驗項目']}},

{id:'a-gtwing', cat:'aero', brand:'社外通用', name:'GT 大尾翼',
 spec:{}, fit:{body:['coupe','sedan']}, price:[8000,45000], pconf:'est', labor:[3000,8000], req:['需鑽孔固定於行李廂蓋'], conf:'unverified', src:'reg_att15', grade:'y',
 impact:{look:['賽道風格最強烈'],perf:['高速後軸下壓力增加，但同時增加風阻'],legal:['⚠ 不得突出車身兩側及後方致影響行車安全；後延伸 ≤25cm。是驗車時最常被注意的項目之一']}},

{id:'a-wide', cat:'aero', brand:'Pandem / Rocket Bunny', name:'寬體暴龜套件',
 spec:{'材質':'FRP'}, fit:{}, price:[60000,180000], pconf:'est', labor:[40000,120000],
 req:['需切割輪拱與鈑金','需重新烤漆','幾乎必須搭配大 ET 差輪圈'], conf:'vendor', src:null, grade:'r',
 impact:{look:['視覺衝擊最大'],perf:['可容納更寬輪胎'],dura:['切割後鈑金防鏽處理不當易生鏽'],legal:['❌ 台灣規定車身尺寸不得與原車資料不符，會被要求復原。實務上僅快拆式或微幅擴展有操作空間']},
 warn:'依 OiCar 整理，寬體在台灣「無爭論空間」，車身尺寸與行照不符即不合格。'},

/* ============ 燈具 ============ */
{id:'l-angel', cat:'light', brand:'社外通用', name:'天使眼 / 光圈頭燈',
 spec:{}, fit:{}, price:[6000,25000], pconf:'est', labor:[2000,5000], req:[], conf:'community', src:'thb_light', grade:'r',
 impact:{look:['夜間辨識度提升'],legal:['⚠ 依改裝業者整理，加裝天使眼／惡魔眼禁止，罰 2,400–9,600 元。此為非官方來源，建議向監理站確認']},
 warn:'法規來源為改裝店部落格，非官方文件。頭燈只要涉及 HID/LED 光源變更，依附件十五需審驗合格證明並辦變更登記。'},

{id:'l-hid', cat:'light', brand:'社外通用', name:'HID 氣體放電式頭燈改裝',
 spec:{}, fit:{}, price:[5000,30000], pconf:'est', labor:[2000,6000],
 req:['需交通部委託之車輛專業技術研究機構審驗合格','需配光測試','需自動調整垂直傾角裝置','需辦變更登記'], conf:'oem', src:'reg_att15', grade:'y',
 impact:{safety:['配光不良會嚴重眩光對向來車'],legal:['97/7/1 起適用：需審驗合格證明＋變更登記。未登記罰 2,400–9,600 元，且驗車不過']}},

{id:'l-led', cat:'light', brand:'社外通用', name:'LED 頭燈改裝',
 spec:{}, fit:{}, price:[4000,28000], pconf:'est', labor:[2000,6000],
 req:['需審驗合格證明（108/7/1 起適用）','需辦變更登記'], conf:'oem', src:'reg_att15', grade:'y',
 impact:{legal:['108/7/1 起適用審驗合格證明要求']}},

{id:'l-tail', cat:'light', brand:'社外通用', name:'燻黑尾燈 / 晶鑽尾燈',
 spec:{}, fit:{}, price:[3000,15000], pconf:'est', labor:[800,2500], req:[], conf:'community', src:'thb_light', grade:'y',
 impact:{look:['尾部收斂'],safety:['過度燻黑會降低後方辨識度'],legal:['法規未直接規定「燻黑」，但尾燈／煞車燈必須維持紅色且亮度需達標，過度燻黑會驗不過']}},

/* ============ 烤漆包膜隔熱紙 ============ */
{id:'f-wrap', cat:'finish', brand:'3M / Avery / KPMF 等', name:'全車包膜改色',
 spec:{}, fit:{}, price:[45000,150000], pconf:'est', labor:[0,0],
 req:['需至監理站辦臨時檢驗＋換行照（一個月內）'], conf:'oem', src:'tvbs_color', grade:'y',
 impact:{look:['可逆的改色方案，保護原漆'],dura:['膜材壽命約 3–7 年，撕除不當可能傷漆'],legal:['⚠ 依道安規則第 44 條，改色需辦變更登記。小型車可在定期檢驗時於代檢廠一併辦理，非定檢期間仍須跑監理站']}},

{id:'f-paint', cat:'finish', brand:'—', name:'全車烤漆改色',
 spec:{}, fit:{}, price:[60000,250000], pconf:'est', labor:[0,0], req:['需辦變更登記＋換行照'], conf:'oem', src:'tvbs_color', grade:'y',
 impact:{look:['質感最佳、不可逆'],legal:['同包膜，需辦變更登記']}},

{id:'f-tint', cat:'finish', brand:'—', name:'隔熱紙',
 spec:{}, fit:{}, price:[8000,45000], pconf:'est', labor:[0,0], req:[], conf:'unverified', src:null,
 impact:{comfort:['降低車內溫度與眩光'],safety:['前檔與前門過深會影響夜間視線'],legal:['需注意可見光穿透率，各地稽查標準不一']}},

{id:'f-caliper', cat:'finish', brand:'—', name:'卡鉗烤漆 / 卡鉗蓋',
 spec:{}, fit:{}, price:[2000,9000], pconf:'est', labor:[2000,6000], req:['卡鉗需拆下清潔除鏽'], conf:'unverified', src:null,
 impact:{look:['輪圈內視覺重點'],dura:['耐高溫塗料選錯會變色剝落']}},

/* ============ 避震懸吊 ============ */
{id:'s-b12pro', cat:'susp', brand:'Bilstein', name:'B12 Pro-Kit（避震＋短彈簧套裝）',
 spec:{'前降幅':'約 30 mm','後降幅':'約 15 mm','可調':'否'}, fit:{}, price:[32000,45000], pconf:'est', labor:[6000,12000],
 drop:30, req:['建議同時更換避震上座與防塵套','降低後需重做四輪定位'], conf:'oem', src:'bilstein',
 impact:{look:['溫和降低，輪拱間隙縮小'],perf:['側傾減少、轉向反應提升'],comfort:['較原廠硬但仍屬街道可接受'],safety:['底盤離地降低，進出地下室與減速丘需注意'],dura:['需確認後副樑鎖點狀況'],legal:['避震器變更需統一發票＋檢驗合格後登記；變更後不得超過原核定車身高度']}},

{id:'s-b12sport', cat:'susp', brand:'Bilstein', name:'B12 Sportline',
 spec:{'前降幅':'約 45 mm','後降幅':'約 15 mm','可調':'否'}, fit:{}, price:[34000,48000], pconf:'est', labor:[6000,12000],
 drop:45, req:['需可調上座修正外傾','降低後需重做四輪定位'], conf:'oem', src:'bilstein', grade:'y',
 impact:{look:['前傾姿態明顯'],perf:['重心明顯降低'],comfort:['明顯變硬'],safety:['前後降幅差大，需注意配重與定位'],legal:['同上']}},

{id:'s-b14', cat:'susp', brand:'Bilstein', name:'B14 絞牙避震（高低可調）',
 spec:{'前降幅':'35–55 mm','後降幅':'20–45 mm','可調':'高低無段'}, fit:{}, price:[42000,60000], pconf:'est', labor:[7000,14000],
 drop:45, req:['⚠ 施工前務必先檢查後副樑鎖點','需可調上座','需重做四輪定位','建議同時處理 RTAB 與後避震上座'], conf:'oem', src:'bilstein', grade:'y',
 impact:{look:['車高可自由設定'],perf:['操控明顯提升'],comfort:['明顯變硬、路感直接'],safety:['硬懸吊會加速 E36 後副樑鎖點疲勞'],dura:['⚠ 增加車體結構應力'],legal:['需統一發票＋檢驗合格後登記']}},

{id:'s-b16', cat:'susp', brand:'Bilstein', name:'B16 絞牙避震（高低＋阻尼可調）',
 spec:{'前降幅':'35–55 mm','後降幅':'20–40 mm','可調':'高低＋壓縮/回彈 10 段'}, fit:{}, price:[62000,88000], pconf:'est', labor:[7000,14000],
 drop:45, req:['⚠ 施工前務必先檢查後副樑鎖點','需可調上座','需重做四輪定位'], conf:'oem', src:'bilstein', grade:'y',
 impact:{perf:['阻尼可依用途調整'],comfort:['調軟時仍可日常'],dura:['同 B14']}},

{id:'s-bc', cat:'susp', brand:'BC Racing', name:'BR 系列絞牙避震',
 spec:{'可調':'高低＋阻尼 30 段'}, fit:{}, price:[32000,45000], pconf:'est', labor:[7000,14000],
 drop:40, req:['⚠ 先檢查後副樑鎖點','需可調上座','需重做四輪定位'], conf:'community', src:null, grade:'y',
 impact:{perf:['入門絞牙 CP 值高'],comfort:['評測形容「硬但不彈跳」']},
 note:'降幅範圍查無官方數據，此處 40mm 為預覽預設值，請以實際安裝為準。'},

{id:'s-kwv3', cat:'susp', brand:'KW', name:'Variant 3 絞牙避震',
 spec:{'可調':'高低＋壓縮＋回彈獨立可調'}, fit:{}, price:[70000,95000], pconf:'est', labor:[7000,14000],
 drop:40, req:['⚠ KW 筒身較粗，配 17×9 ET30 等輪圈需 12mm 以上墊片','先檢查後副樑鎖點','需重做四輪定位'], conf:'community', src:'apex_e36', grade:'y',
 impact:{perf:['全可調，賽道街道兼顧'],safety:['⚠ 筒身較粗，輪圈內側間隙需重新計算']},
 warn:'Apex 明確指出：同一組輪圈在原廠避震上可以，換 KW 後就需要 12mm 以上墊片。'},

{id:'s-camber', cat:'susp', brand:'Ground Control / Vorshlag / SLR 等', name:'前可調上座 Camber Plate',
 spec:{'可調':'外傾＋後傾','建議值':'日常 -1.5°~-2.0°；賽道 -2.5°~-3.0°；甩尾 -3.0°~-4.0°'}, fit:{}, price:[12000,30000], pconf:'est', labor:[3000,7000],
 req:['需重做四輪定位'], conf:'vendor', src:'slr_camber',
 impact:{perf:['修正降低後的外傾，恢復接地面積'],comfort:['多數為金屬球接頭，路噪與震動傳遞增加'],dura:['球接頭為消耗品']},
 note:'車身降低會使避震柱角度變直，自然產生非預期的負外傾 — 這是降低車身後幾乎必備的配套。'},

{id:'s-rearcamber', cat:'susp', brand:'SPL / Turner 等', name:'後可調外傾連桿（可調李仔串）',
 spec:{}, fit:{}, price:[10000,26000], pconf:'est', labor:[3000,7000],
 req:['需在正常車高下鎖付（77 / 110 Nm）','需重做四輪定位'], conf:'vendor', src:'ecs_rlca',
 impact:{perf:['把降低後過大的後負外傾拉回'],dura:['減少後輪內側偏磨']}},

{id:'s-swaybar', cat:'susp', brand:'社外通用', name:'加粗防傾桿（前 25–28mm）',
 spec:{}, fit:{}, price:[9000,28000], pconf:'est', labor:[2500,6000],
 req:['須在常態位置（車輛落地承重）下鎖付：固定座 21–22 Nm'], conf:'community', src:null,
 impact:{perf:['側傾抑制、轉向響應提升'],comfort:['單邊過坎時另一側被拉動，舒適度下降'],safety:['前後配比失衡會改變轉向特性']}},

{id:'s-strutbar', cat:'susp', brand:'社外通用', name:'引擎室拉桿 / 底盤拉桿',
 spec:{}, fit:{}, price:[3000,15000], pconf:'est', labor:[800,2500], req:[], conf:'community', src:null,
 impact:{perf:['塔頂剛性提升，轉向感較紮實'],dura:['剛性提升會把應力轉移到其他鈑件']}},

/* ============ 底盤強化（E36 專屬弱點） ============ */
{id:'c-subframe', cat:'chassis', brand:'BMW 原廠 / MODE / CMP', name:'後副樑鎖點加強板',
 spec:{'施工方式':'周邊焊接 或 3M 08115 板件結構膠黏合'}, fit:{}, price:[6000,20000], pconf:'est', labor:[70000,160000],
 req:['需拆後副樑','需專業焊接或結構膠施工'], conf:'vendor', src:'brentford', priority:1,
 impact:{safety:['✅ 防止後懸吊幾何跑掉與副樑拉穿地板'],dura:['✅ 這是 E36 最重要的預防性補強']},
 note:'BMW 原廠有出鋼製衝壓加強板（等於原廠承認此問題）。原廠板有複合曲面與螺栓孔加厚，部分副廠板沒有。專業加強費用國外約 US$2,500–5,000。',
 warn:'⚠ 高風險族群：Coupe、Cabrio、M3。改硬懸吊、加寬輪胎、下賽道都會加速此處疲勞。裝絞牙避震前請先掀後座地毯與趴車底檢查四個鎖點是否有放射狀裂紋。'},

{id:'c-rtab', cat:'chassis', brand:'Condor / Turner / Vorshlag', name:'RTAB 後拖曳臂襯套＋限位墊片',
 spec:{}, fit:{}, price:[3500,12000], pconf:'est', labor:[13000,20000],
 req:['需壓出壓入專用工具','拖曳臂鎖付需在常態位置：67 / 77 Nm'], conf:'vendor', src:'condor_rtab', priority:2,
 impact:{perf:['✅ 抑制後輪 toe 角動態亂跑，後軸穩定性明顯改善'],comfort:['較硬材質會增加路噪'],dura:['延長襯套壽命']},
 note:'零件便宜但工資高（國外約 US$400–600），建議與其他後軸工程一次做完。'},

{id:'c-fcab', cat:'chassis', brand:'Revshift / Turner 等', name:'Offset 偏心前下支臂襯套 FCAB',
 spec:{'效果':'增加正 caster ＋ 少量負 camber'}, fit:{}, price:[3000,9000], pconf:'est', labor:[9000,16000],
 req:['需重做四輪定位','聚氨酯/Delrin 版會在座圈內轉動，需加止付螺絲'], conf:'vendor', src:'fcp_fcab', priority:2,
 impact:{perf:['✅ 直線穩定性與前輪抓地提升'],comfort:['⚠ 方向盤變重（無動力方向盤者更明顯）'],safety:['解決煞車時方向盤抖動的常見主因']},
 note:'FCAB 破裂是 E36「煞車時方向盤抖動」最典型的原因。既然要換，直接上 offset 版一次到位。'},

{id:'c-rsm', cat:'chassis', brand:'BMW 原廠 / 社外', name:'後避震上座 RSM 更換',
 spec:{}, fit:{}, price:[2500,9000], pconf:'est', labor:[4000,9000],
 req:['鎖付 24 Nm，需換新螺帽'], conf:'community', src:null, priority:2,
 impact:{comfort:['✅ 消除後方過坎「叩叩」異音'],safety:['破損會影響後軸支撐']},
 note:'換絞牙避震時一併處理最划算。'},

{id:'c-cooling', cat:'chassis', brand:'BMW 原廠 / Stewart 等', name:'冷卻系統全套翻新（水泵/節溫器/水箱/副水箱/水管/風扇離合器）',
 spec:{'水泵葉輪':'建議選金屬葉輪'}, fit:{eng:['M50B20','M50B20TU','M50B25','M50B25TU','M52B20','M52B25','M52B28','S50B30','S50B32','S50B30US','S52B32']},
 price:[26000,45000], pconf:'est', labor:[10000,20000],
 req:['需排放並重新加注冷卻液、確實排空氣'], conf:'vendor', src:'dept69', priority:1,
 impact:{safety:['✅ 水泵塑膠葉輪碎裂會塞住水道直接搞死引擎'],dura:['✅ 過熱後續發汽缸床破裂，維修費是本項的 3–5 倍']},
 note:'國外有「$1,200 法則」：冷卻系統全套翻新請直接預算 US$1,200。E36 已 25–35 年，塑膠件全數老化。',
 warn:'⚠ 任何動力改裝前，請務必先完成這一項。'},

{id:'c-vanos', cat:'chassis', brand:'Beisan Systems', name:'VANOS 密封環整理包（BS011）',
 spec:{}, fit:{eng:['M50B20TU','M50B25TU','M52B20','M52B25','M52B28','S50B30US','S52B32','S50B30','S50B32']},
 price:[5000,9000], pconf:'est', labor:[3000,12000],
 req:['VANOS 電磁閥鎖付 30 Nm、油管 32 Nm'], conf:'vendor', src:'beisan', priority:2,
 impact:{perf:['恢復可變汽門正時作動，中低轉扭力回復'],comfort:['✅ 消除 1,000–3,000 rpm「罐子裡有彈珠」的響聲']},
 note:'成因是斜齒磨損造成凸輪軸軸向竄動。Beisan 方案不換昂貴斜齒，而是消除 VANOS 活塞軸承的軸向間隙。專業約 30 分鐘、DIY 1 小時以上。裝性能凸輪的 M3 會響得更嚴重。'},

/* ============ 煞車 ============ */
{id:'b-e46', cat:'brake', brand:'BMW 原廠', name:'E46 328i 前煞升級（碟盤＋碟盤座）',
 spec:{'原廠 E36 325/328 前碟':'286 × 22 mm 通風'}, fit:{mdl:['325i','328i','323i','320i']}, price:[8000,18000], pconf:'est', labor:[3000,6000],
 req:['需換 carrier 與碟盤'], conf:'community', src:null,
 impact:{perf:['✅ 制動力與抗熱衰提升，卡鉗與來令片可沿用'],dura:['碟盤尺寸加大，熱容量提升']},
 note:'E36 中最划算的煞車升級：只需換 carrier + 碟盤，卡鉗與來令片沿用。'},

{id:'b-m3', cat:'brake', brand:'BMW 原廠', name:'E36 M3 前煞（315×28mm）換裝',
 spec:{'M3 前碟':'315 × 28 mm 通風','M3 後碟':'312 × 20 mm 通風'}, fit:{}, price:[15000,35000], pconf:'est', labor:[5000,12000],
 req:['需 M3 羊角／carrier'], conf:'community', src:null, grade:'y',
 impact:{perf:['✅ 原廠 M 規格制動力'],safety:['需確認輪圈內間隙']},
 warn:'最小輪圈尺寸查無明確可靠來源。原廠即配 17 吋，實務普遍認為需 16 吋以上。安裝前請務必試裝確認。'},

{id:'b-bbk6', cat:'brake', brand:'Turner / ECS', name:'6 活塞大盤套件 325×25mm',
 spec:{'碟盤':'325 × 25 mm'}, fit:{}, price:[55000,95000], pconf:'est', labor:[6000,14000],
 req:['Turner 版明訂需 17 吋以上輪圈；ECS 版稱多數 17 吋可通過','套件內含轉接座'], conf:'vendor', src:'turner_bbk', grade:'y',
 impact:{perf:['制動力與抗熱衰大幅提升'],comfort:['多活塞卡鉗低速可能有輕微拖磨聲'],legal:['⚠ 台灣「煞車類型」屬不可變更項目 — 詳見法規頁']},
 warn:'⚠ 交通部公路局明列汽車「煞車類型」不可變更。碟盤加大是否構成「變更煞車類型」，實務認定請先洽監理站。'},

{id:'b-brembo', cat:'brake', brand:'Brembo', name:'GT 4/6 活塞套件 355×32mm',
 spec:{'碟盤':'355 × 32 mm'}, fit:{}, price:[128000,142000], pconf:'est', labor:[8000,18000],
 req:['355mm 實務需 18 吋輪圈'], conf:'vendor', src:'turner_bbk', grade:'y',
 impact:{perf:['賽道級制動'],legal:['同上']},
 note:'國外定價 US$3,995 / US$4,395。'},

{id:'b-pad', cat:'brake', brand:'社外通用', name:'性能來令片＋金屬油管',
 spec:{}, fit:{}, price:[4000,16000], pconf:'est', labor:[1500,4000], req:['更換後需磨合'], conf:'unverified', src:null,
 impact:{perf:['踏板反饋更線性，抗熱衰提升'],comfort:['多數性能片冷車制動力較弱、粉塵多、可能有異音'],dura:['碟盤磨耗加快']}},

/* ============ 進氣 ============ */
{id:'i-cai', cat:'intake', brand:'社外通用', name:'開放式進氣 / 冷進氣套件',
 spec:{}, fit:{}, price:[4000,18000], pconf:'est', labor:[1000,3000], req:[], conf:'community', src:null, hp:[3,8],
 impact:{perf:['進氣聲浪明顯，實際馬力增益因人而異'],comfort:['進氣噪音增加'],dura:['濾material 需定期清洗保養'],legal:['一般不需變更登記']},
 warn:'廠商宣稱「進氣量 +15–20%」屬行銷數據，未取得可靠實測佐證。E36 這類老車若同時有 MAF 髒污或真空洩漏，換進氣不會解決問題。'},

{id:'i-m50mani', cat:'intake', brand:'BMW 原廠（M50 歧管）', name:'M50 進氣歧管換裝（M50 manifold swap）',
 spec:{}, fit:{eng:['M52B25','M52B28','S52B32']}, price:[4000,12000], pconf:'est', labor:[5000,12000],
 req:['需處理節氣門線組與感知器接頭','部分需調整 ECU'], conf:'community', src:'motoiq_m50', hp:[10,15],
 impact:{perf:['中高轉進氣阻力降低'],dura:['二手歧管需確認 DISA 閥狀態']},
 note:'E36 最著名的 CP 值改裝。S52 原廠歧管限制明顯，相較歐規 S50B32 馬力較低。',
 warn:'⚠ 「+10–15 hp」為社群普遍說法，本次未取得可引用的原始 dyno 實測數據（MotoIQ 有做過背對背測試，原文可自行查閱）。'},

{id:'i-tb', cat:'intake', brand:'社外通用', name:'加大節氣門（M52 70mm / 社外 74mm）',
 spec:{}, fit:{eng:['M50B25','M50B25TU','M52B25','M52B28','S50B30','S50B32','S52B32']}, price:[8000,25000], pconf:'est', labor:[3000,8000],
 req:['建議搭配 ECU 調校'], conf:'community', src:null, hp:[3,8],
 impact:{perf:['高轉進氣量提升'],comfort:['低速油門線性可能變差']}},

/* ============ 排氣 ============ */
{id:'e-header', cat:'exhaust', brand:'Supersprint / 社外', name:'不鏽鋼頭段（Header）',
 spec:{}, fit:{}, price:[25000,70000], pconf:'est', labor:[4000,10000],
 req:['部分需移除或移位觸媒 → 會影響驗車與故障燈'], conf:'community', src:null, hp:[10,25], kg:[-4,-2],
 impact:{perf:['高轉排氣效率提升，低轉扭力可能略降'],comfort:['噪音增加'],dura:['原廠含氧感知器位置改變可能觸發故障碼'],legal:['⚠ 若移除觸媒，廢氣檢驗必定不合格']},
 warn:'Supersprint 官方未公布 E36 328i 頭段的馬力數據；「+10–25 hp」為社群說法。'},

{id:'e-catback', cat:'exhaust', brand:'社外通用', name:'中尾段（Cat-back）',
 spec:{}, fit:{}, price:[15000,60000], pconf:'est', labor:[2000,6000], req:[], conf:'community', src:'noise_std', hp:[8,12], kg:[-8,-3],
 impact:{perf:['排氣阻力略降'],comfort:['音量與音色改變，長途巡航共鳴可能惱人'],legal:['⚠ 非原型式排氣管未登記：道交條例第 16 條加倍至 3,600 元，15 日內強制檢驗；拆除消音器罰 6,000–24,000 元並當場禁止駕駛']},
 note:'E36（1990–2000 出廠）在台灣多屬噪音管制第一或第二期，原地噪音標準 103 dB(A)、加速噪音 78–81 dB(A) — 相對寬鬆，但實際適用期別以行照／車籍登記為準。'},

{id:'e-tip', cat:'exhaust', brand:'—', name:'排氣尾管（僅換尾飾管）',
 spec:{}, fit:{}, price:[1500,8000], pconf:'est', labor:[500,2000], req:[], conf:'unverified', src:'reg_att15',
 impact:{look:['尾部視覺'],legal:['排氣管尾端出口應位於車輛後方；最低點離地不得少於 10 公分（不准改側排）']}},

/* ============ 引擎動力 ============ */
{id:'g-ecu', cat:'engine', brand:'社外通用', name:'ECU 程式（晶片／刷寫）',
 spec:{}, fit:{}, price:[10000,35000], pconf:'est', labor:[0,0], req:[], conf:'community', src:null, hp:[8,12],
 impact:{perf:['點火與噴油調整，輕改車增益有限'],dura:['過度提前點火在老引擎上有爆震風險'],legal:['⚠ 「引擎機械或增壓系統」屬台灣不可變更項目 — 純程式調校一般不涉及，但增壓相關則涉及']}},

{id:'g-cam252', cat:'engine', brand:'Schrick', name:'凸輪軸 252/244',
 spec:{'適用':'325i / 328i / 525i / 528i / Z3 2.8'}, fit:{eng:['M50B25','M50B25TU','M52B25','M52B28']}, price:[38000,60000], pconf:'est', labor:[15000,30000],
 req:['高里程引擎建議換彈簧座與鎖片','須確認揚程未讓汽門彈簧併圈（可能需墊片）','凸輪軸齒盤鎖付 22 Nm'], conf:'vendor', src:'bw_schrick', hp:[20,45],
 impact:{perf:['✅ 官方稱「中高轉明顯提升，低轉扭力不損失」，配合進氣與調校可輕鬆破 240 hp'],comfort:['怠速可能略粗'],dura:['汽門機構負荷增加']},
 note:'BimmerWorld 官方稱不需額外硬體。M3 / MZ3 / M52 2.8 另有 256/264 規格。'},

{id:'g-sc', cat:'engine', brand:'Active Autowerke', name:'Level 2 機械增壓套件（Rotrex C38-81）',
 spec:{'輸出':'400 hp 以上'}, fit:{eng:['S50B30US','S52B32','S50B30','S50B32']}, price:[210000,290000], pconf:'est', labor:[40000,90000],
 req:['⚠ 必須先完成冷卻系統全套翻新','需專業 ECU 調校','建議先做缸壓／洩漏測試'], conf:'vendor', src:'aaw_sc', hp:[140,180], grade:'r',
 impact:{perf:['動力大幅提升'],dura:['引擎、變速箱、傳動、煞車全面承壓'],safety:['原廠煞車與輪胎將明顯不足'],legal:['❌ 台灣明列「引擎機械或增壓系統」不可辦理變更登記']},
 warn:'⚠ 依交通部公路局，汽車「引擎機械或增壓系統」屬不可變更項目，無法辦理變更登記。'},

{id:'g-turbo', cat:'engine', brand:'社外通用', name:'渦輪套件（M52 系）',
 spec:{'原廠內裝件約可承受':'300–400 hp'}, fit:{eng:['M52B25','M52B28','M50B25','M50B25TU']}, price:[160000,320000], pconf:'est', labor:[50000,120000],
 req:['440cc 噴油嘴','中冷器','專業 ECU 調校','10 psi 以上需鍛造活塞與連桿','必須先完成冷卻系統翻新'], conf:'community', src:null, hp:[100,200], grade:'r',
 impact:{perf:['動力大幅提升'],dura:['⚠ Nikasil 缸體的 M52 風險更高，改裝前務必做洩漏測試'],legal:['❌ 增壓系統屬不可變更項目']}},

{id:'g-ls', cat:'engine', brand:'Sikky / CXRacing 等', name:'LS 引擎互換（LS swap）',
 spec:{}, fit:{}, price:[300000,800000], pconf:'est', labor:[150000,400000],
 req:['LS 引擎＋T56 變速箱總成','引擎腳＋變速箱橫樑套件','傳動軸需訂製','水箱需下移改支架＋16" 吸風扇','原廠排氣岐管需改、觸媒需移位','需 timer 電路模擬 BMW BCM 的 50Hz 訊號','訂製油管、ABS 移位延長線束','轉向軸與排氣干涉需多節萬向接頭'], conf:'community', src:'sikky_ls', grade:'r',
 impact:{perf:['動力型態完全改變'],legal:['❌ 引擎變更屬不可辦理變更登記項目，台灣道路使用有重大法規障礙']},
 warn:'2JZ swap 的 E36 零件清單本次查無可靠來源，未收錄。'},

{id:'g-oilcool', cat:'engine', brand:'社外通用', name:'機油冷卻器',
 spec:{}, fit:{}, price:[12000,40000], pconf:'est', labor:[5000,12000], req:[], conf:'unverified', src:null,
 impact:{dura:['✅ 賽道或大馬力使用時保護引擎'],comfort:['冷車暖機時間變長']}},

/* ============ 傳動 ============ */
{id:'d-lsd', cat:'drive', brand:'原廠 / 社外', name:'限滑差速器 LSD',
 spec:{'差速器尺寸':'四缸 168mm / 六缸 188mm / M3 3.2 為 210mm'}, fit:{}, price:[35000,110000], pconf:'est', labor:[10000,25000],
 req:['需用 LSD 專用油 BMW SAF-XJ 75W-140 GL-5'], conf:'vendor', src:'racingdiffs', hp:[0,0],
 impact:{perf:['✅ 出彎推進力明顯改善'],comfort:['低速迴轉可能有跳動與異音'],dura:['需定期更換 LSD 專用油']}},

{id:'d-clutch', cat:'drive', brand:'社外通用', name:'強化離合器＋輕量飛輪',
 spec:{}, fit:{}, price:[25000,70000], pconf:'est', labor:[20000,40000],
 req:['飛輪螺絲必須換新品：手排一般 105 Nm'], conf:'community', src:null, kg:[-8,-4],
 impact:{perf:['轉速攀升更快'],comfort:['⚠ 輕量飛輪會使怠速抖動與低速起步變難，日常代步不建議過輕'],dura:['變速箱與傳動軸衝擊增加']}},

{id:'d-giubo', cat:'drive', brand:'BMW 原廠', name:'撓性盤 giubo ＋ 傳動軸中央支撐軸承',
 spec:{}, fit:{}, price:[4000,12000], pconf:'est', labor:[5000,12000],
 req:['鎖付：M12 8.8 為 81 Nm、10.9 為 100 Nm、M3 為 115 Nm'], conf:'oem', src:'tis_torque', priority:2,
 impact:{comfort:['✅ 消除起步／放油門時的「咚」一聲'],safety:['giubo 完全斷裂會使傳動軸脫落']},
 note:'E36 起步頓挫最典型的原因。目視有裂紋即應更換。'},

/* ============ 內裝 ============ */
{id:'n-wheel', cat:'int', brand:'MOMO / Nardi / 原廠 M', name:'方向盤',
 spec:{}, fit:{}, price:[6000,30000], pconf:'est', labor:[1500,4000], req:['社外方向盤需轉接盤（boss kit）'], conf:'unverified', src:null,
 impact:{look:['駕駛座氛圍改變'],perf:['小徑方向盤使轉向更靈敏但更重'],safety:['⚠ 移除原廠方向盤會失去駕駛座安全氣囊']},
 warn:'移除安全氣囊在事故中的風險請自行評估。'},

{id:'n-seat', cat:'int', brand:'Recaro / Bride / Sparco', name:'賽車椅（桶椅）',
 spec:{}, fit:{}, price:[20000,90000], pconf:'est', labor:[4000,10000], req:['需專用椅腳與滑軌'], conf:'unverified', src:null, kg:[-20,-8],
 impact:{perf:['✅ 支撐性大幅提升，減輕車重'],comfort:['長途舒適度下降，上下車不便'],safety:['固定式桶椅搭配三點式安全帶的相容性需注意']}},

{id:'n-gauge', cat:'int', brand:'Defi / AEM 等', name:'追加儀表（油溫／水溫／油壓／增壓）',
 spec:{}, fit:{}, price:[6000,30000], pconf:'est', labor:[4000,12000], req:['需鑽孔安裝感知器'], conf:'unverified', src:null,
 impact:{safety:['✅ 老車監控油溫水溫非常實用'],dura:['感知器安裝不當可能滲漏']}},

{id:'n-headunit', cat:'int', brand:'社外通用', name:'車機（含藍牙／導航）',
 spec:{}, fit:{}, price:[5000,30000], pconf:'est', labor:[2000,6000], req:['需 E36 專用面板框與線組'], conf:'unverified', src:null,
 impact:{comfort:['✅ 現代化便利性'],look:['內裝原始感降低']}},

{id:'n-shift', cat:'int', brand:'社外通用', name:'排檔頭＋短檔桿',
 spec:{}, fit:{}, price:[3000,15000], pconf:'est', labor:[1500,5000], req:[], conf:'unverified', src:null,
 impact:{perf:['行程縮短，換檔手感更明確'],comfort:['⚠ 短檔桿會放大變速箱震動與入檔阻力']}},

{id:'n-pedal', cat:'int', brand:'社外通用', name:'鋁合金踏板組',
 spec:{}, fit:{}, price:[1500,8000], pconf:'est', labor:[500,2000], req:[], conf:'unverified', src:null,
 impact:{look:['駕駛座細節'],safety:['⚠ 表面過滑的劣質品在濕鞋時有踩滑風險']}},

{id:'n-pixel', cat:'int', brand:'—', name:'儀表板液晶缺字（pixel）維修',
 spec:{}, fit:{}, price:[1500,3500], pconf:'est', labor:[2000,6000], req:[], conf:'community', src:'dept69', priority:3,
 impact:{comfort:['✅ 恢復儀表資訊可讀性']},
 note:'成因為排線焊點老化。DIY 重焊國外約 US$50–100。'},
];
