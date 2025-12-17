// Calendar-based Appointments with FullCalendar.js
let calendar = null;
let currentCalendar = null;
let allSlots = [];

// Initialize calendar when appointments view is shown
async function initializeAppointmentCalendar() {
    const user = await Auth.checkAuth();
    if (!user) return;

    // Get or create user's calendar
    await getOrCreateCalendar(user.id);

    // Load calendar
    if (!calendar) {
        const calendarEl = document.getElementById('appointmentCalendar');
        if (!calendarEl) return;

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            locale: 'tr',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,timeGridDay'
            },
            slotMinTime: '08:00:00',
            slotMaxTime: '24:00:00',
            slotDuration: '00:30:00',
            selectable: true,
            selectMirror: true,
            select: handleDateSelect,
            eventClick: handleEventClick,
            editable: false,
            dayMaxEvents: true,
            events: [],
            buttonText: {
                today: 'Bugün',
                week: 'Hafta',
                day: 'Gün'
            },
            allDaySlot: false,
            height: 'auto'
        });

        calendar.render();
    }

    // Load slots
    await loadCalendarSlots();

    // Setup form event listener
    setTimeout(() => {
        setupSlotFormListener();
    }, 100);
}

// Get or create user's calendar
async function getOrCreateCalendar(userId) {
    try {
        // Check if user has a calendar
        const { data: calendars, error: fetchError } = await supabase
            .from('appointment_calendars')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1);

        if (fetchError) throw fetchError;

        if (calendars && calendars.length > 0) {
            currentCalendar = calendars[0];
        } else {
            // Create new calendar
            const { data: newCalendar, error: createError } = await supabase
                .from('appointment_calendars')
                .insert([{ user_id: userId }])
                .select()
                .single();

            if (createError) throw createError;
            currentCalendar = newCalendar;
        }

        // Update share link display
        updateShareLink();
    } catch (error) {
        console.error('Error getting/creating calendar:', error);
    }
}

