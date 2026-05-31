/* =====================================================
   YASSYCREATES — UPGRADED MOTION SYSTEM
   GSAP + CustomEase + Cinema-grade interactions
   ===================================================== */

// ── SECURITY ──────────────────────────────────────────
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if(e.key==='F12') e.preventDefault();
  if(e.ctrlKey && e.shiftKey && (e.key==='I'||e.key==='J')) e.preventDefault();
  if(e.ctrlKey && e.key==='u') e.preventDefault();
});

// ── GSAP SETUP ────────────────────────────────────────
gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create('cinema', 'M0,0 C0.22,1 0.36,1 1,1');
CustomEase.create('exitEase', 'M0,0 C0.7,0 0.84,0.3 1,1');

// ── MOBILE DETECTION ──────────────────────────────────
const isMobile = () => window.innerWidth <= 768;

// ── SHARED CAT POSITION VARS ──────────────────────────
// Declared globally so both the cursor block
// and the WebGL cat block can read/write them
let mouseX2    = 0, mouseY2    = 0;
let targetCatX = 0, targetCatY = 0;
let currentCatX= 0, currentCatY= 0;

// =====================================================
// LOADER
// =====================================================
(function initLoader() {
  const bar    = document.querySelector('.ld-bar');
  const count  = document.querySelector('.ld-count');
  const loader = document.getElementById('loader');
  if(!loader) { initHeroEntrance(); return; }
  let p = 0;

  const tick = setInterval(() => {
    p += Math.random() * 18 + 4;
    if (p >= 100) { p = 100; clearInterval(tick); }
    const v = Math.floor(p);
    if(bar)   bar.style.width   = v + '%';
    if(count) count.textContent = String(v).padStart(2,'0');

    if (p >= 100) {
      setTimeout(() => {
        gsap.to(loader, {
          opacity: 0, duration: .55, ease: 'power2.inOut',
          onComplete: () => {
            loader.classList.add('out');
            initHeroEntrance();
          }
        });
      }, 200);
    }
  }, 55);
})();

// =====================================================
// GRAIN CANVAS
// =====================================================
(function initGrain() {
  const cv = document.getElementById('grain');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();
  // Performance: grain renders at half resolution scaled up
  // and only every 4 frames — barely visible difference
  let frame = 0;
  const GRAIN_SCALE = 0.35; // render at 35% size, stretch to full
  let gW, gH;

  const grainResize = () => {
    gW = Math.floor(window.innerWidth  * GRAIN_SCALE);
    gH = Math.floor(window.innerHeight * GRAIN_SCALE);
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  };
  window.addEventListener('resize', grainResize); grainResize();

  // Offscreen canvas for grain at low res
  const offscreen = document.createElement('canvas');
  const offCtx    = offscreen.getContext('2d');

  function drawGrain() {
    frame++;
    // Only redraw every 4 frames — saves 75% CPU
    if (frame % 4 === 0) {
      offscreen.width  = gW;
      offscreen.height = gH;
      const imageData = offCtx.createImageData(gW, gH);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255 | 0;
        data[i] = data[i+1] = data[i+2] = v;
        data[i+3] = 14; // slightly less alpha too
      }
      offCtx.putImageData(imageData, 0, 0);
      // Stretch low-res grain to full screen
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(offscreen, 0, 0, W, H);
    }
    requestAnimationFrame(drawGrain);
  }
  drawGrain();
})();

// =====================================================
// ADVANCED CURSOR SYSTEM
// =====================================================
const CUR = (() => {
  const el   = document.getElementById('cur');
  if(!el) return { setLabel: () => {} };
  const dot  = el.querySelector('.cur-dot');
  const ring = el.querySelector('.cur-ring');
  const txt  = el.querySelector('.cur-text');

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;

    // Update shared cat position vars
    mouseX2    = (e.clientX / window.innerWidth  - .5) * .5;
    mouseY2    = (e.clientY / window.innerHeight - .5) * .35;
    targetCatX = (e.clientX / window.innerWidth  - .5) * 0.9;
    targetCatY = (e.clientY / window.innerHeight - .5) * 0.55;

    if(dot) gsap.set(dot, { x: mx, y: my });
    if(txt) gsap.set(txt, { x: mx + 18, y: my - 8 });
  });

  // Ring follows with lag
  gsap.ticker.add(() => {
    rx += (mx - rx) * .072;
    ry += (my - ry) * .072;
    if(ring) gsap.set(ring, { x: rx, y: ry });
  });

  function setLabel(label) {
    if (!txt) return;
    if (label) txt.textContent = label;
    gsap.to(txt, { opacity: label ? 1 : 0, duration: .25 });
  }

  document.querySelectorAll(
    'a,button,.sdot,.pill,.stb,.wcard,.cwc,.role,.skc,.ct-link,.wc-arrow,.mag-btn'
  ).forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const label = e.currentTarget.dataset.cursor || '';
      document.body.classList.add('cur-hover');
      setLabel(label);
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cur-hover');
      setLabel('');
    });
  });

  return { setLabel };
})();

// =====================================================
// SLIDE ENGINE
// =====================================================
const slides     = document.querySelectorAll('.slide');
const TOTAL      = slides.length;
let cur_s        = 0;
let busy         = false;
let lastWheel    = 0;

const labels     = ['Home','About','Work','Creative','Skills','Stats','Contact'];
const dots       = document.querySelectorAll('.sdot');
const navLinks   = document.querySelectorAll('.n-links a:not(.n-avail)');
const prog       = document.getElementById('prog');
const scCur      = document.getElementById('sc-cur');
const slideLabel = document.getElementById('slide-label');
const nav        = document.getElementById('nav');

function pad(n) { return n < 10 ? '0' + n : String(n); }

function updateUI(idx) {
  dots.forEach((d,i) => d.classList.toggle('act', i === idx));
  navLinks.forEach((a,i) => {
    const targets = [0,1,2,4,6];
    a.classList.toggle('act', targets[i] === idx);
  });
  if (prog) prog.style.width = ((idx / (TOTAL-1)) * 100) + '%';
  if (scCur) {
    gsap.to(scCur, {
      y: -8, opacity: 0, duration: .18, ease: 'power2.in',
      onComplete: () => {
        scCur.textContent = pad(idx + 1);
        gsap.fromTo(scCur, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .28, ease: 'power2.out' });
      }
    });
  }
  if (slideLabel) {
    gsap.to(slideLabel, {
      opacity: 0, duration: .2,
      onComplete: () => {
        slideLabel.textContent = labels[idx];
        gsap.to(slideLabel, { opacity: 1, duration: .3 });
      }
    });
  }
  if(nav) nav.classList.toggle('solid', idx > 0);
  const arrDown = document.getElementById('arr-down');
  if (arrDown) gsap.to(arrDown, { opacity: idx === TOTAL-1 ? 0 : 1, duration: .4 });
}

