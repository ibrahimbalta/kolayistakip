const Proposals = {
    init: async () => {
        // Load proposals
        await Proposals.loadProposals();

        // Event Listeners
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
            listContainer.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500">Henüz teklif oluşturulmamış.</td></tr>';
            return;
        }

        listContainer.innerHTML = proposals.map(p => `
            <tr style="transition: all 0.2s ease; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${Security.sanitize(p.customer_name)}</div>
                    <div style="font-size: 0.875rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-brands fa-whatsapp" style="color: #25D366;"></i>
                        ${Security.sanitize(p.customer_phone)}
                    </div>
                </td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 500; color: #334155;">${Security.sanitize(p.title)}</div>
                </td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 700; font-size: 1.1rem; color: #0ea5e9;">
                        ₺${parseFloat(p.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
                    <div style="display: flex; gap: 8px;">
                        <button onclick="Proposals.shareWhatsApp('${p.id}', '${p.customer_phone}')" 
                            style="background: #dcfce7; color: #16a34a; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                            title="WhatsApp ile Paylaş"
                            onmouseover="this.style.background='#bbf7d0'" 
                            onmouseout="this.style.background='#dcfce7'">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button onclick="Proposals.copyLink('${p.id}')" 
                            style="background: #dbeafe; color: #2563eb; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                            title="Linki Kopyala"
                            onmouseover="this.style.background='#bfdbfe'" 
                            onmouseout="this.style.background='#dbeafe'">
                            <i class="fa-solid fa-link"></i>
                        </button>
                        <button onclick="Proposals.deleteProposal('${p.id}')" 
                            style="background: #fee2e2; color: #dc2626; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                            title="Sil"
                            onmouseover="this.style.background='#fecaca'" 
                            onmouseout="this.style.background='#fee2e2'">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add hover effect to rows
        const rows = listContainer.querySelectorAll('tr');
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = '#f8fafc';
                row.style.transform = 'scale(1.01)';
                row.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            });
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = 'transparent';
                row.style.transform = 'scale(1)';
                row.style.boxShadow = 'none';
            });
        });
    },

    getStatusBadge: (status) => {
        const badges = {
            'pending': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem; font-weight: 600; background: #fef3c7; color: #92400e;"><i class="fa-regular fa-clock"></i>Bekliyor</span>',
            'approved': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem; font-weight: 600; background: #d1fae5; color: #065f46;"><i class="fa-solid fa-check-circle"></i>Onaylandı</span>',
            'rejected': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem; font-weight: 600; background: #fee2e2; color: #991b1b;"><i class="fa-solid fa-times-circle"></i>Reddedildi</span>',
            'negotiating': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem; font-weight: 600; background: #fed7aa; color: #9a3412;"><i class="fa-solid fa-handshake"></i>Pazarlık</span>',
            'waiting': '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem; font-weight: 600; background: #e0e7ff; color: #3730a3;"><i class="fa-regular fa-hourglass"></i>Beklemede</span>'
        };
        return badges[status] || badges['pending'];
    },

    getStatusLabel: (status) => {
        const labels = {
            'pending': 'Bekliyor',
            'approved': 'Onaylandı',
            'rejected': 'Reddedildi',
            'negotiating': 'Teklif Yüksek',
            'waiting': 'Daha Uygun Bekliyor'
        };
        return labels[status] || status;
    },

    updateStats: (proposals) => {
        // Update proposal module stats
        document.getElementById('totalProposals').textContent = proposals.length;
        document.getElementById('approvedProposals').textContent = proposals.filter(p => p.status === 'approved').length;
        document.getElementById('pendingProposals').textContent = proposals.filter(p => p.status === 'pending').length;

        // Update dashboard cards if they exist
        const dashPendingValue = document.getElementById('dashPendingValue');
        const dashPendingCount = document.getElementById('dashPendingCount');

        if (dashPendingValue && dashPendingCount) {
            const pendingProposals = proposals.filter(p => p.status === 'pending');
            const pendingValue = pendingProposals.reduce((sum, p) => sum + (p.amount || 0), 0);
            const currency = pendingProposals.length > 0 ? (pendingProposals[0].currency || 'TRY') : 'TRY';
            const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';

            dashPendingValue.textContent = `${currencySymbol}${pendingValue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;
            dashPendingCount.textContent = `${pendingProposals.length} Adet Bekleyen Teklif`;
        }
    },

    // --- Item Management ---
    addItem: () => {
        const container = document.getElementById('proposalItemsContainer');
        const id = Date.now(); // Unique ID for the row
        const row = document.createElement('div');
        row.className = 'item-row';
        row.id = `item-${id}`;
        row.style.display = 'flex';
        row.style.gap = '10px';
        row.style.alignItems = 'center';

        row.innerHTML = `
            <input type="text" placeholder="Ürün/Hizmet Açıklaması" class="item-desc" required
                style="flex: 2; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px;">
            <input type="number" placeholder="Fiyat" class="item-price" required step="0.01" oninput="Proposals.calculateTotal()"
                style="flex: 1; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px;">
            <button type="button" onclick="Proposals.removeItem('${id}')" class="btn"
                style="background: #ef4444; color: white; padding: 8px 12px;">
                <i class="fa-solid fa-trash"></i> Kaldır
            </button>
        `;
        container.appendChild(row);
    },

    removeItem: (id) => {
        const row = document.getElementById(`item-${id}`);
        if (row) row.remove();
        Proposals.calculateTotal();
    },

    calculateTotal: () => {
        const prices = document.querySelectorAll('.item-price');
        let total = 0;
        prices.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('propTotalAmount').textContent = `₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        return total;
    },

    saveProposal: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');

            const customerName = document.getElementById('propCustomerName').value;
            const customerPhone = document.getElementById('propCustomerPhone').value;
            const title = document.getElementById('propTitle').value;
            const details = document.getElementById('propDetails').value;

            // Collect items
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                items.push({
                    description: row.querySelector('.item-desc').value,
                    price: parseFloat(row.querySelector('.item-price').value) || 0
                });
            });

            const totalAmount = Proposals.calculateTotal();

            if (items.length === 0) {
                alert('Lütfen en az bir kalem ekleyin.');
                return;
            }

            const formData = {
                user_id: user.id,
                customer_name: customerName,
                customer_phone: customerPhone,
                title: title,
                details: details,
                amount: totalAmount,
                items: items, // Save items array
                status: 'pending'
            };

            const { error } = await supabase.from('proposals').insert([formData]);

            if (error) throw error;

            alert('Teklif başarıyla oluşturuldu!');
            closeProposalModal();
            Proposals.loadProposals();

        } catch (error) {
            console.error('Error saving proposal:', error);
            alert('Hata: ' + error.message);
        }
    },

    shareWhatsApp: (id, phone) => {
        const link = Proposals.getLink(id);
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '90' + cleanPhone;

        const message = `Merhaba, size özel hazırladığımız teklifi incelemek için tıklayın: ${link}`;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    },

    copyLink: (id) => {
        const link = Proposals.getLink(id);
        navigator.clipboard.writeText(link).then(() => {
            alert('Teklif linki kopyalandı!');
        });
    },

    getLink: (id) => {
        return `${window.location.origin}/teklif.html?id=${id}`;
    },

    deleteProposal: async (id) => {
        if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase.from('proposals').delete().eq('id', id);
            if (error) throw error;
            Proposals.loadProposals();
        } catch (error) {
            console.error('Error deleting proposal:', error);
            alert('Silinirken hata oluştu.');
        }
    }
};

// Override openProposalModal to add initial item
window.openProposalModal = function () {
    document.getElementById('proposalModal').style.display = 'flex';
    document.getElementById('proposalItemsContainer').innerHTML = ''; // Clear existing
    Proposals.addItem(); // Add first empty row
    Proposals.calculateTotal(); // Reset total
}

window.closeProposalModal = function () {
    document.getElementById('proposalModal').style.display = 'none';
    document.getElementById('proposalForm').reset();
}
