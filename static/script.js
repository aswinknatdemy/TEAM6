document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('membersGrid');
    const searchInput = document.getElementById('searchInput');
    const globalTotalEl = document.getElementById('globalTotal');
    const globalVerifiedEl = document.getElementById('globalVerified');
    const globalWaitingEl = document.getElementById('globalWaiting');
    const globalRejectedEl = document.getElementById('globalRejected');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const themeToggle = document.querySelector('.theme-switch input[type="checkbox"]');

    // Theme Switch Logic
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'light' && themeToggle) {
            themeToggle.checked = true;
        }
    }

    function switchTheme(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }    
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', switchTheme, false);
    }

    let currentData = [];
    let isInitialLoad = true;
    let previousVerified = null;

    // Show initial loading state
    gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 5rem;" id="initialLoader">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 3rem; color: var(--accent-primary);"></i>
            <p style="margin-top: 1.5rem; color: var(--text-secondary);">Fetching live student data from Natdemy...</p>
        </div>
    `;

    async function fetchStats() {
        try {
            // Show a subtle indicator (pulse dot is already there)
            const response = await fetch('/api/stats');
            currentData = await response.json();
            
            if (isInitialLoad) {
                const loader = document.getElementById('initialLoader');
                if (loader) loader.remove();
                isInitialLoad = false;
            }

            renderDashboard(currentData);
            updateGlobalStats(currentData);
            
            const now = new Date();
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = now.toLocaleTimeString();
            }
        } catch (error) {
            console.error('Error:', error);
            if (isInitialLoad) {
                gridContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 5rem;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--danger);"></i>
                        <p style="margin-top: 1.5rem;">Failed to connect to the scraping service.</p>
                    </div>
                `;
            }
        }
    }

    function triggerPartyAnimation(count) {
        let overlay = document.getElementById('partyOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'partyOverlay';
            overlay.className = 'party-overlay';
            overlay.innerHTML = `
                <div class="party-content">
                    <div class="party-count" id="partyCountDisplay"></div>
                    <div class="party-message">Verified Milestone Reached! 🎉</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        document.getElementById('partyCountDisplay').textContent = count;
        overlay.classList.add('active');

        // Confetti effect using canvas-confetti
        if (typeof confetti === 'function') {
            const duration = 5000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#6366f1', '#8b5cf6', '#10b981'],
                    zIndex: 10000
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#6366f1', '#8b5cf6', '#10b981'],
                    zIndex: 10000
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }

        // Auto remove overlay after 6 seconds
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 6000);
    }

    function updateGlobalStats(data) {
        const stats = data.reduce((acc, curr) => {
            acc.total += curr.total;
            acc.verified += curr.verified;
            acc.waiting += curr.waiting;
            acc.rejected += curr.rejected;
            return acc;
        }, { total: 0, verified: 0, waiting: 0, rejected: 0 });

        if (previousVerified !== null) {
            const prevMult = Math.floor(previousVerified / 50);
            const currMult = Math.floor(stats.verified / 50);
            if (currMult > prevMult && stats.verified > 0) {
                triggerPartyAnimation(stats.verified);
            }
        }
        previousVerified = stats.verified;

        animateValue(globalTotalEl, stats.total);
        animateValue(globalVerifiedEl, stats.verified);
        animateValue(globalWaitingEl, stats.waiting);
        animateValue(globalRejectedEl, stats.rejected);
    }

    function animateValue(el, value) {
        if (!el) return;
        let currentText = el.textContent.replace(/,/g, '');
        let current = parseInt(currentText) || 0;
        if (current === value) return; // No change

        const duration = 1000;
        const start = performance.now();

        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const val = Math.floor(progress * (value - current) + current);
            el.textContent = val.toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    function renderDashboard(data) {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filteredData = data.filter(m => 
            m.name.toLowerCase().includes(searchTerm) || 
            m.id.toLowerCase().includes(searchTerm)
        ).sort((a, b) => b.verified - a.verified);

        // To make it truly "without loading", we update existing elements if possible
        // but for simplicity and to handle re-ordering, we'll re-render if the order changed
        // or just re-render but hide the transition.
        
        // Let's check if we should re-render
        const currentIds = Array.from(gridContainer.querySelectorAll('.member-card')).map(card => card.dataset.id);
        const newIds = filteredData.map(m => m.id);

        if (JSON.stringify(currentIds) === JSON.stringify(newIds)) {
            // Same order and items, just update the values
            filteredData.forEach(member => {
                const card = gridContainer.querySelector(`.member-card[data-id="${member.id}"]`);
                if (card) {
                    const verifiedRate = member.total > 0 ? Math.round((member.verified / member.total) * 100) : 0;
                    card.querySelector('.val.total').textContent = member.total;
                    card.querySelector('.val.verified').textContent = member.verified;
                    card.querySelector('.val.waiting').textContent = member.waiting;
                    card.querySelector('.val.rejected').textContent = member.rejected;
                    card.querySelector('.progress-label span:last-child').textContent = `${verifiedRate}%`;
                    card.querySelector('.bar-fill').style.width = `${verifiedRate}%`;
                }
            });
        } else {
            // Re-render the whole grid
            gridContainer.innerHTML = '';
            filteredData.forEach((member, index) => {
                const verifiedRate = member.total > 0 ? Math.round((member.verified / member.total) * 100) : 0;
                const initials = member.name.substring(0, 2);
                
                const card = document.createElement('div');
                card.className = `member-card glass rank-${index + 1}`;
                card.dataset.id = member.id;
                card.innerHTML = `
                    <div class="member-header">
                        <div class="avatar">${initials}</div>
                        <div class="member-info">
                            <h2>${member.name}</h2>
                            <span class="id-label">${member.id}</span>
                        </div>
                        <div class="rank-pill">#${index + 1}</div>
                    </div>
                    <div class="member-stats">
                        <div class="mini-stat">
                            <span>Total Students</span>
                            <span class="val total">${member.total}</span>
                        </div>
                        <div class="mini-stat">
                            <span>Verified</span>
                            <span class="val verified">${member.verified}</span>
                        </div>
                        <div class="mini-stat">
                            <span>Waiting</span>
                            <span class="val waiting">${member.waiting}</span>
                        </div>
                        <div class="mini-stat">
                            <span>Rejected</span>
                            <span class="val rejected">${member.rejected}</span>
                        </div>
                    </div>
                    <div class="progress-wrap">
                        <div class="progress-label">
                            <span>Success Rate</span>
                            <span>${verifiedRate}%</span>
                        </div>
                        <div class="bar-bg">
                            <div class="bar-fill" style="width: ${verifiedRate}%"></div>
                        </div>
                    </div>
                `;
                gridContainer.appendChild(card);
            });
        }
    }

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderDashboard(currentData);
        });
    }

    // Initial load
    fetchStats();
    
    // Auto refresh every 5 seconds without showing loading spinner
    setInterval(fetchStats, 10000);
});