function goTo(idx, dir) {
  if (isMobile()) {
    const sectionIds = ['s1','s2','s3','s3b','s4','s5','s6'];
    const target = document.getElementById(sectionIds[idx]);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateUI(idx);
    return;
  }
  if (busy || idx === cur_s || idx < 0 || idx >= TOTAL) return;
  busy = true;

  const goingDown = dir !== undefined ? dir : (idx > cur_s);
  const fromSlide = slides[cur_s];
  const toSlide   = slides[idx];

  gsap.to(fromSlide, {
    opacity: 0, y: goingDown ? -55 : 55, scale: .97,
    duration: .62, ease: 'exitEase',
    onComplete: () => {
      fromSlide.classList.remove('active');
      gsap.set(fromSlide, { clearProps: 'all' });

      gsap.fromTo(toSlide,
        { opacity: 0, y: goingDown ? 60 : -60, scale: .985, rotateX: goingDown ? 1.5 : -1.5 },
        {
          opacity: 1, y: 0, scale: 1, rotateX: 0,
          duration: .88, ease: 'cinema',
          onStart: () => toSlide.classList.add('active'),
          onComplete: () => {
            if (idx === 5) triggerCountUp();
            document.querySelectorAll('.mc').forEach(cv => { if (cv._resize) cv._resize(); });
            cur_s = idx;
            updateUI(idx);
            busy = false;
          }
        }
      );
    }
  });
}

// Scroll / wheel
window.addEventListener('wheel', e => {
  if (isMobile()) return;
  const now = Date.now();
  if (now - lastWheel < 880) return;
  lastWheel = now;
  e.deltaY > 0 ? goTo(cur_s + 1, true) : goTo(cur_s - 1, false);
}, { passive: true });

// Touch swipe (desktop only)
let tsy = 0;
window.addEventListener('touchstart', e => { tsy = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', e => {
  if (isMobile()) return;
  const dy = tsy - e.changedTouches[0].clientY;
  if (Math.abs(dy) > 42) dy > 0 ? goTo(cur_s + 1, true) : goTo(cur_s - 1, false);
}, { passive: true });

// Keyboard
window.addEventListener('keydown', e => {
  if (isMobile()) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') goTo(cur_s + 1, true);
  if (e.key === 'ArrowUp'   || e.key === 'PageUp')   goTo(cur_s - 1, false);
});

// Data-goto universal handler
document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    const idx = parseInt(this.dataset.goto);
    if (!isNaN(idx)) goTo(idx);
    closeMobileMenu();
  });
});

// Init first slide
updateUI(0);
slides[0].classList.add('active');

// =====================================================
// HERO ENTRANCE
// =====================================================
function initHeroEntrance() {
  // ── Cinematic entrance sequence ──
  // Use fromTo instead of from so GSAP always
  // ends at explicit opacity:1 — never leaves opacity:0 behind
  const tl = gsap.timeline({ delay: .12 });

  tl.fromTo('.h1-tag',
      { opacity:0, y:22 },
      { opacity:1, y:0, duration:.7, ease:'cinema' })
    .fromTo('.h1-name .solid',
      { opacity:0, y:32 },
      { opacity:1, y:0, duration:.78, ease:'cinema' }, '-=.4')
    .fromTo('.h1-name .ghost',
      { opacity:0, y:28 },
      { opacity:1, y:0, duration:.78, ease:'cinema' }, '-=.56')
    .fromTo('.role',
      { opacity:0, y:16, scale:.96 },
      { opacity:1, y:0, scale:1, duration:.55, stagger:.08, ease:'cinema' }, '-=.4')
    .fromTo('.h1-cta button',
      { opacity:0, y:14 },
      { opacity:1, y:0, duration:.55, stagger:.1, ease:'cinema' }, '-=.3')
    .fromTo('.px-badge',
      { opacity:0, scale:.82, y:12 },
      { opacity:1, scale:1, y:0, duration:.65, stagger:.1, ease:'cinema' }, '-=.55')
    .fromTo('.px-paw',
      { opacity:0 },
      { opacity:1, duration:.8, stagger:.07, ease:'power2.out' }, '-=.4')
    .fromTo('#arr-down',
      { opacity:0, y:8 },
      { opacity:1, y:0, duration:.5, ease:'power2.out' }, '-=.3');

  if (isMobile()) return;

  // ── Multi-layer mouse parallax ──
  // Each layer has data-depth (0=far/slow … 1=near/fast)
  // giving a real 3D depth-of-field feeling
  const layers = document.querySelectorAll('.px-layer[data-depth]');

  let lx = 0, ly = 0; // smoothed position
  let tx = 0, ty = 0; // target position

  document.addEventListener('mousemove', e => {
    tx = (e.clientX / window.innerWidth)  - 0.5;
    ty = (e.clientY / window.innerHeight) - 0.5;
  });

  // Use GSAP ticker so it stays in sync with the render loop
  gsap.ticker.add(() => {
    lx += (tx - lx) * 0.052;
    ly += (ty - ly) * 0.052;

    // Move each layer at its own depth speed
    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth || 0.2);
      gsap.set(layer, {
        x: lx * depth * window.innerWidth  * 0.24,
        y: ly * depth * window.innerHeight * 0.20,
      });
    });

    // Hero content does NOT move — only the bg layers parallax
    // This keeps all buttons exactly where they visually appear (no hitbox drift)
  });
}

// =====================================================
// HAMBURGER MENU
// =====================================================
function closeMobileMenu() {
  const mb = document.getElementById('menuBtn');
  const mm = document.getElementById('mobMenu');
  if (mb) mb.classList.remove('active');
  if (mm) mm.classList.remove('open');
}
const menuBtn = document.getElementById('menuBtn');
const mobMenu = document.getElementById('mobMenu');
if (menuBtn && mobMenu) {
  menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    mobMenu.classList.toggle('open');
  });
}
document.addEventListener('click', e => {
  if (!mobMenu || !menuBtn) return;
  if (!mobMenu.contains(e.target) && !menuBtn.contains(e.target)) closeMobileMenu();
});

