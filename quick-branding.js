/**
 * Quick Branding Settings - Compact version for proposal modal
 */

window.QuickBranding = {
    isOpen: false,

    toggle() {
        const panel = document.getElementById('quickBrandingPanel');
        if (!panel) return;

        this.isOpen = !this.isOpen;
        panel.style.display = this.isOpen ? 'block' : 'none';

        if (this.isOpen) {
            this.load();
        }
    },

    async load() {
        try {
            const { data, error } = await supabase
                .from('company_branding')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error(error);
                return;
            }

            if (data) {
                document.getElementById('quickCompanyName').value = data.company_name || '';
                document.getElementById('quickPrimaryColor').value = data.primary_color || '#6366f1';

                if (data.logo_url) {
                    document.getElementById('quickLogoPreview').src = data.logo_url;
                    document.getElementById('quickLogoPreview').style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Load error:', error);
        }
    },

    async uploadLogo() {
        const input = document.getElementById('quickLogoUpload');
        const file = input.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Sadece resim dosyaları');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Maks 2MB');
            return;
        }

        try {
            const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            await supabase.from('company_branding').upsert({
                user_id: currentUser.id,
                logo_url: urlData.publicUrl
            });

            document.getElementById('quickLogoPreview').src = urlData.publicUrl;
            document.getElementById('quickLogoPreview').style.display = 'block';

            if (window.showToast) showToast('Başarılı', 'Logo yüklendi!', 'success');
            else alert('Logo yüklendi!');
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    },

    async save() {
        try {
            const branding = {
                user_id: currentUser.id,
                company_name: document.getElementById('quickCompanyName').value,
                primary_color: document.getElementById('quickPrimaryColor').value
            };

            const { error } = await supabase
                .from('company_branding')
                .upsert(branding);

            if (error) throw error;

            if (window.showToast) showToast('Başarılı', 'Kaydedildi!', 'success');
            else alert('Kaydedildi!');

            // Reload PDF branding
            if (window.ProposalPDF) {
                await ProposalPDF.loadBranding();
            }
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    }
};
