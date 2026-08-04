# 資料來源與著作權說明

這個專案的**程式碼**由我自己撰寫，採 MIT 授權（見 LICENSE）。
但 app 內含的部分**車輛資料**來自第三方著作，授權狀態與程式碼不同，說明如下。

## 原廠維修手冊

| 平台 | 來源 | 內容 |
|---|---|---|
| BMW E36 | 《1995~1998 BMW E36 1.6L/1.9L/2.0L/2.8L 維修手冊》卡爾世達股份有限公司 | 保養規格表、扭力值、油品容量 |
| Mitsubishi Eclipse 2G | 《1997 Mitsubishi Eclipse GSX AWD Service Manual》（經由 Operation CHARM / charm.li 取得） | 規格數值、保養週期、三段維修程序的中文翻譯 |

規格數值本身（扭力、容量、間隙、壓力等）屬事實性資料。
但**維修程序的中文翻譯屬於原文的衍生著作**，著作權仍屬原出版者（三菱汽車、卡爾世達）。

本專案未取得上述任何一方的授權。內容僅供個人維修參考，不作商業用途。
**若權利人提出要求，我會立即移除相關內容。** 聯絡方式請開 issue。

## 車輛圖片

`AIMG` 中的車身與輪圈素材為 AI 生成的示意圖，非原廠圖片或實拍照片，
也不是精確的原廠 Style 復刻。僅供外觀方向參考。

## 3D 車輛模型

下列基礎網格依 Creative Commons Attribution 4.0（CC BY 4.0）授權使用，
並在本專案中重新調整材質、比例、零件顯示與互動功能：

| 車輛 | 作品與作者 | 原始來源 |
|---|---|---|
| BMW E36 Coupe | “BMW E36 Coupe” by Ricy | https://sketchfab.com/3d-models/bmw-e36-coupe-d637326e3fb24c5d910825e714e30f8d |
| Mitsubishi Eclipse 1997–1999 II | “Mitsubishi Eclipse 1997–1999 II” by szymonpasterczyk734 | https://sketchfab.com/3d-models/mitsubishi-eclipse-1997-1999-ii-c6372726e7e6403a84132e1fba13ce49 |

授權全文：https://creativecommons.org/licenses/by/4.0/

模型隨附授權資料位於 `assets/models/e36/license.txt` 與
`assets/models/eclipse/license.txt`。照片參考與六視圖製作紀錄見
`docs/vehicle-model-references.md`。

## 油價資料

來自政府資料開放平臺「中油主產品牌價」（台灣中油 openData），屬政府開放資料。

## 免責

所有數值、相容性判斷與改裝建議僅供參考，不能取代原廠手冊與專業技師的判斷。
涉及煞車、轉向、燃油、結構安全的項目請務必由合格技師施作。
依此專案內容施工所造成的任何損害，本專案作者不負任何責任。
