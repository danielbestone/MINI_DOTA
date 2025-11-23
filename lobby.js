document.addEventListener('DOMContentLoaded', () => {
    // Check Auth
    const userJSON = localStorage.getItem('dota_user');
    if (!userJSON) {
        window.location.href = 'auth.html';
        return;
    }
    const currentUser = JSON.parse(userJSON);
    document.getElementById('username-display').textContent = currentUser.username;

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('dota_user');
        window.location.href = 'auth.html';
    });

    // --- Navigation ---
    document.getElementById('btn-battle').addEventListener('click', () => {
        window.location.href = 'level_select.html';
    });

    // Modals
    const placeholderModal = document.getElementById('placeholder-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const closeButtons = document.querySelectorAll('.close-modal');

    function showPlaceholder(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        placeholderModal.style.display = 'flex';
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            placeholderModal.style.display = 'none';
            document.getElementById('achievements-modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === placeholderModal) {
            placeholderModal.style.display = 'none';
        }
        if (e.target === document.getElementById('achievements-modal')) {
            document.getElementById('achievements-modal').style.display = 'none';
        }
    });

    // Feature Buttons
    document.getElementById('btn-equipment').addEventListener('click', () => {
        window.location.href = 'equipment.html';
    });

    // Achievements Logic
    const achievementsModal = document.getElementById('achievements-modal');
    const achievementsList = document.getElementById('achievements-list');

    // Define achievements locally or import? 
    // Since game.js has them, we should probably duplicate or share. 
    // For simplicity in this task, I'll duplicate the definitions or just show what the user has.
    const ACHIEVEMENTS = {
        firstBlood: { name: '第一滴血', description: '在本局遊戲中率先擊殺一名敵方英雄。' },
        tenKills: { name: '十殺', description: '在一局遊戲中累計擊殺 10 名敵人（英雄或小兵）。' },
        winner: { name: '勝利者', description: '贏得一局遊戲。' },
        perfectWin: { name: '完勝', description: '在沒有死亡的情況下贏得一局遊戲。' },
        winningStreak3: { name: '連勝將軍', description: '連勝三場遊戲。' }
    };

    document.getElementById('btn-achievements').addEventListener('click', () => {
        achievementsList.innerHTML = '';

        // Refresh user data from storage in case it changed
        const freshUser = JSON.parse(localStorage.getItem('dota_user'));
        const userAchievements = freshUser.achievements || [];

        for (const id in ACHIEVEMENTS) {
            const achievement = ACHIEVEMENTS[id];
            const isUnlocked = userAchievements.includes(id);

            const item = document.createElement('div');
            item.style.padding = '15px';
            item.style.marginBottom = '10px';
            item.style.background = isUnlocked ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)';
            item.style.border = isUnlocked ? '1px solid #00ff00' : '1px solid #555';
            item.style.borderRadius = '5px';
            item.style.color = isUnlocked ? '#fff' : '#aaa';

            item.innerHTML = `
                <h4 style="margin: 0 0 5px 0; color: ${isUnlocked ? '#00ff00' : 'inherit'}">
                    ${achievement.name} ${isUnlocked ? '<i class="fas fa-check-circle"></i>' : ''}
                </h4>
                <p style="margin: 0; font-size: 0.9rem;">${achievement.description}</p>
            `;
            achievementsList.appendChild(item);
        }
        achievementsModal.style.display = 'flex';
    });

});
