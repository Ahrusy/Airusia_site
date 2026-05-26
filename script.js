/* ═══════════════════════════════════════════════════════════
   Airusia — script.js  v3.1  Genesis Teal Edition
   ═══════════════════════════════════════════════════════════ */

/* ── CONFIG (edit before deploy) ── */
const CFG = {
  telegram:    'https://t.me/Airusy',
  email:       'partner@airusia.com',
  pitchDeck:   '#',
  qrTarget:    'https://t.me/Airusy',
  // Telegram Bot API — set these to enable direct form delivery
  // Get token from @BotFather, chatId from @userinfobot
  tgBotToken:  '',   // e.g. '123456:ABC-DEF...'
  tgChatId:    '',   // e.g. '-1001234567890'
};

/* ════════════════════════════════════════
   PARTICLE HERO — chaos → order on scroll
   Optimised: spatial grid reduces O(N²) to ~O(N)
   ════════════════════════════════════════ */
class ParticleHero {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Fewer particles on mobile/low-end devices
    this.N = window.innerWidth < 768 ? 48 : 90;
    this.particles = [];
    this.mouse = { x: -9999, y: -9999 };
    this.scrollFactor = 0;
    this.raf = null;
    this.active = true;
    this._cellSize = 100; // spatial grid cell size

    this.resize();
    this.createParticles();
    this.bindEvents();
    this.loop();
  }

  resize() {
    this.W = this.canvas.offsetWidth || window.innerWidth;
    this.H = this.canvas.offsetHeight || window.innerHeight;
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
    this.computeGrid();
  }

  computeGrid() {
    const aspect = this.W / this.H;
    const cols = Math.round(Math.sqrt(this.N * aspect));
    const rows = Math.ceil(this.N / cols);
    const padX = this.W * .1, padY = this.H * .15;
    const stepX = (this.W - padX * 2) / Math.max(cols - 1, 1);
    const stepY = (this.H - padY * 2) / Math.max(rows - 1, 1);
    this._grid = { cols, rows, padX, padY, stepX, stepY };
  }

  createParticles() {
    const { cols, padX, padY, stepX, stepY } = this._grid;
    this.particles = Array.from({ length: this.N }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        cx: Math.random() * this.W,
        cy: Math.random() * this.H,
        gx: padX + col * stepX,
        gy: padY + row * stepY,
        vx: (Math.random() - .5) * .6,
        vy: (Math.random() - .5) * .6,
        r:  Math.random() * 2.2 + 1.2,
        op: Math.random() * .45 + .35,
        t:  Math.random() * Math.PI * 2,
        ts: .003 + Math.random() * .004,
      };
    });
  }

  /* Build spatial hash grid for O(1) neighbour lookup */
  _buildSpatialGrid(maxDist) {
    const cellSize = maxDist;
    const grid = new Map();
    this.particles.forEach((p, i) => {
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    });
    return { grid, cellSize };
  }

  loop() {
    if (!this.active) return;
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    const sf = this.scrollFactor;
    const sfEased = sf * sf * (3 - 2 * sf); // smoothstep

    this.particles.forEach(p => {
      if (sf < .95) {
        p.t += p.ts;
        p.cx += p.vx + Math.sin(p.t) * .2;
        p.cy += p.vy + Math.cos(p.t) * .2;
        if (p.cx < 0)   { p.cx = 0;   p.vx *= -1; }
        if (p.cx > W)   { p.cx = W;   p.vx *= -1; }
        if (p.cy < 0)   { p.cy = 0;   p.vy *= -1; }
        if (p.cy > H)   { p.cy = H;   p.vy *= -1; }
      }
      p.x = p.cx + (p.gx - p.cx) * sfEased;
      p.y = p.cy + (p.gy - p.cy) * sfEased;

      // Mouse repulsion
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90 && dist > 0) {
        const force = ((90 - dist) / 90) * 18;
        p.x += (dx / dist) * force;
        p.y += (dy / dist) * force;
      }
    });

    // Draw connections using spatial grid — O(N) instead of O(N²)
    const maxDist = 80 + sfEased * 100;
    const { grid, cellSize } = this._buildSpatialGrid(maxDist);

    const visited = new Set();
    this.particles.forEach((a, i) => {
      const cx = Math.floor(a.x / cellSize);
      const cy = Math.floor(a.y / cellSize);
      for (let nx = cx - 1; nx <= cx + 1; nx++) {
        for (let ny = cy - 1; ny <= cy + 1; ny++) {
          const neighbours = grid.get(`${nx},${ny}`);
          if (!neighbours) continue;
          neighbours.forEach(j => {
            if (j <= i) return;
            const key = i * this.N + j;
            if (visited.has(key)) return;
            visited.add(key);
            const b = this.particles[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < maxDist) {
              const alpha = (1 - d / maxDist) * (.14 + sfEased * .22);
              ctx.beginPath();
              ctx.strokeStyle = `rgba(40,184,160,${alpha.toFixed(3)})`;
              ctx.lineWidth = .5 + sfEased * .5;
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          });
        }
      }
    });

    // Draw dots
    this.particles.forEach(p => {
      const r = p.r + sfEased * 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      const glow = sfEased > .3 ? sfEased * .3 : 0;
      ctx.fillStyle = `rgba(40,184,160,${(p.op + glow).toFixed(3)})`;
      ctx.fill();
    });

    this.raf = requestAnimationFrame(() => this.loop());
  }

  setScroll(v) {
    this.scrollFactor = Math.min(1, Math.max(0, v));
  }

  bindEvents() {
    window.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.resize();
        this.createParticles();
      }, 150);
    }, { passive: true });
  }

  destroy() {
    this.active = false;
    cancelAnimationFrame(this.raf);
  }
}

