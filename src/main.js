import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);
scene.fog = new THREE.FogExp2(0x04050a, 0.0055);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2.5, 13);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.15, 0.6, 0.1);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.AmbientLight(0x334466, 2.5));
const sun = new THREE.DirectionalLight(0x88ccff, 1.2);
sun.position.set(5, 10, 6);
scene.add(sun);

// ---------- 工具 ----------
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const tmpV = new THREE.Vector3();

function neon(color, ei = 1.1, flat = true) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: ei, metalness: 0.3, roughness: 0.35, flatShading: flat });
}
function add(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}

// ---------- 星空 ----------
const starGeo = new THREE.BufferGeometry();
const starN = 1800;
const sp = new Float32Array(starN * 3);
const sc = new Float32Array(starN * 3);
for (let i = 0; i < starN; i++) {
  sp[i*3] = (Math.random() - 0.5) * 400;
  sp[i*3+1] = (Math.random() - 0.5) * 280;
  sp[i*3+2] = (Math.random() - 1) * 500 - 30;
  const t = Math.random();
  sc[i*3] = 0.5 + t * 0.5; sc[i*3+1] = 0.6 + t * 0.4; sc[i*3+2] = 1;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
scene.add(stars);

// 星尘流
const dustGeo = new THREE.BufferGeometry();
const dustN = 700;
const dp = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) {
  dp[i*3] = (Math.random() - 0.5) * 130;
  dp[i*3+1] = (Math.random() - 0.5) * 80;
  dp[i*3+2] = (Math.random() - 0.5) * 150;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.9, color: 0x5599ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// 网格地平线
const grid = new THREE.GridHelper(260, 44, 0x2266ff, 0x113366);
grid.position.y = -20;
grid.material.transparent = true; grid.material.opacity = 0.3;
scene.add(grid);

// ---------- 粒子爆炸池 ----------
const boomGeo = new THREE.BufferGeometry();
const boomCap = 3500;
const bp = new Float32Array(boomCap * 3);
const bc = new Float32Array(boomCap * 3);
const bsz = new Float32Array(boomCap);
for (let i = 0; i < boomCap; i++) { bp[i*3]=999; bp[i*3+1]=999; bp[i*3+2]=999; bc[i*3]=1; bc[i*3+1]=0.7; bc[i*3+2]=0.3; bsz[i]=1; }
boomGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
boomGeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
boomGeo.setAttribute('size', new THREE.BufferAttribute(bsz, 1));
const booms = new THREE.Points(boomGeo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
booms.frustumCulled = false;
scene.add(booms);

const boomPool = [];
for (let i = 0; i < boomCap; i++) boomPool.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color(0xffffff) });
let boomCursor = 0;

function spawnBoom(x, y, z, count, color, speed = 16, life = 0.6) {
  const col = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const b = boomPool[boomCursor]; boomCursor = (boomCursor + 1) % boomCap;
    b.p.set(x, y, z);
    b.v.set(rand(-1,1), rand(-1,1), rand(-1,1)).normalize().multiplyScalar(rand(3, speed));
    b.life = b.max = life * rand(0.6, 1.1);
    b.c.copy(col);
  }
}

function updateBooms(dt) {
  for (let i = 0; i < boomCap; i++) {
    const b = boomPool[i];
    if (b.life > 0) {
      b.life -= dt;
      b.p.addScaledVector(b.v, dt);
      b.v.multiplyScalar(0.96);
      bp[i*3] = b.p.x; bp[i*3+1] = b.p.y; bp[i*3+2] = b.p.z;
      const k = Math.max(0, b.life / b.max);
      bc[i*3] = b.c.r; bc[i*3+1] = b.c.g; bc[i*3+2] = b.c.b;
      bsz[i] = 0.4 + k * 0.8;
    } else {
      bp[i*3] = 999; bp[i*3+1] = 999; bp[i*3+2] = 999;
    }
  }
  boomGeo.attributes.position.needsUpdate = true;
  boomGeo.attributes.color.needsUpdate = true;
  boomGeo.attributes.size.needsUpdate = true;
}

