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
  const startScreen = document.getElementById('startScreen');

  if (!overlay || !logo || !main || !accent) return;

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Respect reduced-motion: skip straight to the finished state, no animation.
  if (prefersReducedMotion) {
    if (startScreen) startScreen.remove();
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

  // Small initial delay so the page has settled before typing starts.
  // Before the name types, a 0→100% counter plays inside a circular
  // tick-ring (see buildTickRing/runCounter below) — matches the
  // "Enter Site" moment feeling like something is actually loading.
  const introCounterWrap = document.getElementById('introCounterWrap');
  const introCounter     = document.getElementById('introCounter');
  const introTickRing    = document.getElementById('introTickRing');

  const TICK_COUNT = 60;

  function buildTickRing() {
    if (!introTickRing || introTickRing.children.length) return [];
    const ticks = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'intro-tick-wrap';
      wrap.style.transform = `rotate(${(360 / TICK_COUNT) * i}deg)`;
      const t = document.createElement('div');
      t.className = 'intro-tick';
      wrap.appendChild(t);
      introTickRing.appendChild(wrap);
      ticks.push(t);
    }
    return ticks;
  }

  const ringTicks = buildTickRing();

  function runCounter(onDone) {

    if (!introCounterWrap || !introCounter) { onDone(); return; }

    const DURATION = 1600; // ms — total count-up time
    const start = performance.now();

    function tick(now) {

      const progress = Math.min((now - start) / DURATION, 1);
      // Ease-out: counts fast at first, settles into the last few
      // numbers near 100 — reads more natural than a linear count.
      const eased = 1 - Math.pow(1 - progress, 2);
      const value = Math.round(eased * 100);
      introCounter.textContent = value;

      // Light up ticks clockwise from the top, in step with the
      // percentage, like a segmented radial progress ring.
      const activeCount = Math.round((value / 100) * ringTicks.length);
      ringTicks.forEach((t, i) => {
        t.classList.toggle('active', i < activeCount);
      });

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        introCounter.textContent = '100';
        ringTicks.forEach(t => t.classList.add('active'));
        introCounterWrap.classList.add('intro-counter-done');
        setTimeout(onDone, 400); // let the counter's fade-out finish
      }

    }

    requestAnimationFrame(tick);

  }

  function beginIntro() {
    runCounter(() => {
      if (introCounterWrap) introCounterWrap.classList.add('intro-counter-gone');
      if (logo) logo.classList.add('intro-logo-visible');
      setTimeout(typeNextChar, 150);
    });
  }

  // Wait for the visitor to click/tap "Enter Site" before the typing
  // intro (and its sound) starts. This also satisfies the browser's
  // autoplay-audio policy, since playIntroSound() now runs inside a
  // genuine user click gesture instead of on page load.
  if (startScreen) {

    let started = false;

    const enterSite = () => {
      if (started) return;
      started = true;

      startScreen.classList.add('start-hide');
      startScreen.setAttribute('aria-hidden', 'true');

      setTimeout(() => {
        startScreen.remove();
      }, 650);

      beginIntro();
    };

    startScreen.addEventListener('click', enterSite);

  } else {
    beginIntro();
  }

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
   MOBILE NAV — HAMBURGER DRAWER
   ========================================================= */

const navToggle   = document.getElementById('navToggle');
const primaryNav  = document.getElementById('primaryNav');
const navBackdrop = document.getElementById('navBackdrop');

if (navToggle && primaryNav && navBackdrop) {

  function openNav() {
    primaryNav.classList.add('nav-open');
    navBackdrop.classList.add('nav-backdrop-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    primaryNav.classList.remove('nav-open');
    navBackdrop.classList.remove('nav-backdrop-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.contains('nav-open');
    isOpen ? closeNav() : openNav();
  });

  // Close on backdrop click, on any nav link click (so tapping a
  // section jumps there and the drawer gets out of the way), and
  // on Escape. The drawer is now used at every screen width, so
  // there's no breakpoint to auto-close on resize any more.
  navBackdrop.addEventListener('click', closeNav);

  primaryNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryNav.classList.contains('nav-open')) {
      closeNav();
    }
  });

  // Highlight the nav link for whichever section is currently in view,
  // so the drawer shows you where you are on the page, not just a
  // flat link list.
  const navLinks = Array.from(primaryNav.querySelectorAll('a[href^="#"]'));
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (sections.length) {
    const setActive = (id) => {
      navLinks.forEach(link => {
        link.classList.toggle('nav-link-active', link.getAttribute('href') === `#${id}`);
      });
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach(section => sectionObserver.observe(section));
  }

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
   CERTIFICATES / EDITING — VIEW MORE / VIEW LESS TOGGLE
   Shared by any button with data-toggle-grid pointing at a
   grid's CSS selector, so certificates and editing (and any
   future section) can reuse the same behaviour.
   ========================================================= */

