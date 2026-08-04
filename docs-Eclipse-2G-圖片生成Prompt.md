# 第二代 Eclipse 車身素材 — ChatGPT 生圖 Prompt

這份規格跟當初做 E36 那批素材完全一致（純洋紅背景、正側視、中性灰車身、黑色圓盤輪），
所以生出來的圖可以直接進同一套去背與合成流程。

**必要的只有兩張**：Coupe 與 Spyder。輪圈那幾張是加分項，現有的 8 顆輪圈素材本來就是通用造型，
不做也能用。

生完把原始 PNG 丟回來給我，我會做去背（chroma key）、去洋紅溢色、對齊輪心，再接進 app。

---

## 使用方式

在 ChatGPT 裡開一則新對話，**先貼「共用車身 Prompt」，再貼其中一段「車型描述」**，兩段合起來當一個 prompt 送出。
一次只生一台車。圖片比例選 **橫式 3:2（1536 × 1024）**。

---

## 共用車身 Prompt（每張都要貼）

```text
Use case: product-mockup
Asset type: project asset for an automotive configurator

STYLE:
Clean automotive product illustration. Semi-realistic 3D studio render, like a premium car-configurator visual. Smooth soft studio lighting from the upper left, subtle panel shading, gentle specular highlights along the shoulder line. Crisp clean edges. No grain, no texture noise, no motion blur, no depth of field, no lens flare. Not a photograph, not a cartoon.

FRAMING:
Perfectly orthographic SIDE ELEVATION (true left-side profile). Camera exactly at wheel-hub height. Zero perspective, zero foreshortening. The car points to the LEFT and sits perfectly level and horizontal. The car is centred with about 8% empty margin on all four sides. Nothing cropped.

BACKGROUND:
Completely flat uniform pure magenta (#FF00FF). No gradient, no vignette, no ground plane, no floor, no shadow, no reflection, no text, no watermark, no logo, no people.

PAINT:
The bodywork is painted in neutral light grey (#D8D8D8) with clearly visible realistic panel shading. Glass is dark neutral grey. Window trim and mirrors are black.

WHEELS:
Plain, featureless matte black discs with a black tyre. No spokes, no rim design, no brake disc, no caliper, no wheel bolts, no logo.
```

---

## 車型描述（接在上面那段後面）

### body-coupe2g.png — GS-T / GSX / RS / GS 共用車身

```text
A 1997 Mitsubishi Eclipse (second generation, 2G, facelift model year) three-door hatchback coupe, side profile.

Very rounded, organic, bubble-like body with soft flowing surfaces and no sharp creases. Cab-forward stance: the windscreen is steeply raked and starts far forward, the nose is low, short and rounded. Fixed composite headlights with a soft almond / teardrop shape wrapping slightly onto the front fender, NOT pop-up headlights. Low body-coloured front bumper with a small oval lower grille opening.

Long frameless side window glass with a single long door per side and one door handle. Smooth rounded shoulder line rising gently towards the rear. Prominent softly flared rounded wheel arches sitting close to the tyres.

Fastback / liftback rear: the roofline curves down continuously into a large sloping rear hatch with wraparound rear glass. Short rear overhang. A body-coloured spoiler sits on the trailing edge of the hatch. Rounded rear bumper with a single round exhaust tip exiting on the left.

Compact 2+2 sports coupe proportions: 4390 mm long, 1750 mm wide, 1305 mm tall, 2510 mm wheelbase. Low and wide, sitting close to the ground.
```

### body-spyder2g.png — Spyder GS / Spyder GS-T

```text
A 1997 Mitsubishi Eclipse Spyder (second generation, 2G) two-door convertible, side profile, roof fully down.

Same very rounded, organic, bubble-like body as the Eclipse coupe: cab-forward stance, steeply raked windscreen, low rounded nose, fixed almond / teardrop shaped composite headlights (NOT pop-up), body-coloured front bumper with a small oval lower grille opening, softly flared rounded wheel arches.

Roof completely down and stowed: the folded soft top sits under a smooth body-coloured tonneau cover behind the seats, leaving a clean flat rear deck. No roof, no roll bar, no side windows raised — only the slim curved windscreen frame standing up. Cabin interior is dark and simple, no visible people.

Unlike the hatchback coupe, the Spyder has a conventional short separate boot lid with a slightly higher, blunter tail. Rounded rear bumper with a single round exhaust tip exiting on the left.

Compact convertible sports proportions: 4390 mm long, 1750 mm wide, 1310 mm tall, 2510 mm wheelbase. Low and wide, sitting close to the ground.
```

