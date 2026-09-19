const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
  });
}

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => links?.classList.remove('open'));
});

document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

const revealItems = document.querySelectorAll('.reveal-on-scroll');
if ('IntersectionObserver' in window && revealItems.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const wayfinderLinks = document.querySelectorAll('.section-wayfinder a[href^="#"]');
const trackedSections = document.querySelectorAll('[data-section]');
if ('IntersectionObserver' in window && wayfinderLinks.length && trackedSections.length) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      wayfinderLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-35% 0px -50% 0px', threshold: 0 });
  trackedSections.forEach(section => sectionObserver.observe(section));
}

const pageProgress = document.querySelector('.page-progress span');
const floatingBook = document.querySelector('.floating-book');
const bookingSection = document.querySelector('#book');
const updateScrollProgress = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
  if (pageProgress) pageProgress.style.width = `${progress}%`;
  if (floatingBook) {
    floatingBook.classList.toggle('is-visible', scrollTop > 420);
    if (bookingSection) {
      const rect = bookingSection.getBoundingClientRect();
      floatingBook.classList.toggle('is-hidden', rect.top < window.innerHeight && rect.bottom > 0);
    }
  }
};
if (pageProgress || floatingBook) {
  updateScrollProgress();
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
}

const sunnyChapterLinks = document.querySelectorAll('.sunny-chapter-nav a[href^="#"]');
const sunnySections = document.querySelectorAll('[data-sunny-section]');
if ('IntersectionObserver' in window && sunnyChapterLinks.length && sunnySections.length) {
  const chapterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const chapter = entry.target.getAttribute('data-sunny-section');
      sunnyChapterLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${chapter}`);
      });
    });
  }, { rootMargin: '-35% 0px -52% 0px', threshold: 0 });
  sunnySections.forEach(section => chapterObserver.observe(section));
}

const profileDrawer = document.querySelector('.profile-drawer');
const drawerScrim = document.querySelector('.drawer-scrim');
const openDrawer = document.querySelector('.profile-drawer-open');
const closeDrawer = document.querySelector('.drawer-close');
const setDrawer = open => {
  if (!profileDrawer || !drawerScrim) return;
  profileDrawer.classList.toggle('is-open', open);
  profileDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  drawerScrim.hidden = !open;
};
openDrawer?.addEventListener('click', () => setDrawer(true));
closeDrawer?.addEventListener('click', () => setDrawer(false));
drawerScrim?.addEventListener('click', () => setDrawer(false));

const timelineItems = document.querySelectorAll('.interactive-timeline details');
const timelineProgress = document.querySelector('.timeline-progress span');
if ('IntersectionObserver' in window && timelineItems.length) {
  const timelineObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      timelineItems.forEach(item => item.classList.remove('is-current'));
      entry.target.classList.add('is-current');
      if (timelineProgress) {
        const index = Array.from(timelineItems).indexOf(entry.target) + 1;
        timelineProgress.style.width = `${(index / timelineItems.length) * 100}%`;
      }
    });
  }, { rootMargin: '-38% 0px -42% 0px', threshold: 0 });
  timelineItems.forEach(item => timelineObserver.observe(item));
}

const mediaFilterButtons = document.querySelectorAll('.media-filters button');
const mediaCards = document.querySelectorAll('.interactive-media a');
mediaFilterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    mediaFilterButtons.forEach(btn => btn.classList.toggle('is-active', btn === button));
    mediaCards.forEach(card => {
      const types = card.dataset.type || '';
      card.hidden = filter !== 'all' && !types.includes(filter);
    });
  });
});

const galleryDialog = document.querySelector('.gallery-dialog');
const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
let currentGalleryIndex = 0;
const showGalleryItem = index => {
  if (!galleryDialog || !galleryItems.length) return;
  currentGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentGalleryIndex];
  const title = item.querySelector('strong')?.textContent || 'Gallery image';
  const desc = item.querySelector('em')?.textContent || 'Approved image placeholder.';
  const asset = item.dataset.image || item.querySelector('span')?.textContent || '';
  const related = item.dataset.related || '';
  galleryDialog.querySelector('#gallery-dialog-title').textContent = title;
  galleryDialog.querySelector('#gallery-dialog-desc').textContent = desc;
  const media = galleryDialog.querySelector('.gallery-dialog-media');
  media.innerHTML = asset ? `<img src="${asset}" alt="" decoding="async">` : '';
  const relatedLink = galleryDialog.querySelector('.gallery-related');
  if (relatedLink) {
    relatedLink.hidden = !related;
    relatedLink.href = related || '#';
  }
};
if (galleryDialog && galleryItems.length) {
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      showGalleryItem(index);
      if (typeof galleryDialog.showModal === 'function') galleryDialog.showModal();
    });
  });
  galleryDialog.querySelector('.gallery-close')?.addEventListener('click', () => galleryDialog.close());
  galleryDialog.querySelector('.gallery-prev')?.addEventListener('click', () => showGalleryItem(currentGalleryIndex - 1));
  galleryDialog.querySelector('.gallery-next')?.addEventListener('click', () => showGalleryItem(currentGalleryIndex + 1));
  galleryDialog.addEventListener('click', event => {
    if (event.target === galleryDialog) galleryDialog.close();
  });
  galleryDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showGalleryItem(currentGalleryIndex - 1);
    if (event.key === 'ArrowRight') showGalleryItem(currentGalleryIndex + 1);
  });
}

const staggerItems = document.querySelectorAll('.snapshot-grid details,.interactive-achievements details,.interactive-timeline details,.interactive-stories details,.business-lessons details,.toolkit-grid details,.media-link-grid a,.gallery-item');
staggerItems.forEach((item, index) => {
  item.classList.add('stagger-in');
  item.style.transitionDelay = `${Math.min(index % 8, 7) * 55}ms`;
});
if ('IntersectionObserver' in window && staggerItems.length) {
  const staggerObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        staggerObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  staggerItems.forEach(item => staggerObserver.observe(item));
} else {
  staggerItems.forEach(item => item.classList.add('is-visible'));
}

const videoFeature = document.querySelector('.video-feature video');
document.querySelectorAll('.video-gallery button[data-video-src]').forEach(button => {
  button.addEventListener('click', () => {
    if (!videoFeature) return;
    const src = button.dataset.videoSrc;
    const source = videoFeature.querySelector('source');
    if (source && src) {
      source.src = src;
      videoFeature.load();
      videoFeature.focus();
    }
  });
});

const timelineMomentButtons = document.querySelectorAll('.timeline-moment');
const timelineDetailPanel = document.querySelector('.timeline-detail-panel');
if (timelineMomentButtons.length && timelineDetailPanel) {
  const panelImage = timelineDetailPanel.querySelector('img');
  const panelTitle = timelineDetailPanel.querySelector('h3');
  const panelText = timelineDetailPanel.querySelectorAll('p');
  const panelLink = timelineDetailPanel.querySelector('a');
  timelineMomentButtons.forEach(button => {
    button.addEventListener('click', () => {
      timelineMomentButtons.forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      if (panelImage && button.dataset.image) panelImage.src = button.dataset.image;
      if (panelTitle) panelTitle.textContent = button.dataset.title || button.querySelector('h3')?.textContent || 'Selected moment';
      if (panelText[0]) panelText[0].innerHTML = `<strong>The moment:</strong> ${button.dataset.moment || ''}`;
      if (panelText[1]) panelText[1].innerHTML = `<strong>Why it mattered:</strong> ${button.dataset.lesson || ''}`;
      if (panelText[2]) panelText[2].innerHTML = `<strong>Audience relevance:</strong> ${button.dataset.relevance || ''}`;
      if (panelLink) {
        const link = button.dataset.link;
        panelLink.hidden = !link;
        panelLink.href = link || '#';
      }
    });
  });
}

const businessThemeButtons = document.querySelectorAll('.business-theme-tabs button[data-theme]');
const businessThemePanel = document.querySelector('.business-theme-panel');
const businessThemes = {
  decision: {
    title: 'Decision-making',
    reality: 'A referee often has seconds to process incomplete information, control emotion and make a visible decision.',
    lesson: 'Waiting for perfect certainty is not always an option. Good judgement requires preparation, clarity and composure.',
    business: 'Leaders regularly have to act before every variable is available while still taking responsibility for the outcome.'
  },
  communication: {
    title: 'Communication',
    reality: 'A referee has to explain decisions that players, coaches or crowds may strongly disagree with.',
    lesson: 'The way a decision is communicated can affect whether people understand it, accept it or escalate against it.',
    business: 'Teams need clarity, tone and timing when difficult decisions are made, especially when the answer is not popular.'
  },
  resilience: {
    title: 'Resilience',
    reality: 'Mistakes, criticism and scrutiny can arrive quickly, but the next decision still has to be made.',
    lesson: 'Performance depends on the ability to reset without ignoring what needs to be learned.',
    business: 'Leaders and teams need recovery habits that help them respond to setbacks without becoming defensive or distracted.'
  },
  accountability: {
    title: 'Accountability',
    reality: 'A referee makes visible decisions and has to stand behind them in real time.',
    lesson: 'Accountability is not about appearing certain at all costs. It is about owning the decision and reviewing it properly.',
    business: 'Visible leadership means explaining choices, taking responsibility and creating trust through consistency.'
  },
  inclusive: {
    title: 'Inclusive leadership',
    reality: 'Sunny has operated in environments where representation has been limited while maintaining standards and credibility.',
    lesson: 'Visibility matters, but it has to sit alongside preparation, performance and the support to belong properly.',
    business: 'Inclusive leadership asks organisations to consider who gets seen, who gets developed and how high standards can include more people.'
  }
};

const renderBusinessTheme = themeKey => {
  if (!businessThemePanel || !businessThemes[themeKey]) return;
  const theme = businessThemes[themeKey];
  businessThemePanel.classList.add('is-changing');
  window.setTimeout(() => {
    businessThemePanel.innerHTML = `<span class="business-panel-kicker">${theme.title}</span><div><strong>Reality</strong><p>${theme.reality}</p></div><div><strong>The lesson</strong><p>${theme.lesson}</p></div><div><strong>Business application</strong><p>${theme.business}</p></div>`;
    businessThemePanel.classList.remove('is-changing');
  }, 160);
};

businessThemeButtons.forEach(button => {
  button.addEventListener('click', () => {
    businessThemeButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderBusinessTheme(button.dataset.theme);
  });
});

const logoRevealCards = document.querySelectorAll('[data-logo-reveal]');
if ('IntersectionObserver' in window && logoRevealCards.length) {
  const logoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      card.classList.add('logo-revealing');
      window.setTimeout(() => {
        card.classList.remove('logo-revealing');
        card.classList.add('logo-revealed');
      }, 1150);
      logoObserver.unobserve(card);
    });
  }, { threshold: 0.28 });
  logoRevealCards.forEach(card => logoObserver.observe(card));
} else {
  logoRevealCards.forEach(card => card.classList.add('logo-revealed'));
}
const roopaWayfinderLinks = document.querySelectorAll('.roopa-wayfinder a[href^="#"]');
const roopaTrackedSections = document.querySelectorAll('[data-roopa-section]');
if ('IntersectionObserver' in window && roopaWayfinderLinks.length && roopaTrackedSections.length) {
  const roopaObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const chapter = entry.target.getAttribute('data-roopa-section');
      roopaWayfinderLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${chapter}`);
      });
    });
  }, { rootMargin: '-32% 0px -54% 0px', threshold: 0 });
  roopaTrackedSections.forEach(section => roopaObserver.observe(section));
}