// ---------- 玩家机体 ----------
function buildPlane(color, accent, scale) {
  const g = new THREE.Group();
  const mB = neon(color, 1.6);
  const mA = neon(accent, 3.2);
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 1.9, 8), mB);
  fus.rotation.x = Math.PI / 2; fus.position.z = 0.1; g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), mB);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -1.15; g.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mA);
  canopy.position.set(0, 0.16, -0.55); g.add(canopy);
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.85), mB);
    w.position.set(side * 0.95, 0, 0.15); w.rotation.y = -side * 0.28; g.add(w);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.1), mA);
    ws.position.set(side * 1.02, 0.05, -0.12); ws.rotation.y = -side * 0.28; g.add(ws);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), mB);
    t.position.set(side * 0.5, 0, 0.95); t.rotation.y = -side * 0.3; g.add(t);
    const ts = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.08), mA);
    ts.position.set(side * 0.55, 0.04, 0.75); ts.rotation.y = -side * 0.3; g.add(ts);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.65, 0.5), mB);
  fin.position.set(0, 0.4, 0.95); g.add(fin);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.4), mA);
  finTip.position.set(0, 0.72, 0.95); g.add(finTip);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.7, 8), mB);
  eng.rotation.x = Math.PI / 2; eng.position.z = 1.15; g.add(eng);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), add(0xff8844, 0.95));
  glow.position.z = 1.6; g.add(glow);
  g.scale.setScalar(scale);
  return g;
}
const player = buildPlane(0x1e3f9e, 0x55ddff, 1.15);
scene.add(player);
const playerPos = new THREE.Vector3(0, 0, 0);
const playerState = {
  hp: 100, maxHp: 100, speed: 17, fireRate: 7, dmg: 14,
  parts: [], invuln: 0, dashT: 0, dashCd: 0,
  combo: 0, comboT: 0, magnet: 8, wingmen: 0,
  crit: 0.05, critMult: 2.5, pierce: 0, twin: 0,
  dashVec: new THREE.Vector3(0, 0, 1)
};

// ---------- 子弹 ----------
const bullets = [];
function fireBullet(from, dir, dmg, color, size = 0.35, pierce = 0) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 8, 8), add(color, 1));
  g.add(core);
  const trail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, size * 0.5, size * 4.5), add(color, 0.6));
  trail.position.z = -size * 2.2;
  g.add(trail);
  g.position.copy(from);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  scene.add(g);
  bullets.push({ m: g, v: dir.clone(), dmg, pierce, hit: new Set(), life: 3 });
}

// 自动开火：找最近敌人
function nearestEnemy(from) {
  let best = null, bd = Infinity;
  for (const e of enemies) {
    const d = from.distanceToSquared(e.position);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- 敌人 ----------
const enemies = [];
function spawnEnemy(kind) {
  const g = new THREE.Group();
  let hp;
  if (kind === 0) {
    hp = 40;
    g.add(buildPlane(0x7a1420, 0xff4433, 1.0));
  } else if (kind === 1) {
    hp = 80;
    g.add(buildPlane(0x7a3d00, 0xffaa22, 1.05));
  } else {
    hp = 130;
    g.add(buildPlane(0x4a1478, 0xcc66ff, 1.5));
  }
  g.rotation.y = Math.PI;
  g.traverse(o => { if (o.isMesh && o.material && o.material.emissiveIntensity !== undefined) o.userData.baseEI = o.material.emissiveIntensity; });
  const x = rand(-15, 15), y = rand(-9, 9);
  g.position.set(x, y, -70);
  g.userData = { hp, maxHp: hp, kind, shootT: rand(1.6, 3.2), type: 'enemy', moveT: 0, banT: rand(0, 6), flash: 0 };
  scene.add(g);
  enemies.push(g);
  return g;
}

// ---------- BOSS ----------
let boss = null;
function spawnBoss(layer) {
  const g = new THREE.Group();
  const s = 1 + layer * 0.2;
  const baseHp = 500 * (1 + (layer - 1) * 0.85);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3 * s, 1), neon(0xff2266, 1.4));
  g.add(core);
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(4.2 * s, 0.15, 10, 40), add(0xff4488, 1));
  g.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(5.4 * s, 0.12, 10, 40), add(0xff2266, 0.8));
  r2.rotation.x = Math.PI / 2.4; r2.rotation.y = 0.6; g.add(r2);
  const parts = [];
  for (let k = 0; k < 4; k++) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 2.4 * s, 4), neon(0xffffff, 1.1));
    p.position.set(k % 2 === 0 ? -3.4 * s : 3.4 * s, k < 2 ? -2.4 * s : 2.4 * s, 0);
    p.rotation.z = k % 2 === 0 ? Math.PI / 4 : -Math.PI / 4;
    g.add(p);
    parts.push({ mesh: p, hp: baseHp * 0.3, alive: true });
  }
  g.position.set(0, 0, -120);
  g.userData = { hp: baseHp, maxHp: baseHp, layer, parts, shootT: 1.6, phase: 0 };
  scene.add(g);
  boss = g;
  return g;
}

