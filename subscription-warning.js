// Subscription Warning System
const SubscriptionWarning = {
    WARNING_DAYS: 7, // 7 gün kala uyarı göster

    init: async function () {
        const user = await Auth.getCurrentUser();
        if (!user || user.is_admin) return;

        this.checkSubscriptionStatus(user);
    },

    checkSubscriptionStatus: function (user) {
        // Check if subscription is expiring soon
        if (user.subscription_status === 'active' && user.subscription_end_date) {
            const now = new Date();
            const endDate = new Date(user.subscription_end_date);
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= this.WARNING_DAYS && daysLeft > 0) {
                this.showWarning(daysLeft, 'subscription');
            }
        }

        // Check if trial is expiring soon
        if (user.subscription_status === 'trial' && user.trial_end_date) {
            const now = new Date();
            const endDate = new Date(user.trial_end_date);
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= this.WARNING_DAYS && daysLeft > 0) {
                this.showWarning(daysLeft, 'trial');
            }
        }
    },

    showWarning: function (daysLeft, type) {
        // Find sidebar header (where logo is)
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (!sidebarHeader) return;

        // Create warning element if it doesn't exist
        let banner = document.getElementById('subscriptionWarning');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'subscriptionWarning';
            banner.className = 'subscription-warning';
            // Insert at the very top of sidebar header
            sidebarHeader.insertBefore(banner, sidebarHeader.firstChild);
        }

        // Set mini-warning message
        const message = `${daysLeft} Gün Kaldı`;

        banner.innerHTML = `
            <div class="warning-pill-mini">
                <i class="fa-solid fa-clock"></i>
                <span>${message}</span>
                <button class="renew-btn-mini" onclick="window.location.href='index.html#pricing'" title="Hemen Yenile">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
            </div>
        `;

        // Slight delay to ensure animation works if just created
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);
    },

    hideWarning: function () {
        const banner = document.getElementById('subscriptionWarning');
        if (banner) {
            banner.classList.remove('show');
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Auth to be ready
    setTimeout(() => {
        SubscriptionWarning.init();
    }, 1000);
});
