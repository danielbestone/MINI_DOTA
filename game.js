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
    const achievementNotifier = document.getElementById('achievement-notifier');
    const achievementsModal = document.getElementById('achievements-modal');
    const viewAchievementsBtn = document.getElementById('view-achievements-btn');
    const closeAchievementsBtn = document.getElementById('close-achievements-btn');
    const playerTargetBtn = document.getElementById('player-target-btn');
    const closeShopBtn = document.getElementById('close-shop-btn');

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
        gameLevel: window.gameLevel || 1,
        levelTimer: 0,
        auraTimer: 0,
        level3SpawnDuration: 0,
        cannonSpawnTimer: 0,
        minionSpawnInterval: MINION_SPAWN_INTERVAL
    };

    let currentUser = null;
    let achievementState = {};

    // --- Game Data ---
    const HEROES = {
        samurai: {
            name: '武士凌',
            description: '近戰物理輸出，快速貼近敵人並造成大量傷害。',
            stats: { hp: 1000, mp: 100, maxMp: 100, def: 20, att: 200, mdef: 10, matt: 10, range: 1, agi: 20, type: 'physical', image: 'pict/武士.png' },
            skills: [
                { name: '巨盾', type: 'buff', effects: { def: 500, mdef: 500 }, duration: 30000, cost: 5, cooldown: 60000, currentCooldown: 0 }
            ]
        },
        assassin: {
            name: '殺手007',
            description: '遠程物理輸出，在安全的距離進行攻擊。',
            stats: { hp: 750, mp: 80, maxMp: 80, def: 10, att: 150, mdef: 10, matt: 10, range: 5, agi: 10, type: 'physical', image: 'pict/殺手007.png' },
            skills: [
                { name: '一箭穿心', type: 'damage', multiplier: 10, damageType: 'physical', cost: 5, cooldown: 3000, currentCooldown: 0 }
            ]
        },
        merlin: {
            name: '梅林',
            description: '遠程魔法輸出，攻擊能穿透物理防禦。',
            stats: { hp: 400, mp: 200, maxMp: 200, def: 1, att: 10, mdef: 100, matt: 120, range: 5, agi: 10, type: 'magical', image: 'pict/魔法師.png' },
            skills: [
                { name: '火球術', type: 'damage', multiplier: 20, damageType: 'magical', cost: 2, cooldown: 10000, currentCooldown: 0 }
            ]
        }
    };
    const MINION_STATS = { hp: 500, mp: 10, def: 10, att: 10, mdef: 10, matt: 10, range: 1, agi: 10, type: 'physical', image: 'pict/士兵.png' };
    const CANNON_STATS = { name: '大砲', hp: 200, mp: 10, def: 10, att: 300, mdef: 10, matt: 10, range: 2, agi: 5, type: 'physical', image: 'pict/canon.jpg' };
    const OGRE_STATS = { hp: 500000, mp: 0, def: 50, att: 300, mdef: 50, matt: 0, range: 2, agi: 5, type: 'physical', image: 'pict/食人魔.jpg' };
    const GAME_VERSION = '202511201212';
    const ITEMS = {
        dragonSword: { name: '昇龍劍', description: '物理攻擊力 +10000。', cost: 100, type: 'attack', effects: { att: 10000 } },
        elderWand: { name: '惡魔接骨木', description: '魔法攻擊力 +10000。', cost: 100, type: 'magic', effects: { matt: 10000 } },
        tigerHelmet: { name: '白虎頭盔', description: '物理防禦 +10000，血量 +1000。', cost: 100, type: 'defense', effects: { def: 10000, hp: 1000 } },
        batCape: { name: '血蝙蝠披風', description: '魔法防禦 +10000。', cost: 100, type: 'defense', effects: { mdef: 10000 } },
        shockGloves: { name: '觸電手套', description: '攻擊時會額外造成等同於對方物理防禦的傷害。', cost: 100, type: 'special', effects: { onHit: 'enemy_def' } },
        reflectBullScarf: { name: '反彈鬥牛巾', description: '攻擊時會額外造成等同於對方魔法防禦的傷害。', cost: 100, type: 'special', effects: { onHit: 'enemy_mdef' } },
        generalsFlag: {
            name: '帥將旗幟',
            description: '提升小兵攻擊力為600，防禦力為2000',
            cost: 100,
            type: 'special',
            effects: { buffMinions: { att: 600, def: 2000 } }
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
        scope16x: { name: '16倍鏡', description: '攻擊敵人無視閃避機率並造成100倍傷害。', cost: 100, type: 'attack', effects: { ignoreEvasion: true, damageMultiplier: 100 } },
        telescope: { name: '望遠鏡', description: '攻擊距離 +1。', cost: 100, type: 'special', effects: { range: 1 } }
    };
    const ACHIEVEMENTS = {
        firstBlood: { name: '第一滴血', description: '在本局遊戲中率先擊殺一名敵方英雄。' },
        tenKills: { name: '十殺', description: '在一局遊戲中累計擊殺 10 名敵人（英雄或小兵）。' },
        winner: { name: '勝利者', description: '贏得一局遊戲。' },
        perfectWin: { name: '完勝', description: '在沒有死亡的情況下贏得一局遊戲。' },
        winningStreak3: { name: '連勝將軍', description: '連勝三場遊戲。' }
    };

    const SKINS = {
        goldenSamurai: { name: '黃金武士', hero: 'samurai', image: 'pict/黃金武士.jpg' },
        zoro: { name: '索隆', hero: 'samurai', image: 'pict/索隆.jpg' },
        britishAgent: { name: '英國特務', hero: 'assassin', image: 'pict/英國特務.jpg' },
        sealAgent: { name: '海豹特務', hero: 'assassin', image: 'pict/海豹特務.jpg' },
        zhugeLiang: { name: '諸葛亮', hero: 'merlin', image: 'pict/諸葛亮.jpg' },
        frieren: { name: '芙莉蓮', hero: 'merlin', image: 'pict/芙莉蓮.jpg' }
    };

    // --- Achievement & User Data Functions ---
    function loadUserData() {
        const userJSON = localStorage.getItem('dota_user');
        if (userJSON) {
            currentUser = JSON.parse(userJSON);
            // Ensure achievements array exists
            if (!currentUser.achievements) {
                currentUser.achievements = [];
            }
        }
    }

    function updateUserData() {
        if (!currentUser) return;
        // Update the session user data
        localStorage.setItem('dota_user', JSON.stringify(currentUser));

        // Update the master user list
        const users = JSON.parse(localStorage.getItem('dota_users') || '[]');
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('dota_users', JSON.stringify(users));
        }
    }

    function showAchievementNotification(achievementId) {
        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return;

        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `<h4>成就解鎖！</h4><p>${achievement.name}</p>`;
        achievementNotifier.appendChild(popup);

        setTimeout(() => {
            popup.remove();
        }, 5000);
    }

    function unlockAchievement(achievementId) {
        if (!currentUser || currentUser.achievements.includes(achievementId)) {
            return; // Already unlocked
        }
        currentUser.achievements.push(achievementId);
        updateUserData();
        showAchievementNotification(achievementId);
    }

    function checkAndUnlockAchievement(event, data) {
        if (gameState.gameOver) return;

        // First Blood
        if (event === 'kill' && data.isHero && !achievementState.firstBloodDone) {
            achievementState.firstBloodDone = true;
            unlockAchievement('firstBlood');
        }

        // Ten Kills
        if (event === 'kill') {
            achievementState.playerKills++;
            if (achievementState.playerKills >= 10) {
                unlockAchievement('tenKills');
            }
        }

        // Winner
        if (event === 'win') {
            unlockAchievement('winner');
            // Perfect Win
            if (gameState.player.deaths === 0) {
                unlockAchievement('perfectWin');
            }
        }
    }

    function populateAchievementsModal() {
        const achievementsList = document.getElementById('achievements-list');
        achievementsList.innerHTML = '';

        for (const id in ACHIEVEMENTS) {
            const achievement = ACHIEVEMENTS[id];
            const isUnlocked = currentUser && currentUser.achievements.includes(id);

            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
            item.innerHTML = `
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
            `;
            achievementsList.appendChild(item);
        }
    }

    // --- Unit Class ---
    class Unit {
        constructor(team, unitData, isHero = false, initialPosition = null, skipElementCreation = false) {
            const stats = unitData.stats || unitData; // Handle both heroes with {stats: {}} and minions with {}

            this.team = team;
            this.baseStats = { ...stats };
            this.currentStats = { ...stats };
            // For Heroes, the name is on unitData, not in the stats object. Let's add it.
            if (unitData.name) {
                this.baseStats.name = unitData.name;
                this.currentStats.name = unitData.name;
            }

            this.hp = this.currentStats.hp;
            this.mp = this.currentStats.mp;
            this.maxMp = this.currentStats.maxMp;
            this.isHero = isHero;
            this.isDead = false;
            this.unitType = unitData.name || stats.name; // Use the name from the root object first
            this.skills = unitData.skills ? JSON.parse(JSON.stringify(unitData.skills)) : []; // Deep copy skills
            this.buffs = []; // To hold active buffs

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

            // Apply level scaling for new units (except initial towers which are special)
            if (gameState.gameLevel > 1 && !this.isTower) {
                const multiplier = Math.pow(2, gameState.gameLevel - 1);
                this.applyLevelMultiplier(multiplier);
            }
        }

        applyLevelMultiplier(multiplier) {
            const statsToScale = ['hp', 'mp', 'att', 'def', 'matt', 'mdef', 'agi'];
            statsToScale.forEach(stat => {
                if (this.baseStats[stat] !== undefined) {
                    this.baseStats[stat] *= multiplier;
                    this.currentStats[stat] *= multiplier;
                }
            });
            this.hp = this.currentStats.hp;
        }

        levelUp() {
            // Double stats
            const statsToScale = ['hp', 'mp', 'att', 'def', 'matt', 'mdef', 'agi'];
            statsToScale.forEach(stat => {
                if (this.baseStats[stat] !== undefined) {
                    this.baseStats[stat] *= 2;
                    this.currentStats[stat] *= 2;
                }
            });
            this.hp *= 2; // Double current HP as well
            this.updateHealthBar();

            // Visual effect for level up
            const levelUpText = document.createElement('div');
            levelUpText.className = 'damage-text'; // Reuse damage text style for simplicity
            levelUpText.style.color = '#ffd700';
            levelUpText.style.fontSize = '20px';
            levelUpText.textContent = 'LEVEL UP!';
            gameWorld.appendChild(levelUpText);

            const xPos = this.position - 40;
            const yPos = gameWorld.offsetHeight / 2 - 100;

            levelUpText.style.left = `${xPos}px`;
            levelUpText.style.top = `${yPos}px`;

            setTimeout(() => levelUpText.remove(), 1000);
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

            this._updateEffects(deltaTime);

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

        _updateEffects(deltaTime) {
            // Update skill cooldowns
            if (this.skills && this.skills.length > 0) {
                this.skills.forEach(skill => {
                    if (skill.currentCooldown > 0) {
                        skill.currentCooldown -= deltaTime;
                        if (skill.currentCooldown < 0) {
                            skill.currentCooldown = 0;
                        }
                    }
                });
            }

            // Update buffs
            if (this.buffs && this.buffs.length > 0) {
                let needsRecalc = false;
                this.buffs = this.buffs.filter(buff => {
                    buff.duration -= deltaTime;
                    if (buff.duration <= 0) {
                        // Buff expired
                        if (buff.name === '巨盾') {
                            this.element.classList.remove('has-aura');
                        }
                        needsRecalc = true;
                        return false; // Remove buff
                    }
                    return true;
                });

                if (needsRecalc) {
                    this.recalculateStats();
                    if (this.team === gameState.playerTeam && this.isHero) {
                        updatePlayerHeroStatsUI();
                    }
                }
            }
        }

        findTarget(allUnits) {
            // Cannon AI: Only targets enemy tower
            if (this.isCannon) {
                const enemyTower = (this.team === gameState.playerTeam) ? gameState.enemyTower : gameState.playerTower;
                if (enemyTower && !enemyTower.isDead) {
                    this.target = enemyTower;
                } else {
                    this.target = null;
                }
                return;
            }

            // Ogre Logic: Target whoever attacked it (handled in takeDamage) or nearest unit if no target
            if (this.isOgre) {
                if (!this.target || this.target.isDead) {
                    // Find nearest unit that is not Ogre
                    let nearest = null;
                    let minDist = Infinity;
                    allUnits.forEach(u => {
                        if (u !== this && !u.isDead && !u.isOgre) {
                            const dist = Math.abs(this.position - u.position);
                            if (dist < minDist) {
                                minDist = dist;
                                nearest = u;
                            }
                        }
                    });
                    return;
                }
                return;
            }

            const enemies = allUnits.filter(u => u.team !== this.team && !u.isDead && !u.isOgre);

            const potentialTargets = allUnits.filter(u => {
                if (u.isDead) return false;
                if (u === this) return false;
                if (this.team === 'neutral') return true; // Neutral hates everyone
                if (u.team === 'neutral') return true; // Everyone hates neutral
                return u.team !== this.team;
            });

            if (potentialTargets.length === 0) {
                this.target = null;
                return;
            }

            let bestTarget = null;
            let minDistance = Infinity;

            potentialTargets.forEach(enemy => {
                const distance = Math.abs(this.position - enemy.position);

                // Hero priority logic: Hero > Minion > Tower
                if (this.targetPriority === 'hero') {
                    // If we found a hero, ignore non-heroes
                    if (bestTarget && bestTarget.isHero && !enemy.isHero) return;

                    // If current enemy is hero and bestTarget is not, switch to this hero
                    if (enemy.isHero && (!bestTarget || !bestTarget.isHero)) {
                        bestTarget = enemy;
                        minDistance = distance;
                        return;
                    }

                    // If both are same type (both hero or both not), pick closest
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestTarget = enemy;
                    }
                    return;
                }

                // Defense priority: Only attack if in range while holding position? 
                // Actually, findTarget just picks who to shoot. Move logic handles positioning.
                // So for defense, we still target nearest enemy, but we won't chase them far.

                if (distance < minDistance) {
                    minDistance = distance;
                    bestTarget = enemy;
                }
            });

            this.target = bestTarget;
        }

        move(deltaTime) {
            if (this.isOgre) return; // Ogre doesn't move

            // Defense Mode Logic for Player Hero
            if (this.isHero && this.team === gameState.playerTeam && this.targetPriority === 'defense') {
                // Move to defensive position (near castle)
                const defensePos = PLAYER_CASTLE_POS + 150; // Stand slightly in front of castle
                const diff = defensePos - this.position;

                if (Math.abs(diff) > 10) {
                    const direction = Math.sign(diff);
                    const distance = MOVE_SPEED * (deltaTime / 1000);
                    this.position += direction * distance;
                }
                this.position = Math.max(0, Math.min(GAME_WIDTH, this.position));
                return;
            }

            let direction = (this.team === gameState.playerTeam) ? 1 : -1;

            if (this.target) {
                // Move towards target
                const diff = this.target.position - this.position;
                if (Math.abs(diff) > 10) { // Small threshold to avoid jitter
                    direction = Math.sign(diff);
                } else {
                    direction = 0; // Stop if close enough
                }
            }

            const distance = MOVE_SPEED * (deltaTime / 1000);
            this.position += direction * distance;
            this.position = Math.max(0, Math.min(GAME_WIDTH, this.position));
        }

        attack() {
            if (this.attackCooldown > 0) return;

            // Set cooldown
            if (this.isHero) {
                this.attackCooldown = 200;
            } else if (this.isOgre) {
                this.attackCooldown = 1000; // Ogre attack speed
            } else {
                this.attackCooldown = 10000 / (this.currentStats.agi || 10);
            }

            // Ogre AOE Attack
            if (this.isOgre) {
                // Attack ALL units around
                gameState.units.forEach(u => {
                    if (u !== this && !u.isDead) {
                        const dist = Math.abs(this.position - u.position);
                        if (dist <= this.currentStats.range * 50) { // Range 1 * 50 = 50px radius
                            // Calculate damage
                            let damage = this.currentStats.att; // Physical
                            // Apply damage
                            u.takeDamage(damage, this);
                            createAttackEffect(this, u); // Visual
                        }
                    }
                });
                return;
            }

            // Standard Attack
            if (this.target && !this.target.isDead) {
                // Evasion Check
                let hitChance = 1.0;
                if (this.target.item && this.target.item.effects.evasion) {
                    hitChance = 1.0 - this.target.item.effects.evasion;
                }
                if (this.item && this.item.effects.ignoreEvasion) {
                    hitChance = 1.0;
                }

                if (Math.random() > hitChance) return; // Miss

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

                // Minion Siege Buff: 500x damage to Towers
                if (!this.isHero && this.target.isTower) {
                    damage = Math.max(10, damage);
                    damage *= 500;
                }

                damage = Math.max(10, damage); // Floor

                createAttackEffect(this, this.target);
                this.target.takeDamage(damage, this);
            }
        }

        takeDamage(amount, source) {
            // Calculate actual damage based on defense
            let actualDamage = amount;
            if (this.currentStats.type === 'magical') {
                actualDamage = Math.max(10, amount - this.currentStats.mdef);
            } else {
                actualDamage = Math.max(10, amount - this.currentStats.def);
            }

            // Ogre Logic: Pull attacker
            if (this.isOgre && source && !source.isTower) { // Don't pull towers
                this.target = source; // Aggro on attacker

                // Pull mechanic
                const pullDistance = 50;
                if (source.position < this.position) {
                    source.position = this.position - pullDistance;
                } else {
                    source.position = this.position + pullDistance;
                }

                // Create pull effect (visual)
                const pullText = document.createElement('div');
                pullText.className = 'damage-text';
                pullText.textContent = 'PULL!';
                pullText.style.color = '#ff0000';
                pullText.style.left = `${source.position}px`;
                pullText.style.top = `${gameWorld.offsetHeight / 2 - 100}px`;
                gameWorld.appendChild(pullText);
                setTimeout(() => pullText.remove(), 500);
            }

            this.hp -= actualDamage;

            // Show damage text
            showDamageText(this, actualDamage);

            if (this.hp <= 0) {
                this.hp = 0;
                this.die(source);
            }
            this.updateHealthBar();
        }

        die(killer) {
            this.isDead = true;
            this.element.classList.add('dead');

            if (killer) {
                const isPlayerKill = killer.team === gameState.playerTeam;
                const killerOwner = isPlayerKill ? gameState.player : gameState.enemy;

                if (this.isHero) {
                    killerOwner.kills++;
                    killerOwner.gold += 100; // Hero kill gold
                } else {
                    killerOwner.kills++; // Also count minion kills
                    killerOwner.gold += 100; // Minion kill gold
                }

                if (isPlayerKill) {
                    checkAndUnlockAchievement('kill', { isHero: this.isHero });
                }
            }

            if (this.isTower) {
                const playerWon = this.team === gameState.enemyTeam;
                const message = playerWon ? '你贏了！' : '你輸了！';
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
            const oldMaxHp = this.currentStats.hp;
            this.currentStats = { ...this.baseStats };

            // Apply item effects
            if (this.item) {
                for (const key in this.item.effects) {
                    if (key !== 'onHit' && key !== 'buffMinions') {
                        this.currentStats[key] = (this.currentStats[key] || 0) + this.item.effects[key];
                    }
                }
            }

            // Apply buff effects
            if (this.buffs && this.buffs.length > 0) {
                this.buffs.forEach(buff => {
                    for (const key in buff.effects) {
                        this.currentStats[key] = (this.currentStats[key] || 0) + buff.effects[key];
                    }
                });
            }

            // Apply General's Flag buff to minions (special case)
            const owner = (this.team === gameState.playerTeam) ? gameState.player : gameState.enemy;
            if (owner.hero && owner.hero.item && owner.hero.item.effects.buffMinions && !this.isHero) {
                this.currentStats.att = owner.hero.item.effects.buffMinions.att;
                this.currentStats.def = owner.hero.item.effects.buffMinions.def;
            }

            const newMaxHp = this.currentStats.hp;
            if (newMaxHp > oldMaxHp) {
                this.hp += (newMaxHp - oldMaxHp);
            } else if (this.hp > newMaxHp) {
                this.hp = newMaxHp;
            }
        }

        useSkill(skillIndex) {
            if (!this.skills || !this.skills[skillIndex]) return;

            const skill = this.skills[skillIndex];

            // 1. Check cooldown and MP
            if (skill.currentCooldown > 0) {
                console.log(`${skill.name} is on cooldown.`);
                return;
            }
            if (this.mp < skill.cost) {
                console.log(`Not enough MP for ${skill.name}.`);
                return;
            }

            // 2. Consume resources
            this.mp -= skill.cost;
            skill.currentCooldown = skill.cooldown;

            // 3. Execute effect
            console.log(`${this.unitType} uses ${skill.name}!`);

            if (skill.type === 'damage') {
                if (!this.target || this.target.isDead) {
                    console.log("No valid target for damage skill.");
                    // Refund resources if no target
                    this.mp += skill.cost;
                    skill.currentCooldown = 0;
                    return;
                }

                let damage = 0;
                if (skill.damageType === 'physical') {
                    damage = this.currentStats.att * skill.multiplier;
                } else if (skill.damageType === 'magical') {
                    damage = this.currentStats.matt * skill.multiplier;
                }

                createAttackEffect(this, this.target); // Use existing attack effect for now
                this.target.takeDamage(damage, this);

            } else if (skill.type === 'buff') {
                const newBuff = {
                    name: skill.name,
                    effects: { ...skill.effects },
                    duration: skill.duration
                };
                this.buffs.push(newBuff);
                if (skill.name === '巨盾') {
                    this.element.classList.add('has-aura');
                }
                this.recalculateStats();
            }

            // 4. Update UI
            updatePlayerHeroStatsUI();
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

            const stats = { hp: 5000000, mp: 0, def: 100, mdef: 100, att: 0, matt: 0, range: 0, agi: 0, type: 'structure' };
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

        // Update stats display
        const statItems = [
            { label: '英雄', value: hero.baseStats.name },
            { label: '血量 HP', value: `${Math.round(hero.hp)} / ${stats.hp}` },
            { label: '魔力 MP', value: `${Math.round(hero.mp)} / ${stats.maxMp}` },
            { label: '裝備', value: hero.item ? hero.item.name : '無' },
            { label: '物理攻擊', value: stats.att },
            { label: '物理防禦', value: stats.def },
            { label: '魔法攻擊', value: stats.matt },
            { label: '魔法防禦', value: stats.mdef },
            { label: '敏捷', value: stats.agi },
            { label: '攻擊距離', value: stats.range },
            { label: '攻擊間隔', value: `${(10 / stats.agi).toFixed(2)}s` },
            { label: '類型', value: stats.type === 'physical' ? '物理' : '魔法' }
        ];

        playerHeroStatsEl.innerHTML = '';
        statItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'stat-item';
            div.innerHTML = `
                <span class="stat-label">${item.label}</span>
                <span class="stat-value">${item.value}</span>
            `;
            playerHeroStatsEl.appendChild(div);
        });

        // Update skills display
        const skillsContainer = document.getElementById('player-hero-skills-container');
        if (!skillsContainer) return;
        skillsContainer.innerHTML = ''; // Clear old buttons

        if (hero.skills && hero.skills.length > 0) {
            hero.skills.forEach((skill, index) => {
                const btn = document.createElement('button');
                btn.className = 'skill-btn';

                if (skill.currentCooldown > 0) {
                    btn.classList.add('on-cooldown');
                    btn.disabled = true;
                    const timeLeft = (skill.currentCooldown / 1000).toFixed(1);
                    btn.innerHTML = `${skill.name}<br><span class="skill-cooldown-text">${timeLeft}s</span>`;
                } else {
                    btn.textContent = skill.name;
                    btn.disabled = false;
                }

                btn.onclick = () => {
                    hero.useSkill(index);
                };
                skillsContainer.appendChild(btn);
            });
        }
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

    function showHealingText(target, amount) {
        if (!target || !target.element || amount < 0.1) return;

        const textEl = document.createElement('div');
        textEl.className = 'damage-text';
        textEl.style.color = '#4CAF50'; // Green for healing
        textEl.textContent = `+${Math.round(amount)}`;
        gameWorld.appendChild(textEl);

        const textWidth = textEl.offsetWidth || 20;
        const unitHeight = target.element.offsetHeight || 40;
        const startX = getUnitCenterX(target) - (textWidth / 2);
        const startY = (gameWorld.offsetHeight / 2) - unitHeight - 10;

        textEl.style.left = `${startX}px`;
        textEl.style.top = `${startY}px`;
        textEl.style.transform = 'translateY(0)';

        requestAnimationFrame(() => {
            textEl.style.transform = 'translateY(-30px)';
            textEl.style.opacity = '0';
        });

        setTimeout(() => textEl.remove(), 800);
    }

    function applyAuras(deltaTime) {
        if (gameState.gameLevel !== 4) return; // Only for level 4

        gameState.auraTimer += deltaTime;

        if (gameState.auraTimer < 1000) {
            return; // Exit if it's not time to heal yet
        }

        gameState.auraTimer -= 1000; // Subtract one second from the timer

        const HEALING_AMOUNT = 30; // 30 HP per second tick
        const SPRING_CENTER = GAME_WIDTH / 2;
        const SPRING_RADIUS = 150;

        gameState.units.forEach(unit => {
            if (unit.isDead || unit.isTower) return;

            const distance = Math.abs(unit.position - SPRING_CENTER);
            if (distance <= SPRING_RADIUS) {
                if (unit.hp < unit.currentStats.hp) {
                    unit.hp = Math.min(unit.currentStats.hp, unit.hp + HEALING_AMOUNT);
                    unit.updateHealthBar();
                    showHealingText(unit, HEALING_AMOUNT);
                }
            }
        });
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
        // Only act if AI has enough gold to potentially do something (min cost is 100)
        // But we also need to consider selling the current item.

        const hero = aiPlayer.hero;
        const playerHero = gameState.player.hero;

        // Calculate total available value (Gold + 50% of current item)
        let currentItemValue = 0;
        if (hero.item) {
            currentItemValue = Math.floor(hero.item.cost / 2);
        }
        const totalBuyingPower = aiPlayer.gold + currentItemValue;

        // 1. Evaluate all items
        const scoredItems = [];
        for (const key in ITEMS) {
            const item = ITEMS[key];
            const score = evaluateItem(item, hero, playerHero);
            scoredItems.push({ item, score });
        }

        // 2. Sort by score descending
        scoredItems.sort((a, b) => b.score - a.score);

        // 3. Find the best item we can afford
        let bestItem = null;
        for (const entry of scoredItems) {
            if (totalBuyingPower >= entry.item.cost) {
                bestItem = entry.item;
                break;
            }
        }

        // 4. Decide to buy
        if (bestItem) {
            // If we already have this item, do nothing
            if (hero.item && hero.item.name === bestItem.name) {
                return;
            }

            // Sell current if needed
            if (hero.item) {
                aiPlayer.gold += Math.floor(hero.item.cost / 2);
                console.log(`AI sold ${hero.item.name} for ${Math.floor(hero.item.cost / 2)}`);
                hero.item = null;
            }

            // Buy new
            if (aiPlayer.gold >= bestItem.cost) {
                aiPlayer.gold -= bestItem.cost;
                hero.equipItem(bestItem);
                console.log(`AI bought ${bestItem.name} (Score: ${scoredItems.find(i => i.item === bestItem).score})`);

                // Recalculate stats for minions if needed
                if (bestItem.effects.buffMinions) {
                    gameState.units.filter(u => u.team === gameState.enemyTeam && !u.isHero).forEach(minion => minion.recalculateStats());
                }
                updateUI();
            }
        }
    }

    function evaluateItem(item, aiHero, playerHero) {
        let score = 0;

        // --- Base Affinity ---
        // Physical heroes like physical items
        if (aiHero.currentStats.type === 'physical') {
            if (item.type === 'attack') score += 50;
            if (item.effects.att) score += item.effects.att / 100; // Scale raw stats
            if (item.effects.agi) score += item.effects.agi / 100;
        }
        // Magic heroes like magic items
        if (aiHero.currentStats.type === 'magical') {
            if (item.type === 'magic') score += 50;
            if (item.effects.matt) score += item.effects.matt / 100;
        }

        // --- Counter Play ---

        // 1. Counter Evasion (Player has Evasion Cape or high evasion)
        const playerHasEvasion = (playerHero.item && playerHero.item.effects.evasion) || false;
        if (playerHasEvasion && item.effects.ignoreEvasion) {
            score += 500; // High priority to counter evasion
        }

        // 2. Counter High Defense
        if (playerHero.currentStats.def > 200) {
            // Enemy has high physical def
            if (item.effects.onHit === 'enemy_def') score += 200; // Shock Gloves
            if (aiHero.currentStats.type === 'physical' && item.type === 'magic') score += 100; // Pivot to magic? (Maybe not for pure phys heroes)
        }
        if (playerHero.currentStats.mdef > 200) {
            // Enemy has high magic def
            if (item.effects.onHit === 'enemy_mdef') score += 200; // Reflect Scarf
        }

        // 3. Counter High Agility (Assassin)
        if (playerHero.currentStats.agi > 150) {
            if (item.effects.damageBasedOnEnemyAgi) score += 300; // Dream Catcher
        }

        // --- Hero Specific Preferences ---
        if (aiHero.baseStats.name === '殺手007') {
            if (item.effects.agi) score += 100; // Loves Agi
            if (item.name === '飛人跑鞋') score += 50;
        }
        if (aiHero.baseStats.name === '武士凌') {
            if (item.effects.att) score += 50;
            if (item.name === '昇龍劍') score += 50;
        }
        if (aiHero.baseStats.name === '梅林') {
            if (item.effects.matt) score += 100;
            if (item.name === '惡魔接骨木') score += 50;
        }

        return score;
    }

    function showHeroSelection() {
        const heroesContainer = document.getElementById('heroes-container');
        heroesContainer.innerHTML = '';
        for (const heroKey in HEROES) {
            const hero = HEROES[heroKey];
            const heroCard = document.createElement('div');
            heroCard.className = 'hero-card';

            // Check for owned skins for this hero
            const ownedSkins = (currentUser?.skins || []).filter(skinId => SKINS[skinId] && SKINS[skinId].hero === heroKey);

            const statsText = `
                <p>HP: ${hero.stats.hp} / MP: ${hero.stats.mp}</p>
                <p>ATT: ${hero.stats.att} / MATT: ${hero.stats.matt}</p>
                <p>DEF: ${hero.stats.def} / MDEF: ${hero.stats.mdef}</p>
                <p>Range: ${hero.stats.range} / AGI: ${hero.stats.agi}</p>
            `;

            let skinSelectorHTML = '';
            if (ownedSkins.length > 0) {
                skinSelectorHTML = `
                    <div class="skin-selector">
                        <button class="skin-btn">外觀</button>
                        <div class="skin-options hidden">
                            <div class="skin-option" data-hero="${heroKey}" data-skin="">預設</div>
                            ${ownedSkins.map(skinId => `
                                <div class="skin-option" data-hero="${heroKey}" data-skin="${skinId}">${SKINS[skinId].name}</div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            heroCard.innerHTML = `
                <div class="hero-main-content">
                    <h4>${hero.name}</h4>
                    <p class="hero-desc">${hero.description}</p>
                    <div class="hero-stats">${statsText}</div>
                </div>
                ${skinSelectorHTML}
            `;

            // Click on main card to select default
            heroCard.querySelector('.hero-main-content').onclick = () => selectHero(heroKey);

            // Handle skin button click
            const skinBtn = heroCard.querySelector('.skin-btn');
            if (skinBtn) {
                skinBtn.onclick = (e) => {
                    e.stopPropagation();
                    skinBtn.nextElementSibling.classList.toggle('hidden');
                };
            }

            // Handle skin option clicks
            heroCard.querySelectorAll('.skin-option').forEach(option => {
                option.onclick = (e) => {
                    e.stopPropagation();
                    const hero = e.target.dataset.hero;
                    const skin = e.target.dataset.skin;
                    selectHero(hero, skin || null);
                };
            });

            heroesContainer.appendChild(heroCard);
        }
        heroSelectionModal.classList.remove('hidden');
    }

    // --- Initialization ---
    function initGame(playerHeroKey, aiHeroKey, skinId = null) {
        // Reset achievement state for the new game
        achievementState = {
            firstBloodDone: false,
            playerKills: 0
        };

        const playerHeroData = HEROES[playerHeroKey];
        const enemyHeroData = HEROES[aiHeroKey];

        // Create deep copies to avoid modifying the original HEROES object during the game
        const playerHeroInstanceData = JSON.parse(JSON.stringify(playerHeroData));
        const enemyHeroInstanceData = JSON.parse(JSON.stringify(enemyHeroData));

        // Determine player hero image
        if (skinId && SKINS[skinId] && SKINS[skinId].hero === playerHeroKey) {
            playerHeroInstanceData.stats.image = SKINS[skinId].image;
        }

        gameState.player = { kills: 0, deaths: 0, gold: 1000, respawnTime: 0 };
        gameState.enemy = { kills: 0, deaths: 0, gold: 1000, respawnTime: 0 };
        // ... (rest of the gameState setup)
        // ...

        // Create Towers first
        gameState.playerTower = new Tower(gameState.playerTeam);
        gameState.enemyTower = new Tower(gameState.enemyTeam);

        // Create Heroes
        const playerHero = new Unit(gameState.playerTeam, playerHeroInstanceData, true);
        const enemyHero = new Unit(gameState.enemyTeam, enemyHeroInstanceData, true);

        gameState.player.hero = playerHero;
        gameState.enemy.hero = enemyHero;
        // Add all units to the game state
        gameState.units = [gameState.playerTower, gameState.enemyTower, playerHero, enemyHero];
        spawnEscortMinions(gameState.playerTeam, playerHero);
        spawnEscortMinions(gameState.enemyTeam, enemyHero);

        // Level 2: Spawn Ogre
        if (gameState.gameLevel === 2) {
            const ogre = new Unit('neutral', OGRE_STATS, false, GAME_WIDTH / 2);
            ogre.isOgre = true; // Flag for special logic
            ogre.element.classList.add('ogre'); // Make ogre bigger
            gameState.units.push(ogre);
        }

        // Level 3: Horde Mode Setup
        if (gameState.gameLevel === 3) {
            gameState.minionSpawnInterval = 1000; // 1 second
            gameState.level3SpawnDuration = 30000; // 30 seconds
        }

        // AI buys its first item at the start of the game
        aiBuyItem(gameState.enemy);

        updateUI();
        updatePlayerHeroStatsUI();

        // Reset Priority Button
        if (playerTargetBtn) {
            playerTargetBtn.textContent = '最近';
            playerTargetBtn.style.backgroundColor = '#444';
        }

        // Start Game Loop
        if (!gameState.started) {
            gameState.started = true;
            requestAnimationFrame(gameLoop);
        }

        // Hide instructions/hero selection
        document.getElementById('instructions-modal').classList.add('hidden');
        document.getElementById('hero-selection-modal').classList.add('hidden');

        // Auto-open shop at start
        if (gameState.playerTeam === 'player') { // Just a check, always true for initGame
            showShop();
        }

        // Add level-specific elements
        if (gameState.gameLevel === 4) {
            const springEl = document.createElement('div');
            springEl.id = 'healing-spring';
            gameWorld.appendChild(springEl);
        }
    }

    function selectHero(playerHeroKey, skinId = null) {
        // AI picks a random hero that is not the player's
        const heroKeys = Object.keys(HEROES);
        const availableAiHeroes = heroKeys.filter(key => key !== playerHeroKey);
        const aiHeroKey = availableAiHeroes[Math.floor(Math.random() * availableAiHeroes.length)];

        initGame(playerHeroKey, aiHeroKey, skinId);
        heroSelectionModal.classList.add('hidden');
    }

    // --- Game Logic ---
    function spawnMinion(team) {
        const minion = new Unit(team, MINION_STATS, false);
        minion.recalculateStats(); // Apply potential buffs on spawn
        gameState.units.push(minion);
    }

    function spawnCannon(team) {
        const cannon = new Unit(team, CANNON_STATS, false);
        cannon.isCannon = true; // Flag for special AI
        cannon.recalculateStats();
        gameState.units.push(cannon);
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
        if (gameState.gameOver) return;
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
        if (gameState.gameOver) return;

        const isWin = message === '你贏了！';

        // Check for win achievements BEFORE setting gameOver, 
        // because checkAndUnlockAchievement returns early if gameOver is true.
        if (isWin) {
            checkAndUnlockAchievement('win');
        }

        gameState.gameOver = true;

        const reward = isWin ? 2 : 1;

        // Update User Data
        if (currentUser) {
            currentUser.diamonds = (currentUser.diamonds || 0) + reward;

            if (isWin) {
                currentUser.winStreak = (currentUser.winStreak || 0) + 1;
                if (currentUser.winStreak >= 3) {
                    unlockAchievement('winningStreak3');
                }
            } else {
                currentUser.winStreak = 0;
            }

            updateUserData();
        }

        messageEl.innerHTML = `<h2>${message}</h2><p>獲得鑽石: <span style="color: #00d2ff; font-weight: bold;">${reward}</span></p><p>3秒後返回大廳...</p>`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'lobby.html';
        }, 3000);
    }

    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (gameState.gameOver) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Level 3: Horde mode
        if (gameState.gameLevel === 3) {
            if (gameState.level3SpawnDuration > 0) {
                gameState.level3SpawnDuration -= deltaTime;
                // Fast spawn is already set during init, but we make sure it stays
            } else if (gameState.minionSpawnInterval !== MINION_SPAWN_INTERVAL) {
                // After 30 seconds, revert to normal spawn rate and only do it once
                gameState.minionSpawnInterval = MINION_SPAWN_INTERVAL;
                 messageEl.innerHTML = `<h2 style="color: #ffd700;">敵方攻勢已減緩</h2>`;
                messageEl.style.display = 'block';
                setTimeout(() => {
                    if (!gameState.gameOver) messageEl.style.display = 'none';
                }, 2000);
            }
        }

        // Spawn minions
        gameState.minionSpawnTimer += deltaTime;
        if (gameState.minionSpawnTimer >= gameState.minionSpawnInterval) {
            gameState.minionSpawnTimer -= gameState.minionSpawnInterval; // Use subtraction to handle overflow
            spawnMinion(gameState.playerTeam);
            spawnMinion(gameState.enemyTeam);
        }

        // Cannon Spawning for Level 5
        if (gameState.gameLevel === 5) {
            gameState.cannonSpawnTimer += deltaTime;
            if (gameState.cannonSpawnTimer >= 20000) { // 20 seconds
                gameState.cannonSpawnTimer = 0; // Reset timer
                spawnCannon(gameState.playerTeam);
                spawnCannon(gameState.enemyTeam);
            }
        }

        /* Level Up Logic - Disabled for now as it conflicts with level selection
        gameState.levelTimer += deltaTime;
        if (gameState.levelTimer >= 30000) { // 30 seconds
            gameState.levelTimer -= 30000;
            gameState.gameLevel++;

            // Notify
            messageEl.innerHTML = `<h2 style="color: #ffd700; text-shadow: 0 0 10px red;">LEVEL UP! (Lv.${gameState.gameLevel})</h2><p>所有數值翻倍！</p>`;
            messageEl.style.display = 'block';
            setTimeout(() => {
                if (!gameState.gameOver) messageEl.style.display = 'none';
            }, 2000);

            // Level up all existing units
            gameState.units.forEach(unit => {
                if (!unit.isDead && !unit.isTower) {
                    unit.levelUp();
                }
            });
        }
        */

        // Apply auras and environmental effects
        applyAuras(deltaTime);

        // Update all units
        gameState.units.forEach(unit => unit.update(deltaTime, gameState.units));

        // Update respawn timers
        updateRespawnTimers(deltaTime);

        requestAnimationFrame(gameLoop);
    }

    // --- Instructions & Achievements Logic ---
    function showInstructions() {
        const instructionsModal = document.getElementById('instructions-modal');
        const startGameBtn = document.getElementById('start-game-btn');

        instructionsModal.classList.remove('hidden');

        startGameBtn.onclick = () => {
            instructionsModal.classList.add('hidden');
            showHeroSelection();
        };
    }

    viewAchievementsBtn.addEventListener('click', () => {
        populateAchievementsModal();
        achievementsModal.classList.remove('hidden');
    });

    closeAchievementsBtn.addEventListener('click', () => {
        achievementsModal.classList.add('hidden');
    });

    // --- Event Listeners ---
    if (closeShopBtn) {
        closeShopBtn.addEventListener('click', hideShop);
    }

    if (playerTargetBtn) {
        playerTargetBtn.addEventListener('click', () => {
            if (!gameState.player || !gameState.player.hero) return;

            const hero = gameState.player.hero;

            // Cycle: Nearest -> Hero -> Defense -> Nearest
            if (hero.targetPriority === 'nearest') {
                hero.targetPriority = 'hero';
                playerTargetBtn.textContent = '魔王';
                playerTargetBtn.style.backgroundColor = '#d32f2f'; // Red
            } else if (hero.targetPriority === 'hero') {
                hero.targetPriority = 'defense';
                playerTargetBtn.textContent = '防守';
                playerTargetBtn.style.backgroundColor = '#1976d2'; // Blue
            } else {
                hero.targetPriority = 'nearest';
                playerTargetBtn.textContent = '最近';
                playerTargetBtn.style.backgroundColor = '#444'; // Default
            }
        });
    }

    // Start the flow
    loadUserData();
    showInstructions();
});
