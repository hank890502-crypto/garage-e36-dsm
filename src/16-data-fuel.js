/* ==========================================================================
   中油油價
   來源：政府資料開放平臺「中油主產品牌價」（台灣中油 openData）
     JSON  https://vipmbr.cpc.com.tw/openData/MainProdListPrice
     資料集 https://data.gov.tw/dataset/6339   更新頻率：每 7 日
   設計：內建離線快照 → 可線上更新 → 也可手動輸入。
        單檔離線開啟（file://）時通常無法跨網域抓取，此時顯示快照並標明日期。
   ========================================================================== */
const FUEL_API   = 'https://vipmbr.cpc.com.tw/openData/MainProdListPrice';
const FUEL_SITE  = 'https://www.cpc.com.tw/';
const FUEL_DATA  = 'https://data.gov.tw/dataset/6339';

/* 內建快照 — 取自上述 openData 端點，牌價生效日期 民國115/08/03 */
const FUEL_SNAP = {
  eff: '2026-08-03',      // 牌價生效日期
  got: '2026-08-04',      // 寫入這個檔案的日期
  from: 'snapshot',
  list: [
    {k:'92',  name:'92無鉛汽油', ron:92, p:30.5},
    {k:'95',  name:'95無鉛汽油', ron:95, p:32.0},
    {k:'98',  name:'98無鉛汽油', ron:98, p:34.0},
    {k:'die', name:'超級柴油',   ron:0,  p:29.3},
  ],
};

/* openData 產品編號 → 內部代號 */
const FUEL_MAP = {
  '92無鉛汽油':'92', '95無鉛汽油':'95', '98無鉛汽油':'98', '超級柴油':'die',
};

/* 油箱容量（公升）。各規格網站記載不一致，此為預設值，可在車輛資料自行修改 */
/* 2G Eclipse 的 16.9 US gal 直接來自原廠手冊 Fuel Tank 規格頁 */
const TANK_DEF = { sedan:65, coupe:65, cabrio:65, touring:62, compact:52,
                   coupe2g:64, spyder2g:64 };
const TANK_NOTE = '油箱容量在各規格網站上並不一致（Compact 有 52 L 與 55 L 兩種說法，Touring 有 62 L 與 65 L 兩種），這裡採比較常見的數值，屬社群彙整而非原廠文件。把上面的欄位改成你實際從見底加到跳槍的公升數，試算才會準。';

/* 建議油品。E36 原廠標示為無鉛汽油；歐規一般車型 RON 95、M3（S50）RON 98。
   台灣 95 無鉛對應 RON 95、98 無鉛對應 RON 98。 */
const FUEL_HI_ENG = ['S50B30','S50B32','S52B32','S50B30US'];
function fuelRec(c){
  const e = carEngine(c);
  if(!e) return {k:'95', why:'尚未選擇車型，先以一般 E36 的 95 無鉛估算。', conf:'community'};
  if(e.diesel) return {k:'die', why:'柴油引擎，加超級柴油。', conf:'oem'};
  if(e.id==='4G63T')
    return {k:'98', why:'4G63 渦輪壓縮比 8.5，原廠要求無鉛高級汽油（美規標示 91 AKI，約當 RON 95）。95 無鉛就達到原廠規格，但渦輪車在台灣的氣溫下加 98 可以多一點爆震餘裕，改過增壓值的話更該用 98。', conf:'manual'};
  if(e.id==='420A')
    return {k:'95', why:'420A 自然進氣壓縮比 9.6，一般無鉛即可。加 92 也不會壞，但 95 比較穩。', conf:'community'};
  if(FUEL_HI_ENG.includes(e.id))
    return {k:'98', why:`${e.name} 壓縮比高，歐規原廠建議 RON 98，對應台灣 98 無鉛。`, conf:'community'};
  return {k:'95', why:`${e.name} 歐規原廠建議 RON 95，對應台灣 95 無鉛。加 92 不會壞車，爆震感知器會自動延遲點火，但動力與油耗會變差。`, conf:'community'};
}
const FUEL_CONF_NOTE = '建議油品是依歐規車型的原廠標示與各引擎壓縮比整理的，不是從你手上那本卡爾世達維修手冊來的（該手冊為維修工序，未列燃油辛烷值）。以你車上油箱蓋內側的標示為準。';