// Mobile scroll → update dot nav
window.addEventListener('scroll', () => {
  if (!isMobile()) return;
  const ids = ['s1','s2','s3','s3b','s4','s5','s6'];
  const mid = window.scrollY + window.innerHeight * .4;
  ids.forEach((id, i) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    if (mid >= sec.offsetTop && mid < sec.offsetTop + sec.offsetHeight) updateUI(i);
  });
  const s5 = document.getElementById('s5');
  if (s5 && window.scrollY + window.innerHeight >= s5.offsetTop + 100) triggerCountUp();
}, { passive: true });

// =====================================================
// MAGNETIC BUTTONS
// =====================================================
(function initMagnetics() {
  document.querySelectorAll('.mag-btn,.bp,.bo').forEach(b => {
    b.addEventListener('mousemove', e => {
      if (isMobile()) return;
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * .22;
      const y = (e.clientY - r.top  - r.height / 2) * .22;
      gsap.to(b, { x, y, duration: .4, ease: 'power2.out' });
    });
    b.addEventListener('mouseleave', () => {
      gsap.to(b, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.5)' });
    });
  });
})();

// =====================================================
// 3D CARD TILT
// =====================================================
(function initTilt() {
  document.querySelectorAll('.wcard,.skc,.cwc').forEach(c => {
    c.addEventListener('mousemove', e => {
      if (isMobile()) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      const glow = c.querySelector('.skc-glow');
      if (glow) {
        const px = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        const py = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        gsap.to(glow, {
          background: `radial-gradient(circle at ${px}% ${py}%, rgba(201,127,168,.1) 0%, transparent 55%)`,
          duration: .15, opacity: 1
        });
      }
      gsap.to(c, {
        rotateX: -y * 10, rotateY: x * 10,
        translateY: -8, scale: 1.005,
        duration: .22, ease: 'power2.out', transformPerspective: 900
      });
    });
    c.addEventListener('mouseleave', () => {
      const glow = c.querySelector('.skc-glow');
      if (glow) gsap.to(glow, { opacity: 0, duration: .4 });
      gsap.to(c, {
        rotateX: 0, rotateY: 0, translateY: 0, scale: 1,
        duration: .65, ease: 'elastic.out(1,.4)', transformPerspective: 900
      });
    });
  });
})();

// =====================================================
// COUNT-UP
// =====================================================
let counted = false;
function triggerCountUp() {
  if (counted) return;
  counted = true;
  document.querySelectorAll('.stb-n[data-n]').forEach(el => {
    const tgt  = +el.dataset.n;
    const plus = el.dataset.plus === 'true';
    const obj  = { v: 0 };
    gsap.to(obj, {
      v: tgt, duration: 2.2, ease: 'power2.out',
      onUpdate:  () => { el.textContent = Math.floor(obj.v) + (plus ? '+' : ''); },
      onComplete:() => { el.textContent = tgt + (plus ? '+' : ''); }
    });
  });
}

// =====================================================
// MINI CANVASES
// =====================================================
const pals = [
  ['#c97fa8','#9b7bc4'],
  ['#b87090','#8a6ab8'],
  ['#9b7bc4','#7a9ea8'],
  ['#7a9ea8','#c97fa8']
];

