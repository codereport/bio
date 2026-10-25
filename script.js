function initWebsiteBelt() {
    const track = document.querySelector('.belt-track');
    const group = track?.querySelector('.belt-group');
    if (!group) return;

    // Identical groups include their trailing gap, so half the track is one full cycle.
    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.querySelectorAll('a').forEach(link => link.tabIndex = -1);
    track.appendChild(duplicate);
    track.style.setProperty('--belt-duration', `${group.children.length * 4.5}s`);
    track.classList.add('is-ready');
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