// ---------- 部件系统 (Roguelike) ----------
const PART_TYPES = [
  { id: 'turret',  ico: 'cannon', name: 'Cannon Core',  desc: 'DMG +45% | Rate +25%',  apply: (p) => { p.dmg *= 1.45; p.fireRate *= 1.25; } },
  { id: 'wingman', ico: 'dron',   name: 'Wingman Wing', desc: 'Summon 1 auto-firing wingman', apply: (p) => { p.wingmen += 1; rebuildWingmen(); } },
  { id: 'engine', ico: 'speed',   name: 'Vector Engine', desc: 'Speed +35% | Dash CD -30%', apply: (p) => { p.speed *= 1.35; } },
  { id: 'shield', ico: 'shield',  name: 'Shield Core',  desc: 'Max HP +40 | Regen +2/s', apply: (p) => { p.maxHp += 40; p.hp = Math.min(p.hp + 45, p.maxHp); p.hpRegen = (p.hpRegen || 0) + 2; } },
  { id: 'magnet', ico: 'magnet',  name: 'Magnet Field', desc: 'Pull all drops to you', apply: (p) => { p.magnet += 999; } },
  { id: 'crit',   ico: 'laser',   name: 'Crit Laser',   desc: 'Crit +18% | Mult +100% | Pierce +1', apply: (p) => { p.crit += 0.18; p.critMult += 1; p.pierce += 1; } },
  { id: 'twin',   ico: 'twin',    name: 'Twin Barrel',  desc: '+1 bullet per shot', apply: (p) => { p.twin += 1; } },
];
const PART_ICON = { cannon: 'K', dron: 'D', speed: '>>', shield: 'S', magnet: 'M', laser: 'L', twin: 'II' };

const wingmen = [];
function rebuildWingmen() {
  wingmen.forEach(w => scene.remove(w.g));
  wingmen.length = 0;
  for (let i = 0; i < playerState.wingmen; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), neon(0x44ffaa, 1.4));
    g.add(b);
    scene.add(g);
    wingmen.push({ g, ang: (i / Math.max(1, playerState.wingmen)) * Math.PI * 2, fireT: 0 });
  }
}

// 经验/拾取光球
const drops = [];
function spawnDrop(x, y, z, color, big) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(big ? 0.8 : 0.45, 0), add(color, 1));
  m.position.set(x, y, z);
  scene.add(m);
  drops.push({ m, big: !!big, t: 0, life: 30 });
}

function showPick() {
  const pool = [...PART_TYPES];
  const opts = [];
  const used = new Set();
  while (opts.length < 3 && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    const it = pool[i]; pool.splice(i, 1);
    if (!used.has(it.id)) { used.add(it.id); opts.push(it); }
  }
  const cards = document.getElementById('pickCards');
  cards.innerHTML = '';
  state.playing = false;
  document.getElementById('pick').classList.remove('hidden');
  opts.forEach(p => {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = '<div class="ico">' + PART_ICON[p.ico] + '</div><div class="nm">' + p.name + '</div><div class="desc">' + p.desc + '</div>';
    c.onclick = () => {
      playerState.parts.push(p);
      p.apply(playerState);
      document.getElementById('pick').classList.add('hidden');
      updatePartsUI();
      state.playing = true;
      state.picking = false;
      spawnBoom(playerPos.x, playerPos.y, 0, 120, 0x66ccff, 26, 0.7);
      cameraShake(0.5);
      nextLayer();
    };
    cards.appendChild(c);
  });
}

// ---------- 游戏状态 ----------
const state = { playing: false, over: false, layer: 1, killCount: 0, time: 0, slow: 0, picking: false };
let shake = 0;
const input = { mx: 0, my: 0, keys: new Set() };
let best = parseInt(localStorage.getItem('snpb_best') || '0', 10);
if (best > 0) document.getElementById('bestline').textContent = 'BEST: Layer ' + best;

function cameraShake(amt) { shake = Math.max(shake, amt); }
const hitFlash = document.createElement('div');
hitFlash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:9;mix-blend-mode:screen';
document.body.appendChild(hitFlash);
function flash(a) {
  hitFlash.style.transition = 'none'; hitFlash.style.opacity = a;
  requestAnimationFrame(() => { hitFlash.style.transition = 'opacity 0.12s'; hitFlash.style.opacity = 0; });
}
function hitstop(t) { state.slow = Math.max(state.slow, t); }