document.querySelectorAll('.mc').forEach((cv, idx) => {
  const ctx = cv.getContext('2d');
  const pal = pals[idx % pals.length];
  let W, H;
  const resize = cv._resize = () => {
    W = cv.width  = cv.offsetWidth  || 280;
    H = cv.height = cv.offsetHeight || 160;
  };
  resize();
  new ResizeObserver(resize).observe(cv.parentElement);
  const h2r = h => {
    const c = h.replace('#','');
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const pts = Array.from({ length: 38 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random()-.5)*.0028, vy: (Math.random()-.5)*.0028,
    r: Math.random()*2.4+.4, ph: Math.random()*Math.PI*2,
    col: pal[Math.floor(Math.random()*pal.length)]
  }));
  let t = 0;
  (function loop() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0a0910'; ctx.fillRect(0,0,W,H);
    const [r0,g0,b0] = h2r(pal[0]);
    const bl = ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,W*.55);
    bl.addColorStop(0,`rgba(${r0},${g0},${b0},.05)`); bl.addColorStop(1,'transparent');
    ctx.fillStyle = bl; ctx.fillRect(0,0,W,H);
    t += .0065;
    pts.forEach(p => {
      p.x += p.vx + Math.sin(t+p.ph)*.00045;
      p.y += p.vy + Math.cos(t+p.ph)*.00045;
      if(p.x<0)p.x=1; if(p.x>1)p.x=0;
      if(p.y<0)p.y=1; if(p.y>1)p.y=0;
      const a = .15 + .14*Math.sin(t*1.3+p.ph);
      const px = p.x*W, py = p.y*H;
      const [r,g,b] = h2r(p.col);
      const g2 = ctx.createRadialGradient(px,py,0,px,py,p.r*5.5);
      g2.addColorStop(0,`rgba(${r},${g},${b},${a*.44})`); g2.addColorStop(1,'transparent');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(px,py,p.r*5.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px,py,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},${a*.78})`; ctx.fill();
    });
    requestAnimationFrame(loop);
  })();
});

// =====================================================
// 3D LOW-POLY CAT (WebGL)
// Cat follows mouse — uses global mouseX2/mouseY2
// and targetCatX/Y for smooth position shift
// =====================================================
(function() {
  const cv = document.getElementById('c3d');
  const gl = cv.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) return;

  let W, H;
  const resize = () => {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
    gl.viewport(0,0,W,H);
  };
  window.addEventListener('resize', resize); resize();

  const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uMVP;uniform mat4 uM;varying vec3 vN;varying vec3 vW;varying vec3 vC;void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize((uM*vec4(aN,0.)).xyz);vC=aC;gl_Position=uMVP*vec4(aP,1.);}`;
  const FS = `precision highp float;varying vec3 vN;varying vec3 vW;varying vec3 vC;uniform vec3 uCam;uniform float uSlide;void main(){vec3 V=normalize(uCam-vW);vec3 N=normalize(vN);vec3 L1=normalize(vec3(0.3,1.0,0.8));float diff=max(dot(N,L1),0.0)*.55;float fill=max(dot(N,normalize(vec3(-.5,.2,.5))),0.0)*.15;float rim=pow(1.0-max(dot(V,N),0.0),3.5)*.5;float fres=pow(1.0-max(dot(V,N),0.0),5.0)*.3;float s=uSlide/5.0;vec3 rCol=s<.5?mix(vec3(.64,.38,.50),vec3(.50,.40,.65),s*2.0):mix(vec3(.50,.40,.65),vec3(.38,.52,.55),(s-.5)*2.0);vec3 col=vC*.18+vC*(diff+fill)+rCol*(rim+fres);gl_FragColor=vec4(col,.85+fres*.15);}`;

  function mkSh(t,s){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;}
  const prog2=gl.createProgram();
  gl.attachShader(prog2,mkSh(gl.VERTEX_SHADER,VS));
  gl.attachShader(prog2,mkSh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(prog2); gl.useProgram(prog2);

  const BODY=[.32,.22,.30],BODY2=[.28,.19,.26],HEAD=[.38,.26,.34],HEAD2=[.34,.23,.30],
        EAR=[.42,.28,.36],EAR_IN=[.62,.40,.52],TAIL=[.30,.20,.28],PAW=[.36,.24,.32],
        NOSE=[.70,.48,.58],EYE=[.72,.55,.82];

  const tris=[];
  function tri(v0,v1,v2,col){
    const ax=v1[0]-v0[0],ay=v1[1]-v0[1],az=v1[2]-v0[2];
    const bx=v2[0]-v0[0],by=v2[1]-v0[1],bz=v2[2]-v0[2];
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
    const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    tris.push({verts:[v0,v1,v2],n:[nx/nl,ny/nl,nz/nl],col});
  }
  function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}

  const BFL=[-.38,-.72,.28],BFR=[.38,-.72,.28],BFT=[-.30,.05,.26],BFTR=[.30,.05,.26];
  const BBL=[-.35,-.72,-.24],BBR=[.35,-.72,-.24],BBT=[-.28,.02,-.22],BBTR=[.28,.02,-.22];
  const MFL=[-.42,-.28,.32],MFR=[.42,-.28,.32],MBL=[-.38,-.28,-.28],MBR=[.38,-.28,-.28];
  quad(BFL,BFR,MFR,MFL,BODY);quad(MFL,MFR,BFTR,BFT,BODY2);
  quad(BBR,BBL,MBL,MBR,BODY2);quad(MBR,MBL,BBT,BBTR,BODY);
  quad(BBL,BFL,MFL,MBL,BODY2);quad(MBL,MFL,BFT,BBT,BODY);
  quad(BFR,BBR,MBR,MFR,BODY);quad(MFR,MBR,BBTR,BFTR,BODY2);
  quad(BFT,BFTR,BBTR,BBT,HEAD);quad(BBL,BBR,BFR,BFL,BODY2);

  const NFL=[-.18,.04,.20],NFR=[.18,.04,.20],NBL=[-.16,.04,-.16],NBR=[.16,.04,-.16];
  const NTL=[-.15,.38,.14],NTR=[.15,.38,.14],NBTL=[-.13,.36,-.12],NBTR=[.13,.36,-.12];
  quad(NFL,NFR,NTR,NTL,BODY);quad(NBR,NBL,NBTL,NBTR,BODY2);
  quad(NBL,NFL,NTL,NBTL,BODY);quad(NFR,NBR,NBTR,NTR,BODY);
  tri(BFT,BFTR,NFR,BODY);tri(BFT,NFR,NFL,BODY);
  tri(BFTR,BBTR,NBR,BODY2);tri(BFTR,NBR,NFR,BODY2);
  tri(BBT,BFT,NFL,BODY2);tri(BBT,NFL,NBL,BODY2);
  tri(BBTR,BBT,NBL,BODY);tri(BBTR,NBL,NBR,BODY);

  const HR=0.36,HCX=0,HCY=0.72,HCZ=0.04;
  function hv(theta,phi){return[HCX+HR*1.05*Math.sin(phi)*Math.cos(theta),HCY+HR*Math.cos(phi),HCZ+HR*.85*Math.sin(phi)*Math.sin(theta)];}
  const PHI=[0,Math.PI*.18,Math.PI*.38,Math.PI*.56,Math.PI*.72,Math.PI*.88,Math.PI],SEGS=10;
  for(let pi=0;pi<PHI.length-1;pi++)for(let ti=0;ti<SEGS;ti++){
    const t0=ti/SEGS*Math.PI*2,t1=(ti+1)/SEGS*Math.PI*2;
    const a=hv(t0,PHI[pi]),b=hv(t1,PHI[pi]),c=hv(t1,PHI[pi+1]),d=hv(t0,PHI[pi+1]);
    quad(a,b,c,d,pi%2===0?HEAD:HEAD2);
  }

  function ear(sx){
    const bl=[HCX+sx*.14,HCY+HR*.75,HCZ+HR*.2],br=[HCX+sx*.34,HCY+HR*.65,HCZ+HR*.1],tip=[HCX+sx*.26,HCY+HR*1.38,HCZ+HR*.1];
    tri(bl,br,tip,EAR);
    const il=[HCX+sx*.17,HCY+HR*.78,HCZ+HR*.18],ir=[HCX+sx*.30,HCY+HR*.68,HCZ+HR*.08],it=[HCX+sx*.24,HCY+HR*1.25,HCZ+HR*.09];
    tri(il,it,ir,EAR_IN);
    const bbl=[HCX+sx*.12,HCY+HR*.72,HCZ-HR*.12],bbr=[HCX+sx*.32,HCY+HR*.62,HCZ-HR*.1];
    tri(bbl,tip,bbr,EAR);tri(bl,tip,bbl,EAR);
  }
  ear(1); ear(-1);

  tri([-.055,HCY-.055,HCZ+HR*.92],[.055,HCY-.055,HCZ+HR*.92],[0,HCY+.01,HCZ+HR*.94],NOSE);
  function eye(sx){const ex=sx*.16,ey=HCY+.08,ez=HCZ+HR*.88,s=.065;quad([ex-s*1.4,ey+s*.6,ez],[ex+s*1.4,ey+s*.6,ez],[ex+s*1.2,ey-s*.6,ez],[ex-s*1.2,ey-s*.6,ez],EYE);}
  eye(1); eye(-1);

  [[[ .38,-.72,.00],[.40,-.72,-.12],[.44,-.55,-.16],[.44,-.55,-.04]],
   [[ .44,-.55,-.16],[.52,-.55,-.20],[.58,-.36,-.22],[.54,-.36,-.14]],
   [[ .58,-.36,-.22],[.64,-.36,-.20],[.66,-.18,-.16],[.60,-.18,-.13]],
   [[ .66,-.18,-.16],[.68,-.18,-.10],[.66,.02,-.06],[.60,.02,-.08]],
   [[ .66,.02,-.06],[.68,.02,.02],[.60,.18,.06],[.55,.18,-.02]]
  ].forEach((s,i)=>{quad(s[0],s[1],s[3],s[2],i%2===0?TAIL:BODY2);if(i===4)tri(s[2],s[3],[.58,.28,.02],PAW);});

  function paw(sx){
    const px=sx*.26,py=-.72,pz=.32,w=.12,d=.10,h=.08;
    const fl=[px-w,py,pz+d],fr=[px+w,py,pz+d],bl2=[px-w,py,pz-d],br2=[px+w,py,pz-d];
    const tl=[px-w,py+h,pz+d],tr2=[px+w,py+h,pz+d],btl=[px-w,py+h,pz-d],btr=[px+w,py+h,pz-d];
    quad(fl,fr,tr2,tl,PAW);quad(br2,bl2,btl,btr,PAW);quad(bl2,fl,tl,btl,PAW);
    quad(fr,br2,btr,tr2,PAW);quad(tl,tr2,btr,btl,BODY);quad(bl2,br2,fr,fl,PAW);
  }
  paw(1); paw(-1);

  const posA=[],normA=[],colA=[],idxA=[];
  tris.forEach((t,i)=>{
    t.verts.forEach(v=>{posA.push(...v);normA.push(...t.n);colA.push(...t.col);});
    const b=i*3; idxA.push(b,b+1,b+2);
  });

  function mkB(type,data){const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b;}
  const vb=mkB(gl.ARRAY_BUFFER,new Float32Array(posA));
  const nb=mkB(gl.ARRAY_BUFFER,new Float32Array(normA));
  const cb=mkB(gl.ARRAY_BUFFER,new Float32Array(colA));
  const ib=mkB(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idxA));

  const aP=gl.getAttribLocation(prog2,'aP'),aN2=gl.getAttribLocation(prog2,'aN'),aC=gl.getAttribLocation(prog2,'aC');
  const uMVP=gl.getUniformLocation(prog2,'uMVP'),uM=gl.getUniformLocation(prog2,'uM');
  const uCam=gl.getUniformLocation(prog2,'uCam'),uSlide=gl.getUniformLocation(prog2,'uSlide');

  const m4=()=>new Float32Array(16);
  const id=m=>{for(let i=0;i<16;i++)m[i]=0;m[0]=m[5]=m[10]=m[15]=1;return m;};
  const mul=(a,b)=>{const c=m4();for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[i+k*4]*b[k+j*4];c[i+j*4]=s;}return c;};
  const persp=(f,a,n,fa)=>{const t=1/Math.tan(f/2),m=m4();id(m);m[0]=t/a;m[5]=t;m[10]=(fa+n)/(n-fa);m[11]=-1;m[14]=2*fa*n/(n-fa);m[15]=0;return m;};
  const rY=a=>{const m=m4();id(m);m[0]=Math.cos(a);m[2]=Math.sin(a);m[8]=-Math.sin(a);m[10]=Math.cos(a);return m;};
  const rX=a=>{const m=m4();id(m);m[5]=Math.cos(a);m[6]=-Math.sin(a);m[9]=Math.sin(a);m[10]=Math.cos(a);return m;};
  const tr2=(x,y,z)=>{const m=m4();id(m);m[12]=x;m[13]=y;m[14]=z;return m;};
  const sc=s=>{const m=m4();id(m);m[0]=m[5]=m[10]=s;return m;};

  // Slide rotation angles — one per slide
  const slideAngles=[0,Math.PI*.4,Math.PI*.9,Math.PI*1.4,Math.PI*1.9,Math.PI*2.5,Math.PI*3.2];
  let targetRot=0, currentRot=0, autoT=0, catMX=0, catMY=0, lastSlide2=0;

  setInterval(()=>{
    if(cur_s !== lastSlide2){ targetRot=slideAngles[cur_s]; lastSlide2=cur_s; }
  },100);

  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);

  (function frame(){
    autoT += .0065;

    // Smooth lerp all values
    currentRot  += (targetRot  - currentRot)  * .038;
    catMX       += (mouseX2    - catMX)        * .038;
    catMY       += (mouseY2    - catMY)        * .038;
    currentCatX += (targetCatX - currentCatX)  * .035; // smooth position follow
    currentCatY += (targetCatY - currentCatY)  * .035;

    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    const bob = Math.sin(autoT*.6)*.04;

    let model = sc(.60);
    model = mul(rX(.08 + catMY*.5 + Math.sin(autoT*.35)*.014), model);
    model = mul(rY(currentRot + catMX + autoT*.09), model);
    // position: follows mouse left/right/up/down
    model = mul(tr2(currentCatX, bob - .06 - currentCatY, 0), model);

    const camZ = 3.8;
    const mvp  = mul(mul(persp(1.05,W/H,.1,50), tr2(0,0,-camZ)), model);

    gl.uniformMatrix4fv(uMVP,false,mvp);
    gl.uniformMatrix4fv(uM,false,model);
    gl.uniform3f(uCam,0,0,camZ);
    gl.uniform1f(uSlide,cur_s);

    gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,nb); gl.enableVertexAttribArray(aN2);gl.vertexAttribPointer(aN2,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,cb); gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.drawElements(gl.TRIANGLES,idxA.length,gl.UNSIGNED_SHORT,0);

    requestAnimationFrame(frame);
  })();
})();

