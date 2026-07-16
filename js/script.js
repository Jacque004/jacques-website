/**
 * Portfolio — interactions
 * Nav scrollspy, filtres projets, load more, a11y
 */
document.addEventListener('DOMContentLoaded', () => {
    const NAV_OFFSET = 100;
    const BACK_TOP_THRESHOLD = 420;
    const PROJECTS_PAGE_SIZE = 6;

    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const sections = document.querySelectorAll('section[id]');
    const navbarCollapse = document.querySelector('#navbarNav');
    const backToTop = document.getElementById('backToTop');
    const filterButtons = document.querySelectorAll('.project-filters .filter-btn');
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const loadMoreBtn = document.getElementById('loadMoreProjects');
    const loadMoreWrap = document.querySelector('.projects-load-more');

    let currentFilter = 'all';
    let visibleCount = PROJECTS_PAGE_SIZE;
    let ticking = false;

    function updateNavbar() {
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

        navLinks.forEach((link) => {
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
            updateNavbar();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateNavbar();

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                const toggler = document.querySelector('.navbar-toggler');
                if (toggler && window.bootstrap?.Collapse) {
                    bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
                } else {
                    navbarCollapse.classList.remove('show');
                    toggler?.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

        const moreAvailable = matched.length > visibleCount;
        if (loadMoreWrap) {
            loadMoreWrap.hidden = !moreAvailable;
        }
        if (loadMoreBtn) {
            loadMoreBtn.hidden = !moreAvailable;
            loadMoreBtn.setAttribute('aria-expanded', String(moreAvailable && visibleCount > PROJECTS_PAGE_SIZE));
        }
    }

    filterButtons.forEach((btn) => {
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

    filterButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            visibleCount += PROJECTS_PAGE_SIZE;
            refreshProjects();
        });
    }

    refreshProjects();

    /* Filtre compétences */
    const skillsFilterButtons = document.querySelectorAll('.skills-filters .filter-btn');
    const skillsGroups = Array.from(document.querySelectorAll('.skills-group'));
    let currentSkillsFilter = 'outils';

    function matchesSkillsFilter(group) {
        if (currentSkillsFilter === 'outils') {
            return group.dataset.skillsCategory === 'outils';
        }
        return group.dataset.skillsTag === currentSkillsFilter;
    }

    function refreshSkills() {
        skillsGroups.forEach((group) => {
            const match = matchesSkillsFilter(group);
            group.classList.toggle('is-hidden', !match);
            if (match) {
                group.classList.add('visible');
            }
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

    const revealTargets = document.querySelectorAll(
        '.timeline-item, .project-card, .veille-card, .skills-group, .social-btn'
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
});
