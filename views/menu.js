function initDarkMode() {
    // Check system preference and localStorage
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    
    // Set initial state
    document.documentElement.classList.toggle('dark', isDark);
    return isDark;
}

export function showMenu() {
    // Create menu overlay if it doesn't exist
    if (!$('#menuOverlay').length) {
        $('body').append(`
            <div id="menuOverlay">
                <div id="menuDrawer">
                    <div class="menu-header">
                        <h2>Menu</h2>
                        <button class="close-menu">×</button>
                    </div>
                    <div class="menu-content">
                        <div class="menu-item">
                            <span>🌙 Dark Mode</span>
                            <label class="switch">
                                <input type="checkbox" id="darkModeToggle">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="menu-item">
                            <span>🔄 Clear Cache</span>
                        </div>
                        <div class="menu-item">
                            <span>ℹ️ About</span>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Set initial dark mode state
        const isDark = initDarkMode();
        $('#darkModeToggle').prop('checked', isDark);

        // Handle menu close
        $('.close-menu, #menuOverlay').on('click', (e) => {
            if (e.target === e.currentTarget) {
                hideMenu();
            }
        });

        // Prevent drawer clicks from closing menu
        $('#menuDrawer').on('click', (e) => {
            e.stopPropagation();
        });

        // Handle dark mode toggle
        $('#darkModeToggle').on('change', function() {
            const isDark = $(this).is(':checked');
            document.documentElement.classList.toggle('dark', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });

        // Handle other menu items
        $('.menu-item').on('click', function() {
            const action = $(this).find('span').text();
            if (action.includes('Clear Cache')) {
                localStorage.removeItem('theme'); // Don't clear theme preference
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('reddit_posts_')) {
                        localStorage.removeItem(key);
                    }
                });
                hideMenu();
                window.location.reload();
            } else if (action.includes('About')) {
                alert('Reddit Story Reader\nVersion 1.0.0');
            }
        });
    }

    // Show menu with animation
    requestAnimationFrame(() => {
        $('#menuOverlay').addClass('visible');
        $('#menuDrawer').addClass('open');
    });
}

export function hideMenu() {
    $('#menuDrawer').removeClass('open');
    $('#menuOverlay').removeClass('visible');
    setTimeout(() => {
        $('#menuOverlay').remove();
    }, 300); // Match transition duration
} 