/* ════════════════════════════════════════
   SCROLL PROGRESS BAR
   ════════════════════════════════════════ */
function initScrollBar() {
  const bar = document.getElementById('scroll-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
}

/* ════════════════════════════════════════
   STICKY NAV + MOBILE MENU (with focus trap)
   ════════════════════════════════════════ */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('mobile-menu');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (burger && menu) {
    const focusableSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const openMenu = () => {
      menu.classList.add('open');
      burger.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Move focus to first link in menu
      const firstLink = menu.querySelector('a');
      if (firstLink) firstLink.focus();
    };

    const closeMenu = () => {
      menu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      burger.focus();
    };

    burger.addEventListener('click', () => {
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });

    // Focus trap inside mobile menu
    menu.addEventListener('keydown', e => {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(menu.querySelectorAll(focusableSelectors));
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });

    // Close on Escape from anywhere
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
    });
  }

  // Active link highlight
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-link[href^="#"]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        links.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: .3 });
  sections.forEach(s => io.observe(s));
}

/* ════════════════════════════════════════
   CUSTOM CURSOR
   ════════════════════════════════════════ */
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let rx = 0, ry = 0;
  const LERP = .12;

  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  function tick() {
    rx += (mx - rx) * LERP;
    ry += (my - ry) * LERP;
    dot.style.transform  = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  }
  tick();
}

/* ════════════════════════════════════════
   SCROLL REVEALS  (will-change applied only during animation)
   ════════════════════════════════════════ */
function initReveals() {
  const items = document.querySelectorAll('.r, .r-left, .r-right');
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const delay = parseInt(el.dataset.d || '0', 10);
        // Set will-change just before animation starts
        el.style.willChange = 'opacity, transform';
        setTimeout(() => {
          el.classList.add('in');
          // Remove will-change after transition ends to free compositor layer
          el.addEventListener('transitionend', () => {
            el.style.willChange = 'auto';
          }, { once: true });
        }, delay);
        io.unobserve(el);
      }
    });
  }, { threshold: .12 });

  items.forEach(el => io.observe(el));
}

/* ════════════════════════════════════════
   LAYER STACK (Block 3)
   ════════════════════════════════════════ */
