# Prompt Set Used

All generated assets used Codex built-in `imagegen`.

## Shared Body Prompt

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

## Body Subjects

```text
body-coupe.png:
A 1995 BMW 3 Series E36 Coupe (two-door), side profile. Shark-nose front end, twin round headlights behind a single flush glass cover, slim sides, thin A-pillar, frameless side windows, low raked roofline, Hofmeister kink, small mirror, short boot lid, slim tail lights.

body-sedan.png:
A 1995 BMW 3 Series E36 Sedan (four-door), side profile. Shark nose, twin round headlights under one glass cover, Hofmeister kink at the lower rear corner of the rear door window, framed windows, visible B-pillar, taller greenhouse, two door handles per side, separate three-box boot.

body-touring.png:
A 1995 BMW 3 Series E36 Touring (five-door estate / wagon), side profile. Flat roofline to a near-vertical tailgate, long rear side window with Hofmeister kink, no roof rails, tall vertical tail lights.

body-compact.png:
A 1995 BMW 3 Series E36 Compact (three-door hatchback), side profile. Same E36 front end, noticeably shorter stubby hatchback rear, short rear overhang, one long door per side, same wheelbase as coupe.

body-cabrio.png:
A 1995 BMW 3 Series E36 Cabriolet (two-door convertible), side profile, roof fully down. Folded soft top hidden under a smooth body-coloured tonneau cover, clean flat deck, no roof, no roll bar, only the slim windscreen frame standing up.
```

## Shared Wheel Prompt

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
A single 17-inch alloy wheel with a low-profile black tyre (245/40 R17). Plain matte black sidewall with no lettering. Neutral satin silver finish. Five wheel bolts around a small plain centre cap.
```

## Wheel Designs

```text
wheel-st5.png:
Five twin-spoke design: five pairs of flat spokes, each pair splitting from the centre hub and widening slightly towards the rim (classic BBS-style double spoke).

wheel-st42.png:
Five cross-spoke design: ten slim spokes arranged as five crossing X pairs radiating from the hub to the rim.

wheel-st39.png:
Five double-spoke sunflower design: five spokes that each split into a shallow V near the outer rim.

wheel-st24.png:
Ten slim round-ended spokes, evenly spaced, light and simple.

wheel-mesh.png:
Fine woven mesh design: many thin spokes crossing to form a dense mesh pattern, with a distinct polished outer rim ring.

wheel-st66.png:
Five pairs of straight parallel spokes running from the hub to the rim. Motorsport M Parallel style, broad flat parallel twin spokes, clean and symmetric.

wheel-dish.png:
Eight flat spokes set deep inside a wide, highly polished outer lip (deep-dish design). Large shiny stepped polished outer barrel, smaller recessed spoke face, strong deep-lip look.

wheel-steel.png:
A plain pressed-steel wheel covered by a simple silver plastic hubcap with five oval vent slots. Simple utilitarian OEM base-model look, mostly smooth hubcap, satin silver finish.
```

## Hero Prompt

```text
A 1995 BMW E36 M3 Coupe in Estoril Blue, front three-quarter view, parked in a dark minimalist concrete studio with a single soft overhead light. Moody, cinematic, dark background, subtle reflections on the floor. Photorealistic, shallow depth of field. No text, no watermark, no people. Landscape 3:2.
```