function setupViewMoreToggle(buttonId, gridSelector, moreLabel, lessLabel) {

  const button = document.getElementById(buttonId);
  if (!button) return;

  const grid =
    button.closest('section')
      ? button.closest('section').querySelector(gridSelector)
      : null;

  if (!grid) return;

  button.addEventListener('click', () => {

    const isExpanded =
      grid.classList.toggle('expanded');

    button.setAttribute(
      'aria-expanded',
      isExpanded ? 'true' : 'false'
    );

    button.textContent =
      isExpanded ? lessLabel : moreLabel;

    // If collapsing, scroll back up to the section so the
    // user isn't left staring at empty space below the fold
    if (!isExpanded) {

      button
        .closest('section')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });

    }

  });

}

setupViewMoreToggle(
  'certToggleBtn',
  '.cert-grid',
  'View More Certificates ↓',
  'View Less Certificates ↑'
);

setupViewMoreToggle(
  'editToggleBtn',
  '.edit-grid',
  'View More Edits ↓',
  'View Less Edits ↑'
);


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


/* =========================================================
   SKILL DETAIL MODAL
   ========================================================= */

const SKILL_INFO = {
  python: {
    title: 'Python',
    desc: "A general-purpose, readable programming language — the primary language used for machine learning, data analysis, and automation.",
    points: [
      'Huge ecosystem of ML/DL libraries: NumPy, Pandas, PyTorch, TensorFlow, Scikit-learn',
      'Fast to prototype and iterate on experiments',
      'Used here for data preprocessing, model training, and scripting'
    ]
  },
  cpp: {
    title: 'C++',
    desc: 'A fast, compiled, low-level language used when performance and direct memory control matter.',
    points: [
      'Used in coursework for data structures and algorithms',
      'Builds a foundation for understanding how ML frameworks work under the hood',
      'Useful for performance-critical and embedded/signal-processing tasks'
    ]
  },
  html5: {
    title: 'HTML5',
    desc: 'The markup language used to structure content on the web — the backbone of every page on this site.',
    points: [
      'Used to build this entire portfolio from scratch',
      'Semantic structure for accessibility and SEO',
      'Pairs with CSS and JavaScript for full front-end control'
    ]
  },
  css3: {
    title: 'CSS3',
    desc: 'The styling language used to control layout, color, animation, and responsiveness.',
    points: [
      "Used for this site's dark/light themes, animations, and responsive layout",
      'Flexbox and Grid for layout, custom properties for theming',
      'No CSS framework — hand-written for full control'
    ]
  },
  'scikit-learn': {
    title: 'Scikit-learn',
    desc: 'A Python library for classical machine learning — classification, regression, clustering, and model evaluation.',
    points: [
      'Used for baseline ML models and evaluation metrics',
      'A simple, consistent API across many algorithms',
      'Good for quick experimentation before moving to deep learning'
    ]
  },
  pytorch: {
    title: 'PyTorch',
    desc: 'A deep learning framework used to build, train, and debug neural networks with a flexible, Pythonic API.',
    points: [
      'Used for building hybrid deep learning models, e.g. ECG arrhythmia detection',
      'Dynamic computation graph makes debugging and experimentation easier',
      'Widely used in research, so most papers/code are reproducible in it'
    ]
  },
  tensorflow: {
    title: 'TensorFlow',
    desc: 'A deep learning framework built for both research and production-scale deployment of ML models.',
    points: [
      'Used alongside PyTorch to compare model architectures',
      'Strong tooling for deployment and production pipelines',
      'The Keras API makes building standard architectures fast'
    ]
  },
  numpy: {
    title: 'NumPy',
    desc: 'The core numerical computing library in Python — fast array operations that nearly every ML tool is built on.',
    points: [
      'Used for the array/matrix math underlying model and signal-processing code',
      'Vectorized operations are far faster than plain Python loops',
      'The foundation that Pandas, Scikit-learn, and PyTorch build on'
    ]
  },
  pandas: {
    title: 'Pandas',
    desc: 'A data-analysis library for loading, cleaning, and exploring tabular and time-series data.',
    points: [
      'Used to clean and structure datasets before training models',
      'The DataFrame API makes filtering, grouping, and merging data straightforward',
      'A key tool for exploratory data analysis (EDA)'
    ]
  },
  matplotlib: {
    title: 'Matplotlib',
    desc: 'A plotting library used to visualize data, training curves, and model results.',
    points: [
      'Used to plot signals (e.g. ECG waveforms), metrics, and confusion matrices',
      "Visualizing results is essential for debugging and explaining a model's behavior",
      'Works directly with NumPy and Pandas data structures'
    ]
  },
  anaconda: {
    title: 'Anaconda',
    desc: 'A Python distribution and environment manager used to keep ML projects and their dependencies isolated and reproducible.',
    points: [
      'Used to manage separate environments per project',
      'Avoids dependency conflicts between different libraries and versions',
      'Bundles common data-science packages out of the box'
    ]
  },
  git: {
    title: 'Git',
    desc: "A version control system used to track changes to code and collaborate without overwriting each other's work.",
    points: [
      'Used to version this portfolio and other project repositories',
      'Enables branching, experimentation, and safe rollbacks',
      'Works with GitHub for collaboration and hosting'
    ]
  },
  jupyter: {
    title: 'Jupyter',
    desc: 'An interactive notebook environment for writing and running code alongside notes, plots, and results.',
    points: [
      'Used for exploratory data analysis and model prototyping',
      'Code runs in cells with output and plots shown immediately',
      "Documents an experiment's reasoning alongside the code"
    ]
  },
  'google-colab': {
    title: 'Google Colab',
    desc: 'A free, cloud-hosted Jupyter notebook environment with GPU/TPU access.',
    points: [
      'Used to train models without needing a local GPU',
      'Easy to share notebooks and reproduce experiments',
      'Good for running heavier deep-learning training jobs'
    ]
  },
  vscode: {
    title: 'VS Code',
    desc: 'A lightweight, extensible code editor used for most day-to-day development.',
    points: [
      'The primary editor for this portfolio and other projects',
      'Extensions for Python, linting, Git, and live previews speed up development',
      'An integrated terminal keeps the whole workflow in one place'
    ]
  },
  'power-bi': {
    title: 'Power BI',
    desc: 'A business-intelligence tool used to build interactive dashboards and visualize data for decision-making.',
    points: [
      'Used to turn raw datasets into interactive, shareable dashboards',
      'Useful for communicating results to non-technical audiences',
      'Complements Python-based analysis with polished reporting'
    ]
  },
  'explainable-ai': {
    title: 'Explainable AI',
    desc: "Techniques that make a machine learning model's predictions understandable to humans, instead of treating it as a black box.",
    points: [
      'A core focus of the ECG arrhythmia detection and similar classification work',
      'Builds trust by showing why a model made a decision, not just the output',
      'Important in high-stakes domains like healthcare diagnostics'
    ]
  },
  qml: {
    title: 'Quantum Machine Learning (QML)',
    desc: 'An emerging field that combines quantum computing with machine learning to explore new ways of processing data.',
    points: [
      'Explored as a research interest alongside classical ML',
      'Investigates whether quantum circuits can speed up or improve certain ML tasks',
      'Still largely experimental, but a promising area to build early expertise in'
    ]
  },
  'signal-processing': {
    title: 'Signal Processing',
    desc: 'Techniques for analyzing and transforming signals, such as biomedical waveforms, to extract meaningful information.',
    points: [
      'Used to preprocess ECG signals before feeding them into ML models',
      'Filtering and feature extraction improve model accuracy and robustness',
      'Bridges an electronics/communication background with ML work'
    ]
  },
  'ai-agents': {
    title: 'AI Agents',
    desc: 'Systems that use LLMs and automation to perform multi-step tasks autonomously, rather than just answering a single prompt.',
    points: [
      'Explored for building automated workflows and tools',
      'Combines reasoning, tool use, and memory to complete tasks',
      'A fast-growing area connecting traditional ML with modern LLM-based systems'
    ]
  },
  'web-development': {
    title: 'Web Development',
    desc: 'Building and shipping real, usable interfaces — like this portfolio — instead of keeping work stuck in notebooks.',
    points: [
      'Used to design and build this entire site: HTML, CSS, and JavaScript',
      'Turns ML and research work into something people can actually interact with',
      'Covers front-end structure, styling, responsiveness, and interactivity'
    ]
  }
};

