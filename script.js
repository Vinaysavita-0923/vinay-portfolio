/* =========================================================
   PERSISTENT BACKGROUND: STARS + SOLAR SYSTEM
   Runs for the whole session, independent of the opening intro.
   Fixed to the viewport so it doesn't move when the page scrolls.
   Dark mode only — hidden via CSS opacity in light mode; drawing
   is skipped while light mode is active to save CPU/battery.
   ========================================================= */

(function () {

  const canvas = document.getElementById('siteStars');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let stars = [];
  let planets = [];
  let sunRadius = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createStars();
    createPlanets();
  }

  function createStars() {
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.08 + 0.015,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function createPlanets() {
    // Orbit sizes and speeds scale with viewport so it looks right
    // on both phone and desktop screens.
    const unit = Math.min(canvas.width, canvas.height);
    sunRadius = unit * 0.03;

    const defs = [
      { orbit: 0.10, size: 5.5, speed: 0.00030, color: 'rgba(201,124, 75,0.9)' }, // rust
      { orbit: 0.17, size: 7.0, speed: 0.00021, color: 'rgba(143,168,201,0.9)' }, // icy blue
      { orbit: 0.25, size: 6.2, speed: 0.00015, color: 'rgba(217,160, 91,0.9)' }, // sandy
      { orbit: 0.33, size: 8.5, speed: 0.00010, color: 'rgba(110,124,145,0.9)' }, // slate
      { orbit: 0.42, size: 5.8, speed: 0.00007, color: 'rgba(178, 58, 46,0.9)' }, // red
    ];

    planets = defs.map(d => ({
      orbitRadius: unit * d.orbit,
      size: d.size,
      speed: d.speed,
      color: d.color,
      baseAngle: Math.random() * Math.PI * 2,
    }));
  }

  function drawScene(t) {
    const isLight =
      document.documentElement.getAttribute('data-theme') === 'light';

    if (isLight) {
      // Hidden by CSS opacity anyway — skip the drawing work.
      if (!prefersReducedMotion) requestAnimationFrame(drawScene);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars
    stars.forEach(s => {
      if (!prefersReducedMotion) {
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      }
      const twinkle = prefersReducedMotion
        ? 0.7
        : 0.5 + 0.5 * Math.sin(t / 900 + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.2 + twinkle * 0.4})`;
      ctx.fill();
    });

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Sun glow
    const glowR = sunRadius * 5;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grad.addColorStop(0, 'rgba(229,9,20,0.55)');
    grad.addColorStop(1, 'rgba(229,9,20,0)');
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Sun core
    ctx.beginPath();
    ctx.fillStyle = '#E50914';
    ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    planets.forEach(p => {
      const angle = p.baseAngle + t * p.speed;

      // Faint orbit path (flattened ellipse for a tilted, 3D feel)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.ellipse(cx, cy, p.orbitRadius, p.orbitRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      const x = cx + Math.cos(angle) * p.orbitRadius;
      const y = cy + Math.sin(angle) * p.orbitRadius * 0.4;

      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!prefersReducedMotion) requestAnimationFrame(drawScene);
  }

  resize();
  window.addEventListener('resize', resize);

  // Reduced-motion: draw one frozen frame (t = 0), no continuous animation.
  requestAnimationFrame(drawScene);

})();


/* =========================================================
   OPENING INTRO (Netflix-style ident)
   Types "VINAY.AI" letter by letter, then zooms the finished
   text in to fill the screen before revealing the site.
   ========================================================= */

(function () {

  const overlay = document.getElementById('introOverlay');
  const logo    = document.getElementById('introLogo');
  const glow    = document.getElementById('introGlow');
  const main    = document.getElementById('introMain');
  const accent  = document.getElementById('introAccent');
  const cursor  = document.getElementById('introCursor');
  const starsCanvas = document.getElementById('introStars');

  if (!overlay || !logo || !main || !accent) return;

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Respect reduced-motion: skip straight to the finished state, no animation.
  if (prefersReducedMotion) {
    overlay.remove();
    return;
  }

  // Live starfield behind the logo — small dots drifting slowly downward
  // with a gentle twinkle, drawn on canvas for smooth performance.
  let starsRAF = null;
  if (starsCanvas) {
    const ctx2d = starsCanvas.getContext('2d');
    let stars = [];

    function resizeStarsCanvas() {
      starsCanvas.width = window.innerWidth;
      starsCanvas.height = window.innerHeight;
    }

    function createStars() {
      const count = Math.floor((window.innerWidth * window.innerHeight) / 5500);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 1.3 + 0.3,
        speed: Math.random() * 0.15 + 0.03,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    resizeStarsCanvas();
    createStars();
    window.addEventListener('resize', () => {
      resizeStarsCanvas();
      createStars();
    });

    function drawStars(t) {
      ctx2d.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
      stars.forEach(s => {
        s.y += s.speed;
        if (s.y > starsCanvas.height) {
          s.y = 0;
          s.x = Math.random() * starsCanvas.width;
        }
        const twinkle = 0.5 + 0.5 * Math.sin(t / 600 + s.phase);
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(255,255,255,${0.25 + twinkle * 0.6})`;
        ctx2d.fill();
      });
      starsRAF = requestAnimationFrame(drawStars);
    }
    starsRAF = requestAnimationFrame(drawStars);
  }

  // Synthesized cinematic "boom" — generated in-browser, not a copied
  // sound file. Browsers block autoplay audio until the user has
  // interacted with the page, so this will silently do nothing on a
  // cold first load in most browsers. That's a browser security policy,
  // not something that can be worked around from the page's own code.
  function playIntroSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 1.1);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.4);
    } catch (e) {
      // Web Audio unavailable or blocked by browser policy — fail silently
    }
  }

  document.body.classList.add('intro-active');

  const MAIN_TEXT   = 'VINAY';
  const ACCENT_TEXT = '.AI';
  const TYPE_MS      = 90;   // delay between each letter
  const PAUSE_MS      = 350; // pause after typing finishes, before zoom
  const ZOOM_MS       = 900; // must match .intro-logo.zoom-in animation duration
  const FADE_MS       = 600; // must match .intro-overlay's CSS transition duration

  let i = 0;
  const fullText = MAIN_TEXT + ACCENT_TEXT;

  function typeNextChar() {
    if (i < fullText.length) {

      if (i < MAIN_TEXT.length) {
        main.textContent += fullText[i];
      } else {
        accent.textContent += fullText[i];
      }

      i++;
      setTimeout(typeNextChar, TYPE_MS);

    } else {
      // Typing done — pause briefly, then zoom in and fade out
      setTimeout(() => {
        logo.classList.add('zoom-in');
        if (glow) glow.classList.add('pulse');
        playIntroSound();

        setTimeout(() => {
          overlay.classList.add('intro-hide');
          document.body.classList.remove('intro-active');
          setTimeout(() => {
            overlay.remove();
            if (starsRAF) cancelAnimationFrame(starsRAF);
          }, FADE_MS);
        }, ZOOM_MS);

      }, PAUSE_MS);
    }
  }

  // Small initial delay so the page has settled before typing starts
  setTimeout(typeNextChar, 200);

})();


