document.addEventListener('DOMContentLoaded', () => {
    // --- Data & State ---
    const SKINS = {
        goldenSamurai: { name: '黃金武士', hero: 'samurai', image: 'pict/黃金武士.jpg' },
        zoro: { name: '索隆', hero: 'samurai', image: 'pict/索隆.jpg' },
        britishAgent: { name: '英國特務', hero: 'assassin', image: 'pict/英國特務.jpg' },
        sealAgent: { name: '海豹特務', hero: 'assassin', image: 'pict/海豹特務.jpg' },
        zhugeLiang: { name: '諸葛亮', hero: 'merlin', image: 'pict/諸葛亮.jpg' },
        frieren: { name: '芙莉蓮', hero: 'merlin', image: 'pict/芙莉蓮.jpg' }
    };

    const HERO_NAMES = {
        samurai: '武士凌',
        assassin: '殺手007',
        merlin: '梅林'
    };

    let currentUser = null;
    let selectedSkinId = null;

    // --- Initialization ---
    function init() {
        const userJSON = localStorage.getItem('dota_user');
        if (!userJSON) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = JSON.parse(userJSON);

        // Ensure data integrity
        if (!currentUser.skins) currentUser.skins = ['goldenSamurai'];
        if (currentUser.diamonds === undefined) currentUser.diamonds = 0;
        if (!currentUser.equippedSkins) currentUser.equippedSkins = {}; // { heroId: skinId }

        // Select the first skin by default if available
        if (currentUser.skins.length > 0) {
            selectedSkinId = currentUser.skins[0];
        }

        updateUI();
    }

    function updateUI() {
        document.getElementById('diamond-count').textContent = currentUser.diamonds;
        renderWardrobe();
        renderPreview();
    }

    function renderWardrobe() {
        const grid = document.getElementById('wardrobe-grid');
        grid.innerHTML = '';

        const ownedSkins = currentUser.skins;

        if (ownedSkins.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #aaa;">你還沒有任何外觀。</p>';
            return;
        }

        ownedSkins.forEach(skinId => {
            const skin = SKINS[skinId];
            if (!skin) return;

            const isEquipped = currentUser.equippedSkins && currentUser.equippedSkins[skin.hero] === skinId;
            const isSelected = skinId === selectedSkinId;

            const item = document.createElement('div');
            item.className = `wardrobe-item ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`;
            item.onclick = () => selectSkin(skinId);

            let innerHTML = `<img src="${skin.image}" alt="${skin.name}">`;
            if (isEquipped) {
                innerHTML += `<div class="equipped-badge">已裝備</div>`;
            }

            item.innerHTML = innerHTML;
            grid.appendChild(item);
        });
    }

    function renderPreview() {
        const previewImg = document.getElementById('preview-img');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewInfo = document.getElementById('preview-info');
        const previewName = document.getElementById('preview-name');
        const previewHero = document.getElementById('preview-hero');
        const equipBtn = document.getElementById('equip-btn');

        if (!selectedSkinId) {
            previewImg.style.display = 'none';
            previewInfo.style.display = 'none';
            previewPlaceholder.style.display = 'block';
            return;
        }

        const skin = SKINS[selectedSkinId];
        if (!skin) return;

        previewImg.src = skin.image;
        previewImg.style.display = 'block';
        previewPlaceholder.style.display = 'none';

        previewName.textContent = skin.name;
        previewHero.textContent = HERO_NAMES[skin.hero];
        previewInfo.style.display = 'block';

        const isEquipped = currentUser.equippedSkins && currentUser.equippedSkins[skin.hero] === selectedSkinId;

        equipBtn.onclick = () => equipSkin(selectedSkinId, skin.hero);
        if (isEquipped) {
            equipBtn.textContent = '已裝備';
            equipBtn.disabled = true;
        } else {
            equipBtn.textContent = '裝備';
            equipBtn.disabled = false;
        }
    }

    function selectSkin(skinId) {
        selectedSkinId = skinId;
        updateUI();
    }

    // --- Actions ---
    function equipSkin(skinId, heroId) {
        if (!currentUser.equippedSkins) currentUser.equippedSkins = {};
        currentUser.equippedSkins[heroId] = skinId;

        // Save to local storage
        saveUserData();
        updateUI();
    }

    function saveUserData() {
        localStorage.setItem('dota_user', JSON.stringify(currentUser));

        // Also update master list
        const users = JSON.parse(localStorage.getItem('dota_users') || '[]');
        const index = users.findIndex(u => u.username === currentUser.username);
        if (index !== -1) {
            users[index] = currentUser;
            localStorage.setItem('dota_users', JSON.stringify(users));
        }
    }

    // --- Gacha Logic ---
    const drawOneBtn = document.getElementById('draw-one-btn');
    const drawTenBtn = document.getElementById('draw-ten-btn');
    const resultModal = document.getElementById('result-modal');
    const resultGrid = document.getElementById('result-grid');
    const closeResultBtn = document.getElementById('close-result-btn');

    drawOneBtn.onclick = () => performGacha(1, 2);
    drawTenBtn.onclick = () => performGacha(10, 19);
    closeResultBtn.onclick = () => resultModal.style.display = 'none';

    function performGacha(count, cost) {
        if (currentUser.diamonds < cost) {
            alert('鑽石不足！');
            return;
        }

        currentUser.diamonds -= cost;

        const results = [];
        const skinKeys = Object.keys(SKINS);

        for (let i = 0; i < count; i++) {
            // 10% chance to win a skin
            const isWin = Math.random() < 0.1;

            if (isWin) {
                const randomIndex = Math.floor(Math.random() * skinKeys.length);
                const skinId = skinKeys[randomIndex];
                const skin = SKINS[skinId];
                results.push({ type: 'skin', data: skin });

                // Add to inventory if not owned
                if (!currentUser.skins.includes(skinId)) {
                    currentUser.skins.push(skinId);
                }
            } else {
                results.push({ type: 'miss' });
            }
        }

        saveUserData();
        updateUI();
        showResults(results);
    }

    function showResults(results) {
        resultGrid.innerHTML = '';
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'result-item';

            if (result.type === 'skin') {
                const skin = result.data;
                div.innerHTML = `
                    <img src="${skin.image}" alt="${skin.name}">
                    <p style="color: #ffd700; font-weight: bold;">${skin.name}</p>
                `;
            } else {
                div.innerHTML = `
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #333; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px auto; border: 2px solid #555;">
                        <i class="fas fa-times" style="font-size: 40px; color: #555;"></i>
                    </div>
                    <p style="color: #aaa;">銘謝惠顧</p>
                `;
            }

            resultGrid.appendChild(div);
        });
        resultModal.style.display = 'flex';
    }

    init();
});
