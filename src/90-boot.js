/* ==========================================================================
   啟動
   ========================================================================== */
if(!DB.cur && DB.cars.length) DB.cur = DB.cars[0].id;

$('#fileImport').onchange = e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; };

/* 首次開啟：放一台示範車，讓畫面有東西可看 */
if(!DB.cars.length){
  const demo = blankCar();
  Object.assign(demo, {
    name:'示範車（可直接刪除）', modelId:'328i-m52', bodyId:'coupe', year:1997,
    mkt:'EU 歐規', trans:'ZF S5D 320Z (S5-31 強化)', color:'Estoril Blau 335',
    km:186500, wheelW:7, wheelET:47, tire:'205/60R15',
    notes:'這是自動建立的示範車，用來展示各頁面的樣子。可以直接編輯成自己的車，或刪掉後重新建立。',
  });
  demo.build = {...demo.build, paint:'estoril', wheel:'st5', finish:'satblk', size:17,
                tireW:245, tireAR:40, drop:35, caliper:'red', tint:45,
                lip:true, skirt:true, wing:'duck', tips:'dual', shadow:true};
  demo.parts = ['c-cooling'];
  demo.logs = [
    {id:uid(), date:'2026-02-14', km:182000, title:'定期保養：更換機油與機油濾芯、空氣濾芯',
     shop:'', parts:'Motul 8100 5W-40 / Mahle OX68D', cost:3200, labor:800,
     items:['oil','airf'], note:'手冊規格：M52 含濾芯 6.5 L'},
    {id:uid(), date:'2025-06-02', km:171400, title:'冷卻系統全套翻新',
     shop:'', parts:'金屬葉輪水泵 / BMW G48 冷卻液', cost:24800, labor:12000,
     items:['coolant'], note:'手冊規格：M52 冷卻水 10.5 L（含副水箱）'},
  ];
  demo.project = [
    {id:uid(), pid:'c-subframe', name:'', est:90000, paid:0, st:'todo', shop:'', date:today(),
     note:'裝絞牙避震前必須先做', cost:{}},
    {id:uid(), pid:'w-17-85-40', name:'', est:48000, paid:48000, st:'done', shop:'', date:'2025-09-20',
     note:'245/40R17 外徑幾乎與原廠相同', cost:{part:40000, labor:2000, ship:6000}},
    {id:uid(), pid:'s-b14', name:'', est:58000, paid:0, st:'waiting', shop:'', date:today(), note:'', cost:{}},
  ];
  DB.cars.push(demo); DB.cur = demo.id; saveDB();
}

parseHash();
render();
