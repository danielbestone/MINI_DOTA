
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const playerKillsEl = document.getElementById('player-kills');
    const playerDeathsEl = document.getElementById('player-deaths');
    const playerGoldEl = document.getElementById('player-gold');
    const enemyKillsEl = document.getElementById('enemy-kills');
    const enemyDeathsEl = document.getElementById('enemy-deaths');
    const enemyGoldEl = document.getElementById('enemy-gold');
    const playerRespawnEl = document.getElementById('player-respawn');
    const enemyRespawnEl = document.getElementById('enemy-respawn');
    const messageEl = document.getElementById('message-el');
    const playerHeroStatsEl = document.getElementById('player-hero-stats');
    const gameWorld = document.getElementById('game-world');
    const shopModal = document.getElementById('shop-modal');
    const heroSelectionModal = document.getElementById('hero-selection-modal');

    // --- Game Constants & State ---
    const GAME_WIDTH = 1200;
    const MOVE_SPEED = 100; // pixels per second
    const MINION_SPAWN_INTERVAL = 10000; // 10 seconds
    const RESPAWN_TIME = 5000; // 5 seconds
    const CASTLE_OFFSET = 300;
    const PLAYER_CASTLE_POS = CASTLE_OFFSET;
    const ENEMY_CASTLE_POS = GAME_WIDTH - CASTLE_OFFSET;
    const PLAYER_HOME = 0;
    const ENEMY_HOME = GAME_WIDTH;

    let gameState = {
        playerTower: null,
        enemyTower: null,
        player: null,
        enemy: null,
        units: [],
        playerTeam: 'player',
        enemyTeam: 'enemy',
        minionSpawnTimer: 0,
        gameOver: false,
        started: false,
    };

    // --- Game Data ---
    const HEROES = {
        samurai: {
            name: '武士凌',
            description: '近戰物理輸出，快速貼近敵人並造成大量傷害。',
            stats: { hp: 1000, mp: 10, def: 10, att: 100, mdef: 10, matt: 10, range: 1, agi: 20, type: 'physical', image: 'pict/武士.png' }
        },
        assassin: {
            name: '殺手007',
            description: '遠程物理輸出，在安全的距離進行攻擊。',
            stats: { hp: 500, mp: 10, def: 10, att: 50, mdef: 10, matt: 10, range: 5, agi: 10, type: 'physical', image: 'pict/殺手007.png' }
        },
        merlin: {
            name: '梅林',
            description: '遠程魔法輸出，攻擊能穿透物理防禦。',
            stats: { hp: 500, mp: 10, def: 10, att: 10, mdef: 50, matt: 50, range: 5, agi: 10, type: 'magical', image: 'pict/魔法師.png' }
        }
    };
    const MINION_STATS = { hp: 500, mp: 10, def: 10, att: 10, mdef: 10, matt: 10, range: 1, agi: 10, type: 'physical', image: 'pict/士兵.png' };
    const ITEMS = {
        dragonSword: { name: '昇龍劍', description: '物理攻擊力 +10000。', cost: 100, type: 'attack', effects: { att: 10000 } },
        elderWand: { name: '惡魔接骨木', description: '魔法攻擊力 +10000。', cost: 100, type: 'magic', effects: { matt: 10000 } },
        tigerHelmet: { name: '白虎頭盔', description: '物理防禦 +10000。', cost: 100, type: 'defense', effects: { def: 10000 } },
        batCape: { name: '血蝙蝠披風', description: '魔法防禦 +10000。', cost: 100, type: 'defense', effects: { mdef: 10000 } },
        shockGloves: { name: '觸電手套', description: '攻擊時會額外造成等同於對方物理防禦的傷害。', cost: 100, type: 'special', effects: { onHit: 'enemy_def' } },
        reflectBullScarf: { name: '反彈鬥牛巾', description: '攻擊時會額外造成等同於對方魔法防禦的傷害。', cost: 100, type: 'special', effects: { onHit: 'enemy_mdef' } },
        generalsFlag: {
            name: '帥將旗幟',
            description: '提升小兵攻擊力為1000，防禦力為100',
            cost: 100,
            type: 'special',
            effects: { buffMinions: { att: 1000, def: 100 } }
        },
        flyingShoes: { name: '飛人跑鞋', description: '敏捷 +10000。', cost: 100, type: 'special', effects: { agi: 10000 } },
        dreamCatcher: { name: '捕夢網', description: '攻擊敵方英雄會造成敵方英雄敏捷數值同等的傷害。', cost: 100, type: 'special', effects: { damageBasedOnEnemyAgi: true } },
        evasionCape: {
            name: '鬥牛披風',
            description: '閃避攻擊的機率上升99%，攻擊力+100',
            cost: 100,
            type: 'defense',
            effects: { evasion: 0.99, att: 100 }
        },
        scope16x: { name: '16倍鏡', description: '攻擊敵人無視閃避機率並造成100倍傷害。', cost: 100, type: 'attack', effects: { ignoreEvasion: true, damageMultiplier: 100 } }
    };

    // --- Unit Class ---
    class Unit {
        constructor(team, stats, isHero = false, initialPosition = null, skipElementCreation = false) {
            this.team = team;
            this.baseStats = { ...stats };
            this.currentStats = { ...stats };
            this.hp = this.currentStats.hp;
            this.isHero = isHero;
            this.isDead = false;
            this.unitType = stats.name; // For identifying unit type, e.g., for effects
            const defaultPosition = (team === gameState.playerTeam) ? PLAYER_HOME : ENEMY_HOME;
            const rawPosition = initialPosition !== null ? initialPosition : defaultPosition;
            this.position = Math.max(0, Math.min(GAME_WIDTH, rawPosition));
            this.target = null;
            this.attackCooldown = 0;
            this.id = `unit-${Date.now()}-${Math.random()}`;
            this.targetPriority = 'nearest';

            if (!skipElementCreation) {
                this.createElement();
                this.updateElement();
            }
        }

        createElement() {
            this.element = document.createElement('div');
            this.element.id = this.id;
            this.element.className = `unit ${this.team === gameState.playerTeam ? 'player-team' : 'enemy-team'} ${this.isHero ? 'hero' : 'minion'}`;

            // Apply unit image
            if (this.baseStats.image) {
                this.element.style.backgroundImage = `url('${this.baseStats.image}')`;
                this.element.style.backgroundSize = 'contain';
                this.element.style.backgroundPosition = 'center';
                this.element.style.backgroundRepeat = 'no-repeat';
            }

            this.addHealthBarToElement();
            gameWorld.appendChild(this.element);
        }

        addHealthBarToElement() {
            const healthBarContainer = document.createElement('div');
            healthBarContainer.className = 'health-bar-container';
            this.healthBar = document.createElement('div');
            this.healthBar.className = 'health-bar';
            healthBarContainer.appendChild(this.healthBar);
            // Prepend to be the first child, so it appears above the element content
            this.element.prepend(healthBarContainer);
        }

        update(deltaTime, allUnits) {
            if (this.isDead) return;

            if (this.attackCooldown > 0) {
                this.attackCooldown -= deltaTime;
            }

            this.findTarget(allUnits);

            if (this.target) {
                const distance = Math.abs(this.position - this.target.position);
                if (distance <= this.currentStats.range * 50) { // Range unit to pixels
                    this.attack();
                } else {
                    this.move(deltaTime);
                }
            } else {
                this.move(deltaTime);
            }

            this.updateElement();
        }

        findTarget(allUnits) {
            const enemies = allUnits.filter(u => u.team !== this.team && !u.isDead);
            if (enemies.length === 0) {
                this.target = null;
                return;
            }

            let potentialTargets = enemies;
            if (this.targetPriority === 'hero') {
                const enemyHero = enemies.find(e => e.isHero);
                if (enemyHero) potentialTargets = [enemyHero];
            }

            potentialTargets.sort((a, b) => Math.abs(this.position - a.position) - Math.abs(this.position - b.position));

            if (potentialTargets.length > 0) {
                this.target = potentialTargets[0];
            } else {
                // If no minions or heroes, target the tower
                this.target = (this.team === gameState.playerTeam) ? gameState.enemyTower : gameState.playerTower;
            }
        }

        move(deltaTime) {
            let direction = (this.team === gameState.playerTeam) ? 1 : -1;

            if (this.target) {
                // Move towards target
                const diff = this.target.position - this.position;
                if (Math.abs(diff) > 10) { // Small threshold to avoid jitter
                    direction = Math.sign(diff);
                } else {
                    direction = 0; // Stop if close enough (though attack range check usually handles this)
                }
            }

            const distance = MOVE_SPEED * (deltaTime / 1000);
            this.position += direction * distance;
            this.position = Math.max(0, Math.min(GAME_WIDTH, this.position));
        }

        attack() {
            if (this.attackCooldown <= 0 && this.target) {
                // Fixed attack speed for Heroes: 0.2s (200ms)
                if (this.isHero) {
                    this.attackCooldown = 200;
                } else {
                    // Minions or other units use AGI formula
                    this.attackCooldown = 10000 / this.currentStats.agi;
                }

                // Evasion Check
                let hitChance = 1.0;
                if (this.target.item && this.target.item.effects.evasion) {
                    hitChance = 1.0 - this.target.item.effects.evasion;
                }
                if (this.item && this.item.effects.ignoreEvasion) {
                    hitChance = 1.0;
                }

                if (Math.random() > hitChance) {
                    // Miss!
                    return;
                }

                let damage = 0;

                // Damage Formulas
                if (this.baseStats.name === '殺手007') {
                    damage = (this.currentStats.agi * 0.6) - this.target.currentStats.def;
                } else if (this.currentStats.type === 'physical') {
                    damage = (this.currentStats.att * 0.6) - this.target.currentStats.def;
                } else { // magical
                    damage = (this.currentStats.matt * 0.6) - this.target.currentStats.mdef;
                }

                // Item effects
                if (this.item) {
                    if (this.item.effects.onHit === 'enemy_def') {
                        damage += this.target.currentStats.def;
                    } else if (this.item.effects.onHit === 'enemy_mdef') {
                        damage += this.target.currentStats.mdef;
                    } else if (this.item.effects.damageBasedOnEnemyAgi && this.target.isHero) {
                        damage += this.target.currentStats.agi;
                    }

                    if (this.item.effects.damageMultiplier) {
                        damage *= this.item.effects.damageMultiplier;
                    }
                }

                damage = Math.max(10, damage); // Always do at least 10 damage

                createAttackEffect(this, this.target);
                this.target.takeDamage(damage, this);
            }
        }

        takeDamage(damage, attacker) {
            this.hp -= damage;
            showDamageText(this, damage);
            if (this.hp <= 0) {
                this.hp = 0;
                this.die(attacker);
            }
            this.updateHealthBar();
        }

        die(killer) {
            this.isDead = true;
            this.element.classList.add('dead');

            if (killer) {
                const killerOwner = (killer.team === gameState.playerTeam) ? gameState.player : gameState.enemy;
                if (this.isHero) {
                    killerOwner.kills++;
                    killerOwner.gold += 100; // Hero kill gold
                } else {
                    killerOwner.gold += 100; // Minion kill gold
                }
            }

            if (this.isTower) {
                const message = (this.team === gameState.playerTeam) ? '你輸了！' : '你贏了！';
                endGame(message);
                return; // Stop further processing
            }

            if (this.isHero) {
                const owner = (this.team === gameState.playerTeam) ? gameState.player : gameState.enemy;
                owner.deaths++;
                owner.respawnTime = RESPAWN_TIME; // Set respawn timer
                setTimeout(() => this.respawn(), RESPAWN_TIME);
                if (this.team === gameState.playerTeam) {
                    showShop();
                } else {
                    // AI gets to "shop" when it dies
                    aiBuyItem(gameState.enemy);
                }
            } else {
                // Remove minion from game
                this.element.remove();
                gameState.units = gameState.units.filter(u => u.id !== this.id);
            }

            updateUI();
            updatePlayerHeroStatsUI();
            checkWinCondition();
        }

        respawn() {
            this.isDead = false;
            this.hp = this.currentStats.hp;
            const owner = (this.team === gameState.playerTeam) ? gameState.player : gameState.enemy;
            owner.respawnTime = 0; // Clear timer on respawn
            this.recalculateStats(); // Recalculate stats on respawn in case buffs changed
            this.position = (this.team === gameState.playerTeam) ? PLAYER_HOME : ENEMY_HOME;
            this.element.classList.remove('dead');
            this.updateElement(); // immediately snap to base
            this.updateHealthBar();
        }

        equipItem(item) {
            this.item = item;
            this.recalculateStats();
            updatePlayerHeroStatsUI();
        }

        recalculateStats() {
            this.currentStats = { ...this.baseStats };
            if (this.item) {
                for (const key in this.item.effects) {
                    if (key !== 'onHit' && key !== 'buffMinions') {
                        this.currentStats[key] = (this.currentStats[key] || 0) + this.item.effects[key];
                    }
                }
            }
            // Apply General's Flag buff to minions
            const owner = (this.team === gameState.playerTeam) ? gameState.player : gameState.enemy;
            if (owner.hero.item && owner.hero.item.effects.buffMinions && !this.isHero) {
                this.currentStats.att = owner.hero.item.effects.buffMinions.att;
                this.currentStats.def = owner.hero.item.effects.buffMinions.def;
            }
        }

        updateElement() {
            // Towers have fixed positions defined by CSS, so we don't touch their transform.
            if (this.isTower) {
                return;
            }

            const xPos = this.position - (this.element.offsetWidth / 2);
            const yPos = gameWorld.offsetHeight / 2 - this.element.offsetHeight / 2;
            this.element.style.transform = `translateX(${xPos}px) translateY(${yPos}px)`;
        }

        updateHealthBar() {
            const hpPercent = (this.hp / this.currentStats.hp) * 100;
            this.healthBar.style.width = `${hpPercent}%`;
        }
    }

    // --- Tower Class (extends Unit) ---
    class Tower extends Unit {
        constructor(team) {
            // Call super with a flag to skip initialization in the parent constructor
            super(team, {}, false, null, true); // The 'true' skips default element creation

            const stats = { hp: 500000, mp: 0, def: 100, mdef: 100, att: 0, matt: 0, range: 0, agi: 0, type: 'structure' };
            const position = (team === gameState.playerTeam) ? PLAYER_CASTLE_POS : ENEMY_CASTLE_POS;

            // Manually set properties for the Tower
            this.baseStats = { ...stats, image: 'pict/城堡.png' };
            this.currentStats = { ...this.baseStats };
            this.hp = this.currentStats.hp;
            this.position = position;
            this.isTower = true;

            // Find the existing tower element in the HTML
            this.element = document.getElementById(`${team}-tower`);

            // Apply tower image
            this.element.style.backgroundImage = `url('${this.baseStats.image}')`;
            this.element.style.backgroundSize = 'contain';
            this.element.style.backgroundPosition = 'center';
            this.element.style.backgroundRepeat = 'no-repeat';

            // Now that this.element is defined, we can add the health bar and update its position
            this.addHealthBarToElement();
            this.updateHealthBar();
            this.updateElement();
        }

        // Towers don't move
        move(deltaTime) { }
    }

    // --- UI & Shop Functions ---
    function updateUI() {
        playerKillsEl.textContent = gameState.player.kills;
        playerDeathsEl.textContent = gameState.player.deaths;
        playerGoldEl.textContent = gameState.player.gold;
        enemyKillsEl.textContent = gameState.enemy.kills;
        enemyDeathsEl.textContent = gameState.enemy.deaths;
        enemyGoldEl.textContent = gameState.enemy.gold;
    }

    function updateRespawnTimers(deltaTime) {
        [gameState.player, gameState.enemy].forEach(p => {
            if (!p || p.respawnTime <= 0) return;

            p.respawnTime -= deltaTime;
            const respawnEl = (p === gameState.player) ? playerRespawnEl : enemyRespawnEl;

            if (p.respawnTime > 0) {
                respawnEl.textContent = `${(p.respawnTime / 1000).toFixed(1)} 秒`;
            } else {
                p.respawnTime = 0;
                respawnEl.textContent = '存活';
            }
        });
    }

    function updatePlayerHeroStatsUI() {
        if (!gameState.player || !gameState.player.hero || !playerHeroStatsEl) return;

        const hero = gameState.player.hero;
        const stats = hero.currentStats;

        const statsText = `
英雄: ${hero.baseStats.name}
血量HP: ${stats.hp}
魔力MP: ${stats.mp}
物理防禦 DEF: ${stats.def}
物理攻擊力 ATT: ${stats.att}
魔法防禦 MDEF: ${stats.mdef}
魔法攻擊力: ${stats.matt}
攻擊距離: ${stats.range}
敏捷: ${stats.agi}
攻擊間隔: ${(10 / stats.agi).toFixed(2)} 秒
裝備: ${hero.item ? hero.item.name : '無'}
        `;
        playerHeroStatsEl.textContent = statsText.trim();
    }

    function getUnitCenterX(unit) {
        if (!unit) return 0;
        return unit.position;
    }

    function createAttackEffect(attacker, target) {
        if (!attacker || !target) return;

        const attackStyle = (attacker.currentStats.type === 'magical')
            ? 'magic'
            : (attacker.currentStats.range > 1 ? 'ranged' : 'melee');

        const effectEl = document.createElement('div');
        effectEl.className = 'attack-effect';
        const targetX = getUnitCenterX(target);
        const attackerX = getUnitCenterX(attacker);
        const centerY = gameWorld.offsetHeight / 2;

        let lifetime = 500;

        if (attackStyle === 'melee') {
            effectEl.classList.add('slash-effect');
            // Use left/top for positioning to avoid conflict with CSS keyframe transform
            effectEl.style.left = `${targetX}px`;
            effectEl.style.top = `${centerY}px`;
        } else if (attackStyle === 'ranged') {
            effectEl.classList.add('bullet-effect');
            // Bullets don't have keyframe transforms, so we can use transform for movement
            effectEl.style.transform = `translateX(${attackerX}px) translateY(${centerY - 5}px)`;
            requestAnimationFrame(() => {
                effectEl.style.transform = `translateX(${targetX}px) translateY(${centerY - 5}px)`;
            });
            lifetime = 300;
        } else {
            effectEl.classList.add('explosion-effect');
            // Use left/top for positioning
            effectEl.style.left = `${targetX}px`;
            effectEl.style.top = `${centerY}px`;
            lifetime = 400;
        }

        gameWorld.appendChild(effectEl);
        setTimeout(() => effectEl.remove(), lifetime);
    }

    function showDamageText(target, damage) {
        if (!target || !target.element) return;

        const textEl = document.createElement('div');
        textEl.className = 'damage-text';
        textEl.textContent = `-${Math.round(damage)}`;
        gameWorld.appendChild(textEl);

        const textWidth = textEl.offsetWidth || 20;
        const unitHeight = target.element.offsetHeight || 40;
        const startX = getUnitCenterX(target) - (textWidth / 2);
        const startY = (gameWorld.offsetHeight / 2) - unitHeight - 10;

        // Use left/top for base position
        textEl.style.left = `${startX}px`;
        textEl.style.top = `${startY}px`;
        // Initialize transform for the animation
        textEl.style.transform = 'translateY(0)';

        requestAnimationFrame(() => {
            textEl.style.transform = `translateY(-30px)`;
            textEl.style.opacity = '0';
        });

        setTimeout(() => textEl.remove(), 600);
    }

    function showShop() {
        const itemsContainer = document.getElementById('items-container');
        itemsContainer.innerHTML = '';

        const sortedKeys = Object.keys(ITEMS).sort((a, b) => {
            const typeOrder = { 'attack': 1, 'magic': 2, 'defense': 3, 'special': 4 };
            const typeA = ITEMS[a].type || 'special';
            const typeB = ITEMS[b].type || 'special';
            if (typeOrder[typeA] !== typeOrder[typeB]) {
                return typeOrder[typeA] - typeOrder[typeB];
            }
            return 0;
        });

        for (const key of sortedKeys) {
            const item = ITEMS[key];
            const canAfford = gameState.player.gold >= item.cost;
            const itemEl = document.createElement('div');
            itemEl.className = `item${canAfford ? '' : ' disabled'}`;
            itemEl.innerHTML = `
                <h4>${item.name}</h4>
                <p class="item-desc">${item.description}</p>
                <p>價格: ${item.cost} 金幣</p>
            `;
            if (canAfford) {
                itemEl.onclick = () => buyItem(item);
            }
            itemsContainer.appendChild(itemEl);
        }
        shopModal.classList.remove('hidden');
    }

    function hideShop() {
        if (!shopModal) return;
        shopModal.classList.add('hidden');
    }

    function buyItem(item) {
        if (gameState.player.gold >= item.cost) {
            gameState.player.gold -= item.cost;
            gameState.player.hero.equipItem(item);
            // Recalculate stats for all player minions if flag is bought
            if (item.effects.buffMinions) {
                gameState.units.filter(u => u.team === gameState.playerTeam && !u.isHero).forEach(minion => minion.recalculateStats());
            }
            updateUI();
            hideShop();
        }
    }

    function aiBuyItem(aiPlayer) {
        // Only act if AI has enough gold to buy
        if (aiPlayer.gold < 100) return;

        // If the AI already owns an item, sell it for half price ONLY if it wants to buy a better one
        // For simplicity, we'll just check if we can afford a better item and sell the current one

        const hero = aiPlayer.hero;
        const playerHero = gameState.player.hero;
        let chosenItem = null;

        // AI Logic:
        // 1. If player has high evasion (Evasion Cape), buy Scope.
        if (playerHero.item && playerHero.item.effects.evasion && ITEMS.scope16x) {
            chosenItem = ITEMS.scope16x;
        }
        // 2. If AI is 007, buy Flying Shoes (AGI).
        else if (hero.baseStats.name === '殺手007' && ITEMS.flyingShoes) {
            chosenItem = ITEMS.flyingShoes;
        }
        // 3. If AI is Mage, buy Elder Wand (MATT).
        else if (hero.currentStats.type === 'magical' && ITEMS.elderWand) {
            chosenItem = ITEMS.elderWand;
        }
        // 4. If AI is Samurai, buy Dragon Sword (ATT).
        else if (hero.baseStats.name === '武士凌' && ITEMS.dragonSword) {
            chosenItem = ITEMS.dragonSword;
        }
        // 5. Default/Fallback: Buy Dreamcatcher if enemy has high AGI
        else if (playerHero.currentStats.agi > 100 && ITEMS.dreamCatcher) {
            chosenItem = ITEMS.dreamCatcher;
        }

        // If we already have the chosen item, do nothing
        if (hero.item && chosenItem && hero.item.name === chosenItem.name) {
            return;
        }

        // If we found a target item and can afford it (considering sell price if we have an item)
        let currentGold = aiPlayer.gold;
        if (hero.item) {
            currentGold += Math.floor(hero.item.cost / 2);
        }

        if (chosenItem && currentGold >= chosenItem.cost) {
            // Sell current item if exists
            if (hero.item) {
                aiPlayer.gold += Math.floor(hero.item.cost / 2);
                hero.item = null;
            }

            aiPlayer.gold -= chosenItem.cost;
            hero.equipItem(chosenItem);
            console.log(`AI hero ${hero.baseStats.name} bought ${chosenItem.name}`);
        }
    }

    function showHeroSelection() {
        const heroesContainer = document.getElementById('heroes-container');
        heroesContainer.innerHTML = '';
        for (const key in HEROES) {
            const hero = HEROES[key];
            const heroCard = document.createElement('div');
            heroCard.className = 'hero-card';

            const statsText = `
                <p>HP: ${hero.stats.hp} / MP: ${hero.stats.mp}</p>
                <p>ATT: ${hero.stats.att} / MATT: ${hero.stats.matt}</p>
                <p>DEF: ${hero.stats.def} / MDEF: ${hero.stats.mdef}</p>
                <p>Range: ${hero.stats.range} / AGI: ${hero.stats.agi}</p>
            `;

            heroCard.innerHTML = `
                <h4>${hero.name}</h4>
                <p class="hero-desc">${hero.description}</p>
                <div class="hero-stats">${statsText}</div>
            `;
            heroCard.onclick = () => selectHero(key);
            heroesContainer.appendChild(heroCard);
        }
        heroSelectionModal.classList.remove('hidden');
    }

    function selectHero(playerHeroKey) {
        // AI picks a random hero that is not the player's
        const heroKeys = Object.keys(HEROES);
        const availableAiHeroes = heroKeys.filter(key => key !== playerHeroKey);
        const aiHeroKey = availableAiHeroes[Math.floor(Math.random() * availableAiHeroes.length)];

        initGame(playerHeroKey, aiHeroKey);
        heroSelectionModal.classList.add('hidden');
    }

    // --- Game Logic ---
    function spawnMinion(team) {
        const minion = new Unit(team, MINION_STATS, false);
        minion.recalculateStats(); // Apply potential buffs on spawn
        gameState.units.push(minion);
    }

    function spawnEscortMinions(team, hero) {
        const direction = (team === gameState.playerTeam) ? 1 : -1;
        const spacing = 60; // pixels between escort minions
        for (let i = 1; i <= 2; i++) {
            const desiredPosition = hero.position + direction * (i * spacing);
            const minion = new Unit(team, MINION_STATS, false, desiredPosition);
            minion.recalculateStats();
            gameState.units.push(minion);
        }
    }

    function checkWinCondition() {
        const playerCastleDown = gameState.playerTower && gameState.playerTower.hp <= 0;
        const enemyCastleDown = gameState.enemyTower && gameState.enemyTower.hp <= 0;
        const playerLostByDeaths = gameState.player.deaths > 10;
        const playerWonByKills = gameState.enemy.deaths >= 10;

        if (playerCastleDown || playerLostByDeaths) {
            endGame('你輸了！');
        } else if (enemyCastleDown || playerWonByKills) {
            endGame('你贏了！');
        }
    }

    function endGame(message) {
        gameState.gameOver = true;
        messageEl.textContent = message;
    }

    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (gameState.gameOver) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Spawn minions
        gameState.minionSpawnTimer += deltaTime;
        if (gameState.minionSpawnTimer >= MINION_SPAWN_INTERVAL) {
            gameState.minionSpawnTimer = 0;
            spawnMinion(gameState.playerTeam);
            spawnMinion(gameState.enemyTeam);
        }

        // Update all units
        gameState.units.forEach(unit => unit.update(deltaTime, gameState.units));

        // Update respawn timers
        updateRespawnTimers(deltaTime);

        requestAnimationFrame(gameLoop);
    }

    // --- Initialization ---
    function initGame(playerHeroKey, aiHeroKey) {
        const playerHeroData = HEROES[playerHeroKey];
        const enemyHeroData = HEROES[aiHeroKey];
        const playerHeroStats = { ...playerHeroData.stats, name: playerHeroData.name };
        const enemyHeroStats = { ...enemyHeroData.stats, name: enemyHeroData.name };

        gameState.player = { kills: 0, deaths: 0, gold: 1000, respawnTime: 0 };
        gameState.enemy = { kills: 0, deaths: 0, gold: 1000, respawnTime: 0 };
        gameState.gameOver = false;
        gameState.minionSpawnTimer = 0;

        // Create Towers first
        gameState.playerTower = new Tower(gameState.playerTeam);
        gameState.enemyTower = new Tower(gameState.enemyTeam);

        // Create Heroes
        const playerHero = new Unit(gameState.playerTeam, playerHeroStats, true);
        const enemyHero = new Unit(gameState.enemyTeam, enemyHeroStats, true);

        gameState.player.hero = playerHero;
        gameState.enemy.hero = enemyHero;
        // Add all units to the game state
        gameState.units = [gameState.playerTower, gameState.enemyTower, playerHero, enemyHero];
        spawnEscortMinions(gameState.playerTeam, playerHero);
        spawnEscortMinions(gameState.enemyTeam, enemyHero);

        // AI buys its first item at the start of the game
        aiBuyItem(gameState.enemy);

        document.getElementById('player-target-btn').onclick = () => {
            playerHero.targetPriority = (playerHero.targetPriority === 'nearest') ? 'hero' : 'nearest';
            document.getElementById('player-target-btn').textContent = playerHero.targetPriority === 'hero' ? '英雄' : '最近';
        };
        document.getElementById('enemy-target-btn').onclick = () => {
            enemyHero.targetPriority = (enemyHero.targetPriority === 'nearest') ? 'hero' : 'nearest';
            document.getElementById('enemy-target-btn').textContent = enemyHero.targetPriority === 'hero' ? '英雄' : '最近';
        };
        document.getElementById('close-shop-btn').onclick = hideShop;

        updateUI();
        showShop();

        if (!gameState.started) {
            gameState.started = true;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    showHeroSelection();
});
