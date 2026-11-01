import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { pointer, reduceMotion } from '../lib.js';

// scroll ranges for the story, shared with Story.js
export const SCAN_START = .22;
export const SCAN_END = .5;
export const PROOF_START = .76;

const lathe = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 96);
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 1040;
  c.height = 400;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const draw = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#f7f1ea';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#1a1714';
    g.textAlign = 'center';
    g.font = '500 30px Inter';
    g.letterSpacing = '10px';
    g.fillText('SERUM Nº 10', 520, 120);
    g.letterSpacing = '0px';
    g.font = 'italic 112px "Instrument Serif"';
    g.fillText('Niacinamide', 520, 238);
    g.font = '400 26px Inter';
    g.fillStyle = '#5e5750';
    g.fillText('10% NIACINAMIDE · 1% ZINC · 30 ML', 520, 310);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.ready.then(draw);
  return tex;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(60, 40, 30, .35)');
  grad.addColorStop(1, 'rgba(60, 40, 30, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// a pill-shaped ingredient tag drawn to a canvas, for a sprite that orbits the bottle
function pillTexture(text) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 144;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.shadowColor = 'rgba(60, 40, 30, .18)';
    g.shadowBlur = 16;
    g.shadowOffsetY = 4;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(12, 12, 616, 112, 56);
    g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#e3f1e8';
    g.beginPath();
    g.arc(72, 68, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2e8b57';
    g.font = '600 32px Inter';
    g.textAlign = 'center';
    g.fillText('✓', 72, 80);
    g.fillStyle = '#1a1714';
    g.font = '500 46px Inter';
    g.textAlign = 'left';
    g.fillText(text, 122, 84);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.ready.then(draw);
  return tex;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(.4, 'rgba(255,255,255,.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const TAGS = [['Niacinamide', .75], ['Zinc PCA', .25], ['Panthenol', -.25], ['Fragrance-free', -.75]];

function buildBottle() {
  const bottle = new THREE.Group();

  // amber apothecary glass: reads as glass from reflections alone, so it never depends on what's behind it
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#9a4a22', roughness: .1, metalness: 0, ior: 1.5, specularIntensity: 1,
    clearcoat: 1, clearcoatRoughness: .03, sheen: .4, sheenColor: new THREE.Color('#f0a46b'), envMapIntensity: 1.3,
  });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#cfa46a', metalness: 1, roughness: .24 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#2a2320', roughness: .45, clearcoat: .4 });
  const label = new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: .55 });

  const parts = [
    new THREE.Mesh(lathe([[0, 0], [.5, 0], [.56, .05], [.58, .14], [.58, 1.42], [.54, 1.58], [.26, 1.74], [.23, 1.8], [.23, 1.92], [0, 1.92]]), glass),
  ];
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .36, 64), gold);
  collar.position.y = 2.08;
  const bulb = new THREE.Mesh(lathe([[0, 0], [.22, 0], [.23, .14], [.22, .38], [.16, .52], [0, .56]]), rubber);
  bulb.position.y = 2.26;
  // label wraps the front half of the bottle
  const arc = Math.PI;
  const labelMesh = new THREE.Mesh(new THREE.CylinderGeometry(.585, .585, .7, 96, 1, true, -arc / 2, arc), label);
  labelMesh.position.y = .72;
  parts.push(collar, bulb, labelMesh);
  parts.forEach((p) => { p.position.y -= 1.35; bottle.add(p); });

  return { bottle, materials: [glass, gold, rubber, label] };
}