// 伤害数字
const dmgEls = [];
function dmgText(wx, wy, wz, str, color) {
  const d = document.createElement('div');
  d.className = 'dmg';
  d.textContent = str;
  d.style.color = color || '#fff';
  document.getElementById('hud').appendChild(d);
  dmgEls.push({ el: d, p: new THREE.Vector3(wx, wy, wz), t: 0 });
}

// HUD
function updateHUD() {
  document.getElementById('hpbar').style.width = Math.max(0, playerState.hp / playerState.maxHp * 100) + '%';
  document.getElementById('hpbar').style.background =
    playerState.hp / playerState.maxHp > 0.35 ? 'linear-gradient(90deg,#3f6,#8f6)' : 'linear-gradient(90deg,#f66,#faa)';
  const combo = document.getElementById('combo');
  combo.textContent = playerState.combo > 1 ? playerState.combo + 'x' : '';
  combo.style.opacity = playerState.combo > 1 ? 1 : 0.25;
  document.getElementById('layer').textContent = 'Layer ' + state.layer;
  const centerEl = document.getElementById('center');
  if (!state.playing) { centerEl.textContent = ''; }
  else if (boss) centerEl.textContent = 'BOSS ' + Math.max(0, Math.ceil(boss.userData.hp / boss.userData.maxHp * 100)) + '%  |  集火白色发光部件!';
  else centerEl.textContent = '敌机剩余 ' + enemies.length + ' 架  |  全灭后 BOSS 登场';
}
function updatePartsUI() {
  const box = document.getElementById('parts');
  box.innerHTML = '';
  playerState.parts.forEach(p => {
    const s = document.createElement('div');
    s.className = 'slot'; s.title = p.name; s.textContent = PART_ICON[p.ico];
    box.appendChild(s);
  });
}

// 血条(敌机)
const bossBar = document.createElement('div');
bossBar.id = 'bossbar';
bossBar.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);width:46vw;height:14px;border:1px solid #a45;border-radius:8px;background:rgba(0,0,0,.4);overflow:hidden;z-index:10;display:none';
bossBar.innerHTML = '<div id="bossfill" style="height:100%;width:0%;background:linear-gradient(90deg,#f55,#f88);box-shadow:0 0 12px #f55;transition:width .15s"></div>';
document.body.appendChild(bossBar);

// ---------- 层管理 ----------
let waveCount = 0;      // 已刷的小兵波数
let spawnTimer = 0;
let layerBossSpawned = false;
let layerDone = false;

function clearEnemies() {
  enemies.forEach(e => scene.remove(e));
  enemies.length = 0;
  if (boss) { scene.remove(boss); boss = null; }
  bullets.forEach(b => scene.remove(b.m));
  bullets.length = 0;
  drops.forEach(d => scene.remove(d.m));
  drops.length = 0;
  enemyBullets.forEach(b => scene.remove(b.m));
  enemyBullets.length = 0;
}

function startLayer() {
  state.picking = false;
  waveCount = 0;
  spawnTimer = 1.2;
  layerBossSpawned = false;
  layerDone = false;
  bossBar.style.display = 'none';
}

// 每层需要的波数
function wavesNeeded(layer) { return 2 + Math.min(4, layer); }

// 波次刷怪
function runWaves(dt) {
  if (layerDone) return;
  spawnTimer -= dt;
  const need = wavesNeeded(state.layer);
  if (waveCount < need) {
    if (spawnTimer <= 0) {
      spawnTimer = 3.2 - Math.min(1.6, state.layer * 0.2);
      const n = 2 + Math.min(6, state.layer + waveCount);
      for (let i = 0; i < n; i++) {
        spawnEnemy(Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? 1 : 2));
      }
      waveCount++;
    }
  } else if (enemies.length === 0 && !layerBossSpawned) {
    // 小兵清完,刷BOSS
    layerBossSpawned = true;
    spawnBoss(state.layer);
    bossBar.style.display = 'block';
  }
  // BOSS死亡判定在碰撞里处理
}

// ---------- 战斗更新 ----------
const tmpDir = new THREE.Vector3();
const tmpN = new THREE.Vector3();
const enemyBullets = [];
const ebt = [];

