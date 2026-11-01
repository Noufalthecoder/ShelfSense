import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { reduceMotion } from '../lib.js';

// An interactive 3D shelf: hover or tap a product and the ShelfSense lens reads it against "your" skin.
const PRODUCTS = [
  { name: 'Serum Nº 10', kind: 'Niacinamide 10% · Zinc 1%', verdict: 'Suits you', tone: 'good', score: 94, why: 'Targets the dark spots in your scan, oil-free for your T-zone.' },
  { name: 'Barrier Cream', kind: 'Ceramides · Squalane', verdict: 'Suits you', tone: 'good', score: 88, why: 'Rich but non-comedogenic. Keeps your low redness low.' },
  { name: 'Glow Tube', kind: 'Glycolic acid 8%', verdict: 'Patch test first', tone: 'warn', score: 71, why: 'AHA can sting cheeks that flush easily. Try it on your jaw first.' },
  { name: 'Rose Toner', kind: 'Alcohol denat. · Parfum', verdict: 'Skip it', tone: 'bad', score: 32, why: 'Fragrance and drying alcohol, both flagged for your skin.' },
  { name: 'Velvet Lip 05', kind: 'Warm brick red', verdict: 'Shade match', tone: 'good', score: 91, why: 'Made for your warm undertone. See it on your face in one tap.' },
];
const TONE = { good: '#5cc58a', warn: '#e8a94f', bad: '#ec6a7a' };
const TONE_COL = Object.fromEntries(Object.entries(TONE).map(([k, c]) => [k, new THREE.Color(c)]));
const XS = [-3.5, -1.75, 0, 1.75, 3.5];

const V2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts, seg = 96) => new THREE.LatheGeometry(V2(pts), seg);
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => { paint(c.getContext('2d'), w, h); tex.needsUpdate = true; };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}

function label({ bg, ink, sub, top, title, line, w = 1024, h = 400, y = 0 }) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.fillStyle = ink;
    g.font = '500 30px Inter';
    g.letterSpacing = '10px';
    g.fillText(top, w / 2, h / 2 - 80 + y);
    g.letterSpacing = '0px';
    g.font = 'italic 104px "Instrument Serif"';
    g.fillText(title, w / 2, h / 2 + 30 + y);
    g.font = '400 24px Inter';
    g.fillStyle = sub;
    g.fillText(line, w / 2, h / 2 + 96 + y);
  });
}

const softDot = () => canvasTexture(64, 64, (g) => {
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
});

const shadowTex = () => canvasTexture(256, 256, (g) => {
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
});

// ---------- products (each built with its base at y = 0) ----------

function serum(m) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9a4a22', roughness: .1, clearcoat: 1, clearcoatRoughness: .03, sheen: .4, sheenColor: new THREE.Color('#f0a46b'), envMapIntensity: 1.4 });
  const lbl = new THREE.MeshStandardMaterial({ map: label({ bg: '#f7f1ea', ink: '#1a1714', sub: '#5e5750', top: 'SERUM Nº 10', title: 'Niacinamide', line: '10% NIACINAMIDE · 30 ML' }), roughness: .55 });
  m.push(glass, lbl);
  g.add(new THREE.Mesh(lathe([[0, 0], [.5, 0], [.56, .05], [.58, .14], [.58, 1.42], [.54, 1.58], [.26, 1.74], [.23, 1.8], [.23, 1.92], [0, 1.92]]), glass));
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .36, 64), m.gold);
  collar.position.y = 2.08;
  const bulb = new THREE.Mesh(lathe([[0, 0], [.22, 0], [.23, .14], [.22, .38], [.16, .52], [0, .56]]), m.ink);
  bulb.position.y = 2.26;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.585, .585, .7, 96, 1, true, -Math.PI / 2, Math.PI), lbl);
  band.position.y = .72;
  g.add(collar, bulb, band);
  g.scale.setScalar(.8);
  return g;
}