function initLayerStack() {
  const outer  = document.getElementById('layers-outer');
  const cards  = document.querySelectorAll('.layer-card');
  const dots   = document.querySelectorAll('.lp-dot');
  if (!outer || !cards.length) return;

  // On tablet/mobile, skip sticky logic — cards shown as plain list
  if (window.innerWidth <= 1024) {
    cards.forEach(c => c.classList.add('visible'));
    return;
  }

  const total = cards.length;

  function update() {
    const rect = outer.getBoundingClientRect();
    const outerH = outer.offsetHeight;
    const progress = -rect.top / (outerH - window.innerHeight);
    const clamped  = Math.max(0, Math.min(1, progress));
    const activeIdx = Math.min(total - 1, Math.floor(clamped * total));

    cards.forEach((card, i) => {
      card.classList.remove('visible', 'stacked');
      card.style.removeProperty('--stack-i');

      if (i < activeIdx) {
        card.classList.add('stacked');
        card.style.setProperty('--stack-i', String(activeIdx - i));
        card.style.zIndex = i;
      } else if (i === activeIdx) {
        card.classList.add('visible');
        card.style.zIndex = total;
      } else {
        card.style.zIndex = i;
      }
    });

    dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ════════════════════════════════════════
   COUNTER ANIMATION (Block 4)
   ════════════════════════════════════════ */
function animateCounter(el) {
  const raw    = el.dataset.val || el.textContent;
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const target = parseFloat(raw.replace(/[^0-9.]/g, ''));
  const decimals = (raw.includes('.')) ? (raw.split('.')[1] || '').length : 0;

  const dur  = 1800;
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / dur, 1);
    const val = target * ease(t);
    el.textContent = prefix + val.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = prefix + raw + suffix;
  }
  requestAnimationFrame(frame);
}

function initCounters() {
  const items = document.querySelectorAll('[data-counter]');
  if (!items.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: .5 });
  items.forEach(el => io.observe(el));
}

/* ════════════════════════════════════════
   SVG PATH DRAW (Problem diagrams)
   ════════════════════════════════════════ */