const skillModal       = document.getElementById('skillModal');
const skillModalIcon   = document.getElementById('skillModalIcon');
const skillModalTitle  = document.getElementById('skillModalTitle');
const skillModalDesc   = document.getElementById('skillModalDesc');
const skillModalPoints = document.getElementById('skillModalPoints');

function openSkillModal(key, iconHTML) {
  const data = SKILL_INFO[key];
  if (!data || !skillModal) return;

  if (skillModalIcon) skillModalIcon.innerHTML = iconHTML || '';
  skillModalTitle.textContent = data.title;
  skillModalDesc.textContent = data.desc;
  skillModalPoints.innerHTML = data.points.map(p => `<li>${p}</li>`).join('');

  skillModal.classList.add('active');
  skillModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeSkillModal() {
  if (!skillModal) return;
  skillModal.classList.remove('active');
  skillModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('.skill-chip[data-skill]').forEach(chip => {
  chip.addEventListener('click', () => {
    const svg = chip.querySelector('svg');
    openSkillModal(chip.dataset.skill, svg ? svg.outerHTML : '');
  });
});

if (skillModal) {
  skillModal.addEventListener('click', (event) => {
    if (event.target === skillModal) closeSkillModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && skillModal.classList.contains('active')) {
      closeSkillModal();
    }
  });
}

/* =========================================================
   PROJECT DETAIL MODAL
   Reads its content straight from the clicked project card
   (title, Problem/Approach/Outcome, tech tags, action links)
   instead of duplicating it in JS, so the two stay in sync.
   ========================================================= */

const projectModal          = document.getElementById('projectModal');
const projectModalCard      = document.getElementById('projectModalCard');
const projectModalGraphic   = document.getElementById('projectModalGraphic');
const projectModalVisual    = document.getElementById('projectModalVisualLabel');
const projectModalEyebrow   = document.getElementById('projectModalEyebrow');
const projectModalTitle     = document.getElementById('projectModalTitle');
const projectModalFields    = document.getElementById('projectModalFields');
const projectModalTags      = document.getElementById('projectModalTags');
const projectModalActions   = document.getElementById('projectModalActions');

// Pulse waveform for signal-based (ECG) projects.
const PROJECT_GRAPHIC_PULSE = `
  <svg class="project-waveform" viewBox="0 0 220 60" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,30 L55,30 L65,8 L75,52 L85,30 L120,30 L128,16 L136,44 L144,30 L220,30" />
  </svg>
`;

// Brain-connectivity graphic for EEG-based projects: a small network
// of nodes and connecting lines instead of a pulse waveform.
const PROJECT_GRAPHIC_NETWORK = `
  <svg class="project-network" viewBox="0 0 160 140" aria-hidden="true">
    <g class="project-network-lines">
      <line x1="30" y1="30" x2="80" y2="20"/>
      <line x1="80" y1="20" x2="130" y2="40"/>
      <line x1="30" y1="30" x2="50" y2="70"/>
      <line x1="50" y1="70" x2="80" y2="20"/>
      <line x1="50" y1="70" x2="100" y2="80"/>
      <line x1="80" y1="20" x2="100" y2="80"/>
      <line x1="100" y1="80" x2="130" y2="40"/>
      <line x1="50" y1="70" x2="40" y2="110"/>
      <line x1="100" y1="80" x2="110" y2="115"/>
      <line x1="40" y1="110" x2="110" y2="115"/>
      <line x1="130" y1="40" x2="140" y2="90"/>
      <line x1="100" y1="80" x2="140" y2="90"/>
    </g>
    <g class="project-network-nodes">
      <circle cx="30" cy="30" r="4"/>
      <circle cx="80" cy="20" r="5"/>
      <circle cx="130" cy="40" r="4"/>
      <circle cx="50" cy="70" r="5"/>
      <circle cx="100" cy="80" r="4"/>
      <circle cx="40" cy="110" r="3.5"/>
      <circle cx="110" cy="115" r="4"/>
      <circle cx="140" cy="90" r="3.5"/>
    </g>
  </svg>
`;

// Rich "live" EEG visual: glowing brain art + an animated 8-channel
// waveform monitor, built and redrawn on a requestAnimationFrame loop
// only while this project's modal is open.
const EEG_CHANNEL_NAMES = ['Fp1', 'Fp2', 'F7', 'F8', 'T3', 'T4', 'O1', 'O2'];
let eegMonitorRAF = null;
let eegMonitorFrame = 0;

function eegGraphicHTML(imgSrc, label) {
  return `
    <div class="eeg-visual">
      <div class="eeg-brain-stage">
        <div class="eeg-brain-halo"></div>
        <div class="eeg-brain-art-wrap">
          <img class="eeg-brain-art" src="${imgSrc}" alt="${label}" loading="lazy">
        </div>
        <p class="eeg-brain-label"><span>●</span>NEURAL ACTIVITY / VISUALIZATION</p>
      </div>
      <div class="eeg-panel">
        <div class="eeg-panel-header">
          <div>
            <p class="eeg-eyebrow">Neuro-signal monitoring</p>
            <h4 class="eeg-title">EEG Signal</h4>
          </div>
          <span class="eeg-live"><span class="eeg-live-dot"></span>LIVE VISUAL</span>
        </div>
        <div class="eeg-channels" id="eegChannels"></div>
        <div class="eeg-time-axis"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        <div class="eeg-panel-footer">
          <span class="eeg-status">SIGNAL ANIMATION ACTIVE</span>
        </div>
      </div>
    </div>
  `;
}

function eegWavePath(index, phase, secondary) {
  const width = 600, height = 24, center = 12;
  const amp = (secondary ? 3 : 5) + (index % 3) * 1.1;
  const frequency = 0.055 + index * 0.004;
  let d = '';
  for (let x = 0; x <= width; x += 4) {
    const t = x * frequency + phase + index * .83;
    let y = center
      + Math.sin(t) * amp * .55
      + Math.sin(t * 2.35 + index) * amp * .24
      + Math.sin(t * .42 + index * 2) * amp * .42;
    const spikeCenter = ((phase * 21 + index * 61) % 190 + 190) % 190;
    const dist = Math.abs((x % 190) - spikeCenter);
    if (!secondary && dist < 8 && index > 1 && index < 5) y -= (8 - dist) * 0.9;
    y = Math.max(2, Math.min(height - 2, y));
    d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(2) + ' ';
  }
  return d;
}

function startEegMonitor() {
  const host = document.getElementById('eegChannels');
  if (!host) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = EEG_CHANNEL_NAMES.map((name, i) => {
    const row = document.createElement('div');
    row.className = 'eeg-channel';
    const label = document.createElement('div');
    label.className = 'eeg-channel-label';
    label.textContent = name;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'eeg-trace');
    svg.setAttribute('viewBox', '0 0 600 24');
    svg.setAttribute('preserveAspectRatio', 'none');
    const back = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    back.setAttribute('class', 'secondary');
    const front = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.append(back, front);
    row.append(label, svg);
    host.appendChild(row);
    return { back, front, index: i };
  });

  eegMonitorFrame = 0;
  function draw() {
    eegMonitorFrame += reducedMotion ? 0 : 0.035;
    rows.forEach(({ back, front, index }) => {
      back.setAttribute('d', eegWavePath(index, eegMonitorFrame * .8 - 1.5, true));
      front.setAttribute('d', eegWavePath(index, eegMonitorFrame * (0.85 + index * .025), false));
    });
    if (!reducedMotion) eegMonitorRAF = requestAnimationFrame(draw);
  }
  draw();
}