// =====================================================
// INTERACTIVE 3D PHYSICS BACKGROUND
// (shapes repel on hover, attract on click)
// =====================================================
/* ═══════════════════════════════════════════════════════════
   INTERACTIVE 3D PHYSICS BACKGROUND
   
   Replaces the static starfield canvas in main.js.
   
   Features:
   - 3D floating geometric shapes (rings, diamonds, stars)
     rendered via WebGL on the background canvas
   - Mouse REPEL: shapes flee from cursor
   - Mouse ATTRACT: hold click — shapes rush toward cursor
   - Each shape has its own velocity, spin, depth
   - Matches yassycreates pink/mauve/sage color palette
   - Connects nearby shapes with faint lines (constellation)
   - 60fps physics with velocity damping & boundary wrap
   
   HOW TO USE:
   In your main.js, find the STARFIELD BACKGROUND section:
   
     (function() {
       const cv = document.createElement('canvas');
       ...
       (function draw(){ ... })();
     })();
   
   Replace the ENTIRE thing with the code below.
═══════════════════════════════════════════════════════════ */

(function() {
  const cv  = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');

  let W, H;
  const resize = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();

  // ── Mouse state ──
  let mouseX = W / 2, mouseY = H / 2;
  let mouseDown = false;
  let mouseOnPage = false;

  // Read from the global cur position if available,
  // otherwise fall back to direct listener
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseOnPage = true;
  });
  document.addEventListener('mousedown', () => mouseDown = true);
  document.addEventListener('mouseup',   () => mouseDown = false);
  document.addEventListener('mouseleave',() => mouseOnPage = false);

  // ── Color palette ──
  const COLORS = [
    'rgba(201,127,168,',  // rose
    'rgba(155,123,196,',  // mauve
    'rgba(122,158,168,',  // sage
    'rgba(232,224,240,',  // cream
    'rgba(168,100,140,',  // deep rose
  ];

  // ── Shape class ──
  class Shape {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : (Math.random() > .5 ? -30 : H + 30);
      this.z  = Math.random() * 0.8 + 0.2;   // depth 0.2–1.0
      this.vx = (Math.random() - .5) * 0.4;
      this.vy = (Math.random() - .5) * 0.4;
      this.spin     = (Math.random() - .5) * 0.008;
      this.angle    = Math.random() * Math.PI * 2;
      this.size     = (Math.random() * 12 + 4) * this.z;
      this.type     = Math.floor(Math.random() * 4); // 0=diamond 1=ring 2=cross 3=triangle
      this.colorIdx = Math.floor(Math.random() * COLORS.length);
      this.alpha    = (Math.random() * 0.25 + 0.08) * this.z;
      this.baseAlpha= this.alpha;
      this.pulseOff = Math.random() * Math.PI * 2;
    }

    update(t) {
      // Gentle pulse
      this.alpha = this.baseAlpha * (0.75 + 0.25 * Math.sin(t * 0.8 + this.pulseOff));

      // Mouse interaction
      if (mouseOnPage) {
        const dx  = this.x - mouseX;
        const dy  = this.y - mouseY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const radius = 140 * this.z;

        if (dist < radius && dist > 0.1) {
          const force = (radius - dist) / radius;

          if (mouseDown) {
            // ATTRACT — rush toward cursor
            this.vx -= (dx / dist) * force * 1.8;
            this.vy -= (dy / dist) * force * 1.8;
            this.alpha = Math.min(this.baseAlpha * 3, 0.7);
          } else {
            // REPEL — flee from cursor
            this.vx += (dx / dist) * force * 1.2;
            this.vy += (dy / dist) * force * 1.2;
          }
        }
      }

      // Velocity damping
      this.vx *= 0.974;
      this.vy *= 0.974;

      // Speed cap
      const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
      if (speed > 3.5) { this.vx = (this.vx/speed)*3.5; this.vy = (this.vy/speed)*3.5; }

      this.x += this.vx;
      this.y += this.vy;
      this.angle += this.spin;

      // Boundary wrap with padding
      const pad = 40;
      if (this.x < -pad) this.x = W + pad;
      if (this.x > W+pad) this.x = -pad;
      if (this.y < -pad) this.y = H + pad;
      if (this.y > H+pad) this.y = -pad;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.alpha;

      const col = COLORS[this.colorIdx];
      const s   = this.size;

      ctx.strokeStyle = col + '1)';
      ctx.fillStyle   = col + '0.12)';
      ctx.lineWidth   = 0.8 * this.z;

      switch(this.type) {

        case 0: // Diamond ◇
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * .55, 0);
          ctx.lineTo(0,  s);
          ctx.lineTo(-s * .55, 0);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;

        case 1: // Circle ring ○
          ctx.beginPath();
          ctx.arc(0, 0, s * .7, 0, Math.PI * 2);
          ctx.stroke();
          // inner dot
          ctx.beginPath();
          ctx.arc(0, 0, s * .12, 0, Math.PI * 2);
          ctx.fillStyle = col + '0.4)';
          ctx.fill();
          break;

        case 2: // Cross / plus +
          ctx.beginPath();
          ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
          ctx.moveTo(0, -s); ctx.lineTo(0, s);
          ctx.stroke();
          // rotated 45deg inner cross
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-s*.6, 0); ctx.lineTo(s*.6, 0);
          ctx.moveTo(0, -s*.6); ctx.lineTo(0, s*.6);
          ctx.globalAlpha = this.alpha * .4;
          ctx.stroke();
          break;

        case 3: // Triangle △
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * .85, s * .6);
          ctx.lineTo(-s * .85, s * .6);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;
      }

      ctx.restore();
    }
  }

  // ── Spawn shapes ──
  const COUNT = 35; // reduced from 55 for performance
  const shapes = Array.from({ length: COUNT }, () => new Shape());

  // ── Static stars ──
  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * .8 + .1,
    a: Math.random() * .25 + .03,
    da: (Math.random() - .5) * .001
  }));

  // ── Background nebula orbs ──
  const orbs = [
    { x:.14, y:.22, rw:320, rh:240, h:340, a:.036, dx:.00009, dy:.00007 },
    { x:.84, y:.68, rw:275, rh:210, h:280, a:.028, dx:-.00008, dy:.00008 },
    { x:.50, y:.50, rw:400, rh:300, h:300, a:.018, dx:.00006,  dy:-.00007 }
  ];

  let t = 0;

  (function draw() {
    t += .012;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0910';
    ctx.fillRect(0, 0, W, H);

    // ── Orbs ──
    orbs.forEach(o => {
      o.x += o.dx; o.y += o.dy;
      if(o.x < -.3 || o.x > 1.3) o.dx *= -1;
      if(o.y < -.3 || o.y > 1.3) o.dy *= -1;
      const cx = o.x * W, cy = o.y * H;
      ctx.save(); ctx.scale(1, o.rh / o.rw);
      const g = ctx.createRadialGradient(cx, cy*o.rw/o.rh, 0, cx, cy*o.rw/o.rh, o.rw);
      g.addColorStop(0, `hsla(${o.h},28%,28%,${o.a})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H*o.rw/o.rh);
      ctx.restore();
    });

    // ── Stars ──
    stars.forEach((s, i) => {
      s.a += s.da;
      if(s.a > .3) s.da *= -1;
      if(s.a < .015) s.da *= -1;
      const tw = .5 + .5 * Math.sin(t + i * .52);
      ctx.beginPath();
      ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(210,200,228,${s.a * tw * .45})`;
      ctx.fill();
    });

    // ── Constellation lines — only every 2 frames for perf ──
    if(t % 2 < 1) {
      ctx.save();
      for(let i = 0; i < shapes.length; i++) {
        for(let j = i+1; j < shapes.length; j++) {
          const dx   = shapes[i].x - shapes[j].x;
          const dy   = shapes[i].y - shapes[j].y;
          // Use squared distance to avoid sqrt where possible
          const distSq = dx*dx + dy*dy;
          const maxD   = 90;
          if(distSq < maxD * maxD) {
            const dist     = Math.sqrt(distSq);
            const strength = (1 - dist/maxD) * 0.06;
            ctx.beginPath();
            ctx.moveTo(shapes[i].x, shapes[i].y);
            ctx.lineTo(shapes[j].x, shapes[j].y);
            ctx.strokeStyle = `rgba(201,127,168,${strength})`;
            ctx.lineWidth   = 0.4;
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // ── Update + draw shapes ──
    // Sort by z so deeper shapes draw first (painter's algorithm)
    shapes.sort((a, b) => a.z - b.z);
    shapes.forEach(s => { s.update(t); s.draw(); });

    // ── Mouse glow ──
    if(mouseOnPage) {
      const mg = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, mouseDown ? 100 : 70);
      mg.addColorStop(0, mouseDown ? 'rgba(201,127,168,.07)' : 'rgba(201,127,168,.04)');
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(draw);
  })();

  // ── Click burst: spawn shapes toward cursor ──
  cv.style.pointerEvents = 'none'; // keep it non-blocking

  // On mobile, stop the physics loop entirely — too heavy
  if(window.innerWidth <= 768) return;
})();


// =====================================================
// DISCORD LANYARD
// =====================================================
(function() {
  const DISCORD_ID = '653144449777664010';
  const CDN = 'https://cdn.discordapp.com/avatars';
  const statusEmoji  = {online:'🟢',idle:'🌙',dnd:'⛔',offline:'⚫'};
  const statusLabels = {online:'Online',idle:'Idle',dnd:'Do not Disturb',offline:'Offline'};

  function applyPresence(data) {
    const u  = data.discord_user;
    const st = data.discord_status || 'offline';
    const av = document.getElementById('dc-avatar');
    if (av && u && u.avatar)
      av.src = `${CDN}/${u.id}/${u.avatar}.${u.avatar.startsWith('a_')?'gif':'png'}?size=128`;
    const dn = u?.global_name || u?.display_name || u?.username || 'shayn';
    const dd = document.getElementById('dc-display');
    const dt = document.getElementById('dc-tag');
    if (dd) dd.textContent = dn;
    if (dt && u?.username) dt.textContent = '@' + u.username;
    const dot = document.getElementById('dc-dot');
    if (dot) dot.className = 'dc-status-dot ' + st;
    const custom = data.activities?.find(a => a.type === 4);
    const sico = document.getElementById('dc-sico');
    const stxt = document.getElementById('dc-stxt');
    if (sico) sico.textContent = (custom?.emoji?.name && !custom.emoji.id) ? custom.emoji.name : statusEmoji[st];
    if (stxt) stxt.textContent = custom?.state || statusLabels[st];
    const spEl = document.getElementById('dc-spotify');
    if (data.listening_to_spotify && data.spotify && spEl) {
      document.getElementById('dc-sp-song').textContent   = data.spotify.song   || '';
      document.getElementById('dc-sp-artist').textContent = data.spotify.artist || '';
      spEl.style.display = 'flex';
    } else if (spEl) spEl.style.display = 'none';
    const actEl   = document.getElementById('dc-activity');
    const playing = data.activities?.find(a => a.type === 0);
    if (playing && actEl) {
      document.getElementById('dc-act-name').textContent   = playing.name    || '';
      document.getElementById('dc-act-detail').textContent = playing.details || playing.state || '';
      actEl.style.display = 'flex';
    } else if (actEl) actEl.style.display = 'none';
  }

  fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
    .then(r => r.json())
    .then(j => { if (j.success) applyPresence(j.data); })
    .catch(() => {
      const stxt = document.getElementById('dc-stxt');
      if (stxt) stxt.textContent = 'Could not load Discord presence';
    });

  try {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.onopen = () => ws.send(JSON.stringify({ op:2, d:{ subscribe_to_id: DISCORD_ID } }));
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.t === 'PRESENCE_UPDATE' && msg.d) applyPresence(msg.d);
      } catch(err){}
    };
  } catch(e){}
})();

