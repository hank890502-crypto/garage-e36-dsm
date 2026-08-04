# Eclipse 2G AI Asset Pack

Generated on 2026-08-05 with Codex built-in `imagegen`.

## Folders

- `raw/`: original PNG files copied from the image generator. Body images are 1536 x 1024. Wheel raw files are 1254 x 1254 because the generator returned oversized square PNGs.
- `processed/`: chroma-keyed transparent PNG files. Body images remain 1536 x 1024. Wheel images have been normalized to 1024 x 1024.
- `preview-sheet.png`: quick visual QA sheet for all processed assets.

## Included Assets

- `body-coupe2g.png`: 1997 Mitsubishi Eclipse 2G facelift coupe / hatchback body.
- `body-spyder2g.png`: 1997 Mitsubishi Eclipse Spyder roof-down convertible body.
- `wheel-ecl-oem.png`: six-spoke 1990s Japanese OEM-style alloy.
- `wheel-ecl-mesh6.png`: bright silver open multi-spoke Japanese aftermarket-style alloy.
- `wheel-ecl-gold.png`: bronze / gold six-spoke tuner wheel with polished lip.

## Notes

- Raw assets intentionally use a flat magenta background for clean keying.
- Processed assets have alpha transparency and magenta despill applied.
- Body assets still include the temporary black wheel discs from the prompt. They can be covered by wheel PNGs during compositing.
- Both body assets have the exhaust tip very close to the right edge. The vehicle silhouette itself is usable; add output padding or crop consistently during final wheel-center alignment.
- `wheel-ecl-mesh6.png` is visually more like a clean multi-spoke wheel than a true six-pair split mesh, but it works as a 1990s Japanese aftermarket category option.

## Source Prompt

The source prompt is kept in:

`Eclipse-2G-圖片生成Prompt.md`