function enemyBullet(x, y, z, vx, vy, vz, dmg) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), add(0xffee99, 1));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 10), add(0xff4411, 0.35));
  g.add(halo);
  const trail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.2), add(0xff5522, 0.85));
  trail.position.z = -1.1;
  g.add(trail);
  g.position.set(x, y, z);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(vx, vy, vz).normalize());
  scene.add(g);
  enemyBullets.push({ m: g, v: new THREE.Vector3(vx, vy, vz), dmg, life: 6 });
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const ud = e.userData;
    if (ud.flash !== undefined) {
      if (ud.flash > 0) ud.flash -= dt;
      const k = ud.flash > 0 ? 2.4 : 1.0;
      e.traverse(o => { if (o.isMesh && o.material && o.userData.baseEI !== undefined) o.material.emissiveIntensity = o.userData.baseEI * k; });
    }
    // 向玩家逼近
    e.position.z += dt * 8;
    ud.moveT -= dt;
    if (ud.moveT <= 0) {
      ud.moveT = rand(0.8, 1.6);
      tmpDir.set(playerPos.x - e.position.x, playerPos.y - e.position.y, 0).normalize();
      ud.dx = tmpDir.x + rand(-1.5, 1.5);
      ud.dy = tmpDir.y + rand(-1.5, 1.5);
    }
    if (ud.dx !== undefined) {
      e.position.x += ud.dx * dt * 3;
      e.position.y += ud.dy * dt * 3;
    }
    ud.banT += dt;
    e.rotation.z = Math.sin(ud.banT * 1.7) * 0.35;
    e.rotation.x = Math.cos(ud.banT * 1.3) * 0.15;
    // 开火
    ud.shootT -= dt;
    if (ud.shootT <= 0 && e.position.z > -70) {
      ud.shootT = rand(1.5, 2.6);
      tmpDir.set(playerPos.x - e.position.x, playerPos.y - e.position.y, 0).normalize();
      enemyBullet(e.position.x, e.position.y, e.position.z, tmpDir.x * 14, tmpDir.y * 14, 14, 10);
    }
    // 出界销毁
    if (e.position.z > 15) { scene.remove(e); enemies.splice(i, 1); continue; }
    // 与玩家碰撞
    if (playerState.invuln <= 0 && Math.abs(e.position.z) < 2.5) {
      const d = Math.hypot(e.position.x - playerPos.x, e.position.y - playerPos.y);
      if (d < 1.5) {
        playerState.invuln = 1.0;
        damagePlayer(20);
        spawnBoom(e.position.x, e.position.y, e.position.z, 60, 0xff8844, 16, 0.6);
        scene.remove(e); enemies.splice(i, 1);
        cameraShake(0.5); hitstop(0.1);
        continue;
      }
    }
  }
}

let shootT = 0;

// ---------- 玩家开火(自动瞄准最近目标) ----------
function playerFire(dt) {
  shootT -= dt;
  if (shootT > 0) return;
  shootT = 1 / playerState.fireRate;
  let target = null;
  if (boss && boss.userData.parts.some(p => p.alive)) target = boss;
  else target = nearestEnemy(playerPos) || boss;
  if (!target) return;
  tmpDir.copy(target.position).sub(playerPos).normalize();
  const shots = 1 + playerState.twin;
  for (let i = 0; i < shots; i++) {
    const spread = (i - (shots - 1) / 2) * 0.12;
    tmpN.copy(tmpDir);
    const x = tmpN.x + spread;
    tmpN.x = x; tmpN.normalize();
    fireBullet(playerPos.clone().add(new THREE.Vector3(0, 0, -1.6)), tmpN, playerState.dmg, 0xaaffff, 0.4, playerState.pierce);
  }
  muzzle();
}
let muzzleT = 0;
function muzzle() { muzzleT = 0.05; }

function damagePlayer(d) {
  if (playerState.hp <= 0) return;
  playerState.hp -= d;
  flash(0.35);
  playerState.combo = 0;
  cameraShake(0.4);
  if (playerState.hp <= 0) { playerState.hp = 0; gameOver(); }
}

// 击杀奖励
function killEnemy(e, idx) {
  state.killCount++;
  playerState.combo++; playerState.comboT = 3;
  spawnBoom(e.position.x, e.position.y, e.position.z, 70, 0xffaa33, 16, 0.7);
  spawnBoom(e.position.x, e.position.y, e.position.z, 30, 0xffffff, 26, 0.4);
  spawnDrop(e.position.x, e.position.y, e.position.z, 0x44ffaa, false);
  if (Math.random() < 0.35) spawnDrop(e.position.x + rand(-1,1), e.position.y, e.position.z, 0xffdd44, true);
  cameraShake(0.18);
  hitstop(0.04);
  scene.remove(e);
  enemies.splice(idx, 1);
}

