# Vehicle 3D runtime

The vehicle preview uses Three.js r184, OrbitControls, and GLTFLoader, bundled locally so the
GitHub Pages build does not depend on a CDN.

Source: https://github.com/mrdoob/three.js/releases/tag/r184

Rebuild from the repository root:

```sh
npx --yes esbuild vendor/car3d-entry.js --bundle --format=iife --minify \
  --legal-comments=inline --alias:three=./vendor/three.module.min.js \
  --outfile=vendor/car3d-lib.min.js
```

Three.js is distributed under the MIT License. See `THREE-LICENSE.txt`.