---

## 檢查清單（生完先自己看過再丟給我）

送回來之前逐項確認，任何一項不過就重生一張，不用勉強收：

車頭朝**左**，不是朝右。車身**完全水平**，沒有前低後高或傾斜。
視角是**正側面**，看不到車頭正面、車尾正面，也看不到另一側的輪子。
背景是**乾淨的純洋紅**，沒有影子、沒有地板、沒有倒影、沒有漸層。
車身是**中性灰**，不是白色也不是銀色（太白會讓後續上色失準）。
輪子是**全黑圓盤**，沒有輻條、沒有卡鉗、沒有輪圈造型。
車身**四周都留白**，車頭車尾輪胎都沒有被裁掉。
畫面裡**只有一台車**，沒有文字、logo、浮水印、人。

ChatGPT 常見的幾個毛病與對策：

它很愛加地板陰影。如果出現陰影，回一句「Remove the ground shadow completely. The background must be flat uniform magenta with nothing else.」
它有時會偷偷加透視角度。如果看得到車頭鈑金正面，回「Make it a strictly orthographic side elevation. I must not see any of the front or rear face of the car, only the pure side profile.」
它可能把 2G 畫成 1G（有掀燈）或 3G（更方正）。如果頭燈是掀起來的，回「The 1997 second-generation Eclipse has FIXED almond-shaped composite headlights, not pop-up headlights. Redo with fixed headlights.」
它可能忘記 Coupe 是掀背。如果車尾變成有行李廂蓋的三廂造型，回「The coupe must be a fastback hatchback with the roofline curving continuously into a large sloping rear hatch, not a notchback with a separate boot.」

---

## 選配：輪圈素材

現有的 8 顆輪圈是通用造型，Eclipse 直接沿用沒問題。想更貼近 DSM 的話，可以多生這三顆。
一樣是**先貼共用輪圈 Prompt，再貼一段設計描述**，圖片比例選**正方形（1024 × 1024）**。

### 共用輪圈 Prompt

```text
Use case: product-mockup
Asset type: project wheel asset for an automotive configurator

STYLE:
Clean semi-realistic 3D studio product render, soft lighting from the upper left, crisp edges, no grain, no blur.

FRAMING:
Perfectly straight-on, dead-centre view of one single wheel; true perfect circle, zero perspective, zero tilt, zero rotation. The wheel is centred and fills the frame with about 6% margin. Square image.

BACKGROUND:
Completely flat uniform pure magenta (#FF00FF). No shadow, no reflection, no floor, no text, no logo.

IMPORTANT:
Show only the wheel and tyre. No brake disc, no brake caliper, no hub assembly, no car behind it. Gaps between the spokes should show magenta background.

SUBJECT:
A single 17-inch alloy wheel with a low-profile black tyre (215/45 R17). Plain matte black sidewall with no lettering. Neutral satin silver finish. Five wheel bolts around a small plain centre cap.
```

### 輪圈設計

```text
wheel-ecl-oem.png:
Six flat curved spokes radiating from a small flat centre cap, each spoke slightly wider at the rim end and gently twisted. Simple clean 1990s Japanese OEM alloy look, satin silver, mildly concave face.

wheel-ecl-mesh6.png:
Six pairs of thin spokes that split near the hub and meet the rim as twelve narrow points, forming an airy open pattern. Bright silver, flat face, 1990s Japanese aftermarket look.

wheel-ecl-gold.png:
Six straight thin spokes with a bronze / gold finish and a polished silver outer lip ring. Classic 1990s Japanese tuner wheel look, flat face, slightly stepped lip.
```

---

## 生完之後

把原始 PNG（不用自己去背）傳給我，或直接丟進 `汽車改裝app` 資料夾裡我再讀。
我會處理去背、洋紅溢色移除、尺寸正規化、輪心對齊，然後把 Eclipse 接進改裝設計預覽，
車色、降車高、輪圈、卡鉗顏色、隔熱紙那些控制項就會跟 E36 一樣可以即時預覽。

零件庫是另一件事——那需要建一份 DSM 的零件資料（避震、渦輪、排氣、進氣那些的實際品牌、料號與價格），
跟圖片無關，你想做的話我們另外談。
