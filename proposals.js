const Proposals = {
    init: async () => {
        // Load proposals initially
        await Proposals.loadProposals();

        // Event Listeners for the form
        const form = document.getElementById('proposalForm');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await Proposals.saveProposal();
            };
        }
    },

    loadProposals: async () => {
        const listContainer = document.getElementById('proposalListBody');
        if (!listContainer) return;

        listContainer.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('proposals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Store proposals globally for export
            window.proposals = data || [];

            Proposals.renderList(data);
            Proposals.updateStats(data);

        } catch (error) {
            console.error('Error loading proposals:', error);
            listContainer.innerHTML = '<tr><td colspan="6" class="text-center text-red-500">Yüklenirken hata oluştu.</td></tr>';
        }
    },

    renderList: (proposals) => {
        const listContainer = document.getElementById('proposalListBody');
        if (!listContainer) return;

        if (proposals.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500" style="padding: 2rem;">Henüz teklif oluşturulmamış.</td></tr>';
            return;
        }

        listContainer.innerHTML = proposals.map(p => {
            const total = parseFloat(p.amount) || 0;
            return `
            <tr style="transition: all 0.2s ease; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${Security.sanitize(p.customer_name)}</div>
                    <div style="font-size: 0.875rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-brands fa-whatsapp" style="color: #25D366;"></i>
                        ${Security.sanitize(p.customer_phone || '-')}
                    </div>
                </td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 500; color: #334155;">${Security.sanitize(p.title)}</div>
                    ${p.valid_until ? `<div style="font-size: 0.75rem; color: #ef4444;">Son: ${new Date(p.valid_until).toLocaleDateString('tr-TR')}</div>` : ''}
                </td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 700; font-size: 1.1rem; color: #0ea5e9;">
                        ₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                </td>
                <td style="padding: 1rem;">
                    ${Proposals.getStatusBadge(p.status)}
                </td>
                <td style="padding: 1rem;">
                    <div style="font-size: 0.875rem; color: #64748b;">
                        <i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>
                        ${new Date(p.created_at).toLocaleDateString('tr-TR')}
                    </div>
                </td>
                <td style="padding: 1rem;">
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <!-- Primary Actions -->
                        <button onclick="ProposalPDF.previewPDF('${p.id}')" 
                            style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);" 
                            title="PDF Önizle">
                            <i class="fa-solid fa-file-pdf"></i> PDF
                        </button>
                        <button onclick="Proposals.shareWhatsApp('${p.id}', '${p.customer_phone}')" 
                            style="background: #25D366; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem;" 
                            title="WhatsApp Gönder">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        
                        <!-- More Actions Dropdown -->
                        <div style="position: relative; display: inline-block;">
                            <button onclick="toggleProposalMenu('${p.id}')" 
                                style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;" 
                                title="Daha Fazla">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div id="menu-${p.id}" style="display: none; position: absolute; right: 0; top: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 180px; z-index: 1000;">
                                <button onclick="ProposalPDF.downloadPDF('${p.id}'); toggleProposalMenu('${p.id}')" 
                                    style="width: 100%; text-align: left; background: none; border: none; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #334155; font-size: 0.9rem;"
                                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
                                    <i class="fa-solid fa-download" style="width: 20px;"></i> PDF İndir
                                </button>
                                <button onclick="Proposals.quickApprove('${p.id}'); toggleProposalMenu('${p.id}')" 
                                    style="width: 100%; text-align: left; background: none; border: none; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #334155; font-size: 0.9rem;"
                                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
                                    <i class="fa-solid fa-check" style="width: 20px; color: #10b981;"></i> Onayla
                                </button>
                                <button onclick="Proposals.copyLink('${p.id}'); toggleProposalMenu('${p.id}')" 
                                    style="width: 100%; text-align: left; background: none; border: none; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #334155; font-size: 0.9rem;"
                                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
                                    <i class="fa-solid fa-link" style="width: 20px;"></i> Link Kopyala
                                </button>
                                <div style="border-top: 1px solid #e2e8f0; margin: 4px 0;"></div>
                                <button onclick="Proposals.deleteProposal('${p.id}')" 
                                    style="width: 100%; text-align: left; background: none; border: none; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #ef4444; font-size: 0.9rem;"
                                    onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                                    <i class="fa-solid fa-trash" style="width: 20px;"></i> Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `}).join('');
    },

    getStatusBadge: (status) => {
        const badges = {
            'pending': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Bekliyor</span>',
            'approved': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;">Onaylandı</span>',
            'rejected': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;">Reddedildi</span>'
        };
        return badges[status] || badges['pending'];
    },

    updateStats: (proposals) => {
        document.getElementById('totalProposals').textContent = proposals.length;
        document.getElementById('approvedProposals').textContent = proposals.filter(p => p.status === 'approved').length;
        document.getElementById('pendingProposals').textContent = proposals.filter(p => p.status === 'pending').length;

        // Dashboard sync
        const dashPendingValue = document.getElementById('dashPendingValue');
        const dashPendingCount = document.getElementById('dashPendingCount');
        if (dashPendingValue && dashPendingCount) {
            const pending = proposals.filter(p => p.status === 'pending');
            const totalPendingValue = pending.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            dashPendingValue.textContent = `₺${totalPendingValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;
            dashPendingCount.textContent = `${pending.length} Adet Bekleyen Teklif`;
        }
    },

    // --- Müşteri Yönetimi ---
    populateCustomerSelect: () => {
        const select = document.getElementById('propCustomerId');
        if (!select || !window.customers) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="">Müşteri Seçin...</option>';
        window.customers.forEach(cust => {
            const option = document.createElement('option');
            option.value = cust.id;
            option.textContent = cust.name;
            select.appendChild(option);
        });
        select.value = currentVal;
    },

    handleCustomerSelect: (customerId) => {
        const customer = window.customers.find(c => c.id == customerId);
        if (customer) {
            document.getElementById('propCustomerName').value = customer.name;
            document.getElementById('propCustomerPhone').value = customer.phone || '';
        }
    },

    // --- Kalem Yönetimi ---
    addItem: () => {
        const container = document.getElementById('proposalItemsContainer');
        const id = Date.now();
        const row = document.createElement('div');
        row.className = 'item-row';
        row.id = `item-${id}`;
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '8px';
        row.style.padding = '12px';
        row.style.background = '#f8fafc';
        row.style.borderRadius = '10px';
        row.style.border = '1px solid #e2e8f0';
        row.style.marginBottom = '12px';

        row.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" placeholder="Ürün / Hizmet Açıklaması" class="item-desc" required
                    style="flex: 3; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-size: 0.9rem;">
                <input type="number" placeholder="Adet" class="item-qty" value="1" min="1" required oninput="Proposals.calculateTotal()"
                    style="width: 70px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-size: 0.9rem;">
                <input type="number" placeholder="Birim Fiyat" class="item-price" required step="0.01" oninput="Proposals.calculateTotal()"
                    style="flex: 1; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-size: 0.9rem;">
                <button type="button" onclick="Proposals.removeItem('${id}')" 
                    style="background: #fee2e2; color: #ef4444; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
            <div style="display: flex; gap: 15px; align-items: center; padding-left: 5px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.85rem; color: #64748b; font-weight: 500;">İndirim:</label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input type="number" placeholder="0" class="item-discount" step="1" min="0" max="100" oninput="Proposals.calculateTotal()"
                            style="width: 70px; border: 1px solid #cbd5e1; padding: 8px 25px 8px 10px; border-radius: 6px; font-size: 0.9rem; color: #ef4444; font-weight: 700;">
                        <span style="position: absolute; right: 10px; color: #ef4444; font-weight: 700;">%</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Vergi (KDV):</label>
                    <select class="item-vat premium-select" onchange="Proposals.calculateTotal()" 
                        style="width: 110px; padding: 8px; border-radius: 6px; font-size: 0.9rem; border: 1px solid #cbd5e1;">
                        <option value="20">%20 KDV</option>
                        <option value="10">%10 KDV</option>
                        <option value="1">%1 KDV</option>
                        <option value="0">Muaf</option>
                    </select>
                </div>
                <small style="color: #94a3b8; font-style: italic;">(Birim fiyat üzerinden hesaplanır)</small>
            </div>
        `;
        container.appendChild(row);
        Proposals.calculateTotal();
    },

    removeItem: (id) => {
        const row = document.getElementById(`item-${id}`);
        if (row) row.remove();
        Proposals.calculateTotal();
    },

    calculateTotal: () => {
        const rows = document.querySelectorAll('.item-row');
        let subtotal = 0;
        let totalVat = 0;
        let totalDiscount = 0;

        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const vatRate = parseFloat(row.querySelector('.item-vat').value) || 0;
            const discountRate = parseFloat(row.querySelector('.item-discount').value) || 0;

            const rowSubtotal = price * qty;
            const rowDiscount = rowSubtotal * (discountRate / 100);
            const discountedPrice = rowSubtotal - rowDiscount;
            const rowVat = discountedPrice * (vatRate / 100);

            subtotal += rowSubtotal;
            totalDiscount += rowDiscount;
            totalVat += rowVat;
        });

        const generalTotal = subtotal - totalDiscount + totalVat;

        document.getElementById('propSubtotal').textContent = `₺${subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        document.getElementById('propTotalDiscount').textContent = `₺${totalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        document.getElementById('propTotalVat').textContent = `₺${totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        document.getElementById('propTotalAmount').textContent = `₺${generalTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        return generalTotal;
    },

    saveProposal: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Oturum kapalı.');

            const customerId = document.getElementById('propCustomerId').value;
            const customerName = document.getElementById('propCustomerName').value;
            const customerPhone = document.getElementById('propCustomerPhone').value;
            const title = document.getElementById('propTitle').value;
            const validUntil = document.getElementById('propValidUntil').value;
            const details = document.getElementById('propDetails').value;

            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                items.push({
                    description: row.querySelector('.item-desc').value,
                    qty: parseFloat(row.querySelector('.item-qty').value) || 1,
                    price: parseFloat(row.querySelector('.item-price').value) || 0,
                    vat: parseFloat(row.querySelector('.item-vat').value) || 0,
                    discount: parseFloat(row.querySelector('.item-discount').value) || 0
                });
            });

            if (items.length === 0) {
                alert('Lütfen en az bir ürün ekleyin.');
                return;
            }

            const totalAmount = Proposals.calculateTotal();

            const { error } = await supabase.from('proposals').insert([{
                user_id: user.id,
                customer_id: customerId || null,
                customer_name: customerName,
                customer_phone: customerPhone,
                title: title,
                valid_until: validUntil,
                details: details,
                amount: totalAmount,
                items: items,
                status: 'pending'
            }]);

            if (error) throw error;

            alert('Teklif başarıyla kaydedildi!');
            closeProposalModal();
            Proposals.loadProposals();

        } catch (error) {
            console.error('Save error:', error);
            alert('Hata: ' + error.message);
        }
    },

    quickApprove: async (id) => {
        try {
            const { error } = await supabase.from('proposals').update({ status: 'approved' }).eq('id', id);
            if (error) throw error;
            Proposals.loadProposals();
        } catch (e) {
            alert('Güncelleme hatası!');
        }
    },

    shareWhatsApp: (id, phone) => {
        if (!phone) {
            alert('Müşteri telefon numarası tanımlı değil!');
            return;
        }
        const link = Proposals.getLink(id);
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '90' + cleanPhone;
        const msg = encodeURIComponent(`Merhaba, sizin için hazırladığımız güncel teklifi buradan inceleyebilirsiniz: ${link}`);
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    },

    copyLink: (id) => {
        const link = Proposals.getLink(id);
        navigator.clipboard.writeText(link).then(() => alert('Link kopyalandı!'));
    },

    getLink: (id) => `${window.location.origin}/teklif.html?id=${id}`,

    deleteProposal: async (id) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        const { error } = await supabase.from('proposals').delete().eq('id', id);
        if (!error) Proposals.loadProposals();
    }
};

// Toggle proposal dropdown menu
window.toggleProposalMenu = function (id) {
    const menu = document.getElementById(`menu-${id}`);
    const isVisible = menu.style.display === 'block';

    // Close all menus first
    document.querySelectorAll('[id^="menu-"]').forEach(m => m.style.display = 'none');

    // Toggle current menu
    if (!isVisible) {
        menu.style.display = 'block';
    }
};

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="menu-"]') && !e.target.closest('button[onclick^="toggleProposalMenu"]')) {
        document.querySelectorAll('[id^="menu-"]').forEach(m => m.style.display = 'none');
    }
});

window.openProposalModal = function () {
    const modal = document.getElementById('proposalModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('proposalForm').reset();
    document.getElementById('proposalItemsContainer').innerHTML = '';

    // Set default validity date (7 days from now)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('propValidUntil').value = nextWeek.toISOString().split('T')[0];

    Proposals.populateCustomerSelect();
    Proposals.addItem();
};

window.closeProposalModal = function () {
    document.getElementById('proposalModal').style.display = 'none';
};
