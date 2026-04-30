document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('membersGrid');
    const searchInput = document.getElementById('searchInput');
    const globalTotalEl = document.getElementById('globalTotal');
    const globalVerifiedEl = document.getElementById('globalVerified');
    const globalRejectedEl = document.getElementById('globalRejected');

    // Loading state
    gridContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 5rem;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--accent-primary);"></i><p style="margin-top: 1rem;">Collecting live data for 8 members...</p></div>';

    // Global variable to store fetched data
    let currentData = [];

    // Initialize dashboard by fetching data from API
    async function initDashboard() {
        try {
            const response = await fetch('/api/stats');
            currentData = await response.json();
            
            renderCards(currentData);
            updateGlobalStats(currentData);
            
            // Setup search functionality
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredMembers = currentData.filter(member => 
                    member.id.toLowerCase().includes(searchTerm) || 
                    member.name.toLowerCase().includes(searchTerm)
                );
                renderCards(filteredMembers);
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            gridContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 5rem; color: var(--danger);"><i class="fa-solid fa-circle-exclamation" style="font-size: 3rem;"></i><p style="margin-top: 1rem;">Failed to connect to the backend server. Make sure app.py is running.</p></div>`;
        }
    }

    // Update global stats counters
    function updateGlobalStats(data) {
        const stats = data.reduce((acc, curr) => {
            acc.total += curr.total;
            acc.verified += curr.verified;
            acc.rejected += curr.rejected;
            return acc;
        }, { total: 0, verified: 0, rejected: 0 });

        animateValue(globalTotalEl, 0, stats.total, 1000);
        animateValue(globalVerifiedEl, 0, stats.verified, 1000);
        animateValue(globalRejectedEl, 0, stats.rejected, 1000);
    }

    // Number animation
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Render grid cards
    function renderCards(data) {
        gridContainer.innerHTML = '';
        
        if (data.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No members found matching your search.</p>
                </div>
            `;
            return;
        }

        data.forEach((member, index) => {
            // Find actual rank based on sorted full data
            const actualRank = currentData.findIndex(m => m.id === member.id) + 1;
            const rankBadge = actualRank <= 3 
                ? `<div class="rank-badge rank-${actualRank}">#${actualRank}</div>` 
                : `<div class="rank-badge">#${actualRank}</div>`;
            
            const initials = member.name.split(' ').map(n => n[0]).join('');
            const verifiedPercent = Math.round((member.verified / member.total) * 100) || 0;

            const card = document.createElement('div');
            card.className = 'member-card';
            card.innerHTML = `
                ${rankBadge}
                <div class="member-header">
                    <div class="avatar">${initials}</div>
                    <div class="member-info">
                        <h2>${member.name}</h2>
                        <span class="member-id">${member.id}</span>
                    </div>
                </div>
                <div class="member-body">
                    <div class="stat-row">
                        <div class="stat-label">
                            <i class="fa-solid fa-users"></i> Total Registered
                        </div>
                        <div class="stat-value total-val">${member.total}</div>
                    </div>
                    <div class="stat-row">
                        <div class="stat-label">
                            <i class="fa-solid fa-check-circle" style="color: var(--success);"></i> Verified
                        </div>
                        <div class="stat-value verified-val">${member.verified}</div>
                    </div>
                    <div class="stat-row">
                        <div class="stat-label">
                            <i class="fa-solid fa-times-circle" style="color: var(--danger);"></i> Rejected
                        </div>
                        <div class="stat-value rejected-val">${member.rejected}</div>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-header">
                            <span>Verification Rate</span>
                            <span>${verifiedPercent}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: 0%" data-width="${verifiedPercent}%"></div>
                        </div>
                    </div>
                </div>
                <div class="action-footer">
                    <button class="view-btn">View Detailed Log</button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        // Trigger progress bar animations after rendering
        setTimeout(() => {
            const progressBars = document.querySelectorAll('.progress-bar-fill');
            progressBars.forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 100);
    }

    initDashboard();
});