// Load calendar slots
async function loadCalendarSlots() {
    if (!currentCalendar) return;

    try {
        const { data: slots, error } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('calendar_id', currentCalendar.id)
            .order('slot_date', { ascending: true })
            .order('slot_time', { ascending: true });

        if (error) throw error;

        allSlots = slots || [];

        // Helper function to get slot colors based on status
        const getSlotColors = (slot) => {
            if (slot.status === 'available') {
                return { bg: '#10b981', border: '#059669' }; // Yeşil - Müsait
            }

            // Reserved slots - check approval status (null-safe)
            const approvalStatus = slot.approval_status || 'approved'; // Default to approved for old data
            switch (approvalStatus) {
                case 'approved':
                    return { bg: '#667eea', border: '#5568d3' }; // Mavi - Onaylı
                case 'pending':
                    return { bg: '#f59e0b', border: '#d97706' }; // Sarı - Beklemede
                case 'rejected':
                    return { bg: '#ef4444', border: '#dc2626' }; // Kırmızı - Reddedildi
                default:
                    return { bg: '#667eea', border: '#5568d3' };
            }
        };

        // Helper function to get slot title
        const getSlotTitle = (slot) => {
            if (slot.status === 'available') {
                if (slot.capacity && slot.capacity > 0) {
                    return `Müsait (${slot.capacity} kişi)`;
                }
                return 'Müsait';
            }

            let title = slot.customer_name || 'Rezerve';
            if (slot.capacity && slot.capacity > 0) {
                const bookings = slot.current_bookings || 0;
                title += ` (${bookings}/${slot.capacity})`;
            }
            if (slot.approval_status === 'pending') {
                title = '⏳ ' + title;
            }
            return title;
        };

        // Convert slots to FullCalendar events
        const events = allSlots.map(slot => {
            const datetime = `${slot.slot_date}T${slot.slot_time}`;
            const endTime = new Date(datetime);
            endTime.setMinutes(endTime.getMinutes() + (slot.duration_minutes || 60));
            const colors = getSlotColors(slot);

            return {
                id: slot.id,
                title: getSlotTitle(slot),
                start: datetime,
                end: endTime.toISOString(),
                backgroundColor: colors.bg,
                borderColor: colors.border,
                extendedProps: {
                    slotData: slot
                }
            };
        });

        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(events);
        }

        // Update stats
        updateStats();

        // Load tomorrow's appointments for reminder panel
        loadTomorrowAppointments();

        // Load pending approvals (if function exists)
        if (typeof loadPendingApprovals === 'function') {
            loadPendingApprovals();
        }
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

// Handle date selection (create new slot)
async function handleDateSelect(selectInfo) {
    const modal = document.getElementById('slotModal');
    const form = document.getElementById('slotForm');

    // Set form values
    document.getElementById('slotDate').value = selectInfo.startStr.split('T')[0];
    document.getElementById('slotTime').value = selectInfo.startStr.split('T')[1].substring(0, 5);
    document.getElementById('slotDuration').value = '60';

    modal.style.display = 'flex';

    calendar.unselect();
}

// Handle event click (view/delete slot)
async function handleEventClick(clickInfo) {
    const slot = clickInfo.event.extendedProps.slotData;

    if (slot.status === 'reserved') {
        const message = `Rezerve Edildi:\n\nMüşteri: ${slot.customer_name}\nTelefon: ${slot.customer_phone}\nTarih: ${new Date(slot.slot_date).toLocaleDateString('tr-TR')}\nSaat: ${slot.slot_time}\n${slot.customer_notes ? '\nNot: ' + slot.customer_notes : ''}`;

        if (confirm(message + '\n\nBu randevuyu silmek ister misiniz?')) {
            await deleteSlot(slot.id);
        }
    } else {
        if (confirm('Bu müsait saati silmek ister misiniz?')) {
            await deleteSlot(slot.id);
        }
    }
}

// Create new slot
// Setup slot form event listener
function setupSlotFormListener() {
    const form = document.getElementById('slotForm');
    if (!form) {
        console.log('⚠️ Slot form not found, will retry...');
        return;
    }

    console.log('✅ Setting up slot form listener');

    // Remove any existing listener to avoid duplicates (cloning replaces the element)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Populate customer dropdown AFTER cloning
    populateSlotCustomerDropdown();

    // Setup customer select change listener AFTER cloning
    const customerSelect = document.getElementById('slotCustomerSelect');
    if (customerSelect) {
        customerSelect.addEventListener('change', (e) => {
            const customerId = e.target.value;
            const customerNameInput = document.getElementById('slotCustomerName');
            const customerPhoneInput = document.getElementById('slotCustomerPhone');

            if (customerId && window.customers) {
                const customer = window.customers.find(c => c.id === customerId);
                if (customer) {
                    customerNameInput.value = customer.name;
                    customerPhoneInput.value = customer.phone;
                }
            }
        });
    }

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔵 Slot form submitted');

        if (!currentCalendar) {
            console.log('❌ No currentCalendar found!');
            alert('❌ Takvim yüklenemedi! Lütfen sayfayı yenileyin.');
            return;
        }

        const date = document.getElementById('slotDate').value;
        const time = document.getElementById('slotTime').value;
        const duration = parseInt(document.getElementById('slotDuration').value);
        const customerName = document.getElementById('slotCustomerName').value.trim();
        const customerPhone = document.getElementById('slotCustomerPhone').value.trim();
        const selectedCustomerId = document.getElementById('slotCustomerSelect').value;
        const capacityInput = document.getElementById('slotCapacity');
        const capacity = capacityInput && capacityInput.value ? parseInt(capacityInput.value) : null;

        console.log('📅 Slot data:', { date, time, duration, customerName, selectedCustomerId, capacity });

        const newSlot = {
            calendar_id: currentCalendar.id,
            slot_date: date,
            slot_time: time,
            duration_minutes: duration,
            status: customerName ? 'reserved' : 'available',
            capacity: capacity,
            current_bookings: 0
        };

        if (customerName) {
            newSlot.customer_name = customerName;
            newSlot.customer_phone = customerPhone;
            newSlot.approval_status = 'approved'; // Manuel eklenen randevular direkt onaylı
            newSlot.current_bookings = 1;

            // Save customer_id if a customer was selected from dropdown
            if (selectedCustomerId) {
                newSlot.customer_id = selectedCustomerId;
            }
        }

        try {
            console.log('🔵 Inserting slot into database...', newSlot);
            const { data, error } = await supabase
                .from('appointment_slots')
                .insert([newSlot])
                .select();

            if (error) throw error;

            console.log('✅ Slot created successfully:', data);
            alert(customerName ? '✅ Randevu oluşturuldu!' : '✅ Müsait zaman dilimi eklendi!');
            closeSlotModal();
            await loadCalendarSlots();
        } catch (error) {
            console.error('Error creating slot:', error);
            if (error.code === '23505') {
                alert('❌ Bu tarih ve saatte zaten bir randevu var!');
            } else {
                alert('❌ İşlem sırasında hata oluştu: ' + error.message);
            }
        }
    });
}

