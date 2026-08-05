# Vehicle model attribution

## E36 body shells (2025 set) — ⚠️ ATTRIBUTION REQUIRED

`e36-coupe`, `e36-cabrio`, `e36-compact`, `e36-sedan`, `e36-touring` were rebuilt from
three Sketchfab source packages:

- `BMW 3 Series E36 Coupe and Convertible.glb`
- `BMW 3 Series E36 Compact and Sedan.glb`
- `BMW 3 Series E36 Touring.glb`

**The downloaded packages contained no licence file, so the author and licence terms are
not recorded here yet. Do not publish until this section names the author and licence.**
Paste the credit line from each model's Sketchfab page below before pushing.

Processing applied here: the original wheels (tire / rim / brakedisk primitives) were
removed — the app rebuilds wheels from measured hardpoints, so keeping the donor wheels
would only fight the new ones — the two body styles in each package were split into
separate files, geometry was welded and simplified, and the result was Meshopt-compressed.
Roughly 1,000,000 down to ~100,000 triangles per body, 34–59 MB down to 1.0–1.5 MB.

## BMW E36 M3

`e36-m3/model.glb` — "BMW E36 M3" by Martin Trafas (Bexxie), CC BY 4.0.
Converted here from the model's own source OBJ: scene floor and wheels removed,
material names changed to match the shading rules, no source textures attached.
63,433 down to 21,392 triangles. Full licence text in `e36-m3/license.txt`.

## Mitsubishi Eclipse 2G

`eclipse-99/model.glb` (2025 set) — ⚠️ **CC BY-NC-SA — the strictest licence in this
project.** The model page states "CC 署名-非商業性使用-相同方式共享" (Attribution +
NonCommercial + ShareAlike). The uploader's own description links Instagram
`ddiaz.design` and `paypal.me/sergiodd`, and credits the base as an "极品飞车 / Need for
Speed" model. **The uploader's Sketchfab display name still needs to be recorded here.**

Three consequences, all of which apply to this repository:
1. **NonCommercial** — the app must stay free: no ads, no sponsorship, no paid tier, no
   affiliate links to wheel or parts shops. Hosting on GitHub is fine (using a commercial
   host for a non-commercial purpose is not itself commercial use).
2. **ShareAlike** — this converted `.glb` is a derivative and must itself be offered under
   CC BY-NC-SA. Say so wherever it is distributed.
3. The base is described as derived from a commercial game asset, so the uploader may not
   have had the right to license it at all. Treat this model as the highest-risk asset here.

Converted with FBX2glTF from the source FBX; original wheels removed (the app rebuilds
them from measured hardpoints), materials renamed to match the shading rules, textures
resized to 1024 px. 122,798 down to 98,782 triangles, 7.1 MB down to 3.5 MB.

`eclipse/` (scene.gltf) — "Mitsubishi Eclipse 1997-1999 II" by szymonpasterczyk734,
CC BY 4.0. No longer referenced by the preview; can be deleted.

## Wheel face assets

`../wheels/face-bbs.glb` — spoke face extracted from "BBS Wheel" by Serjogasan
(https://sketchfab.com/3d-models/bbs-wheel-f7790f517f3e42fb91a00fb9a0405cd6).
Listed on Sketchfab as a free download, so it carries one of the Creative Commons
licences — **the exact variant is still unconfirmed and must be read off the model
page before publishing**. If it turns out to be any NonCommercial variant, drop it.
See `../wheels/face-bbs-license.txt`.

Separately from the file licence: a recognisable aftermarket wheel design may carry
design rights, and the brand name and centre-cap logo are trademarks. Reproducing the
shape of a 1990s BMW factory wheel is low risk (registered design rights have expired);
naming a current aftermarket product is not.

### Not shipped

"BBS FI-R + Michelin Pilot Sport 5" by MozzarellaARC
(https://sketchfab.com/3d-models/bbs-fi-r-michelin-pilot-sport-5-52eef04370f74df88fa6e4a3ca104158)
is a paid Sketchfab Store item under a royalty-free licence, not a CC download.
Royalty-free licences of this kind generally permit use inside an end product but
prohibit redistributing the asset file itself — and a public repository that serves the
raw .glb over HTTP is redistribution. It is deliberately **not** included here.

## Retired

`e36/` (scene.gltf) is no longer referenced by the preview and can be deleted.
`e36-coupe/model.glb` previously held the Sketchfab-converted M3; that model now
lives in `e36-m3/` and this path holds the 2025 coupe shell.