function stopEegMonitor() {
  if (eegMonitorRAF) {
    cancelAnimationFrame(eegMonitorRAF);
    eegMonitorRAF = null;
  }
}

function openProjectModal(caseEl) {
  if (!projectModal) return;

  const tagText   = caseEl.querySelector('.case-top .tag')?.textContent.trim() || '';
  const idText    = caseEl.querySelector('.case-top span')?.textContent.trim() || '';
  const title     = caseEl.querySelector('h3')?.textContent.trim() || '';
  const fields    = Array.from(caseEl.querySelectorAll('.case-grid > div'));
  const tags      = Array.from(caseEl.querySelectorAll('.tech-tag')).map(t => t.outerHTML);
  const actions   = Array.from(caseEl.querySelectorAll('.case-actions a')).map(a => a.outerHTML);
  const visualType = caseEl.dataset.visualType;

  projectModalEyebrow.textContent = [idText, tagText].filter(Boolean).join(' · ');
  projectModalTitle.textContent = title;

  stopEegMonitor();
  projectModalCard.classList.toggle('project-modal-card--wide', visualType === 'eeg-live');

  if (visualType === 'eeg-live' && caseEl.dataset.visualSrc) {
    projectModalVisual.textContent = '';
    projectModalGraphic.innerHTML = eegGraphicHTML(caseEl.dataset.visualSrc, caseEl.dataset.visualLabel || 'EEG visualization');
    startEegMonitor();
  } else if (visualType === 'image' && caseEl.dataset.visualSrc) {
    projectModalVisual.textContent = caseEl.dataset.visualLabel || 'Signal Visualization';
    projectModalGraphic.innerHTML = `
      <div class="project-modal-image-wrap">
        <img src="${caseEl.dataset.visualSrc}" alt="${caseEl.dataset.visualLabel || 'Project visualization'}" loading="lazy">
        <span class="project-modal-scan" aria-hidden="true"></span>
      </div>
    `;
  } else if (visualType === 'network') {
    projectModalVisual.textContent = caseEl.dataset.visualLabel || 'Signal Visualization';
    projectModalGraphic.innerHTML = PROJECT_GRAPHIC_NETWORK;
  } else {
    projectModalVisual.textContent = caseEl.dataset.visualLabel || 'Signal Visualization';
    projectModalGraphic.innerHTML = PROJECT_GRAPHIC_PULSE;
  }

  projectModalFields.innerHTML = fields.map(f => {
    const label = f.querySelector('.field-label')?.textContent.trim() || '';
    const text  = f.querySelector('p')?.textContent.trim() || '';
    return `<div><span class="field-label mono">${label}</span><p>${text}</p></div>`;
  }).join('');

  projectModalTags.innerHTML = tags.join('');
  projectModalActions.innerHTML = actions.join('');

  projectModal.classList.add('active');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  if (!projectModal) return;
  stopEegMonitor();
  projectModal.classList.remove('active');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('#projects .case').forEach(caseEl => {
  caseEl.addEventListener('click', (event) => {
    if (event.target.closest('a')) return; // let paper/discuss links behave normally
    openProjectModal(caseEl);
  });
});

if (projectModal) {
  projectModal.addEventListener('click', (event) => {
    if (event.target === projectModal) closeProjectModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && projectModal.classList.contains('active')) {
      closeProjectModal();
    }
  });
}

