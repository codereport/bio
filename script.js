/** Paths relative to index.html — add or reorder screenshots in assets/websites/. */
const WEBSITE_SCREENSHOTS = [
    'assets/websites/amazon.png',
    'assets/websites/apl.png',
    'assets/websites/cpp.png',
    'assets/websites/cursor.png',
    'assets/websites/java.png',
    'assets/websites/moodys.png',
    'assets/websites/nvidia.png',
    'assets/websites/python.png',
];

function initWebsiteBelt() {
    const track = document.getElementById('websites-belt-track');
    const viewport = track?.closest('.websites-belt-viewport');
    if (!track || !viewport || WEBSITE_SCREENSHOTS.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cardHtml = (src, index, duplicated) => {
        const hidden = duplicated ? ' aria-hidden="true"' : '';
        const label = `Website screenshot ${index + 1}`;
        return `<div class="websites-belt-card"${hidden} role="img" aria-label="${label}"><img src="${src}" alt="" loading="lazy" decoding="async" width="260" height="162"></div>`;
    };

    const firstPass = WEBSITE_SCREENSHOTS.map((src, i) => cardHtml(src, i, false)).join('');
    const secondPass = WEBSITE_SCREENSHOTS.map((src, i) => cardHtml(src, i, true)).join('');
    track.innerHTML = firstPass + secondPass;

    // Longer belt = slower scroll so each image is readable (~5s per card baseline)
    const seconds = Math.max(28, WEBSITE_SCREENSHOTS.length * 5);
    viewport.style.setProperty('--belt-duration', `${seconds}s`);

    if (prefersReducedMotion) {
        track.style.animation = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();

    initWebsiteBelt();

    // Stats Toggle
    function toggleStats() {
        document.body.classList.toggle('show-stats');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 's' || e.key === 'S') {
            toggleStats();
        }
    });

    window.addEventListener('message', (event) => {
        if (event.data === 'toggle-stats') {
            toggleStats();
        }
    });
});
