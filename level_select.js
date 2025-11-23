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

    // --- Level & Menu Generation ---
    const LEVELS = [
        { id: 1, title: '第一關', description: '經典 5v5 對戰。', icon: 'fa-gamepad', file: 'dota.html' },
        { id: 2, title: '第二關 - 食人魔', description: '挑戰強大的中立頭目！', icon: 'fa-dungeon', file: 'dota2.html' },
        { id: 3, title: '第三關 - 人海', description: '面對無盡的敵軍浪潮！', icon: 'fa-users', file: 'dota3.html' },
        { id: 4, title: '第四關 - 溫泉', description: '在治癒之泉旁戰鬥！', icon: 'fa-spa', file: 'dota4.html' },
        { id: 5, title: '第五關 - 大砲', description: '在敵方砲火下摧毀主堡！', icon: 'fa-bomb', file: 'dota5.html' }
    ];

    const lobbyMenu = document.querySelector('.lobby-menu');

    LEVELS.forEach(level => {
        const card = document.createElement('div');
        card.className = 'lobby-card';
        card.innerHTML = `
            <i class="fas ${level.icon}"></i>
            <h3>${level.title}</h3>
            <p>${level.description}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = level.file;
        });
        lobbyMenu.appendChild(card);
    });
});
