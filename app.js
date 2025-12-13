document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const employeeSelect = document.getElementById('employeeSelect');
    const departmentFilter = document.getElementById('departmentFilter');
    const employeeListBody = document.getElementById('employeeListBody');
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
                if (text.includes('İş Listesi')) switchView('tasks');
                else if (text.includes('Randevular')) switchView('appointments');
                else if (text.includes('Teklifler')) switchView('proposals');
                else if (text.includes('Müşteriler')) switchView('customers');
                else if (text.includes('Website Yönetimi')) switchView('website');
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

        tasks = data.map(task => ({
            id: task.id,
            desc: task.description,
            employeeId: task.employee_id,
            name: task.employee_name,
            phone: task.employee_phone,
            customer_id: task.customer_id,
            completed: task.completed,
            deadline: task.deadline,
            createdAt: new Date(task.created_at).toLocaleDateString('tr-TR'),
            completedAt: task.completed_at ? new Date(task.completed_at) : null
        }));

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
                deadline: deadline
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
            alert('Görev başarıyla eklendi ve çalışana atandı!');
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Görev eklenirken bir hata oluştu.');
        }
    });

    function renderTasks() {
        taskList.innerHTML = '';

        // Get search term
        const searchInput = document.getElementById('taskSearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Apply both status filter and search filter
        const filteredTasks = tasks.filter(task => {
            // Status filter
            let matchesStatus = true;
            if (currentFilter === 'pending') matchesStatus = !task.completed;
            if (currentFilter === 'completed') matchesStatus = task.completed;

            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const taskDesc = task.desc.toLowerCase();
                const employeeName = task.name.toLowerCase();

                // Check if customer exists and has name
                const customer = customers.find(c => c.id === task.customer_id);
                const customerName = customer ? customer.name.toLowerCase() : '';

                matchesSearch = taskDesc.includes(searchTerm) ||
                    employeeName.includes(searchTerm) ||
                    customerName.includes(searchTerm);
            }

            return matchesStatus && matchesSearch;
        });

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>Kayıt bulunamadı.</p></div>`;
            return;
        }

        filteredTasks.forEach(task => {
            const cleanPhone = task.phone.replace(/\D/g, '');
            const companyName = currentUser.company_name || currentUser.username;
            const taskLink = `${window.location.origin}/complete-task.html?id=${task.id}`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Merhaba ${task.name}, ${companyName} tarafından atanan yeni bir görevin var:\n\nGörevin: ${task.desc}\n\nGörevi tamamladığında buraya tıkla:\n${taskLink}`)}`;

            // Get customer info if exists
            const customer = task.customer_id ? customers.find(c => c.id === task.customer_id) : null;
            const customerDisplay = customer ? `<div class="task-meta"><i class="fa-solid fa-building"></i> ${Security.sanitize(customer.name)}</div>` : '';

            const taskDiv = document.createElement('div');
            taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskDiv.innerHTML = `
                <div class="task-content">
                    <div class="task-header">
                        <h3>${Security.sanitize(task.desc)}</h3>
                        <span class="task-meta">${task.createdAt}</span>
                    </div>
                    <div class="task-meta"><i class="fa-solid fa-user"></i> ${Security.sanitize(task.name)}</div>
                    ${customerDisplay}
                </div>
                <div class="task-actions">
                    <a href="${whatsappUrl}" target="_blank" class="action-btn btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Paylaş</a>
                    <button class="action-btn btn-complete"><i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i> ${task.completed ? 'Geri Al' : 'Tamamla'}</button>
                    <button class="action-btn btn-delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Add event listeners
            taskDiv.querySelector('.task-content').addEventListener('click', () => showEditTaskModal(task));
            taskDiv.querySelector('.btn-complete').addEventListener('click', () => toggleTaskStatus(task.id));
            taskDiv.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(taskDiv);
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
                description: desc,
                employee_id: employee.id,
                employee_name: employee.name,
                employee_phone: employee.phone,
                deadline: deadline
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
        employeeListBody.innerHTML = '';
        if (employees.length === 0) {
            employeeListBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">Henüz çalışan eklenmemiş.</td></tr>';
            return;
        }

        employees.forEach(emp => {
            const activeTaskCount = tasks.filter(t => t.employeeId == emp.id && !t.completed).length;
            const tr = document.createElement('tr');

            console.log(`Rendering emp: ${emp.name}, Dept ID: ${emp.department_id}, Departments loaded: ${departments.length} `);

            const departmentName = emp.department_id ?
                (departments.find(d => d.id === emp.department_id)?.name || '<span style="color:red">Tanımsız</span>') : '-';

            tr.innerHTML = `
                <td><div style="font-weight:500;">${Security.sanitize(emp.name)}</div></td>
                <td>${Security.sanitize(emp.phone)}</td>
                <td><span style="background:#eff6ff; color:var(--primary); padding:2px 8px; border-radius:4px; font-size:0.85rem;">${activeTaskCount} Görev</span></td>
                <td><span style="color:var(--text-secondary); font-size:0.9rem;">${departmentName}</span></td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn-edit-emp" style="color:#3b82f6; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-delete-emp" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
        `;

            // Add event listeners
            tr.querySelector('.btn-edit-emp').addEventListener('click', () => showEditEmployeeModal(emp));
            tr.querySelector('.btn-delete-emp').addEventListener('click', () => deleteEmployee(emp.id));

            employeeListBody.appendChild(tr);
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
    function renderCompletionChart() {
        const canvas = document.getElementById('completionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
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
                                return `${label}: ${value} (${percentage}%)`;
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
    function renderProductivityTrend() {
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
            const count = tasks.filter(t => {
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

    // Updated renderReports function
    function renderReports() {
        renderPerformanceCards();
        renderCompletionChart();
        renderProductivityTrend();
        renderPerformanceTable();
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

    // Export to PDF
    window.exportToPDF = function () {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Helper function to normalize Turkish characters for PDF
            const normalizeTurkish = (text) => {
                if (!text) return text;
                return text
                    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                    .replace(/ş/g, 's').replace(/Ş/g, 'S')
                    .replace(/ı/g, 'i').replace(/İ/g, 'I')
                    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
            };

            const performanceData = calculateEmployeePerformance();
            const companyName = currentUser?.company_name || currentUser?.username || 'Kolay Is Takip';

            // Title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(normalizeTurkish(companyName), 105, 20, { align: 'center' });

            doc.setFontSize(14);
            doc.text('Performans Raporu', 105, 30, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Tarih: ' + new Date().toLocaleDateString('tr-TR'), 105, 38, { align: 'center' });

            // Summary Stats
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Genel Ozet', 14, 50);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const pending = total - completed;
            const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

            doc.text(`Toplam Gorev: ${total} `, 14, 58);
            doc.text(`Tamamlanan: ${completed} `, 14, 64);
            doc.text(`Bekleyen: ${pending} `, 14, 70);
            doc.text(`Tamamlanma Orani: ${completionRate}% `, 14, 76);
            doc.text(`Toplam Calisan: ${employees.length} `, 14, 82);

            // Performance Table
            if (performanceData.length > 0) {
                doc.autoTable({
                    startY: 92,
                    head: [['Calisan', 'Toplam', 'Tamamlanan', 'Bekleyen', 'Oran (%)', 'Skor']],
                    body: performanceData.map(emp => [
                        normalizeTurkish(emp.name),
                        emp.totalTasks,
                        emp.completedTasks,
                        emp.pendingTasks,
                        emp.completionRate,
                        emp.performanceScore
                    ]),
                    theme: 'grid',
                    headStyles: {
                        fillColor: [99, 102, 241],
                        fontSize: 10,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 9
                    },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { cellWidth: 20, halign: 'center' },
                        2: { cellWidth: 25, halign: 'center' },
                        3: { cellWidth: 20, halign: 'center' },
                        4: { cellWidth: 22, halign: 'center' },
                        5: { cellWidth: 20, halign: 'center' }
                    }
                });
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Sayfa ${i} / ${pageCount}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Save PDF
            const filename = `Kolay_Is_Takip_Rapor_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            alert('PDF raporu başarıyla indirildi!');
        } catch (error) {
            console.error('PDF export error:', error);
            alert('PDF raporu oluşturulurken bir hata oluştu: ' + error.message);
        }
    };
});
// =============================================
// DEPARTMENT MANAGEMENT
// =============================================
let departments = [];

// Populate department filter dropdown (must be global for loadDepartments to access)
function populateDepartmentFilter() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (!departmentFilter) return;

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
            departments.map(d => `<option value="${d.id}">${Security.sanitize(d.name)}</option>`).join('');
    }

    if (editEmpDept) {
        editEmpDept.innerHTML = '<option value="">Departman Seçiniz</option>' +
            departments.map(d => `<option value="${d.id}">${Security.sanitize(d.name)}</option>`).join('');
    }
}

// Render department list in settings
function renderDepartmentList() {
    const container = document.getElementById('departmentList');
    if (!container) return;
    if (departments.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary); text-align: center;">Henüz departman eklenmemiş.</p>';
        return;
    }
    container.innerHTML = departments.map(dept => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9fafb; border-radius: 8px;">
            <span style="font-weight: 500;">${Security.sanitize(dept.name)}</span>
            <button onclick="deleteDepartment('${dept.id}')" class="btn btn-delete" style="padding: 5px 10px; font-size: 0.85rem;">
                <i class="fa-solid fa-trash"></i> Sil
            </button>
        </div>
    `).join('');
}

// Add department
async function addDepartment() {
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
async function deleteDepartment(id) {
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
        const firstArea = `${prefix.toUpperCase()}${startNo}`;
        const lastArea = `${prefix.toUpperCase()}${endNo}`;
        preview.innerHTML = `<i class="fa-solid fa-check-circle" style="color: #10b981;"></i> <strong>${count}</strong> alan oluşturulacak: ${firstArea} → ${lastArea}`;
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

    const confirmCreate = confirm(`${count} adet alan oluşturulacak (${prefix}${startNo} - ${prefix}${endNo}). Devam etmek istiyor musunuz?`);
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
        console.log('Loaded reservations:', reservations);
        renderReservations();

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

// Render reservations table
function renderReservations() {
    const grid = document.getElementById('reservationCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (reservations.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 40px; color: var(--secondary); background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0;">
                <i class="fa-solid fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="margin: 0;">Henüz alan eklenmemiş.</p>
            </div>
        `;
        return;
    }

    reservations.forEach(reservation => {
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
            border-left: 4px solid ${config.borderColor};
            border-radius: 8px;
            padding: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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

        card.innerHTML = `
            <!-- Header: Alan Kodu + Durum -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937;">${reservation.alan_no}</h3>
                <span style="background: ${config.labelBg}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px;">
                    ${config.label}
                </span>
            </div>
            
            <!-- Info: Tip -->
            <div style="margin-bottom: 8px;">
                <div style="font-weight: 600; color: #374151; font-size: 0.9rem;">${formatReservationType(reservation.alan_tipi)}</div>
            </div>
            
            <!-- Details Grid -->
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
            
            ${firmaBilgi}
            
            <!-- Action Buttons -->
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
console.log('✅ Firma modal fonksiyonları yüklendi!', typeof openFirmaModal);