document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const confirmPasswordInput = document.getElementById('confirm-password');

    let isLoginMode = true;

    // Check if user is already logged in
    if (localStorage.getItem('dota_user')) {
        window.location.href = 'lobby.html';
    }

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateUI();
    });

    function updateUI() {
        if (isLoginMode) {
            authTitle.textContent = '登入';
            submitBtn.textContent = '登入';
            toggleText.innerHTML = '還沒有帳號？ <a href="#" id="toggle-btn">立即註冊</a>';
            confirmPasswordGroup.style.display = 'none';
            confirmPasswordInput.required = false;
        } else {
            authTitle.textContent = '註冊';
            submitBtn.textContent = '註冊';
            toggleText.innerHTML = '已有帳號？ <a href="#" id="toggle-btn">立即登入</a>';
            confirmPasswordGroup.style.display = 'block';
            confirmPasswordInput.required = true;
        }

        // Re-attach event listener since innerHTML replaced the element
        document.getElementById('toggle-btn').addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            updateUI();
        });
    }

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('請填寫所有欄位');
            return;
        }

        if (isLoginMode) {
            handleLogin(username, password);
        } else {
            const confirmPassword = confirmPasswordInput.value;
            if (password !== confirmPassword) {
                alert('兩次輸入的密碼不一致');
                return;
            }
            handleRegister(username, password);
        }
    });

    function handleLogin(username, password) {
        const users = JSON.parse(localStorage.getItem('dota_users') || '[]');
        const userIndex = users.findIndex(u => u.username === username && u.password === password);

        if (userIndex !== -1) {
            const user = users[userIndex];

            // 為舊用戶添加成就和外觀屬性
            let updated = false;
            if (!user.achievements) {
                user.achievements = [];
                updated = true;
            }
            if (!user.skins) {
                user.skins = [];
                updated = true;
            }

            // Grant default skin to existing users if they don't have it
            if (!user.skins.includes('goldenSamurai')) {
                user.skins.push('goldenSamurai');
                updated = true;
            }

            // Grant initial diamonds to existing users
            if (user.diamonds === undefined) {
                user.diamonds = 100;
                updated = true;
            }

            // 如果資料被更新，則寫回 localStorage
            if (updated) {
                users[userIndex] = user;
                localStorage.setItem('dota_users', JSON.stringify(users));
            }

            localStorage.setItem('dota_user', JSON.stringify(user));
            alert('登入成功！');
            window.location.href = 'lobby.html';
        } else {
            alert('帳號或密碼錯誤');
        }
    }

    function handleRegister(username, password) {
        const users = JSON.parse(localStorage.getItem('dota_users') || '[]');

        if (users.some(u => u.username === username)) {
            alert('該使用者名稱已被使用');
            return;
        }

        const newUser = {
            username,
            password,
            achievements: [],
            skins: ['goldenSamurai'], // Add default skin
            diamonds: 100 // Initial diamonds
        };
        users.push(newUser);
        localStorage.setItem('dota_users', JSON.stringify(users));

        // Auto login after register
        localStorage.setItem('dota_user', JSON.stringify(newUser));

        alert('註冊成功！');
        window.location.href = 'lobby.html';
    }
});
