const header = document.querySelector('[data-header]');
const sentinel = document.querySelector('.top-sentinel');
const hero = document.querySelector('[data-hero]');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
const dialog = document.querySelector('#pending-dialog');
const dialogMessage = document.querySelector('#dialog-message');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const headerObserver = new IntersectionObserver(([entry]) => {
  header.classList.toggle('is-scrolled', !entry.isIntersecting);
}, { threshold: 0 });
headerObserver.observe(sentinel);

const heroObserver = new IntersectionObserver(([entry]) => {
  header.classList.toggle('is-past-hero', !entry.isIntersecting);
}, { threshold: 0, rootMargin: '-72px 0px 0px 0px' });
heroObserver.observe(hero);

const closeMenu = () => {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
};

let closeTimer;

menuButton.addEventListener('click', () => {
  const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(willOpen));
  navigation.classList.toggle('is-open', willOpen);
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a, button')) closeMenu();
});

navigation.addEventListener('pointerenter', () => clearTimeout(closeTimer));
navigation.addEventListener('pointerleave', () => {
  if (menuButton.getAttribute('aria-expanded') === 'true') closeTimer = setTimeout(closeMenu, 150);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);

document.querySelectorAll('[data-pending]').forEach(button => {
  button.addEventListener('click', () => {
    dialogMessage.textContent = button.dataset.pending;
    dialog.showModal();
  });
});

const reveals = document.querySelectorAll('.reveal');
if (reduceMotion) {
  reveals.forEach(element => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  reveals.forEach(element => revealObserver.observe(element));
}

const report = document.querySelector('[data-report]');
if (report) {
  const cards = [...report.querySelectorAll('[data-report-card]')];
  const replayChart = card => {
    if (reduceMotion) {
      card.classList.add('is-chart-ready');
      return;
    }
    card.classList.remove('is-chart-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-chart-ready')));
  };
  const selectCard = index => {
    cards.forEach((card, cardIndex) => {
      const active = cardIndex === index;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
      if (active) replayChart(card);
    });
  };
  cards.forEach((card, index) => {
    card.addEventListener('click', () => selectCard(index));
    card.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const next = (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + cards.length) % cards.length;
      selectCard(next);
      cards[next].focus();
    });
  });
  if (reduceMotion) {
    cards.forEach(card => card.classList.add('is-chart-ready'));
  } else {
    const reportObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      replayChart(cards.find(card => card.classList.contains('is-active')) || cards[0]);
      reportObserver.disconnect();
    }, { threshold: 0.15 });
    reportObserver.observe(report);
  }
}

const reportVisual = document.querySelector('.report-visual');
const precisePointer = matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)').matches;
const initImageParallax = ({ frame, prefix, tilt, shiftX, shiftY, glowY }) => {
  if (!frame || reduceMotion || !precisePointer) return;

  let animationFrame;
  const reset = () => {
    cancelAnimationFrame(animationFrame);
    frame.style.setProperty(`--${prefix}-tilt-x`, '0deg');
    frame.style.setProperty(`--${prefix}-tilt-y`, '0deg');
    frame.style.setProperty(`--${prefix}-shift-x`, '0px');
    frame.style.setProperty(`--${prefix}-shift-y`, '0px');
    if (Number.isFinite(glowY)) {
      frame.style.setProperty(`--${prefix}-glow-x`, '50%');
      frame.style.setProperty(`--${prefix}-glow-y`, `${glowY}%`);
    }
    frame.classList.remove('is-parallax-active');
  };

  frame.addEventListener('pointermove', event => {
    const bounds = frame.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2));

    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      frame.style.setProperty(`--${prefix}-tilt-x`, `${(-y * tilt).toFixed(2)}deg`);
      frame.style.setProperty(`--${prefix}-tilt-y`, `${(x * tilt).toFixed(2)}deg`);
      frame.style.setProperty(`--${prefix}-shift-x`, `${(x * shiftX).toFixed(2)}px`);
      frame.style.setProperty(`--${prefix}-shift-y`, `${(y * shiftY).toFixed(2)}px`);
      if (Number.isFinite(glowY)) {
        frame.style.setProperty(`--${prefix}-glow-x`, `${(50 + x * 22).toFixed(1)}%`);
        frame.style.setProperty(`--${prefix}-glow-y`, `${(glowY + y * 16).toFixed(1)}%`);
      }
      frame.classList.add('is-parallax-active');
    });
  });

  frame.addEventListener('pointerleave', reset);
  frame.addEventListener('pointercancel', reset);
};

initImageParallax({ frame: reportVisual, prefix: 'report', tilt: 2.5, shiftX: 8, shiftY: 6, glowY: 38 });
initImageParallax({ frame: hero, prefix: 'hero', tilt: 1.2, shiftX: 6, shiftY: 4 });
initImageParallax({ frame: document.querySelector('.brand-story'), prefix: 'brand', tilt: 1.4, shiftX: 7, shiftY: 5, glowY: 36 });

const testimonials = document.querySelector('[data-testimonials]');
if (testimonials) {
  const cards = [...testimonials.querySelectorAll('.testimonial-card')];
  const previousButton = testimonials.querySelector('[data-testimonial-prev]');
  const nextButton = testimonials.querySelector('[data-testimonial-next]');
  const status = testimonials.querySelector('[data-testimonial-status]');
  let activeIndex = 0;

  const selectTestimonial = (nextIndex, direction = 1) => {
    const normalizedIndex = (nextIndex + cards.length) % cards.length;
    if (normalizedIndex === activeIndex) return;

    testimonials.classList.toggle('is-backwards', direction < 0);
    cards.forEach((card, index) => {
      const active = index === normalizedIndex;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-hidden', String(!active));
    });

    activeIndex = normalizedIndex;
    status.textContent = `正在显示第 ${activeIndex + 1} 条，共 ${cards.length} 条`;
  };

  previousButton.addEventListener('click', () => selectTestimonial(activeIndex - 1, -1));
  nextButton.addEventListener('click', () => selectTestimonial(activeIndex + 1, 1));
  testimonials.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    selectTestimonial(activeIndex + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1);
  });
}
