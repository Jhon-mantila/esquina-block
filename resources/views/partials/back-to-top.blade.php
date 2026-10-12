<button type="button" id="volver-arriba" aria-label="Volver arriba" title="Volver arriba"
        class="pointer-events-none fixed right-4 bottom-6 z-30 grid h-11 w-11 translate-y-2 place-items-center rounded-full bg-blue-600 text-white opacity-0 shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:right-6">
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
</button>

<script>
    (() => {
        const button = document.getElementById('volver-arriba');
        const hiddenClasses = ['pointer-events-none', 'translate-y-2', 'opacity-0'];
        let ticking = false;

        const update = () => {
            ticking = false;
            hiddenClasses.forEach((c) => button.classList.toggle(c, scrollY < innerHeight));

            // El anuncio anclado de AdSense se fija abajo y taparía el botón.
            const anchor = document.querySelector('ins.adsbygoogle[data-anchor-status="displayed"]');
            const top = anchor?.getBoundingClientRect().top ?? innerHeight;
            button.style.bottom = top < innerHeight ? `${innerHeight - top + 16}px` : '';
        };

        const schedule = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        };

        addEventListener('scroll', schedule, { passive: true });
        addEventListener('resize', schedule);

        button.addEventListener('click', () => {
            const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
            scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
            document.querySelector('header a')?.focus({ preventScroll: true });
        });

        update();
    })();
</script>
