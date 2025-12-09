// =============================================
// DASHBOARD MODULE
// =============================================

// Load dashboard data and update UI
window.loadDashboardData = async function () {
    try {
        console.log('Loading dashboard data...');

        // Load all necessary data
        await Promise.all([
            loadDashboardStats(),
            loadPriorityTasks(),
            loadTodaySchedule()
        ]);

        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
};

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        if (!window.currentUser) {
            console.error('No current user found');
            return;
        }

        // Get active tasks count
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('id, completed')
            .eq('user_id', window.currentUser.id);

        if (tasksError) throw tasksError;

        const activeTasks = tasksData ? tasksData.filter(t => !t.completed).length : 0;
        document.getElementById('dashActiveTasks').textContent = activeTasks;

        // Get pending proposals value
        const { data: proposalsData, error: proposalsError } = await supabase
            .from('proposals')
            .select('amount, status, currency')
            .eq('user_id', window.currentUser.id)
            .eq('status', 'pending');

        if (proposalsError) throw proposalsError;

        const pendingValue = proposalsData && proposalsData.length > 0
            ? proposalsData.reduce((sum, p) => sum + (p.amount || 0), 0)
            : 0;
        const currency = proposalsData && proposalsData.length > 0 ? proposalsData[0].currency : 'TRY';
        const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';

        document.getElementById('dashPendingValue').textContent =
            `${currencySymbol}${pendingValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;
        document.getElementById('dashPendingCount').textContent =
            `${proposalsData ? proposalsData.length : 0} Adet Bekleyen Teklif`;

        // Get new customers (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, created_at')
            .eq('user_id', window.currentUser.id);

        if (customersError) throw customersError;

        const newCustomers = customersData
            ? customersData.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length
            : 0;
        const totalCustomers = customersData ? customersData.length : 0;

        document.getElementById('dashNewCustomers').textContent = newCustomers;
        document.getElementById('dashTotalCustomers').textContent = `Toplam: ${totalCustomers} Müşteri`;

        // Get today's appointments
        const today = new Date().toISOString().split('T')[0];

        const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointment_slots')
            .select('id, slot_date')
            .eq('slot_date', today);

        if (appointmentsError) {
            console.warn('Error loading appointments:', appointmentsError);
        }

        const todayAppointments = appointmentsData ? appointmentsData.length : 0;

        // Get today's reservations
        const { data: reservationsData, error: reservationsError } = await supabase
            .from('reservations')
            .select('id')
            .eq('user_id', window.currentUser.id)
            .eq('durum', 'rezerve');

        if (reservationsError) {
            console.warn('Error loading reservations:', reservationsError);
        }

        const todayReservations = reservationsData ? reservationsData.length : 0;

        document.getElementById('dashTodayAppointments').textContent = todayAppointments;
        document.getElementById('dashTodayReservations').textContent = `Rezervasyonlar: ${todayReservations}`;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load priority tasks (incomplete tasks)
async function loadPriorityTasks() {
    try {
        if (!window.currentUser) return;

        const { data: tasksData, error } = await supabase
            .from('tasks')
            .select('id, description, employee_name, created_at, customer_name')
            .eq('user_id', window.currentUser.id)
            .eq('completed', false)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const container = document.getElementById('dashPriorityTasks');

        if (!tasksData || tasksData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                    <i class="fa-solid fa-tasks" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                    <p>Henüz öncelikli iş yok.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasksData.map(task => `
            <div style="padding: 0.75rem; border-left: 3px solid var(--warning); background: #fff9f0; margin-bottom: 0.5rem; border-radius: 4px;">
                <div style="font-weight: 600; color: var(--dark); margin-bottom: 0.25rem;">${task.description}</div>
                <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--secondary);">
                    <span><i class="fa-solid fa-user"></i> ${task.employee_name}</span>
                    ${task.customer_name ? `<span><i class="fa-solid fa-building"></i> ${task.customer_name}</span>` : ''}
                    <span><i class="fa-solid fa-clock"></i> ${new Date(task.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading priority tasks:', error);
    }
}

