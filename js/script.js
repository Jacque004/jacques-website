// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Configuration globale
    const config = {
        navbar: {
            hideOnScroll: true,
            scrollThreshold: 100,
            scrollDelay: 150
        },
        animations: {
            scrollDelay: 100,
            fadeInDelay: 200,
            transitionDuration: 300
        },
        lazyLoad: {
            threshold: 0.1,
            rootMargin: '50px'
        },
        observer: {
            threshold: 0.1,
            rootMargin: '0px'
        }
    };

    // Éléments DOM
    const elements = {
        navbar: document.querySelector('.navbar'),
        navbarToggler: document.querySelector('.navbar-toggler'),
        navbarCollapse: document.querySelector('.navbar-collapse'),
        navLinks: document.querySelectorAll('.nav-link'),
        sections: document.querySelectorAll('section[id]'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        portfolioItems: document.querySelectorAll('.portfolio-item'),
        forms: document.querySelectorAll('form'),
        buttons: document.querySelectorAll('.btn'),
        skills: document.querySelectorAll('.skill')
    };

    // Variables d'état
    let lastScroll = 0;
    let scrollTimeout = null;
    let resizeTimeout = null;
    let isScrolling = false;
    let isResizing = false;

    // Gestionnaire de scroll optimisé
    function handleScroll() {
        if (isScrolling) return;
        isScrolling = true;

        requestAnimationFrame(() => {
            const currentScroll = window.pageYOffset;
            
            // Gestion de la navbar
            if (config.navbar.hideOnScroll) {
                if (currentScroll > lastScroll && currentScroll > config.navbar.scrollThreshold) {
                    elements.navbar.classList.add('hide');
                } else {
                    elements.navbar.classList.remove('hide');
                }
                
                if (currentScroll > config.navbar.scrollThreshold) {
                    elements.navbar.classList.add('scrolled');
                } else {
                    elements.navbar.classList.remove('scrolled');
                }
            }
            
            // Mise à jour du lien actif
            updateActiveLink(currentScroll);
            
            lastScroll = currentScroll;
            isScrolling = false;
        });
    }

    // Gestionnaire de redimensionnement optimisé
    function handleResize() {
        if (isResizing) return;
        isResizing = true;

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Réinitialiser les observateurs
            if (window.observers) {
                Object.values(window.observers).forEach(observer => observer.disconnect());
            }
            initObservers();
            isResizing = false;
        }, config.animations.scrollDelay);
    }

    // Mise à jour des liens actifs optimisée
    function updateActiveLink(scrollY) {
        const offset = 100;
        const currentSection = Array.from(elements.sections).find(section => {
            const rect = section.getBoundingClientRect();
            return rect.top <= offset && rect.bottom >= offset;
        });

        if (currentSection) {
            const id = currentSection.getAttribute('id');
            elements.navLinks.forEach(link => {
                const isActive = link.getAttribute('href') === `#${id}`;
                link.classList.toggle('active', isActive);
                link.setAttribute('aria-current', isActive ? 'page' : null);
            });
        }
    }

    // Initialisation des observateurs
    function initObservers() {
        // Observer pour les animations
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const delay = target.dataset.delay || 0;
                    
                    setTimeout(() => {
                        target.classList.add('visible');
                        if (target.classList.contains('skill-category')) {
                            target.style.transitionDelay = `${delay}s`;
                        }
                    }, config.animations.fadeInDelay);
                    
                    animationObserver.unobserve(target);
                }
            });
        }, config.observer);

        // Observer pour le chargement paresseux
        const lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                    }
                    lazyLoadObserver.unobserve(img);
                }
            });
        }, config.lazyLoad);

        // Observer les éléments
        document.querySelectorAll('.skill-category, .timeline-item, .portfolio-item, .fade-in').forEach((element, index) => {
            element.dataset.delay = index * 0.1;
            animationObserver.observe(element);
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            lazyLoadObserver.observe(img);
        });

        // Stocker les observateurs pour le nettoyage
        window.observers = {
            animation: animationObserver,
            lazyLoad: lazyLoadObserver
        };
    }

    // Gestion des formulaires
    function initFormValidation() {
        elements.forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            form.addEventListener('submit', (e) => {
                if (!form.checkValidity()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.classList.add('was-validated');
            });

            inputs.forEach(input => {
                input.addEventListener('input', debounce(() => {
                    validateInput(input);
                }, 300));

                input.addEventListener('blur', () => {
                    validateInput(input);
                });
            });
        });
    }

    // Validation des champs de formulaire
    function validateInput(input) {
        const isValid = input.checkValidity();
        input.classList.toggle('is-valid', isValid);
        input.classList.toggle('is-invalid', !isValid);
        
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = input.validationMessage;
        }
    }

    // Gestion des boutons
    function initButtonEffects() {
        elements.buttons.forEach(button => {
            button.addEventListener('click', createRippleEffect);
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
    }

    // Effet de ripple
    function createRippleEffect(e) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // Fonction de debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Filtrage des projets
    elements.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons
            elements.filterButtons.forEach(btn => btn.classList.remove('active'));
            // Ajouter la classe active au bouton cliqué
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            elements.skills.forEach(skill => {
                if (filterValue === 'all' || skill.getAttribute('data-category') === filterValue) {
                    skill.style.display = 'flex';
                    // Animation de fade-in
                    skill.style.opacity = '0';
                    setTimeout(() => {
                        skill.style.opacity = '1';
                    }, 50);
                } else {
                    skill.style.display = 'none';
                }
            });
        });
    });

    // Smooth scroll optimisé
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
                const startPosition = window.pageYOffset;
                const distance = targetPosition - startPosition;
                const duration = 1000;
                let start = null;

                function animation(currentTime) {
                    if (start === null) start = currentTime;
                    const timeElapsed = currentTime - start;
                    const progress = Math.min(timeElapsed / duration, 1);
                    const ease = easeInOutCubic(progress);
                    window.scrollTo(0, startPosition + distance * ease);
                    if (timeElapsed < duration) {
                        requestAnimationFrame(animation);
                    }
                }

                requestAnimationFrame(animation);
            }
        });
    });

    // Fonction d'easing pour le smooth scroll
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Gestion du mode sombre
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    function updateTheme(e) {
        document.documentElement.classList.toggle('dark-mode', e.matches);
    }

    // Écouter les changements de préférence de thème
    prefersDarkScheme.addListener(updateTheme);
    // Appliquer le thème initial
    updateTheme(prefersDarkScheme);

    // Initialisation
    initObservers();
    
    // Initialiser les gestionnaires d'événements
    window.addEventListener('scroll', debounce(handleScroll, config.navbar.scrollDelay));
    window.addEventListener('resize', handleResize);
    
    // Initialiser les fonctionnalités
    initFormValidation();
    initButtonEffects();
    
    // Gestion du menu mobile
    if (elements.navbarToggler) {
        elements.navbarToggler.addEventListener('click', () => {
            elements.navbarCollapse.classList.toggle('show');
            elements.navbarToggler.setAttribute('aria-expanded', 
                elements.navbarCollapse.classList.contains('show'));
        });
    }
    
    // Fermer le menu mobile au clic sur un lien
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (elements.navbarCollapse.classList.contains('show')) {
                elements.navbarCollapse.classList.remove('show');
                elements.navbarToggler.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Nettoyage
    window.addEventListener('unload', () => {
        // Nettoyer les observateurs
        if (window.observers) {
            Object.values(window.observers).forEach(observer => observer.disconnect());
        }
        
        // Nettoyer les timeouts
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        
        // Réinitialiser les styles
        document.querySelectorAll('.fade-in').forEach(element => {
            element.style.willChange = 'auto';
        });
    });
}); 