/* =========================================================
   HEADER
   ========================================================= */

// Header border changes slightly on scroll
const header = document.querySelector('.site-header');

if (header) {
  window.addEventListener('scroll', () => {

    header.style.borderBottomColor =
      window.scrollY > 20
        ? 'rgba(42,42,42,0.6)'
        : 'transparent';

  });
}


/* =========================================================
   DARK / LIGHT THEME
   ========================================================= */

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

const savedTheme = localStorage.getItem('theme');

function applyTheme(theme) {

  root.setAttribute('data-theme', theme);

  if (themeToggle) {
    themeToggle.textContent =
      theme === 'light' ? '🌙' : '☀️';
  }

}

applyTheme(
  savedTheme === 'light'
    ? 'light'
    : 'dark'
);


if (themeToggle) {

  themeToggle.addEventListener('click', () => {

    const next =
      root.getAttribute('data-theme') === 'light'
        ? 'dark'
        : 'light';

    applyTheme(next);

    localStorage.setItem('theme', next);

  });

}


/* =========================================================
   CERTIFICATE CURSOR POSITION ZOOM
   ========================================================= */

const certificateImages =
  document.querySelectorAll('.cert-image-wrap');


certificateImages.forEach(container => {

  const image =
    container.querySelector('.cert-image');

  if (!image) return;


  /* Mouse movement */

  container.addEventListener('mousemove', event => {

    // Disable zoom on mobile
    if (window.innerWidth <= 650) return;


    const rect =
      container.getBoundingClientRect();


    // Cursor position inside image
    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;


    // Convert position to percentage
    const xPercent =
      (x / rect.width) * 100;

    const yPercent =
      (y / rect.height) * 100;


    // Zoom follows cursor
    image.style.transformOrigin =
      `${xPercent}% ${yPercent}%`;


    image.style.transform =
      'scale(1.45)';

  });


  /* Mouse leaves image */

  container.addEventListener('mouseleave', () => {

    image.style.transform =
      'scale(1)';

    image.style.transformOrigin =
      'center center';

  });

});


/* =========================================================
   CERTIFICATE FULLSCREEN VIEWER
   ========================================================= */

const certificateModal =
  document.getElementById('certificateModal');

const modalCertificate =
  document.getElementById('modalCertificate');


/* Open certificate */

function openCertificate(imagePath) {

  if (!certificateModal || !modalCertificate) {
    return;
  }


  // Set selected certificate
  modalCertificate.src = imagePath;


  // Show modal
  certificateModal.classList.add('active');


  // Accessibility
  certificateModal.setAttribute(
    'aria-hidden',
    'false'
  );


  // Stop background scrolling
  document.body.style.overflow =
    'hidden';

}


/* Close certificate */

function closeCertificate() {

  if (!certificateModal || !modalCertificate) {
    return;
  }


  // Hide modal
  certificateModal.classList.remove('active');


  // Accessibility
  certificateModal.setAttribute(
    'aria-hidden',
    'true'
  );


  // Restore scrolling
  document.body.style.overflow =
    '';


  // Clear image after animation
  setTimeout(() => {

    if (
      !certificateModal.classList.contains('active')
    ) {

      modalCertificate.src = '';

    }

  }, 300);

}


/* =========================================================
   CLOSE MODAL — OUTSIDE CLICK
   ========================================================= */

if (certificateModal) {

  certificateModal.addEventListener(
    'click',
    event => {

      // Only close when clicking background
      if (event.target === certificateModal) {

        closeCertificate();

      }

    }
  );

}


/* =========================================================
   CLOSE MODAL — ESC KEY
   ========================================================= */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key === 'Escape' &&
      certificateModal &&
      certificateModal.classList.contains('active')
    ) {

      closeCertificate();

    }

  }
);