/* =========================================================
   KINETIC HERO NAME (added)
   Splits the name into per-letter spans that assemble into
   focus on load, then a red scan-line sweeps across once.
   ========================================================= */
(function () {
  const kineticName = document.getElementById('kineticName');
  if (!kineticName) return;

  const words = Array.from(kineticName.children); // .kn-thin / .kn-bold
  let globalIndex = 0;
  let aIndex = 0;
  words.forEach(word => {
    const text = word.textContent;
    word.textContent = '';
    Array.from(text).forEach(ch => {
      const span = document.createElement('span');
      span.className = 'kn-letter';
      span.style.setProperty('--i', globalIndex);

      if (ch.toUpperCase() === 'A') {
        // The "A"s flip in place on a loop. The flip lives on an inner
        // span so it never fights with the outer letter's own
        // transform (used elsewhere for the cursor-repel effect).
        span.classList.add('kn-letter-a');
        const inner = document.createElement('span');
        inner.className = 'kn-a-inner';
        inner.textContent = ch;
        inner.style.animationDelay = (aIndex * 1.1) + 's';
        span.appendChild(inner);
        aIndex++;
      } else {
        span.textContent = ch === ' ' ? '\u00A0' : ch;
      }

      word.appendChild(span);
      globalIndex++;
    });
  });

  const settledLetters = [];
  kineticName.querySelectorAll('.kn-letter').forEach(letter => {
    letter.addEventListener('animationend', () => {
      letter.classList.add('kn-settled');
    }, { once: true });
    settledLetters.push(letter);
  });

  // Cursor-follow: letters near the pointer displace away from it,
  // with a slight rotation for a swirl feel. Desktop/mouse only,
  // and only while the pointer is over the hero name itself.
  const wrap = document.querySelector('.kinetic-name-wrap');
  const canHover = window.matchMedia('(hover: hover)').matches;

  if (wrap && canHover) {
    const REPEL_RADIUS = 120;

    wrap.addEventListener('mousemove', (e) => {
      settledLetters.forEach(letter => {
        if (!letter.classList.contains('kn-settled')) return;
        const rect = letter.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - e.clientX;
        const dy = cy - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS) {
          const strength = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const angle = Math.atan2(dy, dx);
          const push = strength * 20;
          const tx = Math.cos(angle) * push;
          const ty = Math.sin(angle) * push;
          const rot = strength * (dx > 0 ? 12 : -12);
          letter.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
        } else {
          letter.style.transform = '';
        }
      });
    });

    wrap.addEventListener('mouseleave', () => {
      settledLetters.forEach(letter => { letter.style.transform = ''; });
    });
  }

  // Site-wide cursor/touch fog cloud — a soft, blurred red haze
  // (plus water-ripple rings) that trails the pointer across every
  // section of the page. Works with mouse movement on desktop AND
  // with finger movement on touchscreens; skipped entirely for
  // prefers-reduced-motion (see the CSS media query).
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

    let lastFogTime = 0;
    let lastRippleTime = 0;

    function spawnFogAt(x, y) {

      const now = performance.now();

      if (now - lastFogTime >= 45) {
        lastFogTime = now;

        const puff = document.createElement('span');
        puff.className = 'kn-particle';
        const size = 32 + Math.random() * 34;
        puff.style.width = size + 'px';
        puff.style.height = size + 'px';
        puff.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
        puff.style.top = (y + (Math.random() - 0.5) * 30) + 'px';
        const sway = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 16);
        puff.style.setProperty('--sway', sway + 'px');
        document.body.appendChild(puff);
        puff.addEventListener('animationend', () => puff.remove(), { once: true });
      }

      // Water-ripple ring — spawned less often than the fog puffs so
      // each one reads as a distinct expanding circle, like a drop
      // landing on water, rather than a constant stream.
      if (now - lastRippleTime >= 260) {
        lastRippleTime = now;

        const ring = document.createElement('span');
        ring.className = 'kn-ripple';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        document.body.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove(), { once: true });
      }

    }

    document.addEventListener('mousemove', (e) => {
      spawnFogAt(e.clientX, e.clientY);
    });

    // Touch devices: follow the finger while dragging across the
    // screen. passive:true since we never call preventDefault here,
    // so normal page scrolling isn't affected.
    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      if (touch) spawnFogAt(touch.clientX, touch.clientY);
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (touch) spawnFogAt(touch.clientX, touch.clientY);
    }, { passive: true });

  }
})();