function jar(m) {
  const g = new THREE.Group();
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#f4eee8', roughness: .32, clearcoat: .8, clearcoatRoughness: .15 });
  const lbl = new THREE.MeshStandardMaterial({ map: label({ bg: '#e9ded3', ink: '#1a1714', sub: '#6b625a', top: 'BARRIER', title: 'Cream', line: 'CERAMIDES · SQUALANE · 50 ML', h: 300, y: -10 }), roughness: .6 });
  m.push(ceramic, lbl);
  g.add(new THREE.Mesh(lathe([[0, 0], [.66, 0], [.71, .04], [.73, .12], [.73, .62], [.69, .68], [.62, .7], [.62, .76], [0, .76]]), ceramic));
  const lid = new THREE.Mesh(lathe([[0, 0], [.72, 0], [.74, .03], [.74, .27], [.71, .31], [0, .31]]), m.gold);
  lid.position.y = .74;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.735, .735, .4, 96, 1, true, -Math.PI * .55, Math.PI * 1.1), lbl);
  band.position.y = .36;
  g.add(lid, band);
  return g;
}

function tube(m) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(.36, .36, 1.7, 64, 32, true, -Math.PI, Math.PI * 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + .85) / 1.7;
    const k = THREE.MathUtils.smoothstep(t, .45, 1);
    pos.setX(i, pos.getX(i) * (1 + k * .32));
    pos.setZ(i, pos.getZ(i) * (1 - k * .93));
  }
  geo.computeVertexNormals();
  const skin = new THREE.MeshPhysicalMaterial({
    map: label({ bg: '#f1d3c9', ink: '#3b1f1c', sub: '#8a5a52', top: 'GLOW', title: 'Exfoliant', line: 'GLYCOLIC ACID 8% · 75 ML', w: 1024, h: 820, y: 130 }),
    roughness: .42, clearcoat: .6, side: THREE.DoubleSide,
  });
  m.push(skin);
  const body = new THREE.Mesh(geo, skin);
  body.position.y = .32 + .85;
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(.98, .1, .07), skin);
  crimp.position.y = .32 + 1.7;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.27, .3, .34, 48), m.ink);
  cap.position.y = .17;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.33, .27, .06, 48), m.ink);
  neck.position.y = .34;
  g.add(body, crimp, cap, neck);
  return g;
}

function pump(m) {
  const g = new THREE.Group();
  const frosted = new THREE.MeshPhysicalMaterial({ color: '#f2b9b2', transmission: .9, roughness: .28, thickness: .9, ior: 1.45, clearcoat: 1, clearcoatRoughness: .1, attenuationColor: new THREE.Color('#e48a8c'), attenuationDistance: 1.2 });
  const liquid = new THREE.MeshPhysicalMaterial({ color: '#e67f88', roughness: .2, emissive: '#5a1a22', emissiveIntensity: .3 });
  const lbl = new THREE.MeshStandardMaterial({ map: label({ bg: '#fbf4ef', ink: '#5a2430', sub: '#9a6b70', top: 'ROSE', title: 'Toner', line: 'ROSE WATER · PARFUM · 200 ML' }), roughness: .5 });
  m.push(frosted, liquid, lbl);
  g.add(new THREE.Mesh(lathe([[0, 0], [.44, 0], [.49, .05], [.51, .15], [.51, 1.3], [.47, 1.42], [.21, 1.5], [.19, 1.56], [0, 1.56]]), frosted));
  g.add(new THREE.Mesh(lathe([[0, .04], [.44, .04], [.46, .14], [.46, 1.0], [0, 1.0]]), liquid));
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .16, 48), m.gold);
  collar.position.y = 1.62;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .3, 16), m.white);
  stem.position.y = 1.84;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .2, 48), m.white);
  head.position.y = 2.04;
  const nozzle = new THREE.Mesh(new THREE.BoxGeometry(.38, .08, .1), m.white);
  nozzle.position.set(.28, 2.07, 0);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.515, .515, .56, 96, 1, true, -Math.PI * .45, Math.PI * .9), lbl);
  band.position.y = .66;
  g.add(collar, stem, head, nozzle, band);
  return g;
}

