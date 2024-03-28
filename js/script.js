(function ($) {
    "use strict"; // Début d’utilisation strict
  
    // Défilement en douceur avec jQuery easing
    $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
        if (
            location.pathname.replace(/^\//, "") ==
                this.pathname.replace(/^\//, "") &&
            location.hostname == this.hostname
        ) {
            var target = $(this.hash);
            target = target.length
                ? target
                : $("[name=" + this.hash.slice(1) + "]");
            if (target.length) {
                $("html, body").animate(
                    {
                        scrollTop: target.offset().top - 72,
                    },
                    1000,
                    "easeInOutExpo"
                );
                return false;
            }
        }
    });
  
    // Ferme le menu réactif lorsqu’un lien de déclenchement de défilement est cliqué
    $(".js-scroll-trigger").click(function () {
        $(".navbar-collapse").collapse("hide");
    });
  
    // Activer scrollspy pour ajouter une classe active aux éléments de la barre de navigation sur le défilement
    $("body").scrollspy({
        target: "#mainNav",
        offset: 74,
    });
  
    // Réduire Navbar
    var navbarCollapse = function () {
        if ($("#mainNav").offset().top > 100) {
            $("#mainNav").addClass("navbar-shrink");
        } else {
            $("#mainNav").removeClass("navbar-shrink");
        }
    };
    // Réduire maintenant si la page n’est pas en haut
    navbarCollapse();
    // Réduire la barre de navigation lorsque la page défile
    $(window).scroll(navbarCollapse);
  })(jQuery); // Fin d’utilisation stricte
  