/* =========================================================
   VERTICAL ROTATING WORD in hero tagline (added)
   Cycles through phrases with a vertical slide, like an
   odometer digit. Loops continuously.
   ========================================================= */
(function () {
  const track = document.getElementById('rotateTrack');
  if (!track) return;
  const words = track.querySelectorAll('.rotate-word');
  if (words.length < 2) return;

  let index = 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return; // stays on the first word, no motion

  setInterval(() => {
    index = (index + 1) % words.length;
    if (index === 0) {
      // Jump back to the first word without an animated reverse-scroll,
      // then let the next tick animate forward normally.
      track.style.transition = 'none';
      track.style.transform = 'translateY(0)';
      // Force reflow so the transition removal actually takes effect
      // before we re-enable it on the next frame.
      void track.offsetHeight;
      requestAnimationFrame(() => {
        track.style.transition = '';
      });
    } else {
      track.style.transform = `translateY(-${index * 100}%)`;
    }
  }, 2800);
})();

/* =========================================================
   ROLE FLIP CARD replacing the old system-readout panel
   (added). Flips to the next word on hover-enter (desktop)
   or tap (mobile).
   ========================================================= */
(function () {
  const card = document.getElementById('roleFlipCard');
  const textEl = document.getElementById('roleFlipText');
  if (!card || !textEl) return;

  const words = [
    'EXPLAINABLE AI SYSTEMS',
    'QUANTUM ML RESEARCH',
    'AI AGENTS & AUTOMATION',
    'SIGNAL-BASED CLASSIFICATION'
  ];
  let index = 0;
  let animating = false;

  function flipToNext() {
    if (animating) return;
    animating = true;
    textEl.classList.remove('flip-in');
    textEl.classList.add('flip-out');

    textEl.addEventListener('animationend', function onOut() {
      textEl.removeEventListener('animationend', onOut);
      index = (index + 1) % words.length;
      textEl.textContent = words[index];
      textEl.classList.remove('flip-out');
      textEl.classList.add('flip-in');

      textEl.addEventListener('animationend', function onIn() {
        textEl.removeEventListener('animationend', onIn);
        textEl.classList.remove('flip-in');
        animating = false;
      }, { once: true });
    }, { once: true });
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // Still useful without motion: advance instantly on interaction.
    card.addEventListener('click', () => {
      index = (index + 1) % words.length;
      textEl.textContent = words[index];
    });
  } else {
    card.addEventListener('mouseenter', flipToNext);
    card.addEventListener('touchstart', flipToNext, { passive: true });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flipToNext();
      }
    });

    // Phones/touchscreens: after the first tap flips the card, keep
    // it flipping automatically as the visitor scrolls the page up
    // or down — a scroll on a touch device stands in for the
    // "mouseenter" a phone can't otherwise give it.
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) {
      let lastScrollY = window.scrollY;
      let scrollCooldown = false;

      window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        const delta = Math.abs(currentY - lastScrollY);

        if (delta > 50 && !scrollCooldown) {
          lastScrollY = currentY;
          scrollCooldown = true;
          flipToNext();
          setTimeout(() => { scrollCooldown = false; }, 700);
        }
      }, { passive: true });
    }
  }
})();

