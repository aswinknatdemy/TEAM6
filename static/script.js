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
            const response = await fetch('/api/stats');
            const newData = await response.json();
            
            if (isInitialLoad) {
                const loader = document.getElementById('initialLoader');
                if (loader) loader.remove();
                isInitialLoad = false;
                renderDashboard(newData); // Initial full render
            } else {
                updateDashboardSeamlessly(newData);
            }
            
            updateGlobalStats(newData);
            currentData = newData;
            
            const now = new Date();
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = now.toLocaleTimeString();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function updateGlobalStats(data) {
        const stats = data.reduce((acc, curr) => {
            acc.total += Number(curr.total) || 0;
            acc.verified += Number(curr.verified) || 0;
            acc.waiting += Number(curr.waiting) || 0;
            acc.rejected += Number(curr.rejected) || 0;
            return acc;
        }, { total: 0, verified: 0, waiting: 0, rejected: 0 });

        // Only trigger if we have a previous count and the 50-count "bucket" has increased
        if (previousVerified !== null && stats.verified > previousVerified) {
            const prevBucket = Math.floor(previousVerified / 50);
            const currBucket = Math.floor(stats.verified / 50);
            
            if (currBucket > prevBucket) {
                triggerPartyAnimation(stats.verified);
            }
        }
        
        previousVerified = stats.verified;

        globalTotalEl.textContent = stats.total.toLocaleString();
        globalVerifiedEl.textContent = stats.verified.toLocaleString();
        globalWaitingEl.textContent = stats.waiting.toLocaleString();
        globalRejectedEl.textContent = stats.rejected.toLocaleString();
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

        if (typeof confetti === 'function') {
            const duration = 5000;
            const end = Date.now() + duration;
            (function frame() {
                confetti({
                    particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
                    colors: ['#6366f1', '#8b5cf6', '#10b981'], zIndex: 10000
                });
                confetti({
                    particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
                    colors: ['#6366f1', '#8b5cf6', '#10b981'], zIndex: 10000
                });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }

        setTimeout(() => {
            overlay.classList.remove('active');
        }, 6000);
    }

    function updateDashboardSeamlessly(data) {

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filteredData = data.filter(m => 
            m.name.toLowerCase().includes(searchTerm) || 
            m.id.toLowerCase().includes(searchTerm)
        ).sort((a, b) => b.verified - a.verified);

        const currentIds = Array.from(gridContainer.querySelectorAll('.member-card')).map(card => card.dataset.id);
        const newIds = filteredData.map(m => m.id);

        // If the order changed, we must re-render to show new rankings
        if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
            renderDashboard(data);
            return;
        }

        // Otherwise, just update the numbers in place (no flicker)
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
    }

    function renderDashboard(data) {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filteredData = data.filter(m => 
            m.name.toLowerCase().includes(searchTerm) || 
            m.id.toLowerCase().includes(searchTerm)
        ).sort((a, b) => b.verified - a.verified);

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
                    <div class="mini-stat"><span>Total</span><span class="val total">${member.total}</span></div>
                    <div class="mini-stat"><span>Verified</span><span class="val verified">${member.verified}</span></div>
                    <div class="mini-stat"><span>Waiting</span><span class="val waiting">${member.waiting}</span></div>
                    <div class="mini-stat"><span>Rejected</span><span class="val rejected">${member.rejected}</span></div>
                </div>
                <div class="progress-wrap">
                    <div class="progress-label"><span>Success Rate</span><span>${verifiedRate}%</span></div>
                    <div class="bar-bg"><div class="bar-fill" style="width: ${verifiedRate}%"></div></div>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderDashboard(currentData);
        });
    }

    // Initial load
    fetchStats();
    
    // Auto refresh every 10 seconds
    setInterval(fetchStats, 10000);
});

