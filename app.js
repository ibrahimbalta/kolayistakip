document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const employeeSelect = document.getElementById('employeeSelect');
    const departmentFilter = document.getElementById('departmentFilter');
    const employeeCardsGrid = document.getElementById('employeeCardsGrid');
    const settingsForm = document.getElementById('settingsForm');

    // --- State ---
    window.tasks = [];
    window.employees = [];
    window.customers = [];
    window.currentUser = null;
    let tasks = window.tasks;
    let employees = window.employees;
    let customers = window.customers;
    let currentUser = window.currentUser;
    let currentFilter = 'all';
    let tasksSubscription = null;
    let employeesSubscription = null;
    let customersSubscription = null;
    let completionChart = null;
    let productivityChart = null;
    let proposalTypeChart = null;
    let sectorChart = null;

    // --- Navigation ---
    window.switchView = function (viewName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
        // Show selected view
        document.getElementById(`view-${viewName}`).style.display = 'block';

        // Update Sidebar Active State
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.textContent.toLowerCase().includes(getViewLabel(viewName).toLowerCase())) {
                item.classList.add('active');
            }
        });

        // Update Header
        const titles = {
            'dashboard': 'Genel Durum',
            'tasks': 'Panel',
            'appointments': 'Randevular',
            'proposals': 'Teklif Yönetimi',
            'reservations': 'Rezervasyon Yönetimi',
            'customers': 'Müşteri Yönetimi',
            'website': 'Website Yönetimi',
            'employees': 'Çalışan Yönetimi',
            'reports': 'Raporlar ve Analiz',
            'settings': 'Hesap Ayarları'
        };
        const subtitles = {
            'dashboard': 'Tüm işletme faaliyetlerinizin özeti.',
            'tasks': 'Bugünün işlerini organize et.',
            'appointments': 'Randevu takvimini yönet.',
            'proposals': 'Müşteri tekliflerini oluştur ve takip et.',
            'reservations': 'Fuar standı, toplantı odası ve diğer alanları yönet.',
            'customers': 'Müşteri bilgilerini ekle ve yönet.',
            'website': 'Firmanızın web sitesini oluşturun ve yönetin.',
            'employees': 'Ekibini ekle ve yönet.',
            'reports': 'İşletme performansını incele.',
            'settings': 'Profil ve uygulama tercihleri.'
        };
        document.getElementById('pageTitle').textContent = titles[viewName];
        document.getElementById('pageSubtitle').textContent = subtitles[viewName];

        // Refresh data if needed
        if (viewName === 'dashboard') {
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
            // Also load proposals to update dashboard cards
            if (typeof Proposals !== 'undefined' && Proposals.loadProposals) {
                Proposals.loadProposals();
            }
            // Load customers to update dashboard cards
            if (typeof loadCustomers === 'function') {
                loadCustomers();
            }
            // Load appointments to update dashboard cards
            if (typeof initializeAppointmentCalendar === 'function') {
                initializeAppointmentCalendar();
            }
            // Load reservations to update dashboard cards
            if (typeof loadReservations === 'function') {
                loadReservations();
            }
        }
        if (viewName === 'reports') renderReports();
        if (viewName === 'appointments') {
            // Initialize appointment calendar
            setTimeout(() => {
                if (typeof initializeAppointmentCalendar === 'function') {
                    initializeAppointmentCalendar();
                }
            }, 100);
        }

        if (viewName === 'proposals') {
            Proposals.loadProposals();
        }

        if (viewName === 'website') {
            if (typeof WebsiteManager !== 'undefined' && WebsiteManager.init) {
                WebsiteManager.init();
            }
        }

        if (viewName === 'reservations') {
            if (typeof loadReservations === 'function') {
                loadReservations();
            }
        }

        if (viewName === 'settings') {
            // Update export counts when settings view is opened
            setTimeout(() => {
                if (typeof updateExportCounts === 'function') {
                    updateExportCounts();
                }
            }, 100);
        }
    };

    // --- Utility Functions ---
    window.updateCounter = function (id, target) {
        const el = document.getElementById(id);
        if (!el) return;

        const current = parseInt(el.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const ease = 1 - (1 - progress) * (1 - progress);
            const value = Math.floor(current + (target - current) * ease);

            el.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        requestAnimationFrame(animate);
    };

    function getViewLabel(view) {
        if (view === 'dashboard') return 'Genel Durum';
        if (view === 'tasks') return 'İş Listesi';
        if (view === 'appointments') return 'Randevular';
        if (view === 'proposals') return 'Teklifler';
        if (view === 'reservations') return 'Rezervasyonlar';
        if (view === 'customers') return 'Müşteriler';
        if (view === 'website') return 'Website Yönetimi';
        if (view === 'employees') return 'Çalışanlar';
        if (view === 'reports') return 'Raporlar';
        if (view === 'settings') return 'Ayarlar';
        return '';
    }

    // --- Initialization ---
    await init();

    async function init() {
        // Wait for authentication
        const user = await Auth.checkAuth();
        if (!user) return;

        // Update global and local state
        window.currentUser = user;
        currentUser = user;

        // Initialize departments
        if (typeof window.initializeDepartments === 'function') {
            await window.initializeDepartments();
        }

        // Initialize user-based notifications
        if (typeof Notifications !== 'undefined') {
            Notifications.init(user.id);
        }

        // Setup real-time listeners
        setupRealtimeListeners();

        // Load initial data
        await loadInitialData();

        // Load settings
        loadSettings();

        // Init Proposals
        if (typeof Proposals !== 'undefined') Proposals.init();

        // Setup menu item click handlers
        setupMenuListeners();

        // Default view
        switchView('tasks');
    }

    function setupMenuListeners() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const text = item.textContent.trim();

                // Map menu text to view names
                if (text.includes('Genel Durum')) switchView('dashboard');
                else if (text.includes('İş Listesi')) switchView('tasks');
                else if (text.includes('Randevular')) switchView('appointments');
                else if (text.includes('Teklifler')) switchView('proposals');
                else if (text.includes('Rezervasyonlar')) switchView('reservations');
                else if (text.includes('Müşteriler')) switchView('customers');
                else if (text.includes('Website')) switchView('website');
                else if (text.includes('Çalışanlar')) switchView('employees');
                else if (text.includes('Raporlar')) switchView('reports');
                else if (text.includes('Ayarlar')) switchView('settings');
            });
        });
    }

    function setupRealtimeListeners() {
        // Listen to tasks changes
        tasksSubscription = supabase
            .channel('tasks_channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${currentUser.id}` },
                async () => {
                    await loadTasks();
                }
            )
            .subscribe();

        // Listen to employees changes
        employeesSubscription = supabase
            .channel('employees_channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'employees', filter: `user_id=eq.${currentUser.id}` },
                async () => {
                    await loadEmployees();
                }
            )
            .subscribe();

        // Listen to customers changes
        customersSubscription = supabase
            .channel('customers_channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'customers', filter: `user_id=eq.${currentUser.id}` },
                async () => {
                    await loadCustomers();
                }
            )
            .subscribe();
    }

    async function loadInitialData() {
        try {
            await loadEmployees();
            await loadCustomers();
            await loadTasks();
            renderEmployees(); // Update counts after tasks are loaded
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async function loadTasks() {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading tasks:', error);
            return;
        }

        window.tasks = data.map(task => ({
            id: task.id,
            desc: task.description,
            employeeId: task.employee_id,
            name: task.employee_name,
            phone: task.employee_phone,
            customer_id: task.customer_id,
            completed: task.completed,
            deadline: task.deadline,
            priority: task.priority || 'medium',
            createdAt: new Date(task.created_at).toLocaleDateString('tr-TR'),
            completedAt: task.completed_at ? new Date(task.completed_at) : null
        }));

        // Update local reference to match global
        tasks = window.tasks;

        renderEmployees();
        renderTasks();
        renderStats();
        renderReports();
        renderCustomers(); // Update customer cards with new task counts
    }

    async function loadEmployees() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading employees:', error);
            return;
        }

        console.log('Raw employee data from DB:', data);

        employees = data.map(emp => ({
            id: emp.id,
            name: emp.name,
            phone: emp.phone,
            department_id: emp.department_id
        }));

        console.log('Mapped employees:', employees);

        renderEmployees();
        populateEmployeeSelect();
        populateCustomerSelect();
    }

    // --- Task Management ---
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('taskDesc').value;
        const empId = document.getElementById('employeeSelect').value;
        const customerId = document.getElementById('customerSelect')?.value || null;
        const deadline = document.getElementById('taskDeadline')?.value || null;

        if (!empId) {
            alert('Lütfen bir çalışan seçin.');
            return;
        }

        const employee = employees.find(e => e.id == empId);
        const customer = customerId ? customers.find(c => c.id == customerId) : null;

        try {
            const taskData = {
                user_id: currentUser.id,
                description: desc,
                employee_id: employee.id,
                employee_name: employee.name,
                employee_phone: employee.phone,
                completed: false,
                deadline: deadline,
                priority: document.getElementById('taskPriority')?.value || 'medium'
            };

            // Add customer info if selected
            if (customer) {
                taskData.customer_id = customer.id;
                taskData.customer_name = customer.name;
                taskData.customer_email = customer.email;
            }

            const { error } = await supabase
                .from('tasks')
                .insert([taskData]);

            if (error) throw error;

            taskForm.reset();
            await loadTasks(); // Refresh list immediately
            if (window.showToast) window.showToast('Başarılı', 'Görev başarıyla eklendi ve çalışana atandı!', 'success');
            else alert('Görev başarıyla eklendi ve çalışana atandı!');
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Görev eklenirken bir hata oluştu.');
        }
    });

    // Toggle Add Task Form Drawer
    window.toggleAddTaskForm = function () {
        const drawer = document.getElementById('addTaskDrawer');
        if (drawer) {
            const isHidden = drawer.style.display === 'none';
            drawer.style.display = isHidden ? 'block' : 'none';
        }
    };

    // Set Status Filter
    window.setTaskFilter = function (filter, btn) {
        currentFilter = filter;
        document.querySelectorAll('.task-filters-sidebar .filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderTasks();
    };

    window.renderTasks = function () {
        renderTasks();
    };

    function renderTasks() {
        const taskList = document.getElementById('taskList');
        if (!taskList) return;

        taskList.innerHTML = '';

        // Get search term
        const searchTerm = document.getElementById('taskSearchInput')?.value.toLowerCase().trim() || '';
        const deptFilter = document.getElementById('departmentFilterSidebar')?.value || '';

        // Apply filters
        const filteredTasks = tasks.filter(task => {
            // Status filter
            let matchesStatus = true;
            if (currentFilter === 'pending') matchesStatus = !task.completed;
            if (currentFilter === 'completed') matchesStatus = task.completed;

            // Priority filter (global)
            let matchesPriority = true;
            if (window.currentPriorityFilter && window.currentPriorityFilter !== 'all') {
                matchesPriority = task.priority === window.currentPriorityFilter;
            }

            // Department filter
            let matchesDept = true;
            if (deptFilter) {
                const employee = employees.find(e => e.id === task.employeeId);
                matchesDept = employee && employee.department_id === deptFilter;
            }

            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const taskDesc = task.desc.toLowerCase();
                const employeeName = task.name.toLowerCase();
                const customer = customers.find(c => c.id === task.customer_id);
                const customerName = customer ? customer.name.toLowerCase() : '';

                matchesSearch = taskDesc.includes(searchTerm) ||
                    employeeName.includes(searchTerm) ||
                    customerName.includes(searchTerm);
            }

            return matchesStatus && matchesSearch && matchesPriority && matchesDept;
        });

        // Update stats
        const total = tasks.length;
        const pending = tasks.filter(t => !t.completed).length;
        const completed = tasks.filter(t => t.completed).length;

        updateCounter('totalTasks', total);
        updateCounter('pendingTasks', pending);
        updateCounter('completedTasks', completed);

        const countEl = document.getElementById('visibleTaskCount');
        if (countEl) countEl.textContent = `${filteredTasks.length} Görev Listeleniyor`;

        // Apply sort if any
        const sortValue = document.getElementById('prioritySort')?.value || 'default';
        if (sortValue !== 'default') {
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            filteredTasks.sort((a, b) => {
                const priorityA = a.priority || 'medium';
                const priorityB = b.priority || 'medium';

                if (sortValue === 'high-first') return priorityOrder[priorityA] - priorityOrder[priorityB];
                if (sortValue === 'low-first') return priorityOrder[priorityB] - priorityOrder[priorityA];
                if (sortValue === 'deadline') {
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                }
                return 0;
            });
        }

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>Kayıt bulunamadı.</p></div>`;
            return;
        }

        filteredTasks.forEach((task, index) => {
            const cleanPhone = task.phone.replace(/\D/g, '');
            const companyName = currentUser.company_name || currentUser.username;
            const taskLink = `${window.location.origin}/complete-task.html?id=${task.id}`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Merhaba ${task.name}, ${companyName} tarafından atanan yeni bir görevin var:\n\nGörevin: ${task.desc}\n\nGörevi tamamladığında buraya tıkla:\n${taskLink}`)}`;

            const customer = task.customer_id ? customers.find(c => c.id === task.customer_id) : null;

            // Priority colors and labels
            let priorityColor = '#f59e0b'; // Orange for medium
            let priorityBg = '#fef3c7';
            let priorityLabel = 'Orta';
            if (task.priority === 'high') {
                priorityColor = '#ef4444';
                priorityBg = '#fef2f2';
                priorityLabel = 'Yüksek';
            } else if (task.priority === 'low') {
                priorityColor = '#10b981';
                priorityBg = '#f0fdf4';
                priorityLabel = 'Düşük';
            }

            // Initials for avatar
            const initials = task.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Check if overdue
            let isOverdue = false;
            if (task.deadline && !task.completed) {
                const today = new Date().toISOString().split('T')[0];
                if (task.deadline < today) isOverdue = true;
            }

            // Status colors
            let statusColor = task.completed ? '#10b981' : (isOverdue ? '#ef4444' : '#3b82f6');
            let statusBg = task.completed ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#eff6ff');
            let statusLabel = task.completed ? 'Tamamlandı' : (isOverdue ? 'Gecikmiş' : 'Devam Ediyor');
            let statusIcon = task.completed ? 'fa-check-circle' : (isOverdue ? 'fa-exclamation-circle' : 'fa-clock');

            const taskCard = document.createElement('div');
            taskCard.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 0;
                margin-bottom: 1rem;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                border: 1px solid #e5e7eb;
                transition: all 0.3s ease;
                overflow: hidden;
                opacity: ${task.completed ? '0.85' : '1'};
            `;
            taskCard.onmouseenter = () => {
                taskCard.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)';
                taskCard.style.transform = 'translateY(-4px)';
                taskCard.style.borderColor = priorityColor;
            };
            taskCard.onmouseleave = () => {
                taskCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                taskCard.style.transform = 'translateY(0)';
                taskCard.style.borderColor = '#e5e7eb';
            };

            taskCard.innerHTML = `
                <div style="display: flex;">
                    <!-- Priority Bar -->
                    <div style="width: 6px; background: linear-gradient(180deg, ${priorityColor} 0%, ${priorityColor}99 100%); flex-shrink: 0;"></div>
                    
                    <!-- Main Content -->
                    <div style="flex: 1; padding: 1rem; cursor: pointer;" class="task-body-area">
                        <!-- Header Row -->
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem; gap: 1rem;">
                            <div style="flex: 1;">
                                <h3 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin: 0 0 0.5rem 0; line-height: 1.4; ${task.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${Security.sanitize(task.desc)}</h3>
                                
                                <!-- Status & Priority Badges -->
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: ${statusBg}; color: ${statusColor}; border-radius: 20px; font-size: 0.7rem; font-weight: 700;">
                                        <i class="fa-solid ${statusIcon}" style="font-size: 0.65rem;"></i>
                                        ${statusLabel}
                                    </span>
                                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: ${priorityBg}; color: ${priorityColor}; border-radius: 20px; font-size: 0.7rem; font-weight: 700;">
                                        <i class="fa-solid fa-flag" style="font-size: 0.6rem;"></i>
                                        ${priorityLabel}
                                    </span>
                                    ${isOverdue ? `
                                        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: #fef2f2; color: #dc2626; border-radius: 20px; font-size: 0.7rem; font-weight: 700; animation: pulse 2s infinite;">
                                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 0.6rem;"></i>
                                            Gecikmiş!
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Date -->
                            <div style="text-align: right; flex-shrink: 0;">
                                <div style="font-size: 0.75rem; color: ${isOverdue ? '#dc2626' : '#6b7280'}; display: flex; align-items: center; gap: 4px; background: ${isOverdue ? '#fef2f2' : '#f8fafc'}; padding: 4px 10px; border-radius: 8px;">
                                    <i class="fa-solid fa-calendar-day" style="font-size: 0.7rem;"></i>
                                    ${task.deadline || task.createdAt}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Info Grid -->
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; padding-top: 0.75rem; border-top: 1px dashed #e5e7eb;">
                            <!-- Employee -->
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem; box-shadow: 0 2px 8px rgba(99,102,241,0.3);">
                                    ${initials}
                                </div>
                                <span style="font-size: 0.85rem; font-weight: 600; color: #374151;">${Security.sanitize(task.name)}</span>
                            </div>
                            
                            ${customer ? `
                                <div style="display: flex; align-items: center; gap: 6px; padding: 4px 12px; background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius: 20px; border: 1px solid #fcd34d;">
                                    <i class="fa-solid fa-building" style="font-size: 0.7rem; color: #d97706;"></i>
                                    <span style="font-size: 0.75rem; font-weight: 600; color: #92400e;">${Security.sanitize(customer.name)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-left: 1px solid #e5e7eb; justify-content: center;">
                        <button onclick="toggleTaskStatus('${task.id}')" 
                            style="width: 40px; height: 40px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; ${task.completed ? 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;' : 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;'} box-shadow: 0 2px 8px ${task.completed ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'};"
                            onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 15px ${task.completed ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}'"
                            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px ${task.completed ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}'"
                            title="${task.completed ? 'Geri Al' : 'Tamamla'}">
                            <i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}" style="font-size: 0.9rem;"></i>
                        </button>
                        
                        <a href="${whatsappUrl}" target="_blank" 
                            style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; box-shadow: 0 2px 8px rgba(37,211,102,0.3);"
                            onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 15px rgba(37,211,102,0.4)'"
                            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(37,211,102,0.3)'"
                            title="WhatsApp ile Paylaş">
                            <i class="fa-brands fa-whatsapp" style="font-size: 1.1rem;"></i>
                        </a>
                        
                        <button onclick="deleteTask('${task.id}')" 
                            style="width: 40px; height: 40px; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #ef4444; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border: 1px solid #fecaca;"
                            onmouseover="this.style.background='linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; this.style.color='white'; this.style.transform='scale(1.1)'; this.style.borderColor='#ef4444'"
                            onmouseout="this.style.background='linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'; this.style.color='#ef4444'; this.style.transform='scale(1)'; this.style.borderColor='#fecaca'"
                            title="Sil">
                            <i class="fa-solid fa-trash" style="font-size: 0.85rem;"></i>
                        </button>
                    </div>
                </div>
            `;

            // Click on card body to edit
            taskCard.querySelector('.task-body-area').addEventListener('click', () => showEditTaskModal(task));

            taskList.appendChild(taskCard);
        });
    }

    // Filter tasks based on search input
    window.filterTasks = function () {
        renderTasks();
    };

    window.toggleTaskStatus = async function (id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const updateData = {
                completed: !task.completed,
                completed_at: !task.completed ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
            await loadTasks(); // Refresh list immediately
        } catch (error) {
            console.error('Error toggling task:', error);
            alert('Görev güncellenirken bir hata oluştu.');
        }
    };

    window.deleteTask = async function (id) {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadTasks();
            const statusText = !isCompleted ? 'tamamlandı' : 'beklemeye alındı';
            if (window.showToast) window.showToast('Durum Güncellendi', `Görev ${statusText}.`, 'info');
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Görev silinirken bir hata oluştu.');
        }
    };

    // --- Task Edit Functions ---
    window.showEditTaskModal = function (task) {
        const modal = document.getElementById('editTaskModal');
        const editTaskId = document.getElementById('editTaskId');
        const editTaskDesc = document.getElementById('editTaskDesc');
        const editTaskEmployee = document.getElementById('editTaskEmployee');
        const editTaskCustomer = document.getElementById('editTaskCustomer');

        // Set task ID
        editTaskId.value = task.id;

        // Set task description
        editTaskDesc.value = task.desc;

        // Populate employee dropdown
        editTaskEmployee.innerHTML = '<option value="">Çalışan Seçin...</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            if (emp.id === task.employeeId) {
                option.selected = true;
            }
            editTaskEmployee.appendChild(option);
        });

        // Populate customer dropdown
        editTaskCustomer.innerHTML = '<option value="">Müşteri Seçin...</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            if (customer.id === task.customer_id) {
                option.selected = true;
            }
            editTaskCustomer.appendChild(option);
        });

        // Set deadline if exists
        const editTaskDeadline = document.getElementById('editTaskDeadline');
        if (editTaskDeadline && task.deadline) {
            editTaskDeadline.value = task.deadline;
        }

        // Set priority
        const editTaskPriority = document.getElementById('editTaskPriority');
        if (editTaskPriority) {
            editTaskPriority.value = task.priority || 'medium';
        }

        // Show modal
        modal.style.display = 'flex';
    };

    window.closeEditTaskModal = function () {
        document.getElementById('editTaskModal').style.display = 'none';
        document.getElementById('editTaskForm').reset();
    };

    // Handle edit task form submission
    document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const taskId = document.getElementById('editTaskId').value;
        const desc = document.getElementById('editTaskDesc').value;
        const empId = document.getElementById('editTaskEmployee').value;
        const customerId = document.getElementById('editTaskCustomer').value || null;
        const deadline = document.getElementById('editTaskDeadline')?.value || null;

        if (!empId) {
            alert('Lütfen bir çalışan seçin.');
            return;
        }

        const employee = employees.find(e => e.id == empId);
        const customer = customerId ? customers.find(c => c.id == customerId) : null;

        try {
            const updateData = {
                description: Security.sanitize(desc),
                employee_id: employee.id,
                employee_name: employee.name,
                employee_phone: employee.phone,
                deadline: deadline,
                priority: document.getElementById('editTaskPriority')?.value || 'medium'
            };

            // Add customer info if selected
            if (customer) {
                updateData.customer_id = customer.id;
                updateData.customer_name = customer.name;
                updateData.customer_email = customer.email;
            } else {
                // Clear customer info if unselected
                updateData.customer_id = null;
                updateData.customer_name = null;
                updateData.customer_email = null;
            }

            const { error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', taskId);

            if (error) throw error;

            closeEditTaskModal();
            await loadTasks(); // Refresh list immediately
            alert('Görev başarıyla güncellendi!');
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Görev güncellenirken bir hata oluştu.');
        }
    });

    // --- Employee Management ---
    window.showAddEmployeeModal = function () {
        document.getElementById('addEmployeeModal').style.display = 'flex';
    };

    window.closeAddEmployeeModal = function () {
        document.getElementById('addEmployeeModal').style.display = 'none';
        document.getElementById('addEmployeeForm').reset();
    };

    window.showEditEmployeeModal = function (employee) {
        document.getElementById('editEmployeeModal').style.display = 'flex';
        document.getElementById('editEmpId').value = employee.id;
        document.getElementById('editEmpName').value = employee.name;
        document.getElementById('editEmpPhone').value = employee.phone;
    };

    window.closeEditEmployeeModal = function () {
        document.getElementById('editEmployeeModal').style.display = 'none';
        document.getElementById('editEmployeeForm').reset();
    };

    window.deleteEmployee = async function (id) {
        try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Çalışan silinirken bir hata oluştu.');
        }
    };

    function renderEmployees() {
        if (!employeeCardsGrid) return;
        employeeCardsGrid.innerHTML = '';

        if (employees.length === 0) {
            employeeCardsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem 0; color:var(--secondary);">
                    <i class="fa-solid fa-users" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
                    <p>Henüz çalışan eklenmemiş.</p>
                </div>
            `;
            return;
        }

        // Get performance data
        const performanceData = calculateEmployeePerformance();

        employees.forEach(emp => {
            const perf = performanceData.find(p => p.id === emp.id) || {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                completionRate: 0,
                performanceScore: 0
            };

            const department = emp.department_id ? departments.find(d => d.id === emp.department_id) : null;
            const deptName = department ? department.name : 'Genel';

            // Performance based colors (like customer status)
            let statusColor = '#10b981'; // Good - green
            let statusLabel = 'Aktif';
            if (perf.performanceScore >= 80) {
                statusColor = '#10b981'; // Green
                statusLabel = 'Mükemmel';
            } else if (perf.performanceScore >= 60) {
                statusColor = '#3b82f6'; // Blue
                statusLabel = 'İyi';
            } else if (perf.performanceScore >= 40) {
                statusColor = '#f59e0b'; // Orange
                statusLabel = 'Orta';
            } else {
                statusColor = '#ef4444'; // Red
                statusLabel = 'Gelişmeli';
            }

            // Get initials for avatar
            const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                padding: 1.25rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            card.onmouseenter = () => {
                card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
                card.style.transform = 'translateY(-4px)';
                card.style.borderColor = statusColor;
            };
            card.onmouseleave = () => {
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                card.style.transform = 'translateY(0)';
                card.style.borderColor = '#e5e7eb';
            };

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, ${statusColor}, ${statusColor}cc); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.1rem; box-shadow: 0 4px 12px ${statusColor}40;">
                        ${initials}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; flex-wrap: wrap;">
                            <div style="font-weight: 700; font-size: 1rem; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Security.sanitize(emp.name)}</div>
                            <span style="background: ${statusColor}15; color: ${statusColor}; padding: 2px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 700; flex-shrink: 0;">${statusLabel}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280; display: flex; align-items: center; gap: 0.3rem;">
                            <i class="fa-solid fa-building" style="font-size: 0.65rem;"></i>
                            ${Security.sanitize(deptName)}
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.75rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${perf.completedTasks}</div>
                        <div style="font-size: 0.65rem; color: #6b7280; text-transform: uppercase; font-weight: 600;">Tamamlanan</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">${perf.pendingTasks}</div>
                        <div style="font-size: 0.65rem; color: #6b7280; text-transform: uppercase; font-weight: 600;">Bekleyen</div>
                    </div>
                </div>

                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <span style="font-size: 0.7rem; color: #6b7280; text-transform: uppercase; font-weight: 600;">Performans</span>
                        <span style="font-size: 0.85rem; font-weight: 800; color: ${statusColor};">${perf.performanceScore}%</span>
                    </div>
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, ${statusColor}, ${statusColor}cc); height: 100%; width: ${perf.performanceScore}%; border-radius: 4px; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-edit-emp" style="flex: 1; padding: 0.5rem; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;"
                        onmouseover="this.style.background='#3b82f6'; this.style.color='white'; this.style.borderColor='#3b82f6';"
                        onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'; this.style.borderColor='#e2e8f0';">
                        <i class="fa-solid fa-pen-to-square"></i> Düzenle
                    </button>
                    <a href="tel:${emp.phone}" style="padding: 0.5rem 0.75rem; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s;"
                        onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';"
                        onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'; this.style.borderColor='#e2e8f0';" title="Ara">
                        <i class="fa-solid fa-phone"></i>
                    </a>
                    <button class="btn-delete-emp" style="padding: 0.5rem 0.75rem; background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 10px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                        onmouseover="this.style.background='#ef4444'; this.style.color='white'; this.style.borderColor='#ef4444';"
                        onmouseout="this.style.background='#fef2f2'; this.style.color='#ef4444'; this.style.borderColor='#fecaca';" title="Sil">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            // Add event listeners
            card.querySelector('.btn-edit-emp').addEventListener('click', (e) => {
                e.stopPropagation();
                showEditEmployeeModal(emp);
            });
            card.querySelector('.btn-delete-emp').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteEmployee(emp.id);
            });

            employeeCardsGrid.appendChild(card);
        });
    }

    let isSubmittingEmployee = false;

    document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingEmployee) {
            console.log('Form already being submitted, ignoring duplicate request');
            return;
        }

        isSubmittingEmployee = true;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

        const name = document.getElementById('newEmpName').value;
        const phone = document.getElementById('newEmpPhone').value;
        const departmentId = document.getElementById('newEmpDepartment')?.value || null;

        try {
            const { error } = await supabase
                .from('employees')
                .insert([{
                    user_id: currentUser.id,
                    name: name,
                    phone: phone,
                    department_id: departmentId
                }]);

            if (error) throw error;

            closeAddEmployeeModal();
            await loadEmployees();
            alert('Yeni çalışan eklendi!');
        } catch (error) {
            console.error('Error adding employee:', error);
            alert('Çalışan eklenirken bir hata oluştu: ' + error.message);
        } finally {
            isSubmittingEmployee = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    document.getElementById('editEmployeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editEmpId').value;
        const name = document.getElementById('editEmpName').value;
        const phone = document.getElementById('editEmpPhone').value;
        const departmentId = document.getElementById('editEmpDepartment')?.value || null;

        try {
            const { error } = await supabase
                .from('employees')
                .update({
                    name: name,
                    phone: phone,
                    department_id: departmentId
                })
                .eq('id', id);

            if (error) throw error;

            closeEditEmployeeModal();
            await loadEmployees();
            alert('Çalışan bilgileri güncellendi!');
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('Çalışan güncellenirken bir hata oluştu: ' + error.message);
        }
    });

    function populateEmployeeSelect(departmentId = null) {
        employeeSelect.innerHTML = '<option value="">Çalışan Seçin...</option>';

        // Filter employees by department if specified
        const filteredEmployees = departmentId
            ? employees.filter(emp => emp.department_id == departmentId)
            : employees;

        filteredEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.name;
            employeeSelect.appendChild(option);
        });
    }


    // Department filter event listener
    if (departmentFilter) {
        departmentFilter.addEventListener('change', (e) => {
            const selectedDepartmentId = e.target.value;
            populateEmployeeSelect(selectedDepartmentId || null);
        });
    }

    // Populate customer select dropdown
    function populateCustomerSelect() {
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        customerSelect.innerHTML = '<option value="">Müşteri Seçin...</option>';

        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            customerSelect.appendChild(option);
        });
    }



    // --- Customer Management ---
    async function loadCustomers() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading customers:', error);
            return;
        }

        console.log('Raw customer data from DB:', data);

        customers = data.map(customer => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            sector: customer.sector,
            status: customer.status,
            share_token: customer.share_token
        }));

        window.customers = customers;
        console.log('Mapped customers:', customers);

        renderCustomers();
        populateCustomerSelect();

        // Update dashboard cards if they exist
        const dashNewCustomers = document.getElementById('dashNewCustomers');
        const dashTotalCustomers = document.getElementById('dashTotalCustomers');

        if (dashNewCustomers && dashTotalCustomers) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const newCustomers = data.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
            const totalCustomers = data.length;

            dashNewCustomers.textContent = newCustomers;
            dashTotalCustomers.textContent = `Toplam: ${totalCustomers} Müşteri`;
        }
    }

    function renderCustomers(customersToRender = null) {
        const customerCardsGrid = document.getElementById('customerCardsGrid');
        if (!customerCardsGrid) return;

        customerCardsGrid.innerHTML = '';

        // Use filtered customers if provided, otherwise use all customers
        const displayCustomers = customersToRender !== null ? customersToRender : customers;

        if (customers.length === 0) {
            customerCardsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem 0; color:var(--secondary);">
                    <i class="fa-solid fa-user-group" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
                    <p>Henüz müşteri eklenmemiş.</p>
                </div>
    `;
            return;
        }

        if (displayCustomers.length === 0) {
            customerCardsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem 0; color:var(--secondary);">
                    <i class="fa-solid fa-search" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i>
                    <p>Arama kriterlerine uygun müşteri bulunamadı.</p>
                </div>
    `;
            return;
        }

        displayCustomers.forEach(customer => {
            console.log(`Rendering customer: ${customer.name}, Sector: ${customer.sector}, Status: ${customer.status} `);

            // Get initials for avatar
            const initials = customer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Status color
            let statusColor = '#10b981'; // Aktif - green
            if (customer.status === 'Potansiyel') statusColor = '#f59e0b'; // Potansiyel - orange
            if (customer.status === 'Pasif') statusColor = '#6b7280'; // Pasif - gray

            // Calculate real task counts for this customer
            const customerTasks = tasks.filter(t => t.customer_id === customer.id);
            const completedTasks = customerTasks.filter(t => t.completed).length;
            const pendingTasks = customerTasks.filter(t => !t.completed).length;
            const totalTasks = customerTasks.length;

            // Calculate performance score based on completion rate
            let performanceScore = 0;
            if (totalTasks > 0) {
                const completionRate = (completedTasks / totalTasks) * 100;
                performanceScore = Math.round(completionRate);
            }

            const card = document.createElement('div');
            card.style.cssText = `
background: white;
border: 1px solid #e5e7eb;
border - radius: 12px;
padding: 1rem;
box - shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
transition: all 0.3s ease;
cursor: pointer;
`;
            card.onmouseenter = () => {
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                card.style.transform = 'translateY(-2px)';
            };
            card.onmouseleave = () => {
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                card.style.transform = 'translateY(0)';
            };

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${statusColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.95rem;">
                        ${initials}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.15rem;">
                            <div style="font-weight: 600; font-size: 0.95rem; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Security.sanitize(customer.name)}</div>
                            <span style="background: ${statusColor}; color: white; padding: 1px 6px; border-radius: 8px; font-size: 0.65rem; font-weight: 600; flex-shrink: 0;">${Security.sanitize(customer.status)}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Security.sanitize(customer.sector)} • ${totalTasks} Görev</div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-around; margin-bottom: 0.75rem; padding: 0.5rem 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${completedTasks}</div>
                        <div style="font-size: 0.65rem; color: #6b7280; text-transform: uppercase;">Tamamlanan</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: #f59e0b;">${pendingTasks}</div>
                        <div style="font-size: 0.65rem; color: #6b7280; text-transform: uppercase;">Bekleyen</div>
                    </div>
                </div>

                <div style="margin-bottom: 0.75rem;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.35rem;">Performans Skoru</div>
                    <div style="background: #f3f4f6; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #10b981; height: 100%; width: ${performanceScore}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="text-align: center; font-size: 1rem; font-weight: 700; color: #10b981; margin-top: 0.35rem;">${performanceScore}/100</div>
                </div>

                <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem;">
                    <button class="btn-share-customer" style="flex: 1; padding: 0.4rem; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s;">
                        <i class="fa-brands fa-whatsapp"></i> Paylaş
                    </button>
                    <button class="btn-edit-customer" style="flex: 1; padding: 0.4rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s;">
                        <i class="fa-solid fa-pen-to-square"></i> Düzenle
                    </button>
                    <button class="btn-delete-customer" style="flex: 1; padding: 0.4rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s;">
                        <i class="fa-solid fa-trash"></i> Sil
                    </button>
                </div>
`;

            // Add event listeners
            card.querySelector('.btn-share-customer').addEventListener('click', (e) => {
                e.stopPropagation();
                shareCustomerCard(customer);
            });
            card.querySelector('.btn-edit-customer').addEventListener('click', (e) => {
                e.stopPropagation();
                showEditCustomerModal(customer);
            });
            card.querySelector('.btn-delete-customer').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCustomer(customer.id);
            });

            // Add click event to card to show tasks modal
            card.addEventListener('click', () => {
                showCustomerTasksModal(customer.id);
            });

            customerCardsGrid.appendChild(card);
        });
    }

    window.showAddCustomerModal = function () {
        document.getElementById('addCustomerModal').style.display = 'flex';
    };

    window.closeAddCustomerModal = function () {
        document.getElementById('addCustomerModal').style.display = 'none';
        document.getElementById('addCustomerForm').reset();
    };

    window.showEditCustomerModal = function (customer) {
        document.getElementById('editCustomerModal').style.display = 'flex';
        document.getElementById('editCustomerId').value = customer.id;
        document.getElementById('editCustomerName').value = customer.name;
        document.getElementById('editCustomerEmail').value = customer.email;
        document.getElementById('editCustomerPhone').value = customer.phone;
        document.getElementById('editCustomerSector').value = customer.sector;
        document.getElementById('editCustomerStatus').value = customer.status;
    };

    window.closeEditCustomerModal = function () {
        document.getElementById('editCustomerModal').style.display = 'none';
        document.getElementById('editCustomerForm').reset();
    };

    // Show customer tasks modal
    window.showCustomerTasksModal = function (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            console.error('Customer not found:', customerId);
            return;
        }

        // Update modal title
        document.getElementById('customerTasksModalTitle').textContent = `${customer.name} - Görevler`;

        // Get all tasks for this customer
        const customerTasks = tasks.filter(t => t.customer_id === customerId);

        // Render tasks
        const container = document.getElementById('customerTasksListContainer');

        if (customerTasks.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--secondary);">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p style="margin: 0;">Bu müşteriye atanmış görev bulunmuyor.</p>
                </div>
    `;
        } else {
            container.innerHTML = customerTasks.map(task => {
                const statusIcon = task.completed
                    ? '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>'
                    : '<i class="fa-solid fa-clock" style="color: #f59e0b;"></i>';

                const statusText = task.completed ? 'Tamamlandı' : 'Beklemede';
                const statusColor = task.completed ? '#10b981' : '#f59e0b';

                // Find employee name
                const employee = employees.find(e => e.id === task.employeeId);
                const employeeName = employee ? employee.name : task.name || 'Bilinmiyor';

                return `
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">
                    ${Security.sanitize(task.desc)}
                </div>
                <div style="font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span><i class="fa-solid fa-user" style="font-size: 0.75rem;"></i> ${Security.sanitize(employeeName)}</span>
                    <span>•</span>
                    <span><i class="fa-solid fa-calendar" style="font-size: 0.75rem;"></i> ${task.createdAt}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${statusIcon}
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
                    ${statusText}
                </span>
            </div>
        </div>
                </div>
    `;
            }).join('');
        }

        // Show modal
        document.getElementById('customerTasksModal').style.display = 'flex';
    };

    // Close customer tasks modal
    window.closeCustomerTasksModal = function () {
        document.getElementById('customerTasksModal').style.display = 'none';
    };

    window.deleteCustomer = async function (id) {
        if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadCustomers();
            alert('Müşteri silindi.');
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Müşteri silinirken bir hata oluştu: ' + error.message);
        }
    };

    let isSubmittingCustomer = false;

    document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingCustomer) {
            console.log('Form already being submitted, ignoring duplicate request');
            return;
        }

        isSubmittingCustomer = true;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

        const name = document.getElementById('newCustomerName').value;
        const email = document.getElementById('newCustomerEmail').value;
        const phone = document.getElementById('newCustomerPhone').value;
        const sector = document.getElementById('newCustomerSector').value;
        const status = document.getElementById('newCustomerStatus').value;

        try {
            const { error } = await supabase
                .from('customers')
                .insert([{
                    user_id: currentUser.id,
                    name: name,
                    email: email,
                    phone: phone,
                    sector: sector,
                    status: status
                }]);

            if (error) throw error;

            closeAddCustomerModal();
            await loadCustomers();
            alert('Yeni müşteri eklendi!');
        } catch (error) {
            console.error('Error adding customer:', error);
            alert('Müşteri eklenirken bir hata oluştu: ' + error.message);
        } finally {
            isSubmittingCustomer = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCustomerId').value;
        const name = document.getElementById('editCustomerName').value;
        const email = document.getElementById('editCustomerEmail').value;
        const phone = document.getElementById('editCustomerPhone').value;
        const sector = document.getElementById('editCustomerSector').value;
        const status = document.getElementById('editCustomerStatus').value;

        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    name: name,
                    email: email,
                    phone: phone,
                    sector: sector,
                    status: status
                })
                .eq('id', id);

            if (error) throw error;

            closeEditCustomerModal();
            await loadCustomers();
            alert('Müşteri bilgileri güncellendi!');
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Müşteri güncellenirken bir hata oluştu: ' + error.message);
        }
    });

    // Share customer card via WhatsApp
    async function shareCustomerCard(customer) {
        try {
            // Generate or get share token
            let shareToken = customer.share_token;

            if (!shareToken) {
                // Generate new token
                shareToken = crypto.randomUUID();

                // Update customer with share token
                const { error } = await supabase
                    .from('customers')
                    .update({ share_token: shareToken })
                    .eq('id', customer.id);

                if (error) throw error;
            }

            // Create share URL
            const baseUrl = window.location.origin;
            const shareUrl = `${baseUrl}/customer-status.html?token=${shareToken}`;

            // WhatsApp message
            const message = `Merhaba! ${customer.name} müşteri kartını görüntülemek ve durumu güncellemek için bu linke tıklayın: ${shareUrl}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');

        } catch (error) {
            console.error('Error sharing customer:', error);
            alert('Paylaşım linki oluşturulurken bir hata oluştu: ' + error.message);
        }
    }

    // Delete customer
    window.deleteCustomer = async function (id) {
        if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadCustomers();
            alert('Müşteri silindi.');
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Müşteri silinirken bir hata oluştu: ' + error.message);
        }
    };

    // Export customers to Excel
    window.exportCustomersToExcel = function () {
        try {
            if (customers.length === 0) {
                alert('Henüz müşteri bulunmamaktadır.');
                return;
            }

            // Prepare customer data with task stats
            const customerData = customers.map(customer => {
                const customerTasks = tasks.filter(t => t.customer_id === customer.id);
                const completedTasks = customerTasks.filter(t => t.completed).length;
                const pendingTasks = customerTasks.filter(t => !t.completed).length;
                const totalTasks = customerTasks.length;
                const performanceScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return {
                    'Ad Soyad': customer.name,
                    'E-posta': customer.email,
                    'Telefon': customer.phone,
                    'Sektör': customer.sector,
                    'Durum': customer.status,
                    'Toplam Görev': totalTasks,
                    'Tamamlanan': completedTasks,
                    'Bekleyen': pendingTasks,
                    'Performans (%)': performanceScore
                };
            });

            // Create workbook
            const ws = XLSX.utils.json_to_sheet([
                { 'Ad Soyad': 'Kolay İş Takip - Müşteri Raporu' },
                { 'Ad Soyad': `Tarih: ${new Date().toLocaleDateString('tr-TR')}` },
                {},
                ...customerData
            ], { skipHeader: false });

            // Set column widths
            ws['!cols'] = [
                { wch: 20 }, // Ad Soyad
                { wch: 25 }, // E-posta
                { wch: 15 }, // Telefon
                { wch: 20 }, // Sektör
                { wch: 12 }, // Durum
                { wch: 12 }, // Toplam Görev
                { wch: 12 }, // Tamamlanan
                { wch: 10 }, // Bekleyen
                { wch: 14 }  // Performans
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');

            // Download
            const filename = `Musteriler_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);

            alert('✅ Excel raporu başarıyla indirildi!');
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Excel raporu oluşturulurken bir hata oluştu: ' + error.message);
        }
    };

    // Export customers to PDF
    window.exportCustomersToPDF = function () {
        try {
            if (customers.length === 0) {
                alert('Henüz müşteri bulunmamaktadır.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Title
            doc.setFontSize(16);
            doc.text('Kolay Is Takip - Musteri Raporu', 14, 15);

            doc.setFontSize(10);
            doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 22);

            // Prepare table data
            const tableData = customers.map(customer => {
                const customerTasks = tasks.filter(t => t.customer_id === customer.id);
                const completedTasks = customerTasks.filter(t => t.completed).length;
                const pendingTasks = customerTasks.filter(t => !t.completed).length;
                const totalTasks = customerTasks.length;
                const performanceScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return [
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.sector,
                    customer.status,
                    totalTasks.toString(),
                    completedTasks.toString(),
                    pendingTasks.toString(),
                    performanceScore + '%'
                ];
            });

            // Create table
            doc.autoTable({
                startY: 28,
                head: [['Ad Soyad', 'E-posta', 'Telefon', 'Sektor', 'Durum', 'Toplam', 'Tamaml.', 'Bekl.', 'Perf.']],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [102, 126, 234], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 15 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 15 },
                    7: { cellWidth: 15 },
                    8: { cellWidth: 15 }
                },
                margin: { left: 14, right: 14 }
            });

            // Save
            const filename = `Musteriler_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            alert('✅ PDF raporu başarıyla indirildi!');
        } catch (error) {
            console.error('PDF export error:', error);
            alert('PDF raporu oluşturulurken bir hata oluştu: ' + error.message);
        }
    };

    // Filter customers based on search input
    window.filterCustomers = function () {
        const searchInput = document.getElementById('customerSearchInput');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm === '') {
            // If search is empty, show all customers
            renderCustomers();
            return;
        }

        // Filter customers by name, email, phone, or sector
        const filteredCustomers = customers.filter(customer => {
            const name = customer.name.toLowerCase();
            const email = customer.email.toLowerCase();
            const phone = customer.phone.toLowerCase();
            const sector = customer.sector.toLowerCase();

            return name.includes(searchTerm) ||
                email.includes(searchTerm) ||
                phone.includes(searchTerm) ||
                sector.includes(searchTerm);
        });

        // Render filtered results
        renderCustomers(filteredCustomers);
    };




    // --- Settings ---
    function loadSettings() {
        if (currentUser) {
            document.getElementById('settingCompanyName').value = currentUser.company_name || '';
            document.getElementById('settingEmail').value = currentUser.username || '';
        }
    }

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('settingCompanyName').value;
        const newPassword = document.getElementById('settingNewPassword').value;
        const confirmPassword = document.getElementById('settingConfirmPassword').value;

        // Validate password if provided
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                alert('Şifreler eşleşmiyor!');
                return;
            }
            if (newPassword.length < 6) {
                alert('Şifre en az 6 karakter olmalıdır!');
                return;
            }
        }

        try {
            // Update company name
            const { error: nameError } = await supabase
                .from('users')
                .update({ company_name: newName })
                .eq('id', currentUser.id);

            if (nameError) throw nameError;

            // Update password if provided
            if (newPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) throw passwordError;
                alert('Ayarlar ve şifre başarıyla güncellendi!');
            } else {
                alert('Ayarlar kaydedildi.');
            }

            // Clear password fields
            document.getElementById('settingNewPassword').value = '';
            document.getElementById('settingConfirmPassword').value = '';

            location.reload();
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Ayarlar kaydedilirken bir hata oluştu: ' + error.message);
        }
    });

    window.clearAllData = async function () {
        if (confirm('❗ DİKKAT: TÜM VERİLERİNİZ SİLİNECEK!\n\nAşağıdaki tüm veriler kalıcı olarak silinecek:\n- Görevler\n- Çalışanlar\n- Müşteriler\n- Teklifler\n- Departmanlar\n- Randevular\n\nBu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?')) {
            try {
                // Show loading indicator
                const originalText = event.target.innerHTML;
                event.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Siliniyor...';
                event.target.disabled = true;

                // Delete all data
                await supabase.from('tasks').delete().eq('user_id', currentUser.id);
                await supabase.from('employees').delete().eq('user_id', currentUser.id);
                await supabase.from('customers').delete().eq('user_id', currentUser.id);
                await supabase.from('proposals').delete().eq('user_id', currentUser.id);
                await supabase.from('departments').delete().eq('user_id', currentUser.id);

                // Delete appointment related tables
                await supabase.from('randevular').delete().eq('user_id', currentUser.id);
                await supabase.from('appointment_calendars').delete().eq('user_id', currentUser.id);
                await supabase.from('appointment_slots').delete().eq('user_id', currentUser.id);

                alert('✅ Tüm veriler başarıyla silindi.');
                location.reload();
            } catch (error) {
                console.error('Error clearing data:', error);
                alert('❌ Veriler silinirken bir hata oluştu: ' + error.message);
                event.target.innerHTML = originalText;
                event.target.disabled = false;
            }
        }
    };

    // --- Helpers ---
    function renderStats() {
        document.getElementById('totalTasks').textContent = tasks.length;
        document.getElementById('pendingTasks').textContent = tasks.filter(t => !t.completed).length;
        document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;
    }

    // Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (tasksSubscription) supabase.removeChannel(tasksSubscription);
        if (employeesSubscription) supabase.removeChannel(employeesSubscription);
    });

    // === ADVANCED REPORTING FUNCTIONS ===

    // Calculate Employee Performance
    function calculateEmployeePerformance() {
        if (employees.length === 0) return [];

        return employees.map(emp => {
            const empTasks = tasks.filter(t => t.employeeId === emp.id);
            const totalTasks = empTasks.length;
            const completedTasks = empTasks.filter(t => t.completed).length;
            const pendingTasks = totalTasks - completedTasks;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Performance score calculation (0-100)
            let performanceScore = 0;
            if (totalTasks > 0) {
                performanceScore = Math.round(
                    (completedTasks * 10) + // Base score from completed tasks
                    (completionRate * 0.5) + // Bonus from completion rate
                    (totalTasks > 5 ? 10 : 0) // Bonus for having many tasks
                );
                performanceScore = Math.min(100, performanceScore); // Cap at 100
            }

            return {
                id: emp.id,
                name: emp.name,
                department_id: emp.department_id,
                totalTasks,
                completedTasks,
                pendingTasks,
                completionRate,
                performanceScore
            };
        }).sort((a, b) => b.performanceScore - a.performanceScore);
    }

    // Render Performance Cards
    function renderPerformanceCards() {
        const performanceData = calculateEmployeePerformance();
        const container = document.getElementById('performanceCards');

        if (performanceData.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align:center; color:var(--secondary); padding:2rem;">Henüz çalışan verisi yok.</p></div>';
            return;
        }

        container.innerHTML = performanceData.map(emp => {
            const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const badgeClass = emp.performanceScore >= 80 ? 'badge-excellent' :
                emp.performanceScore >= 60 ? 'badge-good' :
                    emp.performanceScore >= 40 ? 'badge-average' : 'badge-poor';

            return `
                <div class="performance-card">
                    <div class="performance-card-header">
                        <div class="performance-avatar">${initials}</div>
                        <div class="performance-info">
                            <h3>${Security.sanitize(emp.name)}</h3>
                            <p>${(() => {
                    let deptName = 'Tanımsız';
                    if (emp.department_id && window.departments) {
                        const dept = window.departments.find(d => d.id === emp.department_id);
                        if (dept) deptName = dept.name;
                    }
                    return deptName;
                })()} • ${emp.totalTasks} Toplam Görev</p>
                        </div>
                    </div>
                    <div class="performance-stats">
                        <div class="performance-stat">
                            <div class="performance-stat-value" style="color:var(--success);">${emp.completedTasks}</div>
                            <div class="performance-stat-label">Tamamlanan</div>
                        </div>
                        <div class="performance-stat">
                            <div class="performance-stat-value" style="color:var(--warning);">${emp.pendingTasks}</div>
                            <div class="performance-stat-label">Bekleyen</div>
                        </div>
                    </div>
                    <div class="performance-score">
                        <div class="performance-score-label">Performans Skoru</div>
                        <div class="performance-score-bar">
                            <div class="performance-score-fill" style="width: ${emp.performanceScore}%"></div>
                        </div>
                        <div class="performance-score-value">${emp.performanceScore}/100</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Completion Chart (Donut Chart)
    function renderCompletionChart(reportTasks = tasks) {
        const canvas = document.getElementById('completionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const total = reportTasks.length;
        const completed = reportTasks.filter(t => t.completed).length;
        const pending = total - completed;

        // Destroy previous chart if exists
        if (typeof completionChart !== 'undefined' && completionChart) {
            completionChart.destroy();
        }

        if (total === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Inter';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.fillText('Henüz görev yok', canvas.width / 2, canvas.height / 2);
            document.getElementById('completionStats').innerHTML = '';
            return;
        }

        completionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tamamlanan', 'Bekleyen'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12, family: 'Inter' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ": " + value + " (" + percentage + "%)";
                            }
                        }
                    }
                }
            }
        });

        // Update stats
        const completionRate = ((completed / total) * 100).toFixed(1);
        document.getElementById('completionStats').innerHTML = `
                <div class="chart-stat-item">
                <div class="chart-stat-value" style="color:var(--success);">${completed}</div>
                <div class="chart-stat-label">Tamamlanan</div>
            </div>
            <div class="chart-stat-item">
                <div class="chart-stat-value" style="color:var(--warning);">${pending}</div>
                <div class="chart-stat-label">Bekleyen</div>
            </div>
            <div class="chart-stat-item">
                <div class="chart-stat-value" style="color:var(--primary);">${completionRate}%</div>
                <div class="chart-stat-label">Tamamlanma Oranı</div>
            </div>
            `;
    }

    // Render Productivity Trend (Line Chart - Last 7 Days)
    function renderProductivityTrend(reportTasks = tasks) {
        const canvas = document.getElementById('productivityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy previous chart if exists
        if (productivityChart) {
            productivityChart.destroy();
        }

        // Get last 7 days
        const days = [];
        const completedCounts = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0); // Start of day

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1); // Start of next day

            const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
            days.push(dateStr);

            // Count tasks completed on this specific day using real completed_at dates
            const count = reportTasks.filter(t => {
                if (!t.completed || !t.completedAt) return false;
                const completedDate = new Date(t.completedAt);
                return completedDate >= date && completedDate < nextDate;
            }).length;

            completedCounts.push(count);
        }

        productivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Tamamlanan Görevler',
                    data: completedCounts,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { family: 'Inter' }
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Inter' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Render Performance Table
    function renderPerformanceTable() {
        const performanceData = calculateEmployeePerformance();
        const tbody = document.getElementById('performanceTableBody');

        if (performanceData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--secondary);">Henüz veri yok.</td></tr>';
            return;
        }

        tbody.innerHTML = performanceData.map(emp => {
            const badgeClass = emp.performanceScore >= 80 ? 'badge-excellent' :
                emp.performanceScore >= 60 ? 'badge-good' :
                    emp.performanceScore >= 40 ? 'badge-average' : 'badge-poor';
            const badgeText = emp.performanceScore >= 80 ? 'Mükemmel' :
                emp.performanceScore >= 60 ? 'İyi' :
                    emp.performanceScore >= 40 ? 'Orta' : 'Gelişmeli';

            return `
                <tr>
                    <td><strong>${Security.sanitize(emp.name)}</strong></td>
                    <td>${emp.totalTasks}</td>
                    <td style="color:var(--success); font-weight:600;">${emp.completedTasks}</td>
                    <td style="color:var(--warning); font-weight:600;">${emp.pendingTasks}</td>
                    <td><strong>${emp.completionRate}%</strong></td>
                    <td><span class="performance-badge ${badgeClass}">${badgeText} (${emp.performanceScore})</span></td>
                </tr>
                `;
        }).join('');
    }

    // Expanded renderReports function with BI logic
    window.renderReports = async function () {
        const period = document.getElementById('reportPeriodFilter')?.value || 'this-month';

        // 1. Fetch data from multiple sources
        const { data: proposals, error: propErr } = await supabase
            .from('proposals')
            .select('*')
            .eq('user_id', currentUser.id);

        // reservations is already in scope, but let's ensure we have latest if needed
        // but typically loadReservations() handles it. We'll use the global 'reservations' array.

        // 2. Filter data by period
        const filteredTasks = filterDataByPeriod(tasks, period, 'createdAt');
        const filteredProposals = filterDataByPeriod(proposals || [], period, 'created_at');
        const filteredCustomers = filterDataByPeriod(customers, period, 'created_at');

        // 3. Calculate Executive Summary Stats
        updateExecutiveSummary(filteredProposals, filteredCustomers, reservations);

        // 4. Render Specialized Charts
        renderPerformanceCards();
        renderCompletionChart(filteredTasks);
        renderProductivityTrend(filteredTasks);
        renderProposalTypeChart(filteredProposals);
        renderSectorDistributionChart(customers);
        renderPerformanceTable();
    }

    // Helper: Filter data based on selected period
    function filterDataByPeriod(data, period, dateField) {
        if (period === 'all') return data;

        const now = new Date();
        let startDate = new Date();

        if (period === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'this-week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'this-month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'last-30') {
            startDate.setDate(now.getDate() - 30);
        }

        return data.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= startDate;
        });
    }

    // Update Top KPIs
    function updateExecutiveSummary(proposals, customers, reservations) {
        // Total Proposal Amount
        const totalAmount = proposals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        document.getElementById('repTotalProposalAmount').textContent = `₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} `;

        // Win Rate
        const approved = proposals.filter(p => p.status === 'approved').length;
        const totalProps = proposals.length;
        const winRate = totalProps > 0 ? Math.round((approved / totalProps) * 100) : 0;
        document.getElementById('repWinRate').textContent = `${winRate}% `;
        const winRateBar = document.querySelector('#repWinRateBar div');
        if (winRateBar) winRateBar.style.width = `${winRate}% `;

        // New Customers (Last 30 Days fixed for this card)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCustCount = customers.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
        document.getElementById('repNewCustomers').textContent = newCustCount;

        // Area Occupancy
        const totalAreas = reservations.length;
        const reservedAreas = reservations.filter(r => r.durum === 'rezerve').length;
        const occupancy = totalAreas > 0 ? Math.round((reservedAreas / totalAreas) * 100) : 0;
        document.getElementById('repAreaOccupancy').textContent = `${occupancy}% `;
    }

    // New Chart: Proposal Distribution
    function renderProposalTypeChart(proposals) {
        const canvas = document.getElementById('proposalTypeChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const pending = proposals.filter(p => p.status === 'pending').length;
        const approved = proposals.filter(p => p.status === 'approved').length;
        const rejected = proposals.filter(p => p.status === 'rejected').length;

        if (proposalTypeChart) proposalTypeChart.destroy();

        proposalTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Bekleyen', 'Onaylanan', 'Reddedilen'],
                datasets: [{
                    data: [pending, approved, rejected],
                    backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    // New Chart: Sectoral Distribution
    function renderSectorDistributionChart(customers) {
        const canvas = document.getElementById('sectorChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const sectors = {};
        customers.forEach(c => {
            const s = c.sector || 'Diğer';
            sectors[s] = (sectors[s] || 0) + 1;
        });

        const labels = Object.keys(sectors);
        const data = Object.values(sectors);

        if (sectorChart) sectorChart.destroy();

        sectorChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(236, 72, 153, 0.7)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });
    }

    // Export to Excel
    window.exportToExcel = function () {
        try {
            const performanceData = calculateEmployeePerformance();

            // Prepare data for Excel
            const excelData = [
                ['Kolay İş Takip - Performans Raporu'],
                ['Tarih: ' + new Date().toLocaleDateString('tr-TR')],
                [],
                ['Çalışan', 'Toplam Görev', 'Tamamlanan', 'Bekleyen', 'Tamamlanma Oranı (%)', 'Performans Skoru'],
                ...performanceData.map(emp => [
                    emp.name,
                    emp.totalTasks,
                    emp.completedTasks,
                    emp.pendingTasks,
                    emp.completionRate,
                    emp.performanceScore
                ]),
                [],
                ['Genel Özet'],
                ['Toplam Görev', tasks.length],
                ['Tamamlanan Görev', tasks.filter(t => t.completed).length],
                ['Bekleyen Görev', tasks.filter(t => !t.completed).length],
                ['Toplam Çalışan', employees.length]
            ];

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 20 }, // Çalışan
                { wch: 12 }, // Toplam Görev
                { wch: 12 }, // Tamamlanan
                { wch: 10 }, // Bekleyen
                { wch: 18 }, // Tamamlanma Oranı
                { wch: 16 }  // Performans Skoru
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Performans Raporu');

            // Generate filename
            const filename = `Kolay_Is_Takip_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Download
            XLSX.writeFile(wb, filename);

            alert('Excel raporu başarıyla indirildi!');
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Excel raporu oluşturulurken bir hata oluştu.');
        }
    };

    // Export to PDF - Comprehensive report with all selected modules
    window.exportToPDF = function () {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Helper function to normalize Turkish characters for PDF
            const normalizeTurkish = (text) => {
                if (!text) return '';
                return String(text)
                    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                    .replace(/ş/g, 's').replace(/Ş/g, 'S')
                    .replace(/ı/g, 'i').replace(/İ/g, 'I')
                    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
            };

            const companyName = currentUser?.company_name || currentUser?.username || 'Kolay Is Takip';
            let yPosition = 20;

            // Title Page
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text(normalizeTurkish(companyName), 105, yPosition, { align: 'center' });

            yPosition += 12;
            doc.setFontSize(16);
            doc.text('Kapsamli Veri Raporu', 105, yPosition, { align: 'center' });

            yPosition += 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Tarih: ' + new Date().toLocaleDateString('tr-TR'), 105, yPosition, { align: 'center' });

            // Summary Stats
            yPosition += 15;
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text('Genel Ozet', 14, yPosition);
            doc.setTextColor(0, 0, 0);

            yPosition += 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            const totalTasks = (tasks || []).length;
            const completedTasks = (tasks || []).filter(t => t.completed).length;
            const totalEmployees = (employees || []).length;
            const totalCustomers = (window.customers || []).length;
            const totalProposals = (window.proposals || []).length;
            const totalReservations = (window.reservations || []).length;
            const totalAppointments = (window.appointments || []).length;

            doc.text(`Toplam Gorev: ${totalTasks} (${completedTasks} tamamlandi)`, 14, yPosition);
            yPosition += 6;
            doc.text(`Toplam Calisan: ${totalEmployees}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Toplam Musteri: ${totalCustomers}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Toplam Teklif: ${totalProposals}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Toplam Rezervasyon: ${totalReservations}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Toplam Randevu: ${totalAppointments}`, 14, yPosition);

            // --- TASKS TABLE ---
            if (document.getElementById('exportTasks')?.checked && tasks.length > 0) {
                yPosition += 15;
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(16, 185, 129);
                doc.text('Gorevler', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Gorev', 'Calisan', 'Durum', 'Tarih']],
                    body: tasks.slice(0, 50).map(t => [
                        normalizeTurkish((t.title || t.description || '').substring(0, 40)),
                        normalizeTurkish(t.employee_name || '-'),
                        t.completed ? 'Tamamlandi' : 'Bekliyor',
                        t.due_date || '-'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 70 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 25 }
                    }
                });
                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // --- EMPLOYEES TABLE ---
            if (document.getElementById('exportEmployees')?.checked && employees.length > 0) {
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(59, 130, 246);
                doc.text('Calisanlar', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Ad Soyad', 'Telefon', 'Departman', 'Yonetici']],
                    body: employees.map(e => [
                        normalizeTurkish(e.name || ''),
                        e.phone || '-',
                        normalizeTurkish(departments.find(d => d.id === e.department_id)?.name || '-'),
                        e.is_manager ? 'Evet' : 'Hayir'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 40 },
                        3: { cellWidth: 20 }
                    }
                });
                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // --- CUSTOMERS TABLE ---
            if (document.getElementById('exportCustomers')?.checked && (window.customers || []).length > 0) {
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(245, 158, 11);
                doc.text('Musteriler', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Firma', 'Yetkili', 'Telefon', 'E-posta']],
                    body: (window.customers || []).slice(0, 50).map(c => [
                        normalizeTurkish((c.company_name || c.name || '').substring(0, 30)),
                        normalizeTurkish(c.contact_name || '-'),
                        c.phone || '-',
                        (c.email || '-').substring(0, 25)
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [245, 158, 11], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 45 }
                    }
                });
                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // --- PROPOSALS TABLE ---
            if (document.getElementById('exportProposals')?.checked && (window.proposals || []).length > 0) {
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(168, 85, 247);
                doc.text('Teklifler', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Musteri', 'Konu', 'Tutar', 'Durum']],
                    body: (window.proposals || []).slice(0, 50).map(p => [
                        normalizeTurkish((p.customer_name || '').substring(0, 25)),
                        normalizeTurkish((p.title || p.subject || '').substring(0, 30)),
                        p.amount ? `${parseFloat(p.amount).toLocaleString('tr-TR')} TL` : '-',
                        p.status === 'approved' ? 'Onaylandi' : p.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [168, 85, 247], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 45 },
                        1: { cellWidth: 55 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 25 }
                    }
                });
                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // --- RESERVATIONS TABLE ---
            if (document.getElementById('exportReservations')?.checked && (window.reservations || []).length > 0) {
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(239, 68, 68);
                doc.text('Rezervasyonlar', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Alan No', 'Tip', 'Fiyat', 'Durum', 'Firma']],
                    body: (window.reservations || []).slice(0, 50).map(r => [
                        r.alan_no || '-',
                        normalizeTurkish(r.alan_tipi || '-'),
                        r.fiyat_miktar ? `${parseFloat(r.fiyat_miktar).toLocaleString('tr-TR')} TL` : '-',
                        r.durum === 'bos' ? 'Musait' : r.durum === 'rezerve' ? 'Dolu' : 'Opsiyonda',
                        normalizeTurkish((r.reserved_by_company || '-').substring(0, 20))
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 25 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 25 },
                        4: { cellWidth: 45 }
                    }
                });
                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // --- APPOINTMENTS TABLE ---
            if (document.getElementById('exportAppointments')?.checked && (window.appointments || []).length > 0) {
                if (yPosition > 250) { doc.addPage(); yPosition = 20; }

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(20, 184, 166);
                doc.text('Randevular', 14, yPosition);
                doc.setTextColor(0, 0, 0);

                doc.autoTable({
                    startY: yPosition + 5,
                    head: [['Tarih', 'Saat', 'Musteri', 'Durum']],
                    body: (window.appointments || []).slice(0, 50).map(a => [
                        a.slot_date || a.date || '-',
                        (a.slot_time || a.time || '-').substring(0, 5),
                        normalizeTurkish((a.customer_name || a.title || '-').substring(0, 30)),
                        a.status === 'reserved' ? 'Rezerve' : a.status === 'available' ? 'Musait' : (a.status || '-')
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [20, 184, 166], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 30 },
                        1: { cellWidth: 20 },
                        2: { cellWidth: 60 },
                        3: { cellWidth: 25 }
                    }
                });
            }

            // Footer with page numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    'Sayfa ' + i + ' / ' + pageCount + ' | ' + normalizeTurkish(companyName) + ' - Kapsamli Rapor',
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Save PDF
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${normalizeTurkish(companyName).replace(/\s+/g, '_')}_Rapor_${dateStr}.pdf`;
            doc.save(filename);

            alert('✅ Kapsamlı PDF raporu başarıyla indirildi!\n\nDosya adı: ' + filename);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('❌ PDF raporu oluşturulurken hata: ' + error.message);
        }
    };

    // =============================================
    // COMPREHENSIVE DATA EXPORT FUNCTIONS
    // =============================================

    // Toggle all export module checkboxes
    window.toggleAllExportModules = function () {
        const checkboxes = document.querySelectorAll('.export-module-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
    };

    // Update export counts in the UI
    window.updateExportCounts = function () {
        const tasksCount = document.getElementById('exportTasksCount');
        const employeesCount = document.getElementById('exportEmployeesCount');
        const customersCount = document.getElementById('exportCustomersCount');
        const proposalsCount = document.getElementById('exportProposalsCount');
        const reservationsCount = document.getElementById('exportReservationsCount');
        const appointmentsCount = document.getElementById('exportAppointmentsCount');

        if (tasksCount) tasksCount.textContent = `${(window.tasks || []).length} kayıt`;
        if (employeesCount) employeesCount.textContent = `${(window.employees || []).length} kayıt`;
        if (customersCount) customersCount.textContent = `${(window.customers || []).length} kayıt`;
        if (proposalsCount) proposalsCount.textContent = `${(window.proposals || []).length} kayıt`;
        if (reservationsCount) reservationsCount.textContent = `${(window.reservations || []).length} kayıt`;
        if (appointmentsCount) appointmentsCount.textContent = `${(window.appointments || []).length} kayıt`;
    };

    // Export all selected modules to Excel (multi-sheet)
    window.exportAllToExcel = async function () {
        try {
            const wb = XLSX.utils.book_new();
            let hasData = false;
            const companyName = currentUser?.company_name || 'KolayIsTakip';
            const dateStr = new Date().toISOString().split('T')[0];

            // Tasks
            if (document.getElementById('exportTasks')?.checked && tasks.length > 0) {
                const tasksData = tasks.map(t => ({
                    'Görev Adı': t.title || t.name || '',
                    'Açıklama': t.description || '',
                    'Atanan Kişi': employees.find(e => e.id === t.employee_id)?.name || '-',
                    'Durum': t.completed ? 'Tamamlandı' : 'Bekliyor',
                    'Öncelik': t.priority || 'Normal',
                    'Son Tarih': t.due_date || '-',
                    'Oluşturulma Tarihi': t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-'
                }));
                const ws = XLSX.utils.json_to_sheet(tasksData);
                ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Görevler');
                hasData = true;
            }

            // Employees
            if (document.getElementById('exportEmployees')?.checked && employees.length > 0) {
                const empData = employees.map(e => ({
                    'Ad Soyad': e.name || '',
                    'Telefon': e.phone || '',
                    'Departman': departments.find(d => d.id === e.department_id)?.name || '-',
                    'Yönetici': e.is_manager ? 'Evet' : 'Hayır',
                    'Oluşturulma Tarihi': e.created_at ? new Date(e.created_at).toLocaleDateString('tr-TR') : '-'
                }));
                const ws = XLSX.utils.json_to_sheet(empData);
                ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Çalışanlar');
                hasData = true;
            }

            // Customers
            if (document.getElementById('exportCustomers')?.checked && (window.customers || []).length > 0) {
                const custData = (window.customers || []).map(c => ({
                    'Firma Adı': c.company_name || c.name || '',
                    'Yetkili Kişi': c.contact_name || '',
                    'E-posta': c.email || '',
                    'Telefon': c.phone || '',
                    'Sektör': c.sector || '-',
                    'Adres': c.address || '',
                    'Notlar': c.notes || '',
                    'Oluşturulma Tarihi': c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '-'
                }));
                const ws = XLSX.utils.json_to_sheet(custData);
                ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
                hasData = true;
            }

            // Proposals
            if (document.getElementById('exportProposals')?.checked && (window.proposals || []).length > 0) {
                const propData = (window.proposals || []).map(p => ({
                    'Teklif No': p.proposal_number || p.id?.slice(0, 8) || '',
                    'Müşteri': (window.customers || []).find(c => c.id === p.customer_id)?.company_name || p.customer_name || '-',
                    'Konu': p.subject || p.title || '',
                    'Tutar': p.amount ? `₺${parseFloat(p.amount).toLocaleString('tr-TR')}` : '-',
                    'Durum': p.status === 'approved' ? 'Onaylandı' : p.status === 'rejected' ? 'Reddedildi' : 'Bekliyor',
                    'Geçerlilik Tarihi': p.valid_until ? new Date(p.valid_until).toLocaleDateString('tr-TR') : '-',
                    'Oluşturulma Tarihi': p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : '-'
                }));
                const ws = XLSX.utils.json_to_sheet(propData);
                ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');
                hasData = true;
            }

            // Reservations
            if (document.getElementById('exportReservations')?.checked && (window.reservations || []).length > 0) {
                const resData = (window.reservations || []).map(r => ({
                    'Alan No': r.alan_no || '',
                    'Alan Tipi': r.alan_tipi || '',
                    'Büyüklük': r.alan_buyukluk || '',
                    'Fiyat': r.fiyat_miktar ? `₺${parseFloat(r.fiyat_miktar).toLocaleString('tr-TR')}` : '-',
                    'Durum': r.durum === 'bos' ? 'Müsait' : r.durum === 'rezerve' ? 'Dolu' : 'Opsiyonda',
                    'Firma': r.reserved_by_company || '-',
                    'Yetkili': r.reserved_by_name || '-',
                    'Telefon': r.reserved_by_phone || '-'
                }));
                const ws = XLSX.utils.json_to_sheet(resData);
                ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Rezervasyonlar');
                hasData = true;
            }

            // Appointments
            if (document.getElementById('exportAppointments')?.checked && (window.appointments || []).length > 0) {
                const apptData = (window.appointments || []).map(a => ({
                    'Başlık': a.title || a.name || '',
                    'Tarih': a.date || a.start_date || '',
                    'Saat': a.time || a.start_time || '',
                    'Müşteri': a.customer_name || '-',
                    'Durum': a.status || 'Bekliyor',
                    'Notlar': a.notes || ''
                }));
                const ws = XLSX.utils.json_to_sheet(apptData);
                ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 40 }];
                XLSX.utils.book_append_sheet(wb, ws, 'Randevular');
                hasData = true;
            }

            if (!hasData) {
                alert('İndirilecek veri bulunamadı. Lütfen en az bir modül seçin veya modüllerde veri olduğundan emin olun.');
                return;
            }

            // Generate filename and download
            const filename = `${companyName}_Veri_Yedegi_${dateStr}.xlsx`;
            XLSX.writeFile(wb, filename);
            alert('✅ Excel dosyası başarıyla indirildi!\n\nDosya adı: ' + filename);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('❌ Excel oluşturulurken hata: ' + error.message);
        }
    };

    // Export all selected modules to JSON
    window.exportAllToJSON = async function () {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                companyName: currentUser?.company_name || 'KolayIsTakip',
                version: '2.5.0',
                modules: {}
            };

            if (document.getElementById('exportTasks')?.checked) {
                exportData.modules.tasks = tasks || [];
            }
            if (document.getElementById('exportEmployees')?.checked) {
                exportData.modules.employees = employees || [];
            }
            if (document.getElementById('exportCustomers')?.checked) {
                exportData.modules.customers = window.customers || [];
            }
            if (document.getElementById('exportProposals')?.checked) {
                exportData.modules.proposals = window.proposals || [];
            }
            if (document.getElementById('exportReservations')?.checked) {
                exportData.modules.reservations = window.reservations || [];
            }
            if (document.getElementById('exportAppointments')?.checked) {
                exportData.modules.appointments = window.appointments || [];
            }
            if (departments.length > 0) {
                exportData.modules.departments = departments;
            }

            if (Object.keys(exportData.modules).length === 0) {
                alert('İndirilecek veri bulunamadı. Lütfen en az bir modül seçin.');
                return;
            }

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `${exportData.companyName}_Yedek_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('✅ JSON yedek dosyası başarıyla indirildi!\n\nBu dosyayı güvenli bir yerde saklayın.');
        } catch (error) {
            console.error('JSON export error:', error);
            alert('❌ JSON oluşturulurken hata: ' + error.message);
        }
    };

    // =============================================
    // DEPARTMENT MANAGEMENT
    // =============================================
    let departments = [];

    // Populate department filter dropdown (must be global for loadDepartments to access)
    function populateDepartmentFilter() {
        const departmentFilter = document.getElementById('departmentFilter');
        const departmentFilterSidebar = document.getElementById('departmentFilterSidebar');

        if (departmentFilter) {
            departmentFilter.innerHTML = '<option value="">Tüm Departmanlar</option>';
            if (window.departments && window.departments.length > 0) {
                window.departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    departmentFilter.appendChild(option);
                });
            }
        }

        if (departmentFilterSidebar) {
            departmentFilterSidebar.innerHTML = '<option value="">Tüm Departmanlar</option>';
            if (window.departments && window.departments.length > 0) {
                window.departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    departmentFilterSidebar.appendChild(option);
                });
            }
        }
    }

    // Load departments
    async function loadDepartments() {
        try {
            if (!window.currentUser) {
                console.log('User not loaded yet, skipping department load');
                return;
            }

            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .order('name');
            if (error) throw error;
            departments = data || [];
            window.departments = departments;

            // Update department dropdowns
            updateDepartmentDropdowns();

            // Populate task form department filter
            console.log('About to call populateDepartmentFilter');
            populateDepartmentFilter();

            // Update department list in settings
            renderDepartmentList();
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    // Update department dropdowns in modals
    function updateDepartmentDropdowns() {
        const newEmpDept = document.getElementById('newEmpDepartment');
        const editEmpDept = document.getElementById('editEmpDepartment');

        if (newEmpDept) {
            newEmpDept.innerHTML = '<option value="">Departman Seçiniz</option>' +
                departments.map(d => `<option value="${d.id}"> ${Security.sanitize(d.name)}</option> `).join('');
        }

        if (editEmpDept) {
            editEmpDept.innerHTML = '<option value="">Departman Seçiniz</option>' +
                departments.map(d => `<option value="${d.id}"> ${Security.sanitize(d.name)}</option> `).join('');
        }
    }

    // Render department list in settings
    function renderDepartmentList() {
        const container = document.getElementById('departmentList');
        if (!container) return;
        if (departments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: #6b7280;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; opacity: 0.3; margin-bottom: 8px; display: block;"></i>
                    <p style="margin: 0; font-size: 0.9rem;">Henüz departman eklenmemiş</p>
                </div>
            `;
            return;
        }
        container.innerHTML = departments.map(dept => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: white; border-radius: 10px; border: 1px solid #e5e7eb; transition: all 0.2s ease;"
                onmouseover="this.style.borderColor='#10b981'; this.style.boxShadow='0 2px 8px rgba(16,185,129,0.1)';"
                onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-building" style="color: #059669; font-size: 0.8rem;"></i>
                    </div>
                    <span style="font-weight: 600; color: #1f2937; font-size: 0.95rem;">${Security.sanitize(dept.name)}</span>
                </div>
                <button onclick="deleteDepartment('${dept.id}')" 
                    style="padding: 6px 12px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #dc2626; border: 1px solid #fca5a5; border-radius: 8px; font-size: 0.8rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;"
                    onmouseover="this.style.background='linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; this.style.color='white'; this.style.borderColor='#ef4444';"
                    onmouseout="this.style.background='linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'; this.style.color='#dc2626'; this.style.borderColor='#fca5a5';">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.75rem;"></i> Sil
                </button>
            </div>
        `).join('');
    }

    // Add department
    window.addDepartment = async function addDepartment() {
        const input = document.getElementById('newDepartmentName');
        const name = input.value.trim();
        if (!name) {
            alert('Lütfen departman adı girin.');
            return;
        }

        if (!window.currentUser) {
            alert('❌ Kullanıcı bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
            return;
        }

        try {
            const { error } = await supabase
                .from('departments')
                .insert([{
                    user_id: window.currentUser.id,
                    name: name
                }]);
            if (error) throw error;
            input.value = '';
            await loadDepartments();
            alert('✅ Departman eklendi!');
        } catch (error) {
            console.error('Error adding department:', error);
            alert('❌ Departman eklenirken hata oluştu: ' + error.message);
        }
    }
    // Delete department
    window.deleteDepartment = async function deleteDepartment(id) {
        if (!confirm('Bu departmanı silmek istediğinizden emin misiniz?\n\nNot: Departmandaki çalışanların departman bilgisi silinecek.')) {
            return;
        }
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await loadDepartments();
            alert('✅ Departman silindi!');
        } catch (error) {
            console.error('Error deleting department:', error);
            alert('❌ Departman silinirken hata oluştu: ' + error.message);
        }
    }
    // =============================================
    // MANAGER ASSIGNMENT
    // =============================================
    // Render manager list in settings
    function renderManagerList() {
        const container = document.getElementById('managerList');
        if (!container) return;
        if (employees.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary); text-align: center;">Henüz çalışan eklenmemiş.</p>';
            return;
        }
        container.innerHTML = employees.map(emp => {
            const isManager = emp.is_manager || false;
            const deptName = emp.department_id ?
                (departments.find(d => d.id === emp.department_id)?.name || '-') : '-';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9fafb; border-radius: 8px;">
                <div>
                    <span style="font-weight: 500;">${Security.sanitize(emp.name)}</span>
                    ${isManager ? '<span style="margin-left: 10px; padding: 2px 8px; background: #dcfce7; color: #166534; border-radius: 4px; font-size: 0.75rem;">👔 Yönetici</span>' : ''}
                    <div style="font-size: 0.85rem; color: var(--secondary); margin-top: 4px;">
                        Departman: ${deptName}
                    </div>
                </div>
                <button onclick="toggleManager('${emp.id}', ${!isManager})" 
                    class="btn ${isManager ? 'btn-delete' : 'btn-primary'}" 
                    style="padding: 5px 15px; font-size: 0.85rem;">
                    ${isManager ? '<i class="fa-solid fa-user-minus"></i> Yöneticilikten Çıkar' : '<i class="fa-solid fa-user-tie"></i> Yönetici Yap'}
                </button>
            </div>
                `;
        }).join('');
    }
    // Toggle manager status
    async function toggleManager(employeeId, makeManager) {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ is_manager: makeManager })
                .eq('id', employeeId);
            if (error) throw error;
            await loadEmployees();
            renderManagerList();
            alert(makeManager ? '✅ Yönetici olarak atandı!' : '✅ Yöneticilikten çıkarıldı!');
        } catch (error) {
            console.error('Error toggling manager:', error);
            alert('❌ İşlem sırasında hata oluştu: ' + error.message);
        }
    }
    // =============================================
    // UPDATE EXISTING FUNCTIONS
    // =============================================
    // Update addEmployee function to include department
    const originalAddEmployee = window.addEmployee;
    window.addEmployee = async function (name, phone) {
        const departmentId = document.getElementById('newEmpDepartment')?.value || null;

        try {
            const { error } = await supabase
                .from('employees')
                .insert([{
                    user_id: window.currentUser.id,
                    name: name,
                    phone: phone,
                    department_id: departmentId,
                    is_manager: false
                }]);
            if (error) throw error;
            await loadEmployees();
            closeAddEmployeeModal();
            alert('✅ Çalışan eklendi!');
        } catch (error) {
            console.error('Error adding employee:', error);
            alert('❌ Çalışan eklenirken hata oluştu: ' + error.message);
        }
    };
    // Update editEmployee function to include department
    const originalEditEmployee = window.editEmployee;
    window.editEmployee = async function (id, name, phone) {
        const departmentId = document.getElementById('editEmpDepartment')?.value || null;

        try {
            const { error } = await supabase
                .from('employees')
                .update({
                    name: name,
                    phone: phone,
                    department_id: departmentId
                })
                .eq('id', id);
            if (error) throw error;
            await loadEmployees();
            closeEditEmployeeModal();
            alert('✅ Çalışan güncellendi!');
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('❌ Çalışan güncellenirken hata oluştu: ' + error.message);
        }
    };
    // Update showEditEmployeeModal to load department
    const originalShowEditEmployeeModal = window.showEditEmployeeModal;
    window.showEditEmployeeModal = function (id) {
        originalShowEditEmployeeModal(id);

        const emp = employees.find(e => e.id === id);
        if (emp && emp.department_id) {
            const deptSelect = document.getElementById('editEmpDepartment');
            if (deptSelect) {
                deptSelect.value = emp.department_id;
            }
        }
    };



    // Initialize departments when employees are loaded
    // This will be called after currentUser is available
    window.initializeDepartments = async function () {
        await loadDepartments();
        renderManagerList();
    };


    // ============================================
    // RESERVATION MANAGEMENT MODULE
    // ============================================

    let reservations = [];
    let reservationsSubscription = null;

    // ============================================
    // BULK AREA CREATION
    // ============================================

    window.openBulkCreateModal = function () {
        document.getElementById('bulkCreateModal').style.display = 'flex';
        document.getElementById('bulkCreateForm').reset();
        updateBulkPreview();
    };

    window.closeBulkCreateModal = function () {
        document.getElementById('bulkCreateModal').style.display = 'none';
        document.getElementById('bulkCreateForm').reset();
    };

    function updateBulkPreview() {
        const prefix = document.getElementById('bulkPrefix')?.value || '';
        const startNo = parseInt(document.getElementById('bulkStartNo')?.value) || 0;
        const endNo = parseInt(document.getElementById('bulkEndNo')?.value) || 0;
        const preview = document.getElementById('bulkPreview');

        if (startNo > 0 && endNo > 0 && endNo >= startNo) {
            const count = endNo - startNo + 1;
            const firstArea = prefix.toUpperCase() + startNo;
            const lastArea = prefix.toUpperCase() + endNo;
            preview.innerHTML = `<i class="fa-solid fa-check-circle" style="color: #10b981;"></i> <strong>${count}</strong> alan oluşturulacak: ${firstArea} → ${lastArea} `;
        } else if (startNo > endNo && startNo > 0 && endNo > 0) {
            preview.innerHTML = `<i class="fa-solid fa-exclamation-triangle" style="color: #f59e0b;"></i> Başlangıç numarası bitiş numarasından küçük olmalıdır.`;
        } else {
            preview.innerHTML = `<i class="fa-solid fa-info-circle"></i> Oluşturulacak alan sayısı hesaplanacak...`;
        }
    }

    // Add event listeners for bulk preview update
    document.addEventListener('DOMContentLoaded', function () {
        const bulkStartNo = document.getElementById('bulkStartNo');
        const bulkEndNo = document.getElementById('bulkEndNo');
        const bulkPrefix = document.getElementById('bulkPrefix');

        if (bulkStartNo) bulkStartNo.addEventListener('input', updateBulkPreview);
        if (bulkEndNo) bulkEndNo.addEventListener('input', updateBulkPreview);
        if (bulkPrefix) bulkPrefix.addEventListener('input', updateBulkPreview);
    });

    // Handle bulk create form submission
    document.getElementById('bulkCreateForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const prefix = document.getElementById('bulkPrefix').value.toUpperCase();
        const startNo = parseInt(document.getElementById('bulkStartNo').value);
        const endNo = parseInt(document.getElementById('bulkEndNo').value);
        const alanTipi = document.getElementById('bulkAlanTipi').value;
        const buyukluk = document.getElementById('bulkBuyukluk').value;
        const fiyat = parseFloat(document.getElementById('bulkFiyat').value);
        const durum = document.getElementById('bulkDurum').value;

        if (startNo > endNo) {
            alert('Başlangıç numarası bitiş numarasından küçük olmalıdır.');
            return;
        }

        const count = endNo - startNo + 1;
        if (count > 500) {
            alert('Tek seferde en fazla 500 alan oluşturabilirsiniz.');
            return;
        }

        const confirmCreate = confirm(`${count} adet alan oluşturulacak(${prefix}${startNo} - ${prefix}${endNo}).Devam etmek istiyor musunuz ? `);
        if (!confirmCreate) return;

        // Show loading state
        const submitBtn = document.querySelector('#bulkCreateForm button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Oluşturuluyor...';

        try {
            // Prepare all areas
            const areasToCreate = [];
            for (let i = startNo; i <= endNo; i++) {
                areasToCreate.push({
                    user_id: currentUser.id,
                    alan_no: `${prefix}${i}`,
                    alan_tipi: alanTipi,
                    alan_buyukluk: buyukluk,
                    fiyat_miktar: fiyat,
                    para_birimi: 'TRY',
                    fiyat_tipi: 'tek_fiyat',
                    durum: durum
                });
            }

            // Insert in batches of 100 to avoid timeout
            const batchSize = 100;
            for (let i = 0; i < areasToCreate.length; i += batchSize) {
                const batch = areasToCreate.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('reservations')
                    .insert(batch);

                if (error) throw error;
            }

            closeBulkCreateModal();
            await loadReservations();
            alert(`${count} alan başarıyla oluşturuldu!`);

        } catch (error) {
            console.error('Error creating bulk areas:', error);
            alert('Alanlar oluşturulurken bir hata oluştu: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    });

    // Load reservations from Supabase
    async function loadReservations() {
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('alan_no', { ascending: true });

            if (error) throw error;

            reservations = data || [];
            window.reservations = reservations; // Store globally for export
            console.log('Loaded reservations:', reservations);
            renderReservations();
            updateReservationStats(); // Update statistics cards

            // Update dashboard card if it exists
            const dashTodayReservationCount = document.getElementById('dashTodayReservationCount');

            if (dashTodayReservationCount) {
                const today = new Date().toISOString().split('T')[0];
                // Filter reservations that have status 'rezerve' and were created today
                const todayReservations = data.filter(r => {
                    const createdDate = new Date(r.created_at).toISOString().split('T')[0];
                    return r.durum === 'rezerve' && createdDate === today;
                }).length;

                dashTodayReservationCount.textContent = todayReservations;
            }
        } catch (error) {
            console.error('Error loading reservations:', error);
        }
    }

    // Update reservation statistics cards
    function updateReservationStats() {
        const totalAreas = document.getElementById('totalAreas');
        const availableAreas = document.getElementById('availableAreas');
        const reservedAreas = document.getElementById('reservedAreas');
        const optionalAreas = document.getElementById('optionalAreas');

        if (!totalAreas) return; // Stats cards not in DOM

        const total = reservations.length;
        const available = reservations.filter(r => r.durum === 'bos').length;
        const reserved = reservations.filter(r => r.durum === 'rezerve').length;
        const optional = reservations.filter(r => r.durum === 'opsiyonda').length;

        totalAreas.textContent = total;
        availableAreas.textContent = available;
        reservedAreas.textContent = reserved;
        optionalAreas.textContent = optional;
    }

    // Render reservations table
    function renderReservations() {
        const grid = document.getElementById('reservationCardsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Get search term
        const searchInput = document.getElementById('reservationSearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Filter reservations based on search
        let filteredReservations = reservations;
        if (searchTerm) {
            filteredReservations = reservations.filter(reservation => {
                const alanNo = (reservation.alan_no || '').toLowerCase();
                const alanTipi = formatReservationType(reservation.alan_tipi || '').toLowerCase();
                const durum = (reservation.durum || '').toLowerCase();
                const aciklama = (reservation.aciklama || '').toLowerCase();
                const company = (reservation.reserved_by_company || '').toLowerCase();
                const name = (reservation.reserved_by_name || '').toLowerCase();

                return alanNo.includes(searchTerm) ||
                    alanTipi.includes(searchTerm) ||
                    durum.includes(searchTerm) ||
                    aciklama.includes(searchTerm) ||
                    company.includes(searchTerm) ||
                    name.includes(searchTerm);
            });
        }

        if (filteredReservations.length === 0) {
            grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 40px; color: var(--secondary); background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0;">
                <i class="fa-solid fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="margin: 0;">${searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz alan eklenmemiş.'}</p>
            </div>
            `;
            return;
        }

        filteredReservations.forEach(reservation => {
            const durumConfig = {
                'bos': { borderColor: '#10b981', bgColor: '#ecfdf5', label: 'MÜSAİT', labelBg: '#10b981' },
                'opsiyonda': { borderColor: '#f59e0b', bgColor: '#fffbeb', label: 'OPSİYON', labelBg: '#f59e0b' },
                'rezerve': { borderColor: '#ef4444', bgColor: '#fef2f2', label: 'DOLU', labelBg: '#ef4444' }
            };
            const config = durumConfig[reservation.durum] || { borderColor: '#6b7280', bgColor: '#f9fafb', label: 'BİLİNMİYOR', labelBg: '#6b7280' };

            const card = document.createElement('div');
            card.style.cssText = `
            background: white;
        border: 1px solid #e5e7eb;
        border - left: 4px solid ${config.borderColor};
        border - radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
        box - shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        `;
            card.onmouseover = () => {
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                card.style.transform = 'translateY(-2px)';
            };
            card.onmouseout = () => {
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                card.style.transform = 'translateY(0)';
            };

            // Firma bilgisi (rezerve için)
            const firmaBilgi = reservation.durum === 'rezerve' && reservation.reserved_by_company
                ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 0.7rem; color: #6b7280; margin-bottom: 4px;"><i class="fa-solid fa-building"></i> ${reservation.reserved_by_company}</div>
                ${reservation.reserved_by_name ? `<div style="font-size: 0.7rem; color: #6b7280;"><i class="fa-solid fa-user"></i> ${reservation.reserved_by_name}</div>` : ''}
            </div>
            ` : '';

            // Calculate payment progress for card
            const totalAmount = parseFloat(reservation.total_amount) || parseFloat(reservation.fiyat_miktar) || 0;
            const paidAmount = parseFloat(reservation.paid_amount) || 0;
            const paymentPercentage = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
            const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

            // Payment progress bar HTML (only for rezerve/opsiyonda)
            const paymentBarHTML = (reservation.durum === 'rezerve' || reservation.durum === 'opsiyonda') && totalAmount > 0 ? `
                <div style="margin: 12px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 0.65rem; color: #6b7280; font-weight: 600;">ÖDEME DURUMU</span>
                        <span style="font-size: 0.65rem; font-weight: 700; color: ${isFullyPaid ? '#10b981' : '#6366f1'};">${Math.round(paymentPercentage)}%</span>
                    </div>
                    <div style="background: #e5e7eb; height: 6px; border-radius: 10px; overflow: hidden;">
                        <div style="background: ${isFullyPaid ? '#10b981' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'}; height: 100%; width: ${paymentPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="font-size: 0.65rem; color: ${isFullyPaid ? '#10b981' : '#6366f1'}; margin-top: 4px; font-weight: 600;">
                        ${isFullyPaid ? '✓ Ödendi' : `${formatPrice(paidAmount, reservation.para_birimi || 'TRY')} / ${formatPrice(totalAmount, reservation.para_birimi || 'TRY')}`}
                    </div>
                </div>
            ` : '';

            // Contract badge (small icon in header)
            const contractBadge = reservation.contract_file_url ? `
                <span style="background: #ecfdf5; color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Sözleşme yüklendi">
                    <i class="fa-solid fa-file-pdf"></i>
                </span>
            ` : '';

            card.innerHTML = `
            <!--Header: Alan Kodu + Durum-->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937;">${reservation.alan_no}</h3>
                <div style="display: flex; gap: 6px; align-items: center;">
                    ${contractBadge}
                    <span style="background: ${config.labelBg}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px;">
                        ${config.label}
                    </span>
                </div>
            </div>
            
            <!--Info: Tip-->
            <div style="margin-bottom: 8px;">
                <div style="font-weight: 600; color: #374151; font-size: 0.9rem;">${formatReservationType(reservation.alan_tipi)}</div>
            </div>
            
            <!--Details Grid-->
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; font-size: 0.8rem; color: #6b7280;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-ruler-combined" style="font-size: 0.7rem;"></i>
                    <span>${reservation.alan_buyukluk || '-'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-tag" style="font-size: 0.7rem;"></i>
                    <span style="font-weight: 600; color: #1f2937;">${formatPrice(reservation.fiyat_miktar, reservation.para_birimi)} / ${formatFiyatTipi(reservation.fiyat_tipi)}</span>
                </div>
            </div>
            
            ${reservation.aciklama ? `<div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 12px; padding: 8px; background: #f9fafb; border-radius: 4px;"><i class="fa-solid fa-info-circle"></i> ${reservation.aciklama}</div>` : ''}
            
            ${paymentBarHTML}
            
            ${firmaBilgi}
            
            <!--Action Buttons-->
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick='openReservationDetailModal("${reservation.id}")' style="flex: 1; background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <i class="fa-solid fa-info-circle"></i> Detay
                </button>
                <button onclick='editReservation("${reservation.id}")' style="flex: 1; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <i class="fa-solid fa-pen"></i> Düzenle
                </button>
                <button onclick='deleteReservation("${reservation.id}")' style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

            grid.appendChild(card);
        });
    }

    // Global filter function called from search input
    window.filterReservations = function () {
        renderReservations();
    };


    // Format reservation types
    function formatReservationType(type) {
        const typeMap = {
            'stand': 'Fuar Standı',
            'toplanti': 'Toplantı Odası',
            'masa': 'Coworking Masası',
            'kort': 'Spor Kortu',
            'loca': 'Loca',
            'saatlik': 'Saatlik',
            'gunluk': 'Günlük/Seans',
            'tek_fiyat': 'Tek Fiyat'
        };
        return typeMap[type] || type;
    }

    // Format price type
    function formatFiyatTipi(type) {
        const typeMap = {
            'saatlik': 'Saatlik',
            'gunluk': 'Günlük',
            'tek_fiyat': 'Tek Fiyat'
        };
        return typeMap[type] || 'Tek Fiyat';
    }

    // Open reservation detail modal
    let currentDetailReservationId = null;

    window.openReservationDetailModal = function (reservationId) {
        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        currentDetailReservationId = reservationId;

        const durumConfig = {
            'bos': { label: 'MÜSAİT', color: '#10b981' },
            'opsiyonda': { label: 'OPSİYON', color: '#f59e0b' },
            'rezerve': { label: 'DOLU', color: '#ef4444' }
        };
        const config = durumConfig[reservation.durum] || { label: 'BİLİNMİYOR', color: '#6b7280' };

        // Calculate payment progress
        const totalAmount = parseFloat(reservation.total_amount) || parseFloat(reservation.fiyat_miktar) || 0;
        const paidAmount = parseFloat(reservation.paid_amount) || 0;
        const remainingAmount = totalAmount - paidAmount;
        const paymentPercentage = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
        const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

        // Payment history from JSONB
        const paymentHistory = reservation.payment_history || [];

        // Payment section HTML
        let paymentSectionHTML = '';
        if (reservation.durum === 'rezerve' || reservation.durum === 'opsiyonda') {
            paymentSectionHTML = `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem;">
                <h4 style="font-size: 0.9rem; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-credit-card"></i> Ödeme Bilgileri
                </h4>
                
                <!-- Payment Summary -->
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
                        <div>
                            <div style="color: #6b7280; font-size: 0.7rem; margin-bottom: 4px;">TOPLAM TUTAR</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: #1f2937;">${formatPrice(totalAmount, reservation.para_birimi || 'TRY')}</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; font-size: 0.7rem; margin-bottom: 4px;">ÖDENEN</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: #10b981;">${formatPrice(paidAmount, reservation.para_birimi || 'TRY')}</div>
                        </div>
                        <div>
                            <div style="color: #6b7280; font-size: 0.7rem; margin-bottom: 4px;">KALAN</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: ${isFullyPaid ? '#10b981' : '#ef4444'};">${formatPrice(remainingAmount, reservation.para_birimi || 'TRY')}</div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div style="background: #e2e8f0; height: 12px; border-radius: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${isFullyPaid ? '#10b981' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'}; height: 100%; width: ${paymentPercentage}%; transition: width 0.5s ease; display: flex; align-items: center; justify-content: center;">
                            ${paymentPercentage > 15 ? `<span style="color: white; font-size: 0.65rem; font-weight: 700;">${Math.round(paymentPercentage)}%</span>` : ''}
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-size: 0.75rem; font-weight: 600; color: ${isFullyPaid ? '#10b981' : '#6366f1'};">
                        ${isFullyPaid ? '✓ ÖDENDİ' : `${Math.round(paymentPercentage)}% Ödeme Yapıldı`}
                    </div>
                </div>
                
                ${!isFullyPaid ? `
                <!-- Add Payment Form -->
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 2px dashed #cbd5e1; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 8px; align-items: end;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px;">Ödeme Tutarı</label>
                            <input type="number" id="paymentAmountInput" placeholder="0.00" min="0" step="0.01" max="${remainingAmount}"
                                style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px;">Not (Opsiyonel)</label>
                            <input type="text" id="paymentNoteInput" placeholder="Örn: İlk taksit"
                                style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem;">
                        </div>
                        <button onclick="addPaymentToReservation('${reservation.id}')" class="btn btn-primary" 
                            style="padding: 8px 16px; white-space: nowrap; font-size: 0.85rem;">
                            <i class="fa-solid fa-plus"></i> Ekle
                        </button>
                    </div>
                </div>
                ` : ''}
                
                <!-- Payment History -->
                ${paymentHistory.length > 0 ? `
                <div style="margin-top: 1rem;">
                    <h5 style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px; font-weight: 600;">ÖDEME GEÇMİŞİ</h5>
                    <div style="max-height: 150px; overflow-y: auto;">
                        ${paymentHistory.map((payment, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; margin-bottom: 6px; border: 1px solid #e5e7eb;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #10b981; font-size: 0.9rem;">${formatPrice(payment.amount, reservation.para_birimi || 'TRY')}</div>
                                    <div style="font-size: 0.7rem; color: #6b7280;">${new Date(payment.date).toLocaleDateString('tr-TR')}${payment.note ? ` • ${payment.note}` : ''}</div>
                                </div>
                                <button onclick="deletePaymentFromReservation('${reservation.id}', '${payment.id}')" 
                                    style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            `;
        }

        // Contract section HTML
        let contractSectionHTML = '';
        if (reservation.durum === 'rezerve' || reservation.durum === 'opsiyonda') {
            contractSectionHTML = `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem;">
                <h4 style="font-size: 0.9rem; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-file-contract"></i> Sözleşme Yönetimi
                </h4>
                
                ${reservation.contract_file_url ? `
                    <!-- Contract Exists -->
                    <div style="background: #ecfdf5; padding: 12px; border-radius: 8px; border: 1px solid #a7f3d0; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fa-solid fa-file-pdf" style="font-size: 1.2rem;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #065f46; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reservation.contract_file_name}">${reservation.contract_file_name}</div>
                                <div style="font-size: 0.7rem; color: #059669;">✓ Sözleşme yüklendi</div>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <a href="${reservation.contract_file_url}" target="_blank" class="btn" 
                                    style="background: white; color: #10b981; border: 1px solid #10b981; padding: 6px 12px; font-size: 0.75rem; text-decoration: none;">
                                    <i class="fa-solid fa-eye"></i> Görüntüle
                                </a>
                                <button onclick="deleteContractFromReservation('${reservation.id}')" class="btn" 
                                    style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 6px 12px; font-size: 0.75rem;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- No Contract -->
                    <div style="background: #fffbeb; padding: 12px; border-radius: 8px; border: 1px dashed #fcd34d; margin-bottom: 1rem;">
                        <div style="text-align: center;">
                            <i class="fa-solid fa-file-circle-plus" style="font-size: 2rem; color: #d97706; margin-bottom: 8px;"></i>
                            <p style="margin: 0 0 12px 0; color: #92400e; font-size: 0.85rem;">Henüz sözleşme yüklenmemiş</p>
                            <input type="file" id="contractFileInput_${reservation.id}" accept=".pdf,.doc,.docx" style="display: none;" onchange="uploadContractFile('${reservation.id}', this)">
                            <button onclick="document.getElementById('contractFileInput_${reservation.id}').click()" class="btn btn-primary" 
                                style="background: #d97706; padding: 8px 16px; font-size: 0.85rem;">
                                <i class="fa-solid fa-cloud-arrow-up"></i> Sözleşme Yükle
                            </button>
                            <div style="margin-top: 8px; font-size: 0.7rem; color: #92400e;">PDF, DOC, DOCX (Maks. 10MB)</div>
                        </div>
                    </div>
                `}
            </div>
            `;
        }

        let firmaBilgiHTML = '';
        if (reservation.durum === 'rezerve' && reservation.reserved_by_company) {
            firmaBilgiHTML = `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem;">
                <h4 style="font-size: 0.9rem; color: var(--primary); margin-bottom: 0.75rem;">
                    <i class="fa-solid fa-building"></i> Rezervasyon Bilgileri
                </h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                    <div><strong>Firma:</strong> ${reservation.reserved_by_company || '-'}</div>
                    <div><strong>Yetkili:</strong> ${reservation.reserved_by_name || '-'}</div>
                    <div><strong>Telefon:</strong> ${reservation.reserved_by_phone || '-'}</div>
                    <div><strong>E-posta:</strong> ${reservation.reserved_by_email || '-'}</div>
                </div>
                ${reservation.special_requests ? `<div style="margin-top: 8px; font-size: 0.85rem;"><strong>Notlar:</strong> ${reservation.special_requests}</div>` : ''}
            </div>
            `;
        }

        const contentHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #1f2937;">${reservation.alan_no}</h3>
            <span style="background: ${config.color}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">${config.label}</span>
        </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
                <div style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">Alan Tipi</div>
                    <div style="font-weight: 600;">${formatReservationType(reservation.alan_tipi)}</div>
                </div>
                <div style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">Büyüklük</div>
                    <div style="font-weight: 600;">${reservation.alan_buyukluk || '-'}</div>
                </div>
                <div style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">Fiyat</div>
                    <div style="font-weight: 600; color: var(--primary);">${formatPrice(reservation.fiyat_miktar, reservation.para_birimi)}</div>
                </div>
                <div style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">Fiyat Tipi</div>
                    <div style="font-weight: 600;">${formatFiyatTipi(reservation.fiyat_tipi)}</div>
                </div>
            </div>
        
        ${reservation.aciklama ? `<div style="margin-top: 1rem; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 0.85rem;"><i class="fa-solid fa-info-circle" style="color: #10b981;"></i> ${reservation.aciklama}</div>` : ''}
        
        ${paymentSectionHTML}
        ${contractSectionHTML}
        ${firmaBilgiHTML}
        `;

        document.getElementById('reservationDetailContent').innerHTML = contentHTML;
        document.getElementById('reservationDetailModal').style.display = 'flex';
    };

    window.closeReservationDetailModal = function () {
        document.getElementById('reservationDetailModal').style.display = 'none';
        currentDetailReservationId = null;
    };

    window.editFromDetailModal = function () {
        if (currentDetailReservationId) {
            closeReservationDetailModal();
            editReservation(currentDetailReservationId);
        }
    };

    // ===== PAYMENT MANAGEMENT =====

    // Add payment to reservation
    window.addPaymentToReservation = async function (reservationId) {
        const amountInput = document.getElementById('paymentAmountInput');
        const noteInput = document.getElementById('paymentNoteInput');

        const amount = parseFloat(amountInput.value);
        const note = noteInput.value.trim();

        if (!amount || amount <= 0) {
            alert('Lütfen geçerli bir ödeme tutarı girin.');
            return;
        }

        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        const totalAmount = parseFloat(reservation.total_amount) || parseFloat(reservation.fiyat_miktar) || 0;
        const paidAmount = parseFloat(reservation.paid_amount) || 0;
        const remainingAmount = totalAmount - paidAmount;

        if (amount > remainingAmount) {
            alert(`Ödeme tutarı kalan borçtan (${formatPrice(remainingAmount, reservation.para_birimi || 'TRY')}) fazla olamaz.`);
            return;
        }

        try {
            // Create new payment record
            const newPayment = {
                id: crypto.randomUUID(),
                amount: amount,
                date: new Date().toISOString(),
                note: note || '',
                created_by: currentUser.id
            };

            // Get existing payment history
            const paymentHistory = Array.isArray(reservation.payment_history) ? reservation.payment_history : [];
            paymentHistory.push(newPayment);

            // Update reservation
            const { error } = await supabase
                .from('reservations')
                .update({
                    paid_amount: paidAmount + amount,
                    payment_history: paymentHistory,
                    total_amount: totalAmount // Ensure total_amount is set
                })
                .eq('id', reservationId);

            if (error) throw error;

            // Reload and refresh
            await loadReservations();
            openReservationDetailModal(reservationId);

            if (window.showToast) window.showToast('Başarılı', 'Ödeme başarıyla eklendi!', 'success');
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Ödeme eklenirken bir hata oluştu.');
        }
    };

    // Delete payment from reservation
    window.deletePaymentFromReservation = async function (reservationId, paymentId) {
        if (!confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) return;

        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        try {
            // Get existing payment history
            const paymentHistory = Array.isArray(reservation.payment_history) ? reservation.payment_history : [];
            const paymentToDelete = paymentHistory.find(p => p.id === paymentId);

            if (!paymentToDelete) {
                alert('Ödeme kaydı bulunamadı.');
                return;
            }

            // Remove payment from history
            const updatedHistory = paymentHistory.filter(p => p.id !== paymentId);
            const paidAmount = parseFloat(reservation.paid_amount) || 0;

            // Update reservation
            const { error } = await supabase
                .from('reservations')
                .update({
                    paid_amount: Math.max(0, paidAmount - paymentToDelete.amount),
                    payment_history: updatedHistory
                })
                .eq('id', reservationId);

            if (error) throw error;

            // Reload and refresh
            await loadReservations();
            openReservationDetailModal(reservationId);

            if (window.showToast) window.showToast('Başarılı', 'Ödeme kaydı silindi!', 'info');
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Ödeme silinirken bir hata oluştu.');
        }
    };

    // ===== CONTRACT MANAGEMENT =====

    // Upload contract file
    window.uploadContractFile = async function (reservationId, inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Sadece PDF, DOC ve DOCX dosyaları yüklenebilir.');
            inputElement.value = '';
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Dosya boyutu 10MB\'dan küçük olmalıdır.');
            inputElement.value = '';
            return;
        }

        try {
            // Upload to Supabase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${currentUser.id}/${reservationId}/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('contracts')
                .getPublicUrl(filePath);

            // Update reservation with contract info
            const { error: updateError } = await supabase
                .from('reservations')
                .update({
                    contract_file_url: urlData.publicUrl,
                    contract_file_name: file.name
                })
                .eq('id', reservationId);

            if (updateError) throw updateError;

            // Reload and refresh
            await loadReservations();
            openReservationDetailModal(reservationId);

            if (window.showToast) window.showToast('Başarılı', 'Sözleşme başarıyla yüklendi!', 'success');
        } catch (error) {
            console.error('Error uploading contract:', error);
            alert('Sözleşme yüklenirken bir hata oluştu: ' + error.message);
        } finally {
            inputElement.value = '';
        }
    };

    // Delete contract file
    window.deleteContractFromReservation = async function (reservationId) {
        if (!confirm('Sözleşme dosyasını silmek istediğinizden emin misiniz?')) return;

        const reservation = reservations.find(r => r.id === reservationId);
        if (!reservation || !reservation.contract_file_url) return;

        try {
            // Extract file path from URL
            const url = new URL(reservation.contract_file_url);
            const pathParts = url.pathname.split('/contracts/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];

                // Delete from storage
                const { error: deleteError } = await supabase.storage
                    .from('contracts')
                    .remove([filePath]);

                if (deleteError) console.error('Error deleting file from storage:', deleteError);
            }

            // Update reservation to remove contract info
            const { error: updateError } = await supabase
                .from('reservations')
                .update({
                    contract_file_url: null,
                    contract_file_name: null
                })
                .eq('id', reservationId);

            if (updateError) throw updateError;

            // Reload and refresh
            await loadReservations();
            openReservationDetailModal(reservationId);

            if (window.showToast) window.showToast('Başarılı', 'Sözleşme silindi!', 'info');
        } catch (error) {
            console.error('Error deleting contract:', error);
            alert('Sözleşme silinirken bir hata oluştu.');
        }
    };


    // Format price with currency
    function formatPrice(amount, currency) {
        const locale = currency === 'TRY' ? 'tr-TR' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Handle reservation form submission
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const editId = document.getElementById('editReservationId').value;
            const submitBtn = document.getElementById('reservationSubmitBtn');

            // Disable button during processing
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

            try {
                const formData = {
                    alan_no: document.getElementById('alanNo').value,
                    alan_tipi: document.getElementById('alanTipi').value,
                    alan_buyukluk: document.getElementById('alanBuyukluk').value,
                    fiyat_tipi: document.getElementById('fiyatTipi').value,
                    fiyat_miktar: parseFloat(document.getElementById('fiyatMiktar').value),
                    para_birimi: document.getElementById('paraBirimi').value,
                    durum: document.getElementById('alanDurum').value,
                    aciklama: document.getElementById('alanAciklama').value || null,
                    user_id: currentUser.id
                };

                // Add reservation info if status is rezerve
                if (formData.durum === 'rezerve') {
                    formData.reserved_by_company = document.getElementById('reservedCompany').value;
                    formData.reserved_by_name = document.getElementById('reservedName').value;
                    formData.reserved_by_phone = document.getElementById('reservedPhone').value;
                    formData.reserved_by_email = document.getElementById('reservedEmail').value;
                    formData.special_requests = document.getElementById('reservedNotes').value;
                } else {
                    // Clear reservation info
                    formData.reserved_by_company = null;
                    formData.reserved_by_name = null;
                    formData.reserved_by_phone = null;
                    formData.reserved_by_email = null;
                    formData.special_requests = null;
                }

                if (editId) {
                    // Update existing reservation
                    const { error } = await supabase
                        .from('reservations')
                        .update(formData)
                        .eq('id', editId);

                    if (error) throw error;
                    alert('Alan başarıyla güncellendi!');
                } else {
                    // Insert new reservation
                    const { error } = await supabase
                        .from('reservations')
                        .insert([formData]);

                    if (error) throw error;
                    alert('Yeni alan başarıyla eklendi!');
                }

                // Reset form
                reservationForm.reset();
                document.getElementById('editReservationId').value = '';
                document.getElementById('reservationSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Alan Ekle';
                document.getElementById('reservationInfoSection').style.display = 'none';

                await loadReservations();
            } catch (error) {
                console.error('Error saving reservation:', error);
                alert('Alan kaydedilirken bir hata oluştu: ' + error.message);
            } finally {
                submitBtn.disabled = false;
            }
        });

        // Add durum change listener
        const alanDurumSelect = document.getElementById('alanDurum');
        if (alanDurumSelect) {
            alanDurumSelect.addEventListener('change', function () {
                const reservationInfoSection = document.getElementById('reservationInfoSection');
                if (this.value === 'rezerve') {
                    reservationInfoSection.style.display = 'block';
                } else {
                    reservationInfoSection.style.display = 'none';
                    // Clear reservation fields
                    document.getElementById('reservedCompany').value = '';
                    document.getElementById('reservedName').value = '';
                    document.getElementById('reservedPhone').value = '';
                    document.getElementById('reservedEmail').value = '';
                    document.getElementById('reservedNotes').value = '';
                }
            });
        }
    }

    // Edit reservation - open modal
    window.editReservation = function (id) {
        const reservation = reservations.find(r => r.id === id);
        if (!reservation) return;

        // Fill modal form fields
        document.getElementById('modalEditReservationId').value = reservation.id;
        document.getElementById('modalAlanNo').value = reservation.alan_no;
        document.getElementById('modalAlanTipi').value = reservation.alan_tipi;
        document.getElementById('modalAlanBuyukluk').value = reservation.alan_buyukluk;
        document.getElementById('modalFiyatMiktar').value = reservation.fiyat_miktar;
        document.getElementById('modalAlanDurum').value = reservation.durum;
        document.getElementById('modalAlanAciklama').value = reservation.aciklama || '';

        // Handle reservation info section
        const modalReservationInfoSection = document.getElementById('modalReservationInfoSection');
        if (reservation.durum === 'rezerve') {
            modalReservationInfoSection.style.display = 'block';
            document.getElementById('modalReservedCompany').value = reservation.reserved_by_company || '';
            document.getElementById('modalReservedName').value = reservation.reserved_by_name || '';
            document.getElementById('modalReservedPhone').value = reservation.reserved_by_phone || '';
            document.getElementById('modalReservedEmail').value = reservation.reserved_by_email || '';
            document.getElementById('modalReservedNotes').value = reservation.special_requests || '';
        } else {
            modalReservationInfoSection.style.display = 'none';
            // Clear fields
            document.getElementById('modalReservedCompany').value = '';
            document.getElementById('modalReservedName').value = '';
            document.getElementById('modalReservedPhone').value = '';
            document.getElementById('modalReservedEmail').value = '';
            document.getElementById('modalReservedNotes').value = '';
        }

        // Open modal
        document.getElementById('reservationEditModal').style.display = 'flex';
    };

    // Close edit modal
    window.closeReservationEditModal = function () {
        document.getElementById('reservationEditModal').style.display = 'none';
        document.getElementById('reservationEditForm').reset();
    };

    // Toggle reservation info section in modal
    window.toggleModalReservationInfo = function () {
        const durum = document.getElementById('modalAlanDurum').value;
        const section = document.getElementById('modalReservationInfoSection');
        if (durum === 'rezerve') {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    };

    // Handle edit modal form submission
    document.getElementById('reservationEditForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const id = document.getElementById('modalEditReservationId').value;
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

        try {
            const formData = {
                alan_no: document.getElementById('modalAlanNo').value,
                alan_tipi: document.getElementById('modalAlanTipi').value,
                alan_buyukluk: document.getElementById('modalAlanBuyukluk').value,
                fiyat_miktar: parseFloat(document.getElementById('modalFiyatMiktar').value),
                fiyat_tipi: 'tek_fiyat',
                para_birimi: 'TRY',
                durum: document.getElementById('modalAlanDurum').value,
                aciklama: document.getElementById('modalAlanAciklama').value || null
            };

            // Add reservation info if status is rezerve
            if (formData.durum === 'rezerve') {
                formData.reserved_by_company = document.getElementById('modalReservedCompany').value;
                formData.reserved_by_name = document.getElementById('modalReservedName').value;
                formData.reserved_by_phone = document.getElementById('modalReservedPhone').value;
                formData.reserved_by_email = document.getElementById('modalReservedEmail').value;
                formData.special_requests = document.getElementById('modalReservedNotes').value;
            } else {
                formData.reserved_by_company = null;
                formData.reserved_by_name = null;
                formData.reserved_by_phone = null;
                formData.reserved_by_email = null;
                formData.special_requests = null;
            }

            const { error } = await supabase
                .from('reservations')
                .update(formData)
                .eq('id', id);

            if (error) throw error;

            closeReservationEditModal();
            await loadReservations();
            alert('✅ Alan başarıyla güncellendi!');
        } catch (error) {
            console.error('Error updating reservation:', error);
            alert('❌ Alan güncellenirken bir hata oluştu: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    });

    // Delete reservation
    window.deleteReservation = async function (id) {
        if (!confirm('Bu alanı silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('reservations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loadReservations();
            alert('Alan silindi.');
        } catch (error) {
            console.error('Error deleting reservation:', error);
            alert('Alan silinirken bir hata oluştu: ' + error.message);
        }
    };

    // WhatsApp share function
    window.shareReservations = function () {
        //const baseUrl = window.location.origin;
        const baseUrl = 'https://kolayistakip.vercel.app';
        const reservationUrl = `${baseUrl}/alan-rezervasyon.html?user_id=${currentUser.id}`;

        const message = encodeURIComponent(`Merhaba,
Güncel olarak müsait tüm alanlarımızı görmek ve hemen rezervasyon yapmak için lütfen aşağıdaki sayfamızı inceleyiniz:

${reservationUrl}`);

        const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    // Copy reservation link
    window.copyReservationLink = async function () {
        //const baseUrl = window.location.origin;
        const baseUrl = 'https://kolayistakip.vercel.app';
        const reservationUrl = `${baseUrl}/alan-rezervasyon.html?user_id=${currentUser.id}`;

        try {
            await navigator.clipboard.writeText(reservationUrl);
            alert('Rezervasyon linki panoya kopyalandı:\n' + reservationUrl);
        } catch (err) {
            console.error('Kopyalama başarısız:', err);
            alert('Kopyalama başarısız. Lütfen linki manuel kopyalayın:\n' + reservationUrl);
        }
    };

    // Setup realtime subscription for reservations
    function setupReservationsRealtime() {
        if (reservationsSubscription) {
            reservationsSubscription.unsubscribe();
        }

        reservationsSubscription = supabase
            .channel('reservations-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'reservations',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                console.log('Reservation change received:', payload);
                loadReservations();
            })
            .subscribe();
    }

    // Add to init function check
    if (document.getElementById('view-reservations')) {
        window.addEventListener('DOMContentLoaded', () => {
            if (currentUser) {
                loadReservations();
                setupReservationsRealtime();
            }
        });
    }

    // Upload general kroki/blueprint image for all reservations
    window.uploadKrokiImage = async function (input) {
        const file = input.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}/kroki_${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('reservation-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Görsel yüklenirken hata oluştu: ' + uploadError.message);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('reservation-images')
                .getPublicUrl(fileName);

            // Update ALL reservations with this kroki URL
            const { error: updateError } = await supabase
                .from('reservations')
                .update({ kroki_url: publicUrl })
                .eq('user_id', currentUser.id);

            if (updateError) throw updateError;

            alert('✅ Kroki görseli başarıyla yüklendi!\n\nTüm alanlarınız için bu görsel kullanılacak.');

            // Reload reservations
            await loadReservations();

            // Reset file input
            input.value = '';
        } catch (error) {
            console.error('Error uploading kroki:', error);
            alert('❌ Görsel yüklenirken bir hata oluştu:\n\n' + error.message);
            input.value = '';
        }
    };

    // Firma modal functions
    window.openFirmaModal = function (reservationId) {
        document.getElementById('firmaModalReservationId').value = reservationId;
        // Clear form
        document.getElementById('modalFirmaName').value = '';
        document.getElementById('modalYetkili').value = '';
        document.getElementById('modalTelefon').value = '';
        document.getElementById('modalEmail').value = '';
        document.getElementById('modalNotes').value = '';
        // Show modal
        const modal = document.getElementById('firmaModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal açıldı!');
        } else {
            console.error('firmaModal element bulunamadı!');
        }
    };

    window.closeFirmaModal = function () {
        document.getElementById('firmaModal').style.display = 'none';
    };

    window.saveFirmaToReservation = async function (event) {
        event.preventDefault();

        const reservationId = document.getElementById('firmaModalReservationId').value;
        const firmaData = {
            durum: 'rezerve',
            reserved_by_company: document.getElementById('modalFirmaName').value,
            reserved_by_name: document.getElementById('modalYetkili').value,
            reserved_by_phone: document.getElementById('modalTelefon').value,
            reserved_by_email: document.getElementById('modalEmail').value,
            special_requests: document.getElementById('modalNotes').value
        };

        try {
            const { error } = await supabase
                .from('reservations')
                .update(firmaData)
                .eq('id', reservationId);

            if (error) throw error;

            alert('✅ Firma bilgileri kaydedildi ve alan rezerve edildi!');
            closeFirmaModal();
            await loadReservations();
        } catch (error) {
            console.error('Error saving firma:', error);
            alert('❌ Firma bilgileri kaydedilirken hata oluştu: ' + error.message);
        }
    };
});
console.log('✅ Firma modal fonksiyonları yüklendi!', typeof openFirmaModal);