/* =========================================================
   FULL HEADLINE ROTATOR (fixed)
   Previously used a fixed CSS height guess (3.6em) for every
   line, but each sentence wraps to a different number of
   lines at different screen widths, which caused the lines to
   overlap. This measures each line's real rendered height and
   drives the animation from that, so it's correct at any
   screen size. Re-measures on resize and on font load.
   ========================================================= */
(function () {
  const wrap = document.querySelector('.rotate-headline');
  const track = document.getElementById('rotateHeadlineTrack');
  if (!wrap || !track) return;

  const lines = Array.from(track.querySelectorAll('.rotate-headline-line'));
  if (lines.length < 2) return;

  // The last line is a duplicate of the first (for a seamless loop),
  // so there are (lines.length - 1) genuinely distinct sentences.
  const realCount = lines.length - 1;

  let offsets = [];   // cumulative Y offset for each line
  let index = 0;
  let intervalId = null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure() {
    // Temporarily remove the transform so natural heights are read
    // correctly, then measure each line's actual rendered height.
    track.style.transition = 'none';
    track.style.transform = 'translateY(0)';

    let cumulative = 0;
    offsets = lines.map(line => {
      const h = line.getBoundingClientRect().height;
      const offset = cumulative;
      cumulative += h;
      return offset;
    });

    // Container height = tallest single line, so the block doesn't
    // jump in height as it cycles, and shorter lines don't clip.
    const maxLineHeight = Math.max(...lines.map(l => l.getBoundingClientRect().height));
    wrap.style.height = maxLineHeight + 'px';

    // Re-apply the transition after the reflow above.
    void track.offsetHeight;
    track.style.transition = '';
    track.style.transform = `translateY(-${offsets[index]}px)`;
  }

  function advance() {
    index++;
    if (index >= lines.length) {
      // We're currently showing the duplicate final line (identical
      // text to line 0). Snap instantly back to line 0's position —
      // no transition, so the viewer sees no jump since the text is
      // the same either way.
      index = 0;
      track.style.transition = 'none';
      track.style.transform = `translateY(-${offsets[0]}px)`;
      void track.offsetHeight;
      requestAnimationFrame(() => {
        track.style.transition = '';
      });
      return;
    }
    track.style.transform = `translateY(-${offsets[index]}px)`;
  }

  measure();

  if (!prefersReducedMotion) {
    intervalId = setInterval(advance, 3300);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }
})();

/* =========================================================
   WHAT I WORK ON — "train" carousel
   The six focus-area cards run across the screen like a train
   (endless loop). Click/tap a card: the train stops, that card
   slides to the centre and zooms in. The next click anywhere (or
   Esc) sends the train off again. Skipped for reduced-motion, in
   which case the normal grid stays in place.
   ========================================================= */