// =====================================================
// GMAIL COMPOSE
// =====================================================
function openGmailCompose() {
  const to      = 'shayna.goles31@gmail.com';
  const subject = 'Project Inquiry — [Your Name Here]';
  const body    =
`Hi Shayn! 👋

I found your portfolio at yassycreates.lol and I'd love to work with you!

━━━━━━━━━━━━━━━━━━━━━━━━━
📌 PROJECT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━
Name:
Company / Brand:
Service Needed:
  [ ] Web Design
  [ ] Graphic Design
  [ ] Video Editing
  [ ] Social Media Management
  [ ] Other: _______________
Project Description:

━━━━━━━━━━━━━━━━━━━━━━━━━
📅 TIMELINE & BUDGET
━━━━━━━━━━━━━━━━━━━━━━━━━
Estimated Budget:
Target Start Date:
Deadline / Launch Date:

Looking forward to hearing from you!`;

  window.open(
    'https://mail.google.com/mail/?view=cm&fs=1'
    + '&to='   + encodeURIComponent(to)
    + '&su='   + encodeURIComponent(subject)
    + '&body=' + encodeURIComponent(body),
    '_blank'
  );
}
document.querySelectorAll('.ct-main-btn').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); openGmailCompose(); });
});

// =====================================================
// WORK CAROUSEL
// =====================================================
(function() {
  const track    = document.getElementById('wc-track');
  const prevBtn  = document.getElementById('wc-prev');
  const nextBtn  = document.getElementById('wc-next');
  const dotsWrap = document.getElementById('wc-dots');
  const curEl    = document.getElementById('wc-cur');
  const totalEl  = document.getElementById('wc-total');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.wcard'));
  const COUNT = cards.length;
  let current = 0;

  function visibleCount() {
    const vw = window.innerWidth;
    if (vw >= 1100) return 3;
    if (vw >= 700)  return 2;
    return 1;
  }
  function maxIndex() { return Math.max(0, COUNT - visibleCount()); }
  function stepPx()   { return cards[0].offsetWidth + 18; }

  function goToCard(idx, animate = true) {
    current = Math.max(0, Math.min(idx, maxIndex()));
    const tx = -(current * stepPx());
    if (animate) {
      gsap.to(track, { x: tx, duration: .65, ease: 'cinema' });
      gsap.fromTo(
        cards.slice(current, current + visibleCount()),
        { y: 6, opacity: .6 },
        { y: 0, opacity: 1, duration: .5, stagger: .08, ease: 'power2.out' }
      );
    } else {
      gsap.set(track, { x: tx });
    }
    if (curEl) {
      curEl.textContent = current + 1;
      gsap.fromTo(curEl, { y:-6, opacity:0 }, { y:0, opacity:1, duration:.3, ease:'power2.out' });
    }
    if (totalEl) totalEl.textContent = COUNT;
    dots.forEach((d,i) => d.classList.toggle('act', i === current));
    if (prevBtn) prevBtn.classList.toggle('dim', current === 0);
    if (nextBtn) nextBtn.classList.toggle('dim', current >= maxIndex());
  }

  const dots = cards.map((_,i) => {
    const d = document.createElement('div');
    d.className = 'wc-dot';
    d.addEventListener('click', () => goToCard(i));
    if (dotsWrap) dotsWrap.appendChild(d);
    return d;
  });

  if (prevBtn) prevBtn.addEventListener('click', () => goToCard(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToCard(current + 1));

  window.addEventListener('keydown', e => {
    if (isMobile() || cur_s !== 2) return;
    if (e.key === 'ArrowLeft')  { e.stopPropagation(); goToCard(current - 1); }
    if (e.key === 'ArrowRight') { e.stopPropagation(); goToCard(current + 1); }
  });

  // Mouse drag
  let dragStartX = 0, dragging = false, startCurrent = 0, startX = 0;
  track.addEventListener('mousedown', e => {
    dragging = true; dragStartX = e.clientX;
    startCurrent = current; startX = -(current * stepPx());
    track.classList.add('dragging');
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    gsap.set(track, { x: startX - (dragStartX - e.clientX) });
  });
  window.addEventListener('mouseup', e => {
    if (!dragging) return;
    dragging = false; track.classList.remove('dragging');
    const diff = dragStartX - e.clientX;
    if (Math.abs(diff) > 58) goToCard(diff > 0 ? startCurrent+1 : startCurrent-1);
    else goToCard(startCurrent);
  });

  // Touch drag
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; startCurrent = current; }, { passive:true });
  track.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) goToCard(diff > 0 ? current+1 : current-1);
  }, { passive:true });

  window.addEventListener('resize', () => goToCard(current, false));
  goToCard(0, false);
  if (totalEl) totalEl.textContent = COUNT;
})();