export default function Bottle({ progress, active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
    camera.position.set(0, .15, 7.2);

    const key = new THREE.DirectionalLight('#fff3ea', 1.6);
    key.position.set(3, 5, 4);
    scene.add(key);

    const { bottle, materials } = buildBottle();
    scene.add(bottle);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.37;
    scene.add(shadow);

    // the scan: a thin ring with a faint plane of light, swept down the bottle
    const scan = new THREE.Group();
    const scanMat = new THREE.MeshBasicMaterial({ color: '#c24e5c', transparent: true });
    const scanPlaneMat = new THREE.MeshBasicMaterial({ color: '#c24e5c', transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.82, .007, 8, 160), scanMat);
    const plane = new THREE.Mesh(new THREE.CircleGeometry(.82, 96), scanPlaneMat);
    ring.rotation.x = plane.rotation.x = Math.PI / 2;
    scan.add(ring, plane);
    scene.add(scan);

    // verified ring at the base once the verdict lands
    const baseMat = new THREE.MeshBasicMaterial({ color: '#2e8b57', transparent: true, opacity: 0 });
    const base = new THREE.Mesh(new THREE.TorusGeometry(.9, .008, 8, 160), baseMat);
    base.rotation.x = Math.PI / 2;
    base.position.y = -1.34;
    scene.add(base);

    // ingredient tags orbit the bottle once the scan line has read them
    const tags = TAGS.map(([text, y], i) => {
      const mat = new THREE.SpriteMaterial({ map: pillTexture(text), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(.98, .22, 1);
      sprite.position.y = y;
      scene.add(sprite);
      return { sprite, mat, y, angle: i * Math.PI / 2, at: (1.05 - y) / 2.25 };
    });

    // fine rose-gold dust drifting around the bottle
    const dot = dotTexture();
    const N = 180;
    const dustPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 1.1 + Math.random() * 1.4;
      const a = Math.random() * Math.PI * 2;
      dustPos[i * 3] = Math.cos(a) * r;
      dustPos[i * 3 + 1] = Math.random() * 3.2 - 1.5;
      dustPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ map: dot, color: '#c24e5c', size: .045, transparent: true, opacity: .5, depthWrite: false, toneMapped: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the whole bottle in frame on narrow canvases
      camera.position.z = camera.aspect < .75 ? 7.2 / (camera.aspect / .75) : 7.2;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const clock = new THREE.Clock();
    const smooth = { p: progress.current, x: 0, y: 0 };
    let raf;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!active.current) return;
      const t = clock.getElapsedTime();
      smooth.p += (progress.current - smooth.p) * (reduceMotion ? 1 : .08);
      smooth.x += (pointer.x - smooth.x) * .04;
      smooth.y += (pointer.y - smooth.y) * .04;
      const p = smooth.p;

      bottle.rotation.y = -.35 + p * Math.PI * 1.35 + (reduceMotion ? 0 : Math.sin(t * .4) * .05) + smooth.x * .12;
      bottle.rotation.x = smooth.y * .04;

      const s = clamp01((p - SCAN_START) / (SCAN_END - SCAN_START - .04));
      const vis = Math.sin(s * Math.PI);
      scan.position.y = THREE.MathUtils.lerp(1.05, -1.2, s);
      scan.visible = vis > .01;
      scanMat.opacity = vis;
      scanPlaneMat.opacity = vis * .07;

      baseMat.opacity = clamp01((p - SCAN_END) / .08) * .9;

      const out = 1 - clamp01((p - (PROOF_START - .06)) / .06);
      tags.forEach((tg, i) => {
        const a = tg.angle + (reduceMotion ? 0 : t * .45) + p * 2;
        tg.sprite.position.set(Math.cos(a) * .86, tg.y + (reduceMotion ? 0 : Math.sin(t * 1.3 + i) * .04), Math.sin(a) * 1.25);
        tg.mat.opacity = clamp01((s - tg.at) * 8) * out;
        tg.sprite.visible = tg.mat.opacity > .01;
      });
      dust.rotation.y = t * .04 + p * 1.2;
      dust.position.y = reduceMotion ? 0 : Math.sin(t * .5) * .05;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => o.geometry?.dispose());
      dot.dispose();
      [...materials, ...tags.map((tg) => tg.mat), dustMat, scanMat, scanPlaneMat, baseMat, shadow.material].forEach((m) => { m.map?.dispose(); m.dispose(); });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} role="img" aria-label="A serum bottle being scanned by ShelfSense" />;
}