// ---------- 子弹飞行与碰撞 ----------
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.m.position.addScaledVector(b.v, dt * 90);
    if (b.life <= 0 || Math.abs(b.m.position.z) > 220) {
      scene.remove(b.m); bullets.splice(i, 1); continue;
    }
    let consumed = false;
    for (let j = enemies.length - 1; j >= 0 && !consumed; j--) {
      const e = enemies[j];
      if (b.m.position.distanceTo(e.position) < 1.7) {
        const isCrit = Math.random() < playerState.crit;
        const dmg = isCrit ? Math.round(b.dmg * playerState.critMult) : b.dmg;
        e.userData.hp -= dmg;
        e.userData.flash = 0.09;
        dmgText(e.position.x, e.position.y + 1.2, e.position.z, dmg, isCrit ? '#ff4488' : '#9ef');
        spawnBoom(b.m.position.x, b.m.position.y, b.m.position.z, 10, 0x88eeff, 8, 0.3);
        if (e.userData.hp <= 0) killEnemy(e, j);
        if (b.pierce <= 0) consumed = true;
        else b.pierce--;
      }
    }
    // 打BOSS部件(优先)与本体
    if (!consumed && boss) {
      const bp = boss.userData.parts;
      let hitPart = null;
      for (const p of bp) if (p.alive && b.m.position.distanceTo(p.mesh.position) < 2.6) { hitPart = p; break; }
      const hitCore = b.m.position.distanceTo(boss.position) < 4.0;
      if (hitPart || hitCore) {
        const isCrit = Math.random() < playerState.crit;
        const dmg = isCrit ? Math.round(b.dmg * playerState.critMult) : b.dmg;
        if (hitPart) {
          hitPart.hp -= dmg;
          if (hitPart.hp <= 0) {
            hitPart.alive = false;
            hitPart.mesh.visible = false;
            spawnBoom(hitPart.mesh.position.x, hitPart.mesh.position.y, hitPart.mesh.position.z, 140, 0xffffff, 24, 0.9);
            spawnBoom(hitPart.mesh.position.x, hitPart.mesh.position.y, hitPart.mesh.position.z, 80, 0xff4488, 16, 0.7);
            boss.userData.hp -= 90;
            cameraShake(0.5); hitstop(0.12); flash(0.25);
            dmgText(boss.position.x, boss.position.y + 5, boss.position.z, 'PART OFF!', '#ffdd44');
          }
        } else {
          boss.userData.hp -= dmg;
          dmgText(boss.position.x, boss.position.y + 5, boss.position.z, dmg, isCrit ? '#ff4488' : '#9ef');
        }
        spawnBoom(b.m.position.x, b.m.position.y, b.m.position.z, 12, 0xffaa66, 10, 0.3);
        bossBarFill();
        if (boss.userData.hp <= 0) { killBoss(); consumed = true; }
        if (b.pierce <= 0) consumed = true; else b.pierce--;
      }
    }
    if (consumed) { scene.remove(b.m); bullets.splice(i, 1); }
  }
}

function bossBarFill() {
  if (!boss) return;
  const fill = document.getElementById('bossfill');
  if (fill) fill.style.width = Math.max(0, boss.userData.hp / boss.userData.maxHp * 100) + '%';
}

// ---------- 敌弹 ----------
function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.life -= dt;
    b.m.position.addScaledVector(b.v, dt);
    if (b.life <= 0 || b.m.position.z > 15) { scene.remove(b.m); enemyBullets.splice(i, 1); continue; }
    if (b.m.position.distanceTo(playerPos) < 1.5) {
      scene.remove(b.m); enemyBullets.splice(i, 1);
      if (playerState.invuln <= 0) damagePlayer(b.dmg);
    }
  }
}

// ---------- BOSS 行为 ----------
function updateBoss(dt) {
  if (!boss) return;
  const ud = boss.userData;
  // 入场与漂移
  if (boss.position.z < -26) boss.position.z += dt * 22;
  else {
    ud.phase += dt;
    boss.position.x = Math.sin(ud.phase * 0.6) * 9;
    boss.position.y = Math.cos(ud.phase * 0.4) * 4.5;
    boss.rotation.z += dt * 0.3;
    // 扇形弹幕
    ud.shootT -= dt;
    if (ud.shootT <= 0) {
      ud.shootT = Math.max(0.9, 2.2 - ud.layer * 0.15);
      const n = 7 + ud.layer;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ud.phase;
        enemyBullet(boss.position.x, boss.position.y, boss.position.z + 4,
          Math.cos(a) * 15, Math.sin(a) * 15, 17, 12);
      }
      cameraShake(0.12);
    }
  }
  if (playerState.invuln <= 0 &&
      boss.position.distanceTo(playerPos) < 7) {
    playerState.invuln = 1.2;
    damagePlayer(35);
  }
}

