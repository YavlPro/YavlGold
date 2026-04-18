/**
 * YavlGold Agro — Docs page navigation
 * Sidebar toggle, scroll spy, smooth scroll
 */

const sidebar = document.getElementById('docsSidebar');
const overlay = document.getElementById('docsOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarLinks = document.querySelectorAll('.docs-sidebar__link');
const sections = [];

function openSidebar() {
  sidebar.classList.add('is-open');
  overlay.classList.add('is-visible');
  sidebarToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('is-open');
  overlay.classList.remove('is-visible');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

sidebarLinks.forEach(link => {
  const id = link.getAttribute('data-section');
  if (id) {
    const el = document.getElementById(id);
    if (el) sections.push({ id, el, link });
  }

  link.addEventListener('click', () => {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

let scrollTicking = false;

function updateActiveSection() {
  if (scrollTicking) return;
  scrollTicking = true;

  requestAnimationFrame(() => {
    const scrollY = window.scrollY + 100;
    let current = sections[0];

    for (const s of sections) {
      if (s.el.offsetTop <= scrollY) current = s;
    }

    sidebarLinks.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');

    scrollTicking = false;
  });
}

window.addEventListener('scroll', updateActiveSection, { passive: true });
updateActiveSection();
