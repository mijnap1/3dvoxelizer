import { GoogleGenAI, Type } from '@google/genai';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    elements: {
      type: Type.OBJECT,
      properties: {
        terrain: { type: Type.ARRAY, items: { type: Type.STRING } },
        objects: { type: Type.ARRAY, items: { type: Type.STRING } },
        structures: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['terrain', 'objects', 'structures'],
    },
    palette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hex: { type: Type.STRING },
          name: { type: Type.STRING },
          usage: { type: Type.STRING },
        },
        required: ['hex', 'name', 'usage'],
      },
    },
    clusters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          z: { type: Type.NUMBER },
          w: { type: Type.NUMBER },
          h: { type: Type.NUMBER },
          d: { type: Type.NUMBER },
          color: { type: Type.STRING },
          roughness: { type: Type.NUMBER },
          metalness: { type: Type.NUMBER },
          emissive: { type: Type.STRING },
        },
        required: ['x', 'y', 'z', 'w', 'h', 'd', 'color'],
      },
    },
    dimensions: {
      type: Type.OBJECT,
      properties: {
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
        depth: { type: Type.NUMBER },
      },
      required: ['width', 'height', 'depth'],
    },
  },
  required: ['name', 'description', 'elements', 'palette', 'clusters', 'dimensions'],
};