// =====================================================
// CREATIVE FILTER TABS
// =====================================================
(function() {
  const tabs  = document.querySelectorAll('.cw-tab');
  const cards = document.querySelectorAll('.cwc');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('act'));
      this.classList.add('act');
      const filter = this.dataset.filter;
      cards.forEach((card, i) => {
        const show = filter === 'all' || card.dataset.cat === filter;
        if (show) {
          card.classList.remove('hidden');
          gsap.fromTo(card,
            { opacity:0, y:16, scale:.97 },
            { opacity:1, y:0, scale:1, duration:.5, delay: i*.06, ease:'cinema' }
          );
        } else {
          gsap.to(card, {
            opacity:0, y:-8, scale:.97, duration:.3, ease:'power2.in',
            onComplete: () => card.classList.add('hidden')
          });
        }
      });
    });
  });
})();

// =====================================================
// WEBSITE PREVIEW MODAL
// Click any .wcard → opens modal with iframe preview
// =====================================================
(function() {
  const modal    = document.getElementById('site-modal');
  const backdrop = document.getElementById('sm-backdrop');
  const closeBtn = document.getElementById('sm-close');
  const iframe   = document.getElementById('sm-iframe');
  const loading  = document.getElementById('sm-loading');
  const urlText  = document.getElementById('sm-url-text');
  const titleEl  = document.getElementById('sm-title');
  const tagsEl   = document.getElementById('sm-tags');
  const openBtn  = document.getElementById('sm-open-btn');
  if (!modal) return;

  function openModal(url, title, tags) {
    // Set info
    urlText.textContent = url.replace('https://','');
    titleEl.textContent = title;
    openBtn.href = url;

    // Build tags
    tagsEl.innerHTML = '';
    tags.split(',').forEach(tag => {
      const span = document.createElement('span');
      span.className = 'sm-tag';
      span.textContent = tag.trim();
      tagsEl.appendChild(span);
    });

    // Show loading spinner
    loading.classList.remove('hide');
    iframe.src = 'about:blank';

    // Open modal
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Load iframe after modal is open
    setTimeout(() => {
      iframe.src = url;
      iframe.onload = () => {
        gsap.to(loading, {
          opacity: 0, duration: .4,
          onComplete: () => loading.classList.add('hide')
        });
      };
    }, 120);

    // Entrance animation
    gsap.fromTo('.sm-box',
      { scale: .95, y: 20, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: .5, ease: 'cinema' }
    );
  }

  function closeModal() {
    gsap.to('.sm-box', {
      scale: .95, y: 16, opacity: 0,
      duration: .32, ease: 'power2.in',
      onComplete: () => {
        modal.classList.remove('open');
        document.body.style.overflow = '';
        iframe.src = 'about:blank';
        loading.classList.remove('hide');
        gsap.set('.sm-box', { clearProps: 'all' });
      }
    });
  }

  // Wire up card clicks
  document.querySelectorAll('.wcard[data-url]').forEach(card => {
    card.addEventListener('click', function(e) {
      // Don't open if user was dragging the carousel
      if (Math.abs(dragDeltaX) > 8) return;
      const url   = this.dataset.url;
      const title = this.dataset.title || 'Project';
      const tags  = this.dataset.tags  || '';
      if (url) openModal(url, title, tags);
    });
  });

  // Track drag delta to prevent modal opening on swipe
  let dragDeltaX = 0;
  const track = document.getElementById('wc-track');
  if (track) {
    track.addEventListener('mousedown', e => { dragDeltaX = 0; });
    window.addEventListener('mousemove', e => {
      if (e.buttons === 1) dragDeltaX += Math.abs(e.movementX);
    });
    window.addEventListener('mouseup', () => {
      setTimeout(() => { dragDeltaX = 0; }, 300);
    });
  }

  // Close on backdrop / close button / Escape
  backdrop.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // Add to cursor hover detection
  document.querySelectorAll('.wcard[data-url]').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
  });
})();