// Populate customer dropdown in slot modal
function populateSlotCustomerDropdown() {
    const customerSelect = document.getElementById('slotCustomerSelect');
    if (!customerSelect) return;

    customerSelect.innerHTML = '<option value="">Müşteri Seçin...</option>';

    if (window.customers && window.customers.length > 0) {
        window.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            customerSelect.appendChild(option);
        });
    }
}

// Delete slot
async function deleteSlot(slotId) {
    try {
        const { error } = await supabase
            .from('appointment_slots')
            .delete()
            .eq('id', slotId);

        if (error) throw error;

        alert('✅ Randevu silindi!');
        await loadCalendarSlots();
    } catch (error) {
        console.error('Error deleting slot:', error);
        alert('❌ Randevu silinirken hata oluştu!');
    }
}

// Update share link
function updateShareLink() {
    if (!currentCalendar) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/rezervasyon.html?token=${currentCalendar.share_token}`;

    document.getElementById('shareLink').value = shareUrl;
}

// Copy share link
function copyShareLink() {
    const input = document.getElementById('shareLink');
    input.select();
    document.execCommand('copy');
    alert('✅ Link kopyalandı!');
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const shareUrl = document.getElementById('shareLink').value;
    const message = `Merhaba,\n\nRandevu almak için aşağıdaki linke tıklayarak müsait saatleri görebilir ve randevu oluşturabilirsiniz:\n\n${shareUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Close slot modal
function closeSlotModal() {
    document.getElementById('slotModal').style.display = 'none';
    document.getElementById('slotForm').reset();
}

// Update stats
function updateStats() {
    const total = allSlots.length;
    const available = allSlots.filter(s => s.status === 'available').length;
    const approved = allSlots.filter(s => s.status === 'reserved' && s.approval_status === 'approved').length;
    const pending = allSlots.filter(s => s.status === 'reserved' && s.approval_status === 'pending').length;

    document.getElementById('totalSlots').textContent = total;
    document.getElementById('availableSlots').textContent = available;
    document.getElementById('reservedSlots').textContent = approved;

    const pendingApprovalsEl = document.getElementById('pendingApprovals');
    if (pendingApprovalsEl) {
        pendingApprovalsEl.textContent = pending;
    }

    // Update dashboard card if it exists
    const dashTodayAppointments = document.getElementById('dashTodayAppointments');

    if (dashTodayAppointments) {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = allSlots.filter(s => s.slot_date === today).length;
        dashTodayAppointments.textContent = todayAppointments;
    }
}

// Setup realtime updates
function setupRealtimeSlots() {
    if (!currentCalendar) return;

    supabase
        .channel('slots-changes')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'appointment_slots',
                filter: `calendar_id=eq.${currentCalendar.id}`
            },
            (payload) => {
                console.log('Slot change:', payload);
                loadCalendarSlots();
            }
        )
        .subscribe();
}

// ============================================
// WhatsApp Reminder System
// ============================================