function initPathDraw() {
  const paths = document.querySelectorAll('[data-draw]');
  if (!paths.length) return;
  paths.forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 200;
    p.style.strokeDasharray  = len;
    p.style.strokeDashoffset = len;
    p.style.transition = 'none';
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.drawDelay || '0', 10);
        const dur   = parseInt(e.target.dataset.drawDur   || '900', 10);
        setTimeout(() => {
          e.target.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.16,1,.3,1)`;
          e.target.style.strokeDashoffset = '0';
        }, delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: .2 });
  paths.forEach(p => io.observe(p));
}

/* ════════════════════════════════════════
   HERO PARTICLE + SCROLL
   ════════════════════════════════════════ */
function initHeroParticle() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // On low-end mobile, use fewer particles but keep canvas running

  const ph = new ParticleHero(canvas);
  const hero = document.getElementById('hero');
  if (!hero) return;

  window.addEventListener('scroll', () => {
    const rect = hero.getBoundingClientRect();
    const progress = -rect.top / (hero.offsetHeight * .8);
    ph.setScroll(Math.max(0, Math.min(1, progress)));
  }, { passive: true });
}

/* ════════════════════════════════════════
   QR CODE  (SRI hash for CDN integrity)
   ════════════════════════════════════════ */
function initQR() {
  const wrapper = document.getElementById('qr-canvas');
  if (!wrapper) return;

  const s = document.createElement('script');
  s.src         = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.integrity   = 'sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSi2jPyLWVjpmbxesi3CI9bRFqYkj2/5+NN3Q==';
  s.crossOrigin = 'anonymous';
  s.referrerPolicy = 'no-referrer';
  s.onload = () => {
    try {
      new QRCode(wrapper, {
        text:          CFG.qrTarget,
        width:         160,
        height:        160,
        colorDark:     '#06131A',
        colorLight:    '#ffffff',
        correctLevel:  QRCode.CorrectLevel.H,
      });
    } catch (e) { console.warn('QR failed', e); }
  };
  s.onerror = () => {
    // Fallback: show a plain link if QR fails to load
    wrapper.innerHTML = `<a href="${CFG.qrTarget}" target="_blank" rel="noopener" style="color:var(--teal);font-size:.8rem;">Открыть Telegram</a>`;
  };
  document.head.appendChild(s);
}

/* ════════════════════════════════════════
   PRIVACY MODAL
   ════════════════════════════════════════ */
function initPrivacyModal() {
  const overlay = document.getElementById('privacy-modal');
  const closeBtn = document.getElementById('modal-close');
  const triggers = document.querySelectorAll('[data-modal="privacy"]');
  if (!overlay) return;

  const open  = () => { overlay.classList.add('open');  overlay.removeAttribute('aria-hidden'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };

  triggers.forEach(t => t.addEventListener('click', e => { e.preventDefault(); open(); }));
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
}

/* ════════════════════════════════════════
   COOKIE CONSENT
   ════════════════════════════════════════ */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  if (localStorage.getItem('Airusia_cookie')) return;

  setTimeout(() => banner.classList.add('show'), 1200);

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('Airusia_cookie', 'accepted');
    banner.classList.remove('show');
  });
  document.getElementById('cookie-reject')?.addEventListener('click', () => {
    localStorage.setItem('Airusia_cookie', 'rejected');
    banner.classList.remove('show');
  });
}

/* ════════════════════════════════════════
   LINKS CONFIG
   ════════════════════════════════════════ */
function initLinks() {
  document.querySelectorAll('[data-href="telegram"]').forEach(el => { el.href = CFG.telegram; });
  document.querySelectorAll('[data-href="email"]').forEach(el => { el.href = 'mailto:' + CFG.email; });
  document.querySelectorAll('[data-href="deck"]').forEach(el => {
    el.href = CFG.pitchDeck;
    if (CFG.pitchDeck === '#') {
      el.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });
}

/* ════════════════════════════════════════
   MARKET CIRCLES animation
   ════════════════════════════════════════ */
function initMarketCircles() {
  const circles = document.querySelectorAll('[data-circle]');
  if (!circles.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.circleDelay || '0', 10);
        setTimeout(() => {
          e.target.style.transition = `r .9s cubic-bezier(.16,1,.3,1) ${delay}ms, opacity .6s ease ${delay}ms`;
          e.target.setAttribute('r', e.target.dataset.rTarget || '80');
          e.target.style.opacity = '1';
        }, 100);
        io.unobserve(e.target);
      }
    });
  }, { threshold: .3 });
  circles.forEach(c => { c.style.opacity = '0'; io.observe(c); });
}

/* ════════════════════════════════════════
   TYPEWRITER EFFECT (Hero subtitle)
   ════════════════════════════════════════ */
function initTypewriter() {
  const el = document.getElementById('type-word');
  if (!el) return;
  const words = [
    'CRM-систем', 'VPS-серверов', 'AI-решений',
    'финтех-сервисов', 'телефонии', 'эквайринга', 'SaaS-продуктов',
  ];
  let idx = 0, charIdx = words[0].length, deleting = false;

  function tick() {
    const word = words[idx];
    if (!deleting) {
      el.textContent = word.slice(0, ++charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(tick, 2200);
      } else {
        setTimeout(tick, 75);
      }
    } else {
      el.textContent = word.slice(0, --charIdx);
      if (charIdx === 0) {
        deleting = false;
        idx = (idx + 1) % words.length;
        setTimeout(tick, 280);
      } else {
        setTimeout(tick, 38);
      }
    }
  }

  // Start after hero animations settle
  setTimeout(tick, 2400);
}

/* ════════════════════════════════════════
   BOOT
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initScrollBar();
  initNav();
  initCursor();
  initReveals();
  initHeroParticle();
  initLayerStack();
  initCounters();
  initPathDraw();
  initQR();
  initPrivacyModal();
  initCookieBanner();
  initLinks();
  initMarketCircles();
});
