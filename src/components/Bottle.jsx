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

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => o.geometry?.dispose());
      [...materials, scanMat, scanPlaneMat, baseMat, shadow.material].forEach((m) => { m.map?.dispose(); m.dispose(); });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} role="img" aria-label="A serum bottle being scanned by ShelfSense" />;
}