// Get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Load tomorrow's appointments for reminder panel
async function loadTomorrowAppointments() {
    const reminderList = document.getElementById('reminderList');
    const pendingRemindersEl = document.getElementById('pendingReminders');

    if (!reminderList || !currentCalendar) return;

    const tomorrow = getTomorrowDate();

    try {
        const { data: appointments, error } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('calendar_id', currentCalendar.id)
            .eq('slot_date', tomorrow)
            .eq('status', 'reserved')
            .order('slot_time', { ascending: true });

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            reminderList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                    <i class="fa-solid fa-calendar-check" style="font-size: 2rem; opacity: 0.3; display: block; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0;">Yarın için randevu bulunmuyor.</p>
                </div>
            `;
            if (pendingRemindersEl) pendingRemindersEl.textContent = '0';
            return;
        }

        // Count unreminded appointments
        const unreminded = appointments.filter(a => !a.reminder_sent).length;
        if (pendingRemindersEl) pendingRemindersEl.textContent = unreminded;

        // Render reminder cards
        renderReminderList(appointments, tomorrow);

    } catch (error) {
        console.error('Error loading tomorrow appointments:', error);
        reminderList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>Randevular yüklenirken hata oluştu.</p>
            </div>
        `;
    }
}

// Render reminder list
function renderReminderList(appointments, dateStr) {
    const reminderList = document.getElementById('reminderList');

    const tomorrowFormatted = new Date(dateStr).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let html = `<p style="font-size: 0.85rem; color: var(--secondary); margin-bottom: 1rem;">
        <i class="fa-solid fa-calendar"></i> ${tomorrowFormatted} - ${appointments.length} randevu
    </p>`;

    appointments.forEach(apt => {
        const phone = apt.customer_phone || '';
        const cleanPhone = phone.replace(/\D/g, '');
        const isReminded = apt.reminder_sent;

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin-bottom: 8px; background: ${isReminded ? '#f0fdf4' : '#fefce8'}; border-radius: 10px; border-left: 4px solid ${isReminded ? '#22c55e' : '#f59e0b'};">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; background: ${isReminded ? '#dcfce7' : '#fef3c7'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-user" style="color: ${isReminded ? '#22c55e' : '#f59e0b'};"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${Security.sanitize(apt.customer_name)}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">
                            <i class="fa-solid fa-clock"></i> ${apt.slot_time.substring(0, 5)} 
                            ${phone ? `<span style="margin-left: 10px;"><i class="fa-solid fa-phone"></i> ${Security.sanitize(phone)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    ${cleanPhone ? `
                        <button onclick="sendWhatsAppReminder('${apt.id}', '${cleanPhone}', '${Security.sanitize(apt.customer_name).replace(/'/g, "\\'")}', '${apt.slot_time.substring(0, 5)}')" 
                            class="btn" style="background: #25D366; color: white; padding: 8px 12px; font-size: 0.85rem;">
                            <i class="fa-brands fa-whatsapp"></i> Gönder
                        </button>
                    ` : `
                        <span style="color: #9ca3af; font-size: 0.8rem; padding: 8px;">Telefon yok</span>
                    `}
                    ${isReminded ? `
                        <span style="background: #dcfce7; color: #16a34a; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
                            <i class="fa-solid fa-check"></i> Gönderildi
                        </span>
                    ` : `
                        <button onclick="markAsReminded('${apt.id}')" class="btn" style="background: #f1f5f9; color: #64748b; padding: 8px 12px; font-size: 0.85rem;">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    });

    reminderList.innerHTML = html;
}

// Send WhatsApp reminder to a single customer
function sendWhatsAppReminder(slotId, phone, customerName, time) {
    // Get business info from settings if available
    const companyName = window.currentUser?.company_name || 'İşletmemiz';

    const message = `Merhaba ${customerName},

Yarın saat ${time}'de randevunuz bulunmaktadır.

📅 Randevu Hatırlatması
⏰ Saat: ${time}

İptal veya değişiklik için lütfen bizimle iletişime geçin.

İyi günler dileriz.
${companyName}`;

    // Format phone number (ensure it starts with country code)
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
        formattedPhone = '90' + phone.substring(1);
    } else if (!phone.startsWith('90') && !phone.startsWith('+90')) {
        formattedPhone = '90' + phone;
    }
    formattedPhone = formattedPhone.replace(/\+/g, '');

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Auto-mark as reminded after opening WhatsApp
    setTimeout(() => {
        markAsReminded(slotId, true);
    }, 500);
}

// Mark appointment as reminded
async function markAsReminded(slotId, silent = false) {
    try {
        const { error } = await supabase
            .from('appointment_slots')
            .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
            .eq('id', slotId);

        if (error) throw error;

        if (!silent) {
            // Refresh the reminder list
            await loadTomorrowAppointments();
        } else {
            // Just update the UI
            loadTomorrowAppointments();
        }
    } catch (error) {
        console.error('Error marking as reminded:', error);
    }
}

