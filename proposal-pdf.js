/**
 * ProposalPDF - PDF Generation for Proposals
 * Dependencies: jsPDF, jsPDF-AutoTable (already included in dashboard.html)
 */

const ProposalPDF = {
    branding: null,

    /**
     * Initialize and load branding
     */
    async init() {
        await this.loadBranding();
    },

    /**
     * Load company branding settings
     */
    async loadBranding() {
        try {
            const { data, error } = await supabase
                .from('company_branding')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading branding:', error);
                return;
            }

            this.branding = data || {
                company_name: window.currentUser.username || 'Firma Adı',
                primary_color: '#6366f1',
                secondary_color: '#8b5cf6'
            };
        } catch (error) {
            console.error('Branding load error:', error);
        }
    },

    /**
     * Generate professional HTML proposal
     */
    async generatePDF(proposalId, preview = false) {
        try {
            // Fetch proposal data
            const { data: proposal, error } = await supabase
                .from('proposals')
                .select('*')
                .eq('id', proposalId)
                .single();

            if (error) throw error;

            // Parse items
            let items = [];
            if (Array.isArray(proposal.items)) {
                items = proposal.items;
            } else if (typeof proposal.items === 'string') {
                try {
                    items = JSON.parse(proposal.items);
                } catch (e) {
                    console.error('Failed to parse items:', e);
                }
            }

            const createdDate = proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
            const validDate = proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString('tr-TR') : '';
            const proposalNumber = proposal.proposal_number || `TKL-${proposalId.substring(0, 6).toUpperCase()}`;

            // Calculate totals
            const subtotal = items.reduce((sum, item) => {
                const qty = item.qty || item.quantity || 1;
                const price = parseFloat(item.price || item.unit_price || 0);
                return sum + (qty * price);
            }, 0);

            const tax = subtotal * 0.18; // 18% KDV
            const totalAmount = subtotal + tax;

            // Build items HTML with row numbers
            const itemsHTML = items.map((item, index) => {
                const desc = item.description || item.item_name || item.name || '';
                const qty = item.qty || item.quantity || 1;
                const price = parseFloat(item.price || item.unit_price || 0);
                const total = qty * price;
                return `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; text-align: center; font-weight: 600; color: #6b7280; width: 50px;">${index + 1}.</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; color: #374151;">${desc}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; text-align: center; color: #374151;">${qty}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; text-align: right; color: #374151;">${this.formatPrice(price)}</td>
                    </tr>
                `;
            }).join('');

            // Create clean minimalist HTML
            const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teklif ${proposalNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: white;
            padding: 3rem;
            color: #1f2937;
            font-size: 14px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .dates {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e5e7eb;
        }
        .date-item {
            display: flex;
            flex-direction: column;
        }
        .date-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 0.25rem;
        }
        .date-value {
            font-weight: 600;
            color: #111827;
        }
        .customer-section {
            margin-bottom: 2rem;
        }
        .customer-section h3 {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 1rem;
        }
        .customer-details {
            line-height: 1.8;
            color: #374151;
        }
        .customer-details div {
            margin-bottom: 0.25rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
        }
        thead {
            background: #a7f3d0;
        }
        th {
            padding: 14px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #065f46;
            border: 1px solid #6ee7b7;
        }
        th:first-child { width: 50px; text-align: center; }
        th:nth-child(3) { text-align: center; width: 100px; }
        th:nth-child(4) { text-align: right; width: 130px; }
        td {
            font-size: 14px;
        }
        .totals {
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            width: 350px;
            padding: 0.75rem 1rem;
            font-size: 14px;
        }
        .total-row.subtotal {
            border-top: 1px solid #e5e7eb;
        }
        .total-row.tax {
            color: #6b7280;
        }
        .total-row.final {
            background: #4b5563;
            color: white;
            font-weight: 700;
            font-size: 16px;
            margin-top: 0.5rem;
        }
        .prepared-by {
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 2px solid #e5e7eb;
        }
        .prepared-by h3 {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .prepared-by-name {
            color: #374151;
        }
        .print-btn {
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: #10b981;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            font-size: 14px;
        }
        .print-btn:hover { 
            background: #059669;
            transform: translateY(-1px);
        }
        @media print {
            body { padding: 1rem; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Yazdır / PDF İndir</button>
    
    <div class="container">
        <div class="dates">
            <div class="date-item">
                <div class="date-label">Başlangıç Tarihi</div>
                <div class="date-value">${createdDate}</div>
            </div>
            <div class="date-item" style="text-align: right;">
                <div class="date-label">Bitiş Tarihi</div>
                <div class="date-value">${validDate || createdDate}</div>
            </div>
        </div>

        <div class="customer-section">
            <h3>Müşteri Bilgisi</h3>
            <div class="customer-details">
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 0.5rem;">${proposal.customer_name || 'Müşteri Adı'}</div>
                ${proposal.title ? `<div>${proposal.title}</div>` : ''}
                ${proposal.customer_phone ? `<div>${proposal.customer_phone}</div>` : ''}
                ${proposal.customer_email ? `<div>${proposal.customer_email}</div>` : ''}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="text-align: center;"></th>
                    <th>Ürün Bilgisi</th>
                    <th style="text-align: center;">Miktar</th>
                    <th style="text-align: right;">Birim Fiyatı</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row subtotal">
                <span>Ara Toplam</span>
                <span style="font-weight: 600;">${this.formatPrice(subtotal)}</span>
            </div>
            <div class="total-row tax">
                <span>Vergi (%18)</span>
                <span>${this.formatPrice(tax)}</span>
            </div>
            <div class="total-row final">
                <span>Toplam</span>
                <span>${this.formatPrice(totalAmount)}</span>
            </div>
        </div>

        ${proposal.details || proposal.notes ? `
            <div style="margin-top: 3rem; padding: 1.5rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">Notlar ve Açıklamalar</div>
                <div style="color: #78350f; font-size: 13px;">${proposal.details || proposal.notes}</div>
            </div>
        ` : ''}

        <div class="prepared-by">
            <h3>Teklifi Hazırlayan</h3>
            <div class="prepared-by-name">${this.branding?.company_name || window.currentUser?.username || 'Hazırlayan Kişi'}</div>
            ${this.branding?.phone ? `<div style="color: #6b7280; font-size: 13px; margin-top: 0.25rem;">📞 ${this.branding.phone}</div>` : ''}
            ${this.branding?.email ? `<div style="color: #6b7280; font-size: 13px;">✉️ ${this.branding.email}</div>` : ''}
        </div>
    </div>
</body>
</html>`;

            // Open in new window
            const newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();

        } catch (error) {
            console.error('Proposal generation error:', error);
            alert('Teklif oluşturulurken bir hata oluştu: ' + error.message);
        }
    },

    // Helper to adjust color brightness
    adjustColorBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    },

    /**
     * Preview PDF in modal
     */
    async previewPDF(proposalId) {
        await this.generatePDF(proposalId, true);
    },

    /**
     * Download PDF
     */
    async downloadPDF(proposalId) {
        await this.generatePDF(proposalId, false);
    },

    /**
     * Share via WhatsApp
     */
    async shareViaWhatsApp(proposalId) {
        try {
            const { data: proposal } = await supabase
                .from('proposals')
                .select('*, customer_phone')
                .eq('id', proposalId)
                .single();

            if (!proposal || !proposal.customer_phone) {
                alert('Müşteri telefon numarası bulunamadı.');
                return;
            }

            const cleanPhone = proposal.customer_phone.replace(/\D/g, '');
            const proposalLink = `${window.location.origin}/proposal-view.html?id=${proposalId}`;
            const companyName = this.branding?.company_name || 'Firmamız';

            const message = `Merhaba,\n\n${companyName} tarafından hazırlanan teklifinizi aşağıdaki linkten görüntüleyebilirsiniz:\n\n${proposalLink}\n\nSaygılarımızla,\n${companyName}`;

            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

        } catch (error) {
            console.error('WhatsApp share error:', error);
            alert('WhatsApp paylaşımı sırasında bir hata oluştu.');
        }
    },

    /**
     * Helper: Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 99, g: 102, b: 241 }; // Default primary color
    },

    /**
     * Helper: Format price
     */
    formatPrice(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase !== 'undefined' && window.currentUser) {
        ProposalPDF.init();
    }
});
