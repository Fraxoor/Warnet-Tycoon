import * as THREE from 'three';

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createKeramikFloorTexture(darkMode: boolean): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = darkMode ? '#1e2430' : '#d8cfc0';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle tile speckle & grout lines (2x2 tiles per texture unit)
  const tile = 128;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      const shade = (gx + gy) % 2 === 0 ? 0 : 8;
      ctx.fillStyle = darkMode
        ? `rgb(${30 + shade}, ${36 + shade}, ${48 + shade})`
        : `rgb(${216 - shade}, ${206 - shade}, ${190 - shade})`;
      ctx.fillRect(gx * tile + 3, gy * tile + 3, tile - 6, tile - 6);
    }
  }

  // Noise grain
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(120,100,80,0.04)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createStreetTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#252932';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Road dashed stripe near bottom
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(16, 120, 96, 10);
  ctx.fillRect(144, 120, 96, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSignboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Deep warnet indigo backing with amber border
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WARNET NUSANTARA', 256, 52);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('HIGH SPEED INTERNET · GAMING 24 JAM', 256, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScreenTexture(tier: 1 | 2 | 3 | 4, active: boolean, broken: boolean): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  if (broken) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL', 64, 58);
    ctx.fillStyle = '#fca5a5';
    ctx.font = '12px monospace';
    ctx.fillText('ERR_BOOT', 64, 80);
  } else if (!active) {
    ctx.fillStyle = tier >= 3 ? '#0f172a' : '#1e3a5f';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = tier >= 3 ? '#38bdf8' : '#93c5fd';
    ctx.fillRect(10, 108, 108, 12);
  } else {
    // Active game/browsing visual
    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    if (tier === 1) {
      grad.addColorStop(0, '#1d4ed8');
      grad.addColorStop(1, '#0f766e');
    } else if (tier === 2) {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#0284c7');
    } else if (tier === 3) {
      grad.addColorStop(0, '#312e81');
      grad.addColorStop(1, '#0891b2');
    } else {
      grad.addColorStop(0, '#4c1d95');
      grad.addColorStop(1, '#f59e0b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // Simulated HUD bars / radar
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(12, 16, 40, 26);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(14, 102, 56, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(78, 102, 36, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(64);
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.48)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPosterTexture(
  variant: 'notice_board' | 'paket_malam' | 'tournament',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'notice_board') {
    // Cork / slate warnet notice & tariff board
    ctx.fillStyle = '#b48a5a';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#5c3d24';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 182);

    // Header strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, 16, 220, 28);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INFO & TARIF WARNET', 128, 35);

    // Pinned paper 1: Tariff
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(20, 54, 102, 114);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(71, 61, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REGULER 4K/HR', 26, 80);
    ctx.fillText('GAMING  7K/HR', 26, 98);
    ctx.fillText('PRO     12K/HR', 26, 116);
    ctx.fillText('PEAK 17-21 1.5X', 26, 134);
    ctx.fillStyle = '#0284c7';
    ctx.fillText('WIFI: WARNET_5G', 26, 156);

    // Pinned paper 2: Rules
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(134, 54, 102, 66);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(185, 61, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TATA TERTIB:', 140, 78);
    ctx.font = '10px sans-serif';
    ctx.fillText('1. Dilarang Merokok', 140, 94);
    ctx.fillText('2. Jaga Kebersihan', 140, 109);

    // Pinned yellow sticky note
    ctx.fillStyle = '#fde047';
    ctx.fillRect(140, 128, 92, 42);
    ctx.fillStyle = '#713f12';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('INDOMIE + ES TEH', 146, 146);
    ctx.fillText('PESAN DI KASIR!', 146, 160);
  } else if (variant === 'paket_malam') {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 180);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAKET MALAM', 128, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('22:00 - 06:00 WIB', 128, 78);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(38, 96, 180, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('CUMA Rp15.000', 128, 125);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.fillText('PING STABIL · FULL AC', 128, 166);
  } else {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 180);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(16, 18, 224, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NUSANTARA LAN CUP', 128, 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('5v5 TOURNAMENT', 128, 94);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('PRIZE POOL Rp2.500.000', 128, 130);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('DAFTAR DI MEJA KASIR', 128, 164);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRugTexture(
  style: 'aisle' | 'waiting' | 'reception',
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);

  if (style === 'aisle') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#475569';
    ctx.fillRect(16, 0, 224, 256);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(18, 0, 8, 256);
    ctx.fillRect(230, 0, 8, 256);
    // Subtle chevron weave
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < 256; y += 16) {
      ctx.fillRect(28, y, 200, 4);
    }
  } else if (style === 'waiting') {
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(14, 14, 228, 228);
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, 212, 212);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 32; y < 224; y += 14) {
      ctx.fillRect(32, y, 192, 4);
    }
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 236);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