(function () {
  const section = document.getElementById('what-i-do');
  if (!section) return;

  const grid = section.querySelector('.cert-grid');
  if (!grid) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const originals = Array.from(grid.querySelectorAll('.cert-card'));
  if (!originals.length) return;

  // --- build: viewport > track > [clone set | originals | clone set] ---
  const viewport = document.createElement('div');
  viewport.className = 'wiw-viewport';
  grid.parentNode.insertBefore(viewport, grid);
  viewport.appendChild(grid);
  grid.classList.add('wiw-track');

  const makeClones = () => originals.map((card) => {
    const c = card.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.classList.add('wiw-clone');
    return c;
  });
  const before = makeClones();
  const after  = makeClones();
  const extra  = makeClones();   // spare set at the end so very wide screens can still centre any card
  before.forEach((c) => grid.insertBefore(c, originals[0]));
  after.forEach((c) => grid.appendChild(c));
  extra.forEach((c) => grid.appendChild(c));

  originals.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
  });

  const hint = document.createElement('p');
  hint.className = 'wiw-hint mono';
  hint.textContent = 'CLICK / TAP A CARD TO PAUSE & ZOOM · CLICK AGAIN TO RESUME';
  viewport.insertAdjacentElement('afterend', hint);
  section.classList.add('wiw-active');

  // --- geometry ---
  let S = 0;       // width of one set of six cards (incl. gaps)
  let W = 0;       // visible width
  let trackW = 0;  // full track width

  function measure() {
    S = after[0].offsetLeft - originals[0].offsetLeft;
    W = viewport.clientWidth;
    trackW = grid.offsetWidth;
  }
  measure();

  // --- motion state ---
  // The originals sit in the middle set, so the train runs with its
  // offset between -2S and -S: a full spare set always exists on
  // both sides, and wrapping by S is invisible (sets are identical).
  let offset = -S;
  let speed = 0;
  let state = 'running';        // 'running' | 'centering' | 'held'
  let centering = null;
  let held = null;
  let wrapLockUntil = 0;        // don't wrap while a zoomed card is still shrinking
  let last = 0;
  let rafId = null;
  let visible = false;

  const baseSpeed = () => (window.innerWidth < 700 ? 55 : 85); // px per second

  function apply() {
    grid.style.transform = 'translate3d(' + offset + 'px,0,0)';
  }

  function frame(t) {
    if (!last) last = t;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (state === 'running') {
      // ease up to cruising speed, like a train pulling out
      speed += (baseSpeed() - speed) * Math.min(1, dt * 2.2);
      offset -= speed * dt;
      if (t >= wrapLockUntil) {
        while (offset <= -2 * S) offset += S;
      }
      offset = Math.max(offset, -(trackW - W));
    } else if (state === 'centering') {
      const p = Math.min((t - centering.start) / centering.dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      offset = centering.from + (centering.to - centering.from) * e;
      if (p >= 1) state = 'held';
    }

    apply();

    if (state === 'held' || !visible) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function ensureLoop() {
    if (rafId || !visible) return;
    last = 0;
    rafId = requestAnimationFrame(frame);
  }

  function centerOffsetFor(card) {
    const cx = card.offsetLeft + card.offsetWidth / 2;
    return Math.max(-(trackW - W), Math.min(0, W / 2 - cx));
  }

  function hold(card) {
    held = card;
    card.classList.add('is-zoomed');
    grid.classList.add('is-held');
    if (!card.classList.contains('wiw-clone')) card.setAttribute('aria-pressed', 'true');
    speed = 0;
    state = 'centering';
    centering = {
      from: offset,
      to: centerOffsetFor(card),
      start: performance.now(),
      dur: 650
    };
    ensureLoop();
  }

  function release() {
    if (!held) return;
    held.classList.remove('is-zoomed');
    originals.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    grid.classList.remove('is-held');
    held = null;
    speed = 0;
    state = 'running';
    wrapLockUntil = performance.now() + 700;
    ensureLoop();
  }

  // --- interaction ---
  // First click on a card holds + zooms it; the next click anywhere resumes.
  document.addEventListener('click', (e) => {
    if (held) { release(); return; }
    const card = e.target.closest && e.target.closest('#what-i-do .wiw-track .cert-card');
    if (card) hold(card);
  });

  originals.forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        held ? release() : hold(card);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && held) release();
  });

  window.addEventListener('resize', () => {
    const frac = S ? (-offset - S) / S : 0;
    measure();
    offset = held ? centerOffsetFor(held) : -(S + frac * S);
    apply();
  });

  // --- only animate while on screen ---
  apply();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        if (visible) {
          viewport.classList.add('is-in');
          ensureLoop();
        }
      });
    }, { threshold: 0 }).observe(viewport);
  } else {
    visible = true;
    viewport.classList.add('is-in');
    ensureLoop();
  }
})();