function lipstick(m) {
  const g = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: '#a8243a', roughness: .28, clearcoat: .9, clearcoatRoughness: .1, sheen: .5, sheenColor: new THREE.Color('#ff8a8a') });
  m.push(red);
  const base = new THREE.Mesh(lathe([[0, 0], [.27, 0], [.29, .03], [.29, .7], [.27, .72], [0, .72]], 64), m.gold);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.295, .295, .05, 64), m.ink);
  ring.position.y = .5;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .34, 64), m.gold);
  sleeve.position.y = .89;
  const geo = new THREE.CylinderGeometry(.18, .18, .52, 48, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > .2) pos.setY(i, .26 - (pos.getX(i) + .18) * .62);
  }
  geo.computeVertexNormals();
  const bullet = new THREE.Mesh(geo, red);
  bullet.position.y = 1.06 + .26;
  bullet.rotation.y = -Math.PI / 2.4;
  g.add(base, ring, sleeve, bullet);
  g.scale.setScalar(1.2);
  return g;
}

// ---------- component ----------

export default function Shelf3D() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const lensRef = useRef(null);
  const tagRef = useRef(null);
  const api = useRef({ active: 0, pick: () => {} });
  const [active, setActive] = useState(0);
  const p = PRODUCTS[active];

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const BG = '#15110f';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 13, 24);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
    const key = new THREE.SpotLight('#ffe6d2', 60, 30, .55, .6, 1.6);
    key.position.set(2, 8, 6);
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#e3836f', 2.4);
    rim.position.set(-3, 4, -6);
    scene.add(rim, new THREE.AmbientLight('#ffffff', .15));

    // shared materials
    const mats = [];
    mats.gold = new THREE.MeshPhysicalMaterial({ color: '#cfa46a', metalness: 1, roughness: .22 });
    mats.ink = new THREE.MeshPhysicalMaterial({ color: '#211b18', roughness: .4, clearcoat: .6 });
    mats.white = new THREE.MeshPhysicalMaterial({ color: '#f5f1ec', roughness: .35, clearcoat: .5 });
    mats.push(mats.gold, mats.ink, mats.white);

    // the shelf, with a glowing smart edge
    const wood = new THREE.MeshPhysicalMaterial({ color: '#2d231e', roughness: .55, clearcoat: .35, clearcoatRoughness: .4 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(10.2, .2, 2.4), wood);
    shelf.position.y = -.1;
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#c24e5c', toneMapped: false });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(10.2, .03, .02), edgeMat);
    edge.position.set(0, -.07, 1.21);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: '#1d1714', roughness: 1 }));
    wall.position.set(0, 4, -2.2);
    scene.add(shelf, edge, wall);
    mats.push(wood, edgeMat, wall.material);

    // glow behind the product being read
    const dot = softDot();
    const glowMat = new THREE.MeshBasicMaterial({ map: dot, color: TONE.good, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), glowMat);
    glow.position.set(XS[0], 1.2, -2.1);
    scene.add(glow);
    mats.push(glowMat);

    // products
    const sTex = shadowTex();
    const shadowMat = new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, opacity: .8 });
    mats.push(shadowMat);
    const items = [serum, jar, tube, pump, lipstick].map((build, i) => {
      const root = new THREE.Group();
      root.position.x = XS[i];
      const inner = new THREE.Group();
      const model = build(mats);
      inner.add(model);
      inner.rotation.y = -.25 + i * .12;
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shadowMat.clone());
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = .002;
      root.add(inner, shadow);
      scene.add(root);
      const box = new THREE.Box3().setFromObject(model);
      return { root, inner, shadow, height: box.max.y, lift: 0, phase: i * 1.3 };
    });

    // the scan: a ring and a faint disc of light, swept down the active product
    const scanMat = new THREE.MeshBasicMaterial({ color: TONE.good, transparent: true, toneMapped: false });
    const discMat = new THREE.MeshBasicMaterial({ color: TONE.good, transparent: true, opacity: .1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const scan = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .012, 8, 160), scanMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.95, 96), discMat);
    ring.rotation.x = disc.rotation.x = Math.PI / 2;
    scan.add(ring, disc);
    scene.add(scan);
    mats.push(scanMat, discMat);

    // drifting dust in the light
    const N = 520;
    const pts = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pts[i * 3] = (Math.random() - .5) * 14;
      pts[i * 3 + 1] = Math.random() * 6 - .5;
      pts[i * 3 + 2] = (Math.random() - .5) * 5;
      speed[i] = .05 + Math.random() * .15;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const dustMat = new THREE.PointsMaterial({ map: dot, color: '#f2b48e', size: .06, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    mats.push(dustMat);

    // ---- sizing: on narrow screens the camera follows the active product ----
    let W = 1, H = 1, narrow = false;
    const resize = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      if (!W || !H) return;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      narrow = camera.aspect < 1;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // ---- interaction ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovering = false;
    let lastInteract = -10;
    let lastSwitch = 0;
    const setAct = (i) => {
      if (api.current.active === i) return;
      api.current.active = i;
      setActive(i);
    };
    api.current.pick = (i) => { setAct(i); lastInteract = clock.getElapsedTime(); };

    const hit = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(items.map((it) => it.inner), true);
      if (!hits.length) return -1;
      return items.findIndex((it) => { let o = hits[0].object; while (o) { if (o === it.inner) return true; o = o.parent; } return false; });
    };
    const onMove = (e) => {
      const i = hit(e);
      hovering = i >= 0;
      canvas.style.cursor = hovering ? 'pointer' : '';
      if (hovering) { setAct(i); lastInteract = clock.getElapsedTime(); }
    };
    const onDown = (e) => { const i = hit(e); if (i >= 0) api.current.pick(i); };
    const onLeave = () => { hovering = false; canvas.style.cursor = ''; };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);

    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(stage);

    // ---- loop ----
    const clock = new THREE.Clock();
    const look = new THREE.Vector3(0, 1.4, 0);
    const camPos = new THREE.Vector3(0, 2, 12);
    const toneCol = new THREE.Color(TONE.good);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    const scr = { x0: 0, y0: 0, x1: 0, y1: 0, init: false };
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const onPointer = (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener('pointermove', onPointer, { passive: true });
    let raf;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), .05);
      const t = clock.elapsedTime;
      const a = api.current.active;
      const k = reduceMotion ? 1 : .08;

      // auto-tour when nobody is pointing
      if (!hovering && t - lastInteract > 3 && t - lastSwitch > 3.4) {
        lastSwitch = t;
        setAct((a + 1) % items.length);
      }

      // camera
      mouse.sx += (mouse.x - mouse.sx) * .04;
      mouse.sy += (mouse.y - mouse.sy) * .04;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const halfW = narrow ? 1.9 : 5.6;
      const z = Math.max(halfW / (tanH * camera.aspect), 2.6 / tanH);
      const tx = narrow ? XS[a] : 0;
      camPos.set(tx + mouse.sx * .9, 2.4 - mouse.sy * .5, z);
      camera.position.lerp(camPos, k * .8);
      look.x += (tx - look.x) * k * .8;
      look.y = narrow ? 1.75 : 1.75;
      camera.lookAt(look);

      // products
      items.forEach((it, i) => {
        const on = i === a;
        it.lift += ((on ? .32 : 0) - it.lift) * k;
        const bob = reduceMotion ? 0 : Math.sin(t * 1.1 + it.phase) * .025;
        it.inner.position.y = it.lift + bob * (on ? 1.6 : 1);
        const spin = on ? t * .55 : -.25 + i * .12 + Math.sin(t * .4 + it.phase) * .12;
        it.inner.rotation.y += (spin - it.inner.rotation.y) * (on ? .06 : .03);
        const s = 1 + it.lift * .25;
        it.inner.scale.setScalar(s);
        it.shadow.material.opacity = .85 - it.lift * 1.2;
        it.shadow.scale.setScalar(1 + it.lift * .6);
      });

      // tone colour follows the verdict
      toneCol.lerp(TONE_COL[PRODUCTS[a].tone], .08);
      scanMat.color.copy(toneCol);
      discMat.color.copy(toneCol);
      glowMat.color.copy(toneCol);
      edgeMat.color.copy(toneCol);

      // glow + scan sweep
      const cur = items[a];
      glow.position.x += (XS[a] - glow.position.x) * k;
      glowMat.opacity = .28 + Math.sin(t * 2) * .05;
      const top = cur.height * cur.inner.scale.x + cur.lift + .1;
      const cyc = (t * .55) % 1;
      scan.position.set(cur.root.position.x, cur.lift + THREE.MathUtils.lerp(top, .05, cyc), 0);
      const fade = Math.sin(cyc * Math.PI);
      scanMat.opacity = fade;
      discMat.opacity = fade * .12;
      scan.scale.setScalar(.8 + cur.inner.scale.x * .2 + (a === 2 ? .15 : 0));

      // dust
      const arr = dustGeo.attributes.position.array;
      if (!reduceMotion) {
        for (let i = 0; i < N; i++) {
          arr[i * 3 + 1] += speed[i] * dt;
          arr[i * 3] += Math.sin(t * .3 + i) * .002;
          if (arr[i * 3 + 1] > 5.5) arr[i * 3 + 1] = -.4;
        }
        dustGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // project the product's box to place the HTML lens and verdict card
      box.setFromObject(cur.inner);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let c = 0; c < 8; c++) {
        v.set(c & 1 ? box.max.x : box.min.x, c & 2 ? box.max.y : box.min.y, c & 4 ? box.max.z : box.min.z).project(camera);
        const px = (v.x * .5 + .5) * W;
        const py = (-v.y * .5 + .5) * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      const pad = 16;
      const tgt = [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
      const kk = scr.init ? .18 : 1;
      scr.x0 += (tgt[0] - scr.x0) * kk; scr.y0 += (tgt[1] - scr.y0) * kk;
      scr.x1 += (tgt[2] - scr.x1) * kk; scr.y1 += (tgt[3] - scr.y1) * kk;
      scr.init = true;

      const lens = lensRef.current;
      const tag = tagRef.current;
      if (lens && tag) {
        lens.style.opacity = 1;
        lens.style.transform = `translate(${scr.x0}px, ${scr.y0}px)`;
        lens.style.width = `${scr.x1 - scr.x0}px`;
        lens.style.height = `${scr.y1 - scr.y0}px`;
        const tw = tag.offsetWidth;
        const th = tag.offsetHeight;
        let lx = scr.x1 + 18;
        let ly = (scr.y0 + scr.y1) / 2 - th / 2;
        if (lx + tw > W - 12) lx = scr.x0 - 18 - tw;
        if (narrow) {
          // phones: the card sits under the shelf, clear of the heading
          lx = Math.min(Math.max((scr.x0 + scr.x1) / 2 - tw / 2, 12), W - tw - 12);
          ly = scr.y1 + 26;
        } else if (lx < 12) {
          lx = Math.min(Math.max((scr.x0 + scr.x1) / 2 - tw / 2, 12), W - tw - 12);
          ly = scr.y0 - th - 14;
        }
        ly = Math.min(Math.max(ly, 12), H - th - 12);
        tag.style.opacity = 1;
        tag.style.transform = `translate(${lx}px, ${ly}px)`;
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      const seen = new Set();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const m = o.material;
        if (m && !seen.has(m)) { seen.add(m); m.map?.dispose(); m.dispose(); }
      });
      mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
      dot.dispose();
      sTex.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section className="shelf3d-wrap" id="lens">
      <div className="shelf3d" style={{ '--tone': TONE[p.tone] }}>
        <div className="shelf3d-head fade">
          <p className="eyebrow">Try the lens</p>
          <h2>Point at anything. <em>Get the truth.</em></h2>
          <p className="hint">Hover or tap a product on the shelf. Verdicts are read against an example Skin Passport.</p>
        </div>

        <div className="shelf3d-stage" ref={stageRef}>
          <canvas ref={canvasRef} role="img" aria-label="A 3D beauty shelf. The ShelfSense lens reads each product and shows a verdict." />
          <div className="lens" ref={lensRef} aria-hidden="true">
            <i /><i /><i /><i />
            <span className="lens-line" />
          </div>
          <div className="tag" ref={tagRef} aria-live="polite">
            <div className="tag-inner" key={active}>
              <div className="tag-head">
                <span className="tag-badge"><i />{p.verdict}</span>
                <span className="tag-score">{p.score}</span>
              </div>
              <p className="tag-name">{p.name}</p>
              <p className="tag-kind">{p.kind}</p>
              <p className="tag-why">{p.why}</p>
              <div className="tag-bar"><span style={{ width: `${p.score}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="shelf3d-picker" role="tablist" aria-label="Products on the shelf">
          {PRODUCTS.map((it, i) => (
            <button key={it.name} role="tab" aria-selected={i === active} className={i === active ? 'on' : ''} onClick={() => api.current.pick(i)}>
              <i style={{ background: TONE[it.tone] }} />{it.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
