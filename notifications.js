// ========================================
// NOTIFICATION & REMINDER SYSTEM
// ========================================

const Notifications = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    // Initialize notification system
    init(userId) {
        if (!userId) {
            console.warn('Notifications: No userId provided for init');
            return;
        }
        this.userId = userId;
        this.storageKey = `kolaycrm_notifications_${userId}`;
        this.createContainer();
        this.createBell();
        this.loadNotifications();
        this.checkReminders();

        // Check for reminders every minute
        setInterval(() => this.checkReminders(), 60000);

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-wrapper') && this.isOpen) {
                this.closePanel();
            }
        });
    },

    // Create notification bell in header
    createBell() {
        const headerBar = document.querySelector('.header-bar');
        if (!headerBar) return;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'notification-wrapper';
        wrapper.style.cssText = 'position: relative; margin-left: auto; margin-right: 1rem;';

        wrapper.innerHTML = `
            <div class="notification-bell" onclick="Notifications.togglePanel()">
                <i class="fa-solid fa-bell"></i>
                <span class="notification-badge hidden" id="notificationBadge">0</span>
            </div>
            <div class="notification-panel" id="notificationPanel">
                <div class="notification-header">
                    <h3><i class="fa-solid fa-bell"></i> Bildirimler</h3>
                    <span class="mark-all-read" onclick="Notifications.markAllRead()">Tümünü Okundu İşaretle</span>
                </div>
                <div class="notification-list" id="notificationList">
                    <div class="notification-empty">
                        <i class="fa-solid fa-bell-slash"></i>
                        <p>Henüz bildirim yok</p>
                    </div>
                </div>
                <div class="notification-footer">
                    <a href="#" onclick="Notifications.clearAll(); return false;">Tümünü Temizle</a>
                </div>
            </div>
        `;

        // Insert before trial badge or at the end
        const trialBadge = headerBar.querySelector('.trial-badge');
        if (trialBadge) {
            headerBar.insertBefore(wrapper, trialBadge);
        } else {
            headerBar.appendChild(wrapper);
        }
    },

    // Create toast container
    createContainer() {
        if (document.getElementById('toastContainer')) return;

        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    },

    // Toggle notification panel
    togglePanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            this.isOpen = !this.isOpen;
            panel.classList.toggle('active', this.isOpen);
        }
    },

    // Close panel
    closePanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('active');
            this.isOpen = false;
        }
    },

    // Load notifications from localStorage
    loadNotifications() {
        if (!this.storageKey) return;
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.notifications = JSON.parse(stored);
            this.updateBadge();
            this.renderNotifications();
        }
    },

    // Save notifications to localStorage
    saveNotifications() {
        if (!this.storageKey) return;
        localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
    },

    // Add new notification
    add(notification) {
        // Prevent duplicate IDs if providing a custom string ID
        if (notification.id && typeof notification.id === 'string' && this.hasNotification(notification.id)) {
            return;
        }

        const newNotification = {
            id: notification.id || Date.now(),
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            read: false,
            timestamp: new Date().toISOString(),
            link: notification.link || null
        };

        this.notifications.unshift(newNotification);

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();

        // Show toast
        this.showToast(notification.title, notification.message, notification.type);
    },

    // Update badge count
    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            badge.classList.toggle('hidden', this.unreadCount === 0);
        }
    },

    // Render notifications list
    renderNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <i class="fa-solid fa-bell-slash"></i>
                    <p>Henüz bildirim yok</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.notifications.map(n => `
            <div class="notification-item ${n.read ? '' : 'unread'}" onclick="Notifications.markAsRead('${n.id}')">
                <div class="notification-icon ${n.type}">
                    <i class="fa-solid ${this.getIcon(n.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(n.title)}</div>
                    <div class="notification-text">${this.escapeHtml(n.message)}</div>
                    <div class="notification-time">${this.formatTime(n.timestamp)}</div>
                </div>
            </div>
        `).join('');
    },

    // Get icon for notification type
    getIcon(type) {
        const icons = {
            task: 'fa-clipboard-list',
            deadline: 'fa-clock',
            appointment: 'fa-calendar-check',
            reminder: 'fa-bell',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-bell';
    },

    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Az önce';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} gün önce`;

        return date.toLocaleDateString('tr-TR');
    },

    // Mark notification as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id == id);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    },

    // Mark all as read
    markAllRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    },

    // Clear all notifications
    clearAll() {
        this.notifications = [];
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
        this.closePanel();
    },

    // Show toast notification
    showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fa-solid ${this.getIcon(type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    // Check for deadline reminders
    checkReminders() {
        if (!window.tasks || window.tasks.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        window.tasks.forEach(task => {
            if (task.completed || !task.deadline) return;

            const deadline = new Date(task.deadline);
            deadline.setHours(0, 0, 0, 0);

            // Check if deadline is today
            if (deadline.getTime() === today.getTime()) {
                const reminderId = `deadline_today_${task.id}`;
                if (!this.hasNotification(reminderId)) {
                    this.add({
                        id: reminderId,
                        title: '⏰ Bugün Son Gün!',
                        message: `"${task.desc.substring(0, 50)}..." görevi bugün bitmeli.`,
                        type: 'deadline'
                    });
                }
            }

            // Check if deadline is tomorrow
            if (deadline.getTime() === tomorrow.getTime()) {
                const reminderId = `deadline_tomorrow_${task.id}`;
                if (!this.hasNotification(reminderId)) {
                    this.add({
                        id: reminderId,
                        title: '📅 Yarın Termin!',
                        message: `"${task.desc.substring(0, 50)}..." görevi yarın bitiyor.`,
                        type: 'reminder'
                    });
                }
            }
        });
    },

    hasNotification(id) {
        return this.notifications.some(n => n.id === id);
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready - Removed auto-init to wait for Auth in app.js
// document.addEventListener('DOMContentLoaded', () => {
//     // Wait for app.js to initialize and fetch data
//     setTimeout(() => Notifications.init(), 2000);
// });

// Export for global access
window.Notifications = Notifications;

// Helper function to show quick toast
window.showToast = function (title, message, type = 'info') {
    Notifications.showToast(title, message, type);
};
