/**
 * Branding Management Module
 * Handles company branding settings including logo, colors, and company info
 */

const BrandingManager = {
    branding: null,

    /**
     * Initialize branding manager
     */
    async init() {
        await this.loadBranding();
    },

    /**
     * Load branding settings from database
     */
    async loadBranding() {
        try {
            const { data, error } = await supabase
                .from('company_branding')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading branding:', error);
                return;
            }

            this.branding = data;
            this.populateForm();

        } catch (error) {
            console.error('Branding load error:', error);
        }
    },

    /**
     * Populate form with existing branding data
     */
    populateForm() {
        if (!this.branding) return;

        const fields = {
            'companyName': this.branding.company_name,
            'companyAddress': this.branding.address,
            'companyPhone': this.branding.phone,
            'companyEmail': this.branding.email,
            'companyWebsite': this.branding.website,
            'taxNumber': this.branding.tax_number,
            'primaryColor': this.branding.primary_color,
            'secondaryColor': this.branding.secondary_color
        };

        Object.keys(fields).forEach(id => {
            const element = document.getElementById(id);
            if (element && fields[id]) {
                element.value = fields[id];
            }
        });

        // Display current logo if exists
        if (this.branding.logo_url) {
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = this.branding.logo_url;
                logoPreview.style.display = 'block';
            }
        }
    },

    /**
     * Upload company logo
     */
    async uploadLogo() {
        const fileInput = document.getElementById('logoUpload');
        const file = fileInput.files[0];

        if (!file) {
            alert('Lütfen bir dosya seçin.');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Sadece resim dosyaları yüklenebilir.');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            alert('Dosya boyutu 2MB\'dan küçük olmalıdır.');
            return;
        }

        try {
            // Delete old logo if exists
            if (this.branding?.logo_url) {
                await this.deleteLogo(false);
            }

            // Upload new logo
            const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            // Update branding with logo URL
            await this.saveBranding({ logo_url: urlData.publicUrl });

            // Show preview
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = urlData.publicUrl;
                logoPreview.style.display = 'block';
            }

            if (window.showToast) window.showToast('Başarılı', 'Logo yüklendi!', 'success');
            else alert('Logo başarıyla yüklendi!');

            // Reload branding
            await this.loadBranding();

        } catch (error) {
            console.error('Logo upload error:', error);
            alert('Logo yüklenirken hata oluştu: ' + error.message);
        }
    },

    /**
     * Delete logo
     */
    async deleteLogo(reload = true) {
        if (!this.branding?.logo_url) return;

        try {
            // Extract file path from URL
            const url = new URL(this.branding.logo_url);
            const pathParts = url.pathname.split('/logos/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];

                const { error } = await supabase.storage
                    .from('logos')
                    .remove([filePath]);

                if (error) console.error('Storage delete error:', error);
            }

            // Update branding
            await this.saveBranding({ logo_url: null });

            // Hide preview
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.style.display = 'none';
                logoPreview.src = '';
            }

            if (reload) {
                if (window.showToast) window.showToast('Başarılı', 'Logo silindi!', 'info');
                else alert('Logo silindi!');
                await this.loadBranding();
            }

        } catch (error) {
            console.error('Logo delete error:', error);
            alert('Logo silinirken hata oluştu.');
        }
    },

    /**
     * Save branding settings
     */
    async saveBranding(additionalData = {}) {
        try {
            const formData = {
                user_id: currentUser.id,
                company_name: document.getElementById('companyName')?.value || null,
                address: document.getElementById('companyAddress')?.value || null,
                phone: document.getElementById('companyPhone')?.value || null,
                email: document.getElementById('companyEmail')?.value || null,
                website: document.getElementById('companyWebsite')?.value || null,
                tax_number: document.getElementById('taxNumber')?.value || null,
                primary_color: document.getElementById('primaryColor')?.value || '#6366f1',
                secondary_color: document.getElementById('secondaryColor')?.value || '#8b5cf6',
                ...additionalData
            };

            const { error } = await supabase
                .from('company_branding')
                .upsert(formData);

            if (error) throw error;

            if (!additionalData.logo_url) {
                if (window.showToast) window.showToast('Başarılı', 'Ayarlar kaydedildi!', 'success');
                else alert('Ayarlar başarıyla kaydedildi!');
            }

            // Reload branding to sync
            await this.loadBranding();

            // Update PDF generator branding
            if (window.ProposalPDF) {
                await ProposalPDF.loadBranding();
            }

        } catch (error) {
            console.error('Save branding error:', error);
            alert('Kaydetme hatası: ' + error.message);
        }
    }
};

// Export for global access
window.BrandingManager = BrandingManager;

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase !== 'undefined' && window.currentUser) {
        BrandingManager.init();
    }
});