// Load today's schedule (appointments and reservations)
async function loadTodaySchedule() {
    try {
        if (!window.currentUser) return;

        const today = new Date().toISOString().split('T')[0];

        // Get today's appointments
        const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointment_slots')
            .select('id, slot_time, customer_name, status, duration_minutes')
            .eq('slot_date', today)
            .order('slot_time', { ascending: true });

        if (appointmentsError) {
            console.warn('Error loading appointments:', appointmentsError);
        }

        // Get reservations
        const { data: reservationsData, error: reservationsError } = await supabase
            .from('reservations')
            .select('id, alan_no, reserved_by_company, durum')
            .eq('user_id', window.currentUser.id)
            .eq('durum', 'rezerve')
            .limit(5);

        if (reservationsError) {
            console.warn('Error loading reservations:', reservationsError);
        }

        const container = document.getElementById('dashTodaySchedule');

        const hasAppointments = appointmentsData && appointmentsData.length > 0;
        const hasReservations = reservationsData && reservationsData.length > 0;

        if (!hasAppointments && !hasReservations) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem;"></i>
                    <p>Bugün için randevu/rezervasyon yok.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Show appointments
        if (hasAppointments) {
            html += '<div style="margin-bottom: 1rem;"><h3 style="font-size: 0.9rem; color: var(--primary); margin-bottom: 0.5rem;"><i class="fa-solid fa-calendar-check"></i> Randevular</h3>';
            html += appointmentsData.map(apt => `
                <div style="padding: 0.75rem; border-left: 3px solid ${apt.status === 'reserved' ? 'var(--primary)' : 'var(--success)'}; background: #f0f9ff; margin-bottom: 0.5rem; border-radius: 4px;">
                    <div style="font-weight: 600; color: var(--dark);">${apt.slot_time} - ${apt.customer_name || 'Müsait'}</div>
                    <div style="font-size: 0.8rem; color: var(--secondary);">
                        <i class="fa-solid fa-clock"></i> ${apt.duration_minutes || 60} dakika
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        // Show reservations
        if (hasReservations) {
            html += '<div><h3 style="font-size: 0.9rem; color: var(--warning); margin-bottom: 0.5rem;"><i class="fa-solid fa-calendar-days"></i> Rezervasyonlar</h3>';
            html += reservationsData.map(res => `
                <div style="padding: 0.75rem; border-left: 3px solid var(--warning); background: #fefce8; margin-bottom: 0.5rem; border-radius: 4px;">
                    <div style="font-weight: 600; color: var(--dark);">${res.alan_no}</div>
                    <div style="font-size: 0.8rem; color: var(--secondary);">
                        <i class="fa-solid fa-building"></i> ${res.reserved_by_company || 'Rezerve'}
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading today schedule:', error);
    }
}

// Initialize dashboard when DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('📊 Dashboard-data.js DOMContentLoaded');
    // Check if we're on the dashboard view initially
    setTimeout(() => {
        console.log('📊 Dashboard timeout check - currentUser:', window.currentUser);
        const dashView = document.getElementById('view-dashboard');
        console.log('📊 Dashboard view element:', dashView);
        console.log('📊 Dashboard view display:', dashView?.style.display);

        if (dashView && dashView.style.display !== 'none') {
            console.log('📊 Dashboard is visible, attempting to load data...');
            if (typeof loadDashboardData === 'function' && window.currentUser) {
                console.log('📊 Calling loadDashboardData');
                loadDashboardData();
            } else {
                console.warn('📊 Cannot load dashboard data:', {
                    hasFunction: typeof loadDashboardData === 'function',
                    hasCurrentUser: !!window.currentUser
                });
            }
        } else {
            console.log('📊 Dashboard view is not visible yet');
        }
    }, 3000);
});

console.log('✅ Dashboard module loaded successfully');
