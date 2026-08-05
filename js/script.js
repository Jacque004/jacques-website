/**
 * Portfolio — UX interactions
 * Nav, scroll progress, filtres, load more, a11y
 */
document.addEventListener('DOMContentLoaded', () => {
    const NAV_OFFSET = 100;
    const BACK_TOP_THRESHOLD = 420;
    const PROJECTS_PAGE_SIZE = 6;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .nav-cta');
    const sections = document.querySelectorAll('section[id], header[id]');
    const navbarCollapse = document.querySelector('#navbarNav');
    const backToTop = document.getElementById('backToTop');
    const filterButtons = document.querySelectorAll('.project-filters .filter-btn');
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const loadMoreBtn = document.getElementById('loadMoreProjects');
    const loadMoreWrap = document.querySelector('.projects-load-more');
    const filterStatus = document.getElementById('projectsFilterStatus');
    const projectsEmpty = document.getElementById('projectsEmpty');

    let currentFilter = 'all';
    let visibleCount = PROJECTS_PAGE_SIZE;
    let ticking = false;

    function closeMobileNav() {
        if (!navbarCollapse?.classList.contains('show')) return;
        const toggler = document.querySelector('.navbar-toggler');
        if (toggler && window.bootstrap?.Collapse) {
            bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
        } else {
            navbarCollapse.classList.remove('show');
            toggler?.setAttribute('aria-expanded', 'false');
        }
    }

    function scrollToHash(hash, behavior) {
        if (!hash || hash === '#') return;
        const target = document.querySelector(hash);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - (NAV_OFFSET - 12);
        window.scrollTo({
            top: Math.max(0, top),
            behavior: reduceMotion ? 'auto' : (behavior || 'smooth'),
        });
    }

    function updateChrome() {
        const y = window.scrollY || window.pageYOffset;

        if (navbar) {
            navbar.classList.toggle('scrolled', y > 40);
        }

        if (backToTop) {
            const show = y > BACK_TOP_THRESHOLD;
            backToTop.hidden = !show;
            backToTop.classList.toggle('is-visible', show);
        }

        let currentId = null;
        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= NAV_OFFSET && rect.bottom >= NAV_OFFSET) {
                currentId = section.id;
            }
        });

        document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
            const href = link.getAttribute('href');
            const isActive = currentId && href === `#${currentId}`;
            link.classList.toggle('active', Boolean(isActive));
            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateChrome();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateChrome();

    document.addEventListener('click', (event) => {
        const anchor = event.target.closest('a[href^="#"]');
        if (!anchor) return;

        // Sous file://, laisser le navigateur gérer les ancres (sinon erreur d’origine)
        if (window.location.protocol === 'file:') {
            closeMobileNav();
            return;
        }

        const hash = anchor.getAttribute('href');
        if (!hash || hash === '#' || !document.querySelector(hash)) return;
        event.preventDefault();
        closeMobileNav();
        scrollToHash(hash);
        try {
            history.pushState(null, '', hash);
        } catch (_) {
            /* ignore */
        }
    });

    if (window.location.hash && window.location.protocol !== 'file:') {
        requestAnimationFrame(() => scrollToHash(window.location.hash, 'auto'));
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMobileNav();
    });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    function matchesFilter(card) {
        if (currentFilter === 'all') return true;
        return card.dataset.type === currentFilter;
    }

    function refreshProjects() {
        const matched = projectCards.filter(matchesFilter);
        let shown = 0;

        projectCards.forEach((card) => {
            const match = matchesFilter(card);
            if (!match) {
                card.classList.add('is-hidden');
                return;
            }
            if (shown < visibleCount) {
                card.classList.remove('is-hidden');
                card.classList.add('visible');
                shown += 1;
            } else {
                card.classList.add('is-hidden');
            }
        });

        const remaining = Math.max(0, matched.length - visibleCount);
        const moreAvailable = remaining > 0;

        if (loadMoreWrap) loadMoreWrap.hidden = !moreAvailable;
        if (loadMoreBtn) {
            loadMoreBtn.hidden = !moreAvailable;
            loadMoreBtn.textContent = moreAvailable
                ? `Voir plus (${remaining} restant${remaining > 1 ? 's' : ''})`
                : 'Voir plus de projets';
            loadMoreBtn.setAttribute('aria-expanded', String(visibleCount > PROJECTS_PAGE_SIZE));
        }

        if (filterStatus) {
            filterStatus.textContent = matched.length
                ? `${shown} projet${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''} sur ${matched.length}`
                : '';
        }

        if (projectsEmpty) {
            projectsEmpty.hidden = matched.length > 0;
        }
    }

    filterButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        btn.addEventListener('click', () => {
            filterButtons.forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentFilter = btn.dataset.filter || 'all';
            visibleCount = PROJECTS_PAGE_SIZE;
            refreshProjects();
        });
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            visibleCount += PROJECTS_PAGE_SIZE;
            refreshProjects();
        });
    }

    refreshProjects();

    const skillsFilterButtons = document.querySelectorAll('.skills-filters .filter-btn');
    const skillsGroups = Array.from(document.querySelectorAll('.skills-group'));
    let currentSkillsFilter = 'fullstack';

    function matchesSkillsFilter(group) {
        if (currentSkillsFilter === 'outils') {
            return group.dataset.skillsCategory === 'outils' || group.dataset.skillsTag === 'outils';
        }
        return group.dataset.skillsTag === currentSkillsFilter;
    }

    function refreshSkills() {
        skillsGroups.forEach((group) => {
            const match = matchesSkillsFilter(group);
            group.classList.toggle('is-hidden', !match);
            if (match) group.classList.add('visible');
        });
    }

    skillsFilterButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        btn.addEventListener('click', () => {
            skillsFilterButtons.forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentSkillsFilter = btn.dataset.skillsFilter || 'all';
            refreshSkills();
        });
    });

    refreshSkills();

    function notifySiteVisit() {
        const KEY = 'jpl_visit_notified';
        const CLOUDFLARE_WORKER_URL = 'https://notify-visit.jacques-p69.workers.dev';

        try {
            if (sessionStorage.getItem(KEY)) return;
            sessionStorage.setItem(KEY, '1');
        } catch (_) {
            /* sessionStorage indisponible */
        }

        const payload = {
            page: window.location.href,
            referrer: document.referrer || '',
            lang: navigator.language || '',
            langs: Array.isArray(navigator.languages) ? navigator.languages.join(', ') : '',
            screen: `${window.screen?.width || 0}×${window.screen?.height || 0}`,
            viewport: `${window.innerWidth || 0}×${window.innerHeight || 0}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            platform: navigator.platform || navigator.userAgentData?.platform || '',
        };

        const basePath = window.location.pathname.replace(/\/[^/]*$/, '/');
        const phpEndpoint = `${window.location.origin}${basePath}api/notify-visit.php`;
        const endpoint = CLOUDFLARE_WORKER_URL || phpEndpoint;

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => {});
    }

    notifySiteVisit();

    const revealTargets = document.querySelectorAll(
        '.timeline-item, .project-card, .featured-item, .veille-card, .skills-group, .social-btn'
    );

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        if (entry.target.classList.contains('project-card')) {
                            entry.target.style.transitionDelay = `${(Number(entry.target.dataset.index) % 3) * 0.06}s`;
                        }
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );
        revealTargets.forEach((el) => revealObserver.observe(el));
    } else {
        revealTargets.forEach((el) => el.classList.add('visible'));
    }

    document.documentElement.classList.add('js-ready');
});
