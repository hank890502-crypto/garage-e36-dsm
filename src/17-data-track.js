/* ==========================================================================
   圈速計時：地理運算與賽道資料
   全部在本機算，不上傳任何位置資料。
   ========================================================================== */
const D2R = Math.PI/180, EARTH_R = 6371000;

/* 兩點距離（公尺） */
function geoDist(a,b){
  const dLat=(b.lat-a.lat)*D2R, dLon=(b.lon-a.lon)*D2R;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.sin(dLon/2)**2;
  return 2*EARTH_R*Math.asin(Math.min(1,Math.sqrt(h)));
}
/* 以 ref 為原點的局部平面座標（公尺）。幾百公尺內誤差可忽略 */
function toXY(p, ref){
  return { x:(p.lon-ref.lon)*D2R*EARTH_R*Math.cos(ref.lat*D2R),
           y:(p.lat-ref.lat)*D2R*EARTH_R };
}
/* 由「目前位置＋行進方向」產生一條垂直於行進方向的起跑線 */
function lineFrom(pos, headingDeg, width){
  const half = Math.max(6, (width||40)/2);
  const perp = (headingDeg+90)*D2R;
  const dx = Math.sin(perp)*half, dy = Math.cos(perp)*half;      // 東 / 北 位移（公尺）
  const dLat = dy/EARTH_R/D2R;
  const dLon = dx/(EARTH_R*Math.cos(pos.lat*D2R))/D2R;
  return { a:{lat:pos.lat-dLat, lon:pos.lon-dLon},
           b:{lat:pos.lat+dLat, lon:pos.lon+dLon},
           c:{lat:pos.lat, lon:pos.lon}, hd:headingDeg, w:half*2 };
}
/* 線段 p1→p2 與 p3→p4 相交時，回傳交點在 p1→p2 上的比例 t∈[0,1]，否則 null */
function segCross(p1,p2,p3,p4){
  const d = (p4.y-p3.y)*(p2.x-p1.x) - (p4.x-p3.x)*(p2.y-p1.y);
  if(Math.abs(d) < 1e-9) return null;                             // 平行
  const ua = ((p4.x-p3.x)*(p1.y-p3.y) - (p4.y-p3.y)*(p1.x-p3.x)) / d;
  const ub = ((p2.x-p1.x)*(p1.y-p3.y) - (p2.y-p1.y)*(p1.x-p3.x)) / d;
  return (ua>=0 && ua<=1 && ub>=0 && ub<=1) ? ua : null;
}
/* 判斷這一段移動有沒有「照正確方向」通過起跑線。
   回傳過線的精確時間戳（在兩筆定位之間內插），沒過線就回傳 null。 */
function crossTime(prev, cur, line){
  if(!prev || !cur || !line) return null;
  const ref = line.c;
  const t = segCross(toXY(prev,ref), toXY(cur,ref), toXY(line.a,ref), toXY(line.b,ref));
  if(t === null) return null;
  // 方向檢查：移動向量要與起跑線的行進方向大致同向（夾角 < 90°）
  const mv = toXY(cur,ref), pv = toXY(prev,ref);
  const vx = mv.x-pv.x, vy = mv.y-pv.y;
  const hx = Math.sin(line.hd*D2R), hy = Math.cos(line.hd*D2R);
  if(vx*hx + vy*hy <= 0) return null;                             // 反向通過，不算
  return prev.t + t*(cur.t - prev.t);
}

/* 由兩點算行進方向（度，正北為 0）。裝置沒給 heading 時用這個補 */
function bearing(a,b){
  const dLon = (b.lon-a.lon)*D2R;
  const y = Math.sin(dLon)*Math.cos(b.lat*D2R);
  const x = Math.cos(a.lat*D2R)*Math.sin(b.lat*D2R)
          - Math.sin(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.cos(dLon);
  return (Math.atan2(y,x)/D2R + 360) % 360;
}

/* 時間格式：1:23.456 */
function lapFmt(ms){
  if(ms==null || !isFinite(ms)) return '—';
  const neg = ms<0; ms = Math.abs(ms);
  const m = Math.floor(ms/60000), s = Math.floor(ms%60000/1000), t = Math.floor(ms%1000);
  return (neg?'-':'') + (m>0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}`) + '.' + String(t).padStart(3,'0');
}
/* 差距：+1.234 / -0.567 */
function deltaFmt(ms){
  if(ms==null || !isFinite(ms)) return '';
  return (ms>=0?'+':'-') + (Math.abs(ms)/1000).toFixed(3);
}

/* 台灣目前有在辦賽道日的封閉場地。座標只是地圖上的大概位置，
   起跑線一定要到現場用「通過起跑線時按一下」設定，才會準。 */
const TRACK_SUGGEST = [
  {name:'大鵬灣國際賽車場', area:'屏東東港', len:3504, note:'國內唯一 FIA Grade 2 場地，可開自己的車下場練習'},
  {name:'麗寶國際賽車場 G2 大賽道', area:'台中后里', len:3500, note:'常態舉辦賽道日與駕訓課程'},
  {name:'麗寶國際賽車場 G3 小賽道', area:'台中后里', len:1300, note:'較短、適合新手熟悉場地'},
];
/* 封路活動路段：只在合法取得道路封閉許可的活動期間可以計時 */
const EVENT_TERMS = [
  '本功能僅供在合法取得道路封閉許可的活動中使用。依道路交通管理處罰條例第 43 條，在未封閉的道路上競速，處新臺幣 3 萬元以上 9 萬元以下罰鍰，並當場移置保管車輛、吊扣牌照；情節重大者得沒入車輛。',
  '我確認此路段對應的活動已取得主管機關核發的道路封閉許可，計時只會在活動期間、於封閉路段內進行。',
  '我了解這個程式只是碼錶，不會也無法查證許可真偽。填了文號不會讓任何行為變得合法。活動的安全、保險與法律責任由主辦單位與參加者自負。',
  '我了解活動結束日期一過，這個路段的計時功能會自動停用，只留下歷史成績。',
];
const EVENT_LOCK_NOTE = '活動期間已過，此路段的計時功能已停用。要再次使用請建立新的活動路段，並填入新的封路許可資訊。';

const TRACK_NOTE = '這裡只列出場地名稱與大概長度做為建立時的參考。起跑線的位置一定要到現場設定：在車上經過起跑線的那一瞬間按「設為起跑線」，程式會用你當下的位置與行進方向拉出一條垂直的感應線。用地圖上抓的座標會差好幾公尺，圈速就不準了。';
