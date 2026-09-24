/* Scroll drives progress; the renderer can later be replaced without changing layout. */
(() => {
  const track = document.querySelector('[data-product-sequence]');
  if (!track || !('IntersectionObserver' in window)) return;
  const stage = track.querySelector('.product-stage');
  const canvas = track.querySelector('canvas');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 560px)');
  const connection = navigator.connection;
  let generation = 0, renderer, driver, loading = false, near = false;

  const infos = [...track.querySelectorAll('.product-info')];
  const buttons = [...track.querySelectorAll('[data-info]')];
  let manual = null, lastInfoState = '', complete = true;
  track.classList.add('info-enhanced');
  function annotate(progress, fallback = false) {
    const sequenceRange = mobile.matches ? .90 : .70;
    complete = fallback || progress >= (.03 + sequenceRange * 38.5 / 39);
    if (!complete) manual = null;
    const thresholds = mobile.matches ? [.14, .38, .62, .86] : [.12, .30, .49, .68];
    const active = manual ?? Math.max(0, thresholds.filter(t => progress >= t).length - 1);
    const key = [active, complete, fallback, mobile.matches, ...thresholds.map(t => progress >= t)].join(':');
    if (key === lastInfoState) return;
    lastInfoState = key;
    track.classList.toggle('annotations-complete', complete);
    infos.forEach((item, index) => {
      const visible = fallback || progress >= thresholds[index];
      item.classList.toggle('is-visible', visible);
      item.classList.toggle('selected', index === active);
      item.setAttribute('aria-hidden', String(mobile.matches ? index !== active || !visible : !visible));
    });
    buttons.forEach((button,index) => {
      button.setAttribute('aria-pressed',String(index === active));
      button.disabled = !complete;
    });
  }
  buttons.forEach((button,index) => button.addEventListener('click', () => {
    if (!complete) return;
    manual = index;
    annotate(1, !track.classList.contains('sequence-ready'));
  }));
  annotate(1,true);

  // Final-pose anchors are normalized to the rendered image, not the page.
  // Map through object-fit:contain, then attach each leader to its actual detail circle.
  const board = track.querySelector('.product-board');
  const visual = track.querySelector('.product-visual');
  const leaders = track.querySelector('.product-leaders');
  const anchors = [[.415,.391],[.684,.616],[.625,.660],[.610,.547]];
  function alignLeaders() {
    if (!leaders || mobile.matches) return;
    const b = board.getBoundingClientRect(), v = visual.getBoundingClientRect();
    const width = Math.min(v.width, v.height * 16 / 9), height = width * 9 / 16;
    const left = v.left - b.left + (v.width - width) / 2;
    const top = v.top - b.top + (v.height - height) / 2;
    leaders.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    const paths = [], ends = [];
    infos.forEach((info, index) => {
      const r = info.querySelector('.detail').getBoundingClientRect();
      const x = r.left - b.left + r.width / 2;
      const y = index < 2 ? r.bottom - b.top + 6 : r.top - b.top - 6;
      const tx = left + anchors[index][0] * width, ty = top + anchors[index][1] * height;
      const elbow = index < 2 ? y + 22 : y - 22;
      paths.push(`M${x} ${y} V${elbow} H${tx} V${ty}`);
      ends.push([tx,ty]);
    });
    leaders.querySelector('path').setAttribute('d', paths.join(' '));
    leaders.querySelectorAll('circle').forEach((circle,index) => {
      circle.setAttribute('cx',ends[index][0]); circle.setAttribute('cy',ends[index][1]);
    });
  }
  new ResizeObserver(alignLeaders).observe(board);

  class SequenceRenderer {
    constructor(images) {
      this.images = images;
      this.context = canvas.getContext('2d', { alpha: true });
      if (!this.context) throw new Error('Canvas unavailable');
      this.cropLeft = mobile.matches ? Math.round(images[0].naturalWidth * 160 / 960) : 0;
      this.cropWidth = mobile.matches ? Math.round(images[0].naturalWidth * 640 / 960) : images[0].naturalWidth;
      this.cropTop = mobile.matches ? Math.round(images[0].naturalHeight * 140 / 768) : 0;
      this.cropHeight = mobile.matches ? Math.round(images[0].naturalHeight * 570 / 768) : images[0].naturalHeight;
      canvas.width = this.cropWidth;
      canvas.height = this.cropHeight;
      this.frame = -1;
    }
    setProgress(progress) {
      const index = Math.round(Math.max(0, Math.min(1, progress)) * (this.images.length - 1));
      if (index === this.frame) return;
      this.context.clearRect(0, 0, canvas.width, canvas.height);
      this.context.drawImage(this.images[index], this.cropLeft, this.cropTop, this.cropWidth, this.cropHeight, 0, 0, canvas.width, canvas.height);
      this.frame = index;
      track.dataset.frame = String(index);
    }
    destroy() { this.images.length = 0; }
  }

  class ScrollProgressDriver {
    constructor(present) {
      this.present = present;
      this.running = false;
      this.tick = () => {
        if (!this.running) return;
        const top = parseFloat(getComputedStyle(stage).top) || 0;
        const distance = Math.max(1, track.offsetHeight - stage.offsetHeight);
        const progress = (top - track.getBoundingClientRect().top) / distance;
        this.present(progress);
        this.raf = requestAnimationFrame(this.tick);
      };
    }
    start() { if (!this.running) { this.running = true; this.tick(); } }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.stop(); }
  }

  function clear() {
    generation++;
    driver?.destroy(); renderer?.destroy();
    driver = renderer = undefined;
    loading = false;
    track.classList.remove('sequence-ready');
    delete track.dataset.frame;
    manual = null; annotate(1,true);
  }
  function canAnimate() { return !motion.matches && !connection?.saveData; }
  async function load() {
    if (!near || loading || renderer || !canAnimate()) return;
    loading = true;
    const token = ++generation;
    const kind = mobile.matches ? 'mobile' : 'desktop';
    const config = JSON.parse(track.dataset.productSequence);
    const images = new Array(config.count);
    let next = 0;
    try {
      // Three concurrent requests; no sequence downloads at page startup.
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (next < config.count && token === generation) {
          const index = next++;
          const image = new Image();
          image.decoding = 'async';
          image.src = `${config.base}/${kind}/${String(index).padStart(3, '0')}.webp${config.version ? `?v=${encodeURIComponent(config.version)}` : ''}`;
          let timer;
          try {
            await Promise.race([
              image.decode(),
              new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Sequence load timeout')), 15000); })
            ]);
          } finally { clearTimeout(timer); }
          images[index] = image;
        }
      }));
      if (token !== generation || !canAnimate()) return;
      renderer = new SequenceRenderer(images);
      track.classList.add('sequence-ready');
      driver = new ScrollProgressDriver(progress => {
        renderer.setProgress((progress - .03) / (mobile.matches ? .90 : .70));
        annotate(progress);
      });
      if (near && !document.hidden) driver.start();
    } catch {
      if (token === generation) {
        clear();
        track.dataset.sequenceState = 'fallback';
      }
    } finally { if (token === generation) loading = false; }
  }
  const observer = new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    if (near) {
      load();
      if (!document.hidden) driver?.start();
    } else driver?.stop();
  }, { rootMargin: '700px 0px' });
  observer.observe(track);
  const reconfigure = () => { clear(); load(); };
  motion.addEventListener('change', reconfigure);
  mobile.addEventListener('change', reconfigure);
  const visibility = () => {
    if (document.hidden) driver?.stop();
    else if (near) driver?.start();
  };
  document.addEventListener('visibilitychange', visibility);
  // bfcache restores the existing renderer; a normal unload releases the cache.
  window.addEventListener('pagehide', () => driver?.stop());
  window.addEventListener('pageshow', () => { if (near) driver?.start(); });
})();