// Send reminders to all unreminded appointments
async function sendAllReminders() {
    const tomorrow = getTomorrowDate();

    try {
        const { data: appointments, error } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('calendar_id', currentCalendar.id)
            .eq('slot_date', tomorrow)
            .eq('status', 'reserved')
            .is('reminder_sent', null)
            .order('slot_time', { ascending: true });

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            alert('✅ Tüm hatırlatmalar zaten gönderildi!');
            return;
        }

        const validAppointments = appointments.filter(a => a.customer_phone);

        if (validAppointments.length === 0) {
            alert('⚠️ Telefon numarası olan randevu bulunamadı!');
            return;
        }

        if (confirm(`${validAppointments.length} kişiye WhatsApp mesajı gönderilecek. Devam etmek istiyor musunuz?\n\nNot: Her müşteri için ayrı WhatsApp penceresi açılacaktır.`)) {
            for (let i = 0; i < validAppointments.length; i++) {
                const apt = validAppointments[i];
                const phone = apt.customer_phone.replace(/\D/g, '');

                // Open WhatsApp with delay to not overwhelm
                setTimeout(() => {
                    sendWhatsAppReminder(apt.id, phone, apt.customer_name, apt.slot_time.substring(0, 5));
                }, i * 1500);
            }
        }

    } catch (error) {
        console.error('Error sending all reminders:', error);
        alert('❌ Hatırlatmalar gönderilirken hata oluştu!');
    }
}

// Initialize when view is shown
const originalSwitchView = window.switchView;
window.switchView = function (viewName) {
    originalSwitchView(viewName);
    if (viewName === 'appointments') {
        setTimeout(() => {
            initializeAppointmentCalendar();
        }, 100);
    }
};

// ============================================
// Randevu Onay/Red Sistemi
// ============================================

