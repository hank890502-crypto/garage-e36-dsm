# E36 AI Asset Pack

Generated on 2026-08-04 with Codex built-in `imagegen`.

## Folders

- `raw/`: original PNG files copied from the image generator. Body images are 1536 x 1024. Wheel raw files may be larger than 1024 because the generator returned oversized square PNGs.
- `processed/`: chroma-keyed transparent PNG files. Body images remain 1536 x 1024. Wheel images have been normalized to 1024 x 1024.
- `preview-sheet.png`: quick visual QA sheet for all processed assets plus the dashboard hero.

## Notes

- Raw body and wheel assets intentionally use a flat magenta background for clean keying.
- Processed assets have alpha transparency and magenta despill applied.
- Body assets still include the temporary black wheel discs from the prompt. They can be covered by the processed wheel assets during compositing.
- The Compact body generated slightly closer to a short coupe/hatch hybrid than a perfect E36 Compact. It is usable as a raw candidate, but should be reviewed before replacing the current SVG body.
- Some wheel designs are category-faithful rather than exact OEM reproductions. `wheel-mesh.png` and `wheel-dish.png` are the strongest matches in this batch.

## Next Integration Step

The current app still uses deterministic SVG for live color, suspension, aero, caliper, and wheel changes. These PNGs are ready for a second pass that can:

- align body images to shared wheel centers,
- crop and normalize each body silhouette,
- derive paint masks from the neutral grey bodywork,
- composite transparent wheel PNGs at the corrected centers,
- keep SVG overlays as fallback for dynamic aero/body-kit controls.
