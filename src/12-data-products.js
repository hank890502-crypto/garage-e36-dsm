/* ==========================================================================
   實際改裝產品資料
   商品圖片直接引用製造商官方網站。只有具備車型專用網格的項目才允許 3D 切換。
   ========================================================================== */
const PRODUCT_SOURCES = {
  enkei_rpf1:'https://enkei.com/shop/wheels/racing/rpf1/',
  bbs_lm:'https://bbs-japan.co.jp/en/products/1142/',
  apex_arc8:'https://apexwheels.com/wheels/flow-formed/classic-line/arc-8',
  bridgestone_re71:'https://www.bridgestone.com.tw/zh/tire/potenza-re-71rs',
  yokohama_ad09:'https://www.y-yokohama.com/global/product/tire/tires/passenger/advan_neova_ad09',
  bilstein_b14:'https://performance.bilstein.com/en/bmw-e36-tuning-perfect-lowering-with-bilstein-coilover-suspension-kits/',
  kw_v3:'https://www.kwsuspensions.com/products/kw-suspensions/kw-variant-3.html',
  brembo_gt:'https://www.brembo.com/en/solutions/for-your-car/gt-bm4-kit',
  film_3m:'https://www.3m.com.tw/3M/zh_TW/automotive-window-solutions-tw/solutions/auto-window-film/MA-series/',
  bmw_e36_m3:'https://www.press.bmwgroup.com/usa/article/detail/T0449845EN_US/bmw-na-50th-anniversary-%7C-50-stories-for-50-years-chapter-17%3A-%E2%80%9Cbmw-m-achieves-wide-appeal%3A-unique-e36-m3-models-for-the-u-s-%E2%80%9D?language=en_US',
  eclipse_duraflex:'https://www.duraflexbodykits.com/featured-body-kits-vehicle-catalogs/mitsubishi-body-kits/1995-1999-mitsubishi-eclipse-body-kits/?manufacturer=2977',
};

const TIRE_PRODUCTS = [
  {id:'street',brand:'OEM',name:'原廠街道胎',grip:0,speed:1,wear:8,img:'',src:''},
  {id:'re71rs',brand:'Bridgestone',name:'POTENZA RE-71RS',grip:12,speed:-2,wear:-10,
   img:'https://www.bridgestone.com.tw/content/dam/bridgestone/consumer/bst/apac/th/Tires/Turanza/re-71rs/RE-71RS_3.jpg/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg',src:'bridgestone_re71'},
  {id:'ad09',brand:'YOKOHAMA',name:'ADVAN NEOVA AD09',grip:10,speed:-1,wear:-7,
   img:'https://www.y-yokohama.com/global/product/tire/images/tires/passenger/advan_neova_ad09/tires.png',src:'yokohama_ad09'},
];

const SUSPENSION_PRODUCTS = [
  {id:'stock',brand:'OEM',name:'原廠避震',front:[0,0],rear:[0,0],img:'',src:''},
  {id:'b14',brand:'BILSTEIN',name:'B14 PSS 絞牙',front:[35,55],rear:[20,45],
   img:'https://performance.bilstein.com/wp-content/uploads/2020/01/264-Bilstein_B14_BLACK_005_Smartphone.jpg',src:'bilstein_b14'},
  {id:'kwv3',brand:'KW',name:'Variant 3',front:[25,60],rear:[20,55],img:'',src:'kw_v3'},
];

const BRAKE_PRODUCTS = [
  {id:'stock',brand:'OEM',name:'原廠單活塞',pistons:1,disc:286,color:'stock',img:'',src:''},
  {id:'m3',brand:'BMW M',name:'E36 M3 315 mm',pistons:1,disc:315,color:'blue',img:'',src:''},
  {id:'brembo',brand:'Brembo',name:'GT | BM4 四活塞',pistons:4,disc:355,color:'red',
   img:'https://brem-p-001.sitecorecontenthub.cloud/api/public/content/34c1dfb67a664fc28c322e2a7a7f3b60?v=8326c1bb',src:'brembo_gt'},
];

const TINT_PRODUCTS = [
  {id:'none',brand:'OEM',name:'無隔熱紙',vlt:100,img:'',src:''},
  {id:'3m-ma70',brand:'3M',name:'極透奈米仿生 MA70',vlt:70,img:'',src:'film_3m'},
  {id:'3m-ma40',brand:'3M',name:'極透奈米仿生 MA40',vlt:40,img:'',src:'film_3m'},
];

const AERO_PRODUCTS = [
  {id:'stock',brand:'OEM',name:'原廠車身',preview3d:true,lip:false,skirt:false,diffuser:false,wing:'none'},
  {id:'mtech',plat:'e36',bodies:['coupe','sedan'],brand:'BMW M',name:'E36 M3 空力套件',preview3d:false,lip:true,skirt:true,diffuser:false,wing:'none',
   img:'https://mediapool.bmwgroup.com/cache/P9/202504/P90597044/P90597044-e36-m3-lightweight-with-racing-version-front-2250px.jpg',src:'bmw_e36_m3'},
  {id:'track',plat:'e36',bodies:['coupe'],brand:'BMW Motorsport',name:'M3 Lightweight GT',preview3d:false,lip:true,skirt:true,diffuser:true,wing:'gt',
   img:'https://mediapool.bmwgroup.com/cache/P9/202504/P90597044/P90597044-e36-m3-lightweight-with-racing-version-front-2250px.jpg',src:'bmw_e36_m3'},
  {id:'gsx-oem',plat:'dsm2g',bodies:['coupe2g'],brand:'Mitsubishi',name:'GSX 原廠高尾翼',preview3d:true,lip:false,skirt:false,diffuser:false,wing:'oem-high'},
  {id:'duraflex-b2',plat:'dsm2g',bodies:['coupe2g'],brand:'Duraflex',name:'B-2 四件式套件',preview3d:false,lip:true,skirt:true,diffuser:true,wing:'none',src:'eclipse_duraflex'},
];

function aeroProductsOf(c){
  const plat=platOf(c);
  return AERO_PRODUCTS.filter(x=>(!x.plat||x.plat===plat)&&(!x.bodies||x.bodies.includes(c?.bodyId)));
}

function productSourceLink(item){
  const url=item&&PRODUCT_SOURCES[item.src];
  return url?`<a class="product-src" href="${url}" target="_blank" rel="noopener">官方資料</a>`:'';
}
