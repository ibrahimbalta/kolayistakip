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
        // Create warning banner if it doesn't exist
        let banner = document.getElementById('subscriptionWarning');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'subscriptionWarning';
            banner.className = 'subscription-warning';
            document.body.insertBefore(banner, document.body.firstChild);
        }

        // Set warning message
        const message = type === 'trial'
            ? `⚠️ Deneme süreniz ${daysLeft} gün içinde dolacak!`
            : `⚠️ Aboneliğiniz ${daysLeft} gün içinde sona erecek!`;

        banner.innerHTML = `
            <i class="fa-solid fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="renew-btn" onclick="window.location.href='index.html#pricing'">
                Hemen Yenile
            </button>
        `;

        banner.classList.add('show');
        document.body.classList.add('has-warning');
    },

    hideWarning: function () {
        const banner = document.getElementById('subscriptionWarning');
        if (banner) {
            banner.classList.remove('show');
            document.body.classList.remove('has-warning');
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