const PROMPT = `You are a world-class voxel artist. Study the provided image carefully and convert it into a highly accurate, detailed cinematic 3D voxel scene that closely resembles the original.

Set \`name\` to a natural, evocative scene title (e.g., "Autumn Meadow", "Ocean Sunset at Dusk", "Cozy Forest Cabin", "Fluffy Bear at Play"). NEVER use "Voxel Sculpture", "Voxel Model", or "3D Sculpture" in the name.

━━━ STUDY THE IMAGE FIRST ━━━
Before placing a single cluster, categorize the image type:
  TYPE A — CHARACTER/PORTRAIT: single subject, close-up or mid-shot → use body-part depth rules, optional shallow ground
  TYPE B — SCENE/ENVIRONMENT: landscape, architecture, interior → use full scene layers (sky → background → mid-ground → foreground)
  TYPE C — OBJECT: isolated item (food, product, vehicle) → treat like character with appropriate depth

Then mentally note:
1. IMAGE TYPE — which of A/B/C applies, and why
2. PRIMARY SUBJECT — exact species/type, pose, orientation facing camera
3. KEY COLORS — fur, coat, eyes, sky, terrain, structures (sample exact hex values)
4. PROPORTIONS — subject's width : height : depth ratio; scene depth range
5. FEATURES — what details make it recognizable?
6. COMPOSITION — foreground, mid-ground, background layers present?

━━━ GRID RULES ━━━
• ALL coordinates (x, y, z): even integers only (…−4, −2, 0, 2, 4, 6…)
• ALL dimensions (w, h, d): even integers ≥ 2
• A cluster's CENTER is (x,y,z); it spans [x−w/2, x+w/2] × [y−h/2, y+h/2] × [z−d/2, z+d/2]
• Adjacent clusters MUST share face boundaries — zero gaps, zero overlaps
• y = 0 is the ground. Scene spans ≈ 80–100 units total.
• RESOLUTION GUIDE — use the right block size per zone:
    Sky / atmosphere:            8–16 units (very large)
    Distant background:          6–12 units
    Mid-ground terrain / trees:  4–8  units
    Mid-ground structures:       2–6  units
    Foreground / subject masses: 2–6  units
    Fine surface details:        2    units (minimum)

━━━ 3D VOLUME RULES (CRITICAL — read before placing any cluster) ━━━
This is a cinematic 3D SCENE, NOT a flat 2D sprite. Every part MUST have genuine depth.

Character/body-part minimums:
  Head / skull:       d = 8–12  (a head is a solid sphere, not a flat disk)
  Torso / body:       d = 6–10
  Upper arms:         d = 4–6
  Forearms / hands:   d = 4–6
  Legs / thighs:      d = 4–8
  Feet / shoes:       d = 4–6
  Ears (round):       d = 4–6
  Ground base:        d = 6–12 (platform the figure stands on)

Scene element minimums:
  Sky backdrop:       d = 4–8
  Distant mountains:  d = 6–12
  Foliage canopy:     d = 6–10
  Building facades:   d = 6–10
  Ground terrain:     d = 6–12
  Water surface:      d = 4–6
  Foreground props:   d = 4–8

VIOLATION: Any structural cluster with d < 4 is forbidden (except 2-unit detail accents).

━━━ PALETTE EXPANSION (do this BEFORE placing any clusters) ━━━
For each major material, derive 3 hex variants from the image:
  [material]_light:  "#______"  ← top-facing surfaces, ~15% brighter
  [material]_mid:    "#______"  ← side-facing surfaces, exact sampled color
  [material]_dark:   "#______"  ← bottom/recessed surfaces, ~20% darker

For scenes/environments also include:
  sky_zenith:        "#______"  ← top of sky
  sky_horizon:       "#______"  ← sky near horizon
  sky_glow:          "#______"  ← warm glow near sun (emissive if applicable)
  terrain_light:     "#______"
  terrain_mid:       "#______"
  terrain_dark:      "#______"
  terrain_shadow:    "#______"
  foliage_highlight: "#______"
  foliage_mid:       "#______"
  foliage_shadow:    "#______"
  stone_light:       "#______"
  stone_mid:         "#______"
  stone_dark:        "#______"

Include ALL derived variants in the palette[] array (target 20–28 palette entries).
MANDATORY: warm-toned subjects (golden fur, orange cat, brown bear, tan skin) must use
warm amber/honey hex values — #E8C57A, #D4A96A, #C8904E, #B87840, #9A6030 range.
NEVER substitute neutral gray (#888, #aaa, #999, #ccc) for a warm-toned subject.
Atmospheric perspective: distant/background clusters → desaturate 10–20%, shift slightly blue.

━━━ CINEMATIC LIGHTING ━━━
Assume a key light from upper-left-front (sun or studio light).
• TOP-facing surfaces:     use LIGHT variant (15–25% brighter)
• FRONT-facing surfaces:   use MID variant (base color)
• SIDE-facing surfaces:    use MID or slightly darker
• BOTTOM/SHADOW surfaces:  use DARK variant (20–30% darker)
• SHADOW SIDE clusters:    shift hue slightly cool (add a hint of blue/purple)
• HIGHLIGHT CLUSTERS:      shift hue slightly warm (add a hint of orange/gold)
Atmospheric perspective: background clusters → desaturate 10–20%, shift slightly blue.
Emissive: use sparingly for sky glow near horizon, glowing windows, fire, light sources.

━━━ BUILD ORDER (400–700 clusters total) ━━━

STEP 1 — SKY & ATMOSPHERE  [5–15 clusters]
  Large 8–16 unit blocks spanning the full scene width. z = −35 to −45.
  Gradient from zenith to horizon using sky palette variants (sky_zenith → sky_horizon → sky_glow).
  (Skip this step for TYPE A portraits with no visible sky.)

STEP 2 — DISTANT BACKGROUND  [15–30 clusters]
  Mountains, distant skyline, far terrain. z = −20 to −35, d = 6–12.
  Use atmospheric perspective colors (slightly desaturated, blue-shifted). Block size 6–12 units.
  (For TYPE A: use 2–8 thin accent clusters at d = 2–4. For TYPE C objects: skip.)

STEP 3 — BASE / GROUND SURFACE  [15–25 clusters]
  The immediate terrain/floor. y = 0–8, d = 8–14.
  Wide flat slabs using exact image colors with light/mid/dark variants.

STEP 4 — MID-GROUND ELEMENTS  [60–120 clusters, 2–8 unit blocks]
  Trees, buildings, rocks, water, secondary objects. z = −10 to −20.
  Apply cinematic lighting shading. Foliage uses 3 green variants (top/highlight, mid, shadow).
  (For TYPE A characters: build secondary body masses / clothing here.)

STEP 5 — FOREGROUND SUBJECT  [120–200 clusters]
  The primary subject(s). Full depth per 3D VOLUME RULES.
  Apply directional shading across all masses (top = light, sides = mid, bottom = dark).
  For characters: follow body-part depth rules.
  For objects/buildings: apply structure depth rules.
  Ensure the subject occupies ≥ 40% of the total scene height.

STEP 6 — SURFACE DETAILS & ACCENTS  [60–100 clusters]
  Eyes, facial features, surface texture, material transitions, window details, flower petals.
  Cast shadows on the ground (dark blocks placed adjacent to base of subject).
  Specular highlight clusters on shiny surfaces.
  FUR TEXTURE: scatter 20–30 blocks sized 2×2×2 at the outer surface of fur regions
    Place them z+2 (in front of body faces) or y+2 (above top faces)
    Use 3 closely-related shades: light variant, mid variant, dark variant

━━━ FACE CONSTRUCTION EXAMPLE (adapt coordinates to your subject) ━━━
Suppose subject head base is at y=12, face center x=0, face front surface z=6.
Build left-to-right, row by row (all d=8 — the head has real depth):

  y=22, top peak:    x=−2,y=22,z=2, w=2,h=2,d=8  |  x=2,y=22,z=2, w=2,h=2,d=8
  y=20, forehead:    x=−4,y=20,z=2,w=2,h=2,d=8   |  x=−2,…  |  x=2,…  |  x=4,…
  y=18, eye level:   x=−6,y=18,z=2,w=2,h=2,d=8  (×5 blocks across)
    LEFT EYE:   x=−4, y=18, z=8, w=2,h=2,d=2, color=darkest_brown
    RIGHT EYE:  x=+4, y=18, z=8, w=2,h=2,d=2, color=darkest_brown   ← mirror x exactly
  y=16, nose level:  x=−6..+6 (×5-6 blocks across, d=8)
    NOSE:       x=0,  y=16, z=10, w=2,h=2,d=4, color=darkest_value   ← protrudes z+4 past face
  y=14, lower face:  x=−4..+4 (×3-4 blocks, d=8)
  y=12, chin:        x=−2..+2 (×1-2 blocks, d=8)

  EARS (left):  x=−8, y=20, z=2, w=2,h=4,d=6, ear_color
  EARS (right): x=+8, y=20, z=2, w=2,h=4,d=6, ear_color  ← mirror x exactly

Adapt all coordinates proportionally to your subject's actual size and position.

━━━ MATERIAL PROPERTIES ━━━
  Fur / hair:     roughness = 0.95, metalness = 0.0
  Fabric / cloth: roughness = 0.90, metalness = 0.0
  Leather / skin: roughness = 0.75, metalness = 0.0
  Stone / rock:   roughness = 0.85, metalness = 0.0
  Metal:          roughness = 0.30, metalness = 0.8
  Water:          roughness = 0.10, metalness = 0.0
  Emissive: ONLY for sky glow, glowing windows, fire, light sources — omit for everything else

━━━ FINAL QUALITY CHECK ━━━
Before outputting verify:
✓ name contains NO "Voxel Sculpture", "Voxel Model", or "3D Sculpture" language
✓ Scene has visible depth layers: sky → background → mid-ground → foreground
✓ All x, y, z are even integers (no decimals, no odd numbers)
✓ All w, h, d are even integers ≥ 2
✓ Every structural cluster has d ≥ 4 (sky/thin accents may be d = 2–4)
✓ Colors match the image — no gray substitutions for warm-toned subjects
✓ Cinematic lighting applied: top = light variant, bottom = dark variant, shadow side = cool-shifted
✓ Atmospheric perspective: distant clusters are desaturated and slightly blue
✓ Subject height ≥ 40% of total scene height
✓ No floating clusters disconnected from the model
✓ 400–700 total clusters`;

export async function voxelizeWithGemini(base64Image: string, apiKey: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: PROMPT },
      ],
    },
    config: {
      thinkingConfig: { thinkingBudget: 24576 },
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('No response text from Gemini');
  }

  return JSON.parse(response.text);
}
