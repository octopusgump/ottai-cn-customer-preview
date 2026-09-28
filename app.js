const header = document.querySelector('[data-header]');
const sentinel = document.querySelector('.top-sentinel');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
const dialog = document.querySelector('#pending-dialog');
const dialogMessage = document.querySelector('#dialog-message');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const headerObserver = new IntersectionObserver(([entry]) => {
  header.classList.toggle('is-scrolled', !entry.isIntersecting);
}, { threshold: 0 });
headerObserver.observe(sentinel);

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
  if (reduceMotion) {
    cards.forEach(card => card.classList.add('is-chart-ready'));
  } else {
    const chartObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-chart-ready');
        chartObserver.unobserve(entry.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -8% 0px' });
    cards.forEach(card => chartObserver.observe(card));
  }
}

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
