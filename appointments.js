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

        // Convert slots to FullCalendar events
        const events = allSlots.map(slot => {
            const datetime = `${slot.slot_date}T${slot.slot_time}`;
            const endTime = new Date(datetime);
            endTime.setMinutes(endTime.getMinutes() + (slot.duration_minutes || 60));

            return {
                id: slot.id,
                title: slot.status === 'reserved' ? `${slot.customer_name}` : 'Müsait',
                start: datetime,
                end: endTime.toISOString(),
                backgroundColor: slot.status === 'reserved' ? '#667eea' : '#10b981',
                borderColor: slot.status === 'reserved' ? '#5568d3' : '#059669',
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

        console.log('📅 Slot data:', { date, time, duration, customerName, selectedCustomerId });

        const newSlot = {
            calendar_id: currentCalendar.id,
            slot_date: date,
            slot_time: time,
            duration_minutes: duration,
            status: customerName ? 'reserved' : 'available'
        };

        if (customerName) {
            newSlot.customer_name = customerName;
            newSlot.customer_phone = customerPhone;

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
    const reserved = allSlots.filter(s => s.status === 'reserved').length;

    document.getElementById('totalSlots').textContent = total;
    document.getElementById('availableSlots').textContent = available;
    document.getElementById('reservedSlots').textContent = reserved;

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