function killBoss() {
  layerDone = true;
  const bp = boss.userData.parts;
  // 大爆炸连锁
  const px = boss.position.x, py = boss.position.y, pz = boss.position.z;
  let n = 0;
  const boomSeq = setInterval(() => {
    spawnBoom(px + rand(-6, 6), py + rand(-6, 6), pz + rand(-3, 3), 90, n % 2 ? 0xff4488 : 0xffffff, 22, 0.9);
    cameraShake(0.55);
    if (++n > 6) {
      clearInterval(boomSeq);
      scene.remove(boss); boss = null;
      bossBar.style.display = 'none';
      hitslow(0.9);
      // 30秒后弹出选零件
      setTimeout(() => { state.picking = true; showPick(); }, 900);
    }
  }, 140);
}

function hitslow(t) { state.slow = Math.max(state.slow, t); flash(0.3); }

// ---------- 掉落拾取 ----------
function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.t += dt;
    d.life -= dt;
    d.m.rotation.x += dt * 3; d.m.rotation.y += dt * 2;
    const dist = d.m.position.distanceTo(playerPos);
    if (dist < playerState.magnet) {
      tmpDir.copy(playerPos).sub(d.m.position).normalize();
      d.m.position.addScaledVector(tmpDir, dt * Math.max(30, 60 / Math.max(1, dist)) * 1.4);
    }
    if (dist < 1.6) {
      scene.remove(d.m); drops.splice(i, 1);
      if (d.big) { playerState.hp = Math.min(playerState.hp + 15, playerState.maxHp); spawnBoom(playerPos.x, playerPos.y, 0, 24, 0x44ffaa, 10, 0.4); }
      else playerState.magnetPick = true;
      continue;
    }
    if (d.life <= 0) { scene.remove(d.m); drops.splice(i, 1); }
  }
}

// ---------- 玩家移动 ----------
function updatePlayer(dt) {
  const dts = dt;
  const keys = input.keys;
  let ax = 0, ay = 0;
  if (keys.has('a') || keys.has('arrowleft')) ax -= 1;
  if (keys.has('d') || keys.has('arrowright')) ax += 1;
  if (keys.has('w') || keys.has('arrowup')) ay += 1;
  if (keys.has('s') || keys.has('arrowdown')) ay -= 1;
  playerPos.x += ax * playerState.speed * dts;
  playerPos.y += ay * playerState.speed * dts;
  // 冲刺
  if (playerState.dashCd > 0) playerState.dashCd -= dt;
  if (input.keys.has(' ') && playerState.dashCd <= 0) {
    playerState.dashCd = 2.2;
    playerState.invuln = 0.5;
    let dx = ax, dy = ay;
    if (dx === 0 && dy === 0) dx = Math.random() < 0.5 ? 1 : -1;
    playerPos.x += dx * 7; playerPos.y += dy * 7;
    spawnBoom(playerPos.x, playerPos.y, 1, 40, 0x66ddff, 14, 0.5);
    flash(0.25); cameraShake(0.25);
    playerPos.x = Math.max(-17, Math.min(17, playerPos.x));
    playerPos.y = Math.max(-11, Math.min(11, playerPos.y));
  }
  player.position.copy(playerPos);
  // 倾侧
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -ax * 0.5, Math.min(1, dts * 8));
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, ay * 0.3, Math.min(1, dts * 8));
  if (playerState.invuln > 0) playerState.invuln -= dt;
  // 回血
  if (playerState.hpRegen) playerState.hp = Math.min(playerState.maxHp, playerState.hp + playerState.hpRegen * dt);
}

// ---------- 僚机 ----------
function updateWingmen(dt) {
  wingmen.forEach((w, i) => {
    w.ang += dt * (1.2 + i * 0.1);
    const x = playerPos.x + Math.cos(w.ang) * 3.4;
    const y = playerPos.y + Math.sin(w.ang) * 2.2;
    w.g.position.set(x, y, 0.4);
    w.fireT -= dt;
    if (w.fireT <= 0 && (enemies.length > 0 || boss)) {
      w.fireT = 0.55;
      let target = boss && boss.position.z > -60 ? boss : nearestEnemy(w.g.position);
      if (target) {
        tmpDir.copy(target.position).sub(w.g.position).normalize();
        fireBullet(w.g.position.clone(), tmpDir, playerState.dmg * 0.5, 0x66ffbb, 0.3, playerState.pierce);
      }
    }
  });
}