const roopaStaggerItems = document.querySelectorAll('.roopa-timeline .reveal-on-scroll,.roopa-reasons .reveal-on-scroll,.roopa-lessons .reveal-on-scroll,.roopa-media-row .reveal-on-scroll');
roopaStaggerItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 8, 7) * 55}ms`;
});


const homeHeader = document.querySelector('[data-home-header]');
if (homeHeader) {
  const updateHomeHeader = () => homeHeader.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHomeHeader();
  window.addEventListener('scroll', updateHomeHeader, { passive: true });
}

const homeProgress = document.querySelector('[data-home-progress]');
const homeSections = document.querySelectorAll('[data-home-section]');
const homeRailLinks = document.querySelectorAll('[data-home-rail]');
const homeParallax = document.querySelector('[data-home-parallax]');
const updateHomeProgress = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
  if (homeProgress) homeProgress.style.width = `${progress}%`;
  if (homeParallax) homeParallax.style.transform = `translateX(${Math.max(-24, -scrollTop * 0.015)}px)`;
};
if (homeProgress || homeParallax) {
  updateHomeProgress();
  window.addEventListener('scroll', updateHomeProgress, { passive: true });
}
if ('IntersectionObserver' in window && homeSections.length && homeRailLinks.length) {
  const homeSectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const key = entry.target.getAttribute('data-home-section');
      homeRailLinks.forEach(link => link.classList.toggle('is-active', link.dataset.homeRail === key));
    });
  }, { rootMargin: '-34% 0px -52% 0px', threshold: 0 });
  homeSections.forEach(section => homeSectionObserver.observe(section));
}