// Load pending approvals
async function loadPendingApprovals() {
    const list = document.getElementById('pendingApprovalsList');
    const countEl = document.getElementById('pendingApprovals');

    if (!list || !currentCalendar) return;

    try {
        const { data: pending, error } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('calendar_id', currentCalendar.id)
            .eq('status', 'reserved')
            .eq('approval_status', 'pending')
            .order('slot_date', { ascending: true })
            .order('slot_time', { ascending: true });

        if (error) throw error;

        if (countEl) countEl.textContent = pending?.length || 0;

        renderPendingApprovals(pending || []);
    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

// Render pending approvals list
function renderPendingApprovals(appointments) {
    const list = document.getElementById('pendingApprovalsList');
    if (!list) return;

    if (!appointments || appointments.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                <i class="fa-solid fa-check-circle" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem; color: #22c55e;"></i>
                <p style="margin: 0;">Bekleyen randevu onayı yok. 🎉</p>
            </div>
        `;
        return;
    }

    let html = '';

    appointments.forEach(apt => {
        const dateStr = new Date(apt.slot_date).toLocaleDateString('tr-TR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        const phone = apt.customer_phone || '';

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; margin-bottom: 10px; background: #fffbeb; border-radius: 12px; border: 1px solid #fcd34d;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 48px; height: 48px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-user-clock" style="color: #f59e0b; font-size: 1.2rem;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #1f2937; font-size: 1rem;">${Security.sanitize(apt.customer_name)}</div>
                        <div style="font-size: 0.85rem; color: #6b7280; margin-top: 2px;">
                            <i class="fa-solid fa-calendar"></i> ${dateStr} 
                            <i class="fa-solid fa-clock" style="margin-left: 8px;"></i> ${apt.slot_time.substring(0, 5)}
                            ${phone ? `<span style="margin-left: 8px;"><i class="fa-solid fa-phone"></i> ${Security.sanitize(phone)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="approveAppointment('${apt.id}')" class="btn" 
                        style="background: #22c55e; color: white; padding: 10px 16px; font-size: 0.9rem; border-radius: 8px;">
                        <i class="fa-solid fa-check"></i> Onayla
                    </button>
                    <button onclick="openRejectModal('${apt.id}')" class="btn" 
                        style="background: #ef4444; color: white; padding: 10px 16px; font-size: 0.9rem; border-radius: 8px;">
                        <i class="fa-solid fa-times"></i> Reddet
                    </button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// Approve appointment
async function approveAppointment(slotId) {
    if (!confirm('Bu randevuyu onaylamak istiyor musunuz?')) return;

    try {
        // Get slot data first
        const slot = allSlots.find(s => s.id === slotId);

        const { error } = await supabase
            .from('appointment_slots')
            .update({
                approval_status: 'approved',
                approval_date: new Date().toISOString()
            })
            .eq('id', slotId);

        if (error) throw error;

        alert('✅ Randevu onaylandı!');
        await loadCalendarSlots();

        // WhatsApp notification
        if (slot?.customer_phone) {
            if (confirm('Müşteriye WhatsApp ile bildirim göndermek ister misiniz?')) {
                sendApprovalNotification(slot);
            }
        }
    } catch (error) {
        console.error('Error approving appointment:', error);
        alert('❌ Onaylama sırasında hata oluştu!');
    }
}

// Open reject modal
function openRejectModal(slotId) {
    document.getElementById('rejectSlotId').value = slotId;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectReasonModal').style.display = 'flex';
}

// Close reject modal
function closeRejectModal() {
    document.getElementById('rejectReasonModal').style.display = 'none';
}

// Setup reject form listener
document.addEventListener('DOMContentLoaded', () => {
    const rejectForm = document.getElementById('rejectReasonForm');
    if (rejectForm) {
        rejectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const slotId = document.getElementById('rejectSlotId').value;
            const reason = document.getElementById('rejectReason').value.trim();
            await rejectAppointment(slotId, reason);
        });
    }
});

// Reject appointment
async function rejectAppointment(slotId, reason) {
    try {
        // Get slot data first
        const slot = allSlots.find(s => s.id === slotId);

        const { error } = await supabase
            .from('appointment_slots')
            .update({
                approval_status: 'rejected',
                rejected_reason: reason || null,
                approval_date: new Date().toISOString(),
                status: 'available', // Slot tekrar müsait olsun
                customer_name: null,
                customer_phone: null,
                customer_notes: null,
                customer_id: null,
                current_bookings: 0
            })
            .eq('id', slotId);

        if (error) throw error;

        alert('❌ Randevu reddedildi. Slot tekrar müsait hale geldi.');
        closeRejectModal();
        await loadCalendarSlots();

        // WhatsApp notification
        if (slot?.customer_phone) {
            if (confirm('Müşteriye WhatsApp ile red bildirimi göndermek ister misiniz?')) {
                sendRejectionNotification(slot, reason);
            }
        }
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        alert('❌ Red işlemi sırasında hata oluştu!');
    }
}

// Format phone number for WhatsApp
function formatPhone(phone) {
    if (!phone) return '';
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '90' + formatted.substring(1);
    } else if (!formatted.startsWith('90') && !formatted.startsWith('+90')) {
        formatted = '90' + formatted;
    }
    return formatted.replace(/\+/g, '');
}

// Send approval WhatsApp notification
function sendApprovalNotification(slot) {
    const companyName = window.currentUser?.company_name || 'İşletmemiz';
    const dateStr = new Date(slot.slot_date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const message = `Merhaba ${slot.customer_name},

✅ Randevunuz ONAYLANDI!

📅 Tarih: ${dateStr}
⏰ Saat: ${slot.slot_time.substring(0, 5)}

Görüşmek üzere!
${companyName}`;

    const phone = formatPhone(slot.customer_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Send rejection WhatsApp notification
function sendRejectionNotification(slot, reason) {
    const companyName = window.currentUser?.company_name || 'İşletmemiz';
    const dateStr = new Date(slot.slot_date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let message = `Merhaba ${slot.customer_name},

❌ Maalesef ${dateStr} tarihli saat ${slot.slot_time.substring(0, 5)} randevunuz onaylanamamıştır.`;

    if (reason) {
        message += `

Sebep: ${reason}`;
    }

    message += `

Lütfen başka bir saat seçiniz.
${companyName}`;

    const phone = formatPhone(slot.customer_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}