// ---------- 伤害数字与提示上屏 ----------
const proj = new THREE.Vector3();
function updateDomFx(dt) {
  for (let i = dmgEls.length - 1; i >= 0; i--) {
    const d = dmgEls[i];
    d.t += dt;
    if (d.t > 0.8) { d.el.remove(); dmgEls.splice(i, 1); continue; }
    proj.copy(d.p);
    proj.y += d.t * 3;
    proj.project(camera);
    d.el.style.left = (proj.x * 0.5 + 0.5) * window.innerWidth + 'px';
    d.el.style.top = (-proj.y * 0.5 + 0.5) * window.innerHeight + 'px';
    d.el.style.opacity = 1 - d.t / 0.8;
  }
}

// ---------- 主更新 ----------
function update(dt) {
  state.time += dt;
  if (state.slow > 0) state.slow -= dt;
  const dts = state.slow > 0 ? dt * 0.22 : dt;

  // 场景流动(穿行感)
  stars.position.z += dts * 8; if (stars.position.z > 40) stars.position.z -= 90;
  dust.position.z += dts * 34; if (dust.position.z > 40) dust.position.z -= 120;
  grid.position.z += dts * 7; if (grid.position.z > 20) grid.position.z -= 40;

  if (state.playing) {
    runWaves(dts);
    updatePlayer(dts);
    playerFire(dts);
    updateWingmen(dts);
    updateEnemies(dts);
    updateBullets(dts);
    updateEnemyBullets(dts);
    updateBoss(dts);
    updateDrops(dts);
    updateDomFx(dts);
    // 连击计时
    if (playerState.comboT > 0) { playerState.comboT -= dt; if (playerState.comboT <= 0) playerState.combo = 0; }
    updateHUD();
  }

  // 相机跟随 + 震动
  shake *= Math.pow(0.001, dt);
  // chase camera: locked behind the ship, facing forward
  const camTgtX = playerPos.x + rand(-1, 1) * shake * 0.7;
  const camTgtY = playerPos.y + 3.2 + rand(-1, 1) * shake * 0.7;
  const camTgtZ = 13.5 + (state.slow > 0 ? 3 : 0);
  camera.position.x += (camTgtX - camera.position.x) * Math.min(1, dt * 7);
  camera.position.y += (camTgtY - camera.position.y) * Math.min(1, dt * 7);
  camera.position.z += (camTgtZ - camera.position.z) * Math.min(1, dt * 7);
  camera.lookAt(playerPos.x, playerPos.y + 0.6, -60);

  updateBooms(dts);
}

// ---------- 渲染循环 ----------
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  update(dt);
  composer.render();
}
tick();

// ---------- 输入 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keydown', (e) => { input.keys.add(e.key.toLowerCase()); if (e.key === ' ') e.preventDefault(); });
window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));

// ---------- 开始/结束 ----------
function startGame() {
  clearEnemies();
  playerState.hp = playerState.maxHp = 100;
  playerState.speed = 17; playerState.fireRate = 7; playerState.dmg = 14;
  playerState.parts.length = 0;
  playerState.crit = 0.05; playerState.critMult = 2.5; playerState.pierce = 0;
  playerState.twin = 0; playerState.wingmen = 0; playerState.magnet = 8;
  playerState.hpRegen = 0; playerState.combo = 0; playerState.invuln = 1;
  playerPos.set(0, 0, 0);
  rebuildWingmen();
  state.layer = 1; state.killCount = 0; state.over = false; state.picking = false;
  state.playing = true;
  shootT = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updatePartsUI();
  startLayer();
}
function nextLayer() {
  state.layer++;
  clearEnemies();
  startLayer();
}
function gameOver() {
  state.playing = false; state.over = true;
  clearEnemies();
  spawnBoom(playerPos.x, playerPos.y, 0, 200, 0x66ddff, 30, 1.0);
  spawnBoom(playerPos.x, playerPos.y, 0, 120, 0xff4488, 20, 0.8);
  cameraShake(1); hitstop(1.2);
  if (state.layer > best) {
    best = state.layer;
    localStorage.setItem('snpb_best', String(best));
  }
  document.getElementById('stats').innerHTML =
    'Layer <b>' + state.layer + '</b><br>Kills <b>' + state.killCount + '</b><br>Parts <b>' + playerState.parts.length + '</b>';
  document.getElementById('overbest').textContent = 'BEST: Layer ' + best;
  setTimeout(() => {
    document.getElementById('over').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
  }, 700);
}
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
