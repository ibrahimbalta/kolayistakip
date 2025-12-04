// Website Manager - Handles all website management functionality
const WebsiteManager = {
    currentUser: null,
    currentSettings: null,

    async init() {
        this.currentUser = await Auth.checkAuth();
        if (!this.currentUser) return;

        // Setup tab switching
        this.setupTabs();

        // Load initial data
        await this.loadWebsiteStats();
        await this.loadWebsiteSettings();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.website-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active to clicked tab
                e.currentTarget.classList.add('active');

                // Hide all tab contents
                document.querySelectorAll('.website-tab-content').forEach(content => {
                    content.style.display = 'none';
                });

                // Show selected tab content
                const tabName = e.currentTarget.dataset.tab;
                const content = document.getElementById(`website-tab-${tabName}`);
                if (content) {
                    content.style.display = 'block';

                    // Load data for the selected tab
                    this.loadTabData(tabName);
                }
            });
        });

        // Setup form submissions
        this.setupFormListener('websiteSettingsForm', (e) => this.saveWebsiteSettings());
        this.setupFormListener('productForm', (e) => this.saveProduct());
        this.setupFormListener('serviceForm', (e) => this.saveService());
        this.setupFormListener('teamForm', (e) => this.saveTeamMember());
        this.setupFormListener('galleryForm', (e) => this.saveGalleryImage());
        this.setupFormListener('pageForm', (e) => this.savePage());

        // Setup modal triggers
        const setupModalTrigger = (id, handler) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', handler);
        };

        setupModalTrigger('btn-add-product', () => this.openProductModal());
        setupModalTrigger('btn-add-service', () => this.openServiceModal());
        setupModalTrigger('btn-add-team', () => this.openTeamModal());
        setupModalTrigger('btn-add-gallery', () => this.openGalleryModal());
        setupModalTrigger('btn-add-page', () => this.openPageModal());

        // Logo file input preview
        const logoFileInput = document.getElementById('websiteLogoFile');
        if (logoFileInput) {
            logoFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const preview = document.getElementById('websiteLogoPreview');
                        const placeholder = document.getElementById('websiteLogoPlaceholder');
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    },

    setupFormListener(formId, handler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handler();
            });
        }
    },

    async loadTabData(tabName) {
        switch (tabName) {
            case 'products': await this.loadProducts(); break;
            case 'services': await this.loadServices(); break;
            case 'team': await this.loadTeam(); break;
            case 'gallery': await this.loadGallery(); break;
            case 'pages': await this.loadPages(); break;
        }
    },

    async loadWebsiteStats() {
        try {
            const [productsRes, servicesRes, teamRes, settingsRes] = await Promise.all([
                supabase.from('website_products').select('*', { count: 'exact' }).eq('user_id', this.currentUser.id),
                supabase.from('website_services').select('*', { count: 'exact' }).eq('user_id', this.currentUser.id),
                supabase.from('website_team').select('*', { count: 'exact' }).eq('user_id', this.currentUser.id),
                supabase.from('website_settings').select('*').eq('user_id', this.currentUser.id).single()
            ]);

            document.getElementById('websiteProductCount').textContent = productsRes.count || 0;
            document.getElementById('websiteServiceCount').textContent = servicesRes.count || 0;
            document.getElementById('websiteTeamCount').textContent = teamRes.count || 0;

            const statusEl = document.getElementById('websiteStatus');
            if (settingsRes.data && settingsRes.data.is_published) {
                statusEl.textContent = 'Yayında';
                statusEl.style.color = 'var(--success)';
            } else {
                statusEl.textContent = 'Taslak';
                statusEl.style.color = 'var(--warning)';
            }
        } catch (error) {
            console.error('Error loading website stats:', error);
        }
    },

    async loadWebsiteSettings() {
        try {
            const { data, error } = await supabase
                .from('website_settings')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            this.currentSettings = data;

            if (data) {
                document.getElementById('websiteSubdomain').value = data.subdomain || '';
                document.getElementById('websiteCompanyName').value = data.company_name || '';
                document.getElementById('websiteDescription').value = data.description || '';
                document.getElementById('websiteLogo').value = data.logo_url || '';

                // Update Logo Preview
                const logoPreview = document.getElementById('websiteLogoPreview');
                const logoPlaceholder = document.getElementById('websiteLogoPlaceholder');
                if (data.logo_url) {
                    logoPreview.src = data.logo_url;
                    logoPreview.style.display = 'block';
                    logoPlaceholder.style.display = 'none';
                } else {
                    logoPreview.style.display = 'none';
                    logoPlaceholder.style.display = 'block';
                }

                document.getElementById('websiteEmail').value = data.contact_email || '';
                document.getElementById('websitePhone').value = data.contact_phone || '';
                document.getElementById('websiteAddress').value = data.address || '';
                document.getElementById('websitePrimaryColor').value = data.primary_color || '#0ea5e9';
                document.getElementById('websiteSecondaryColor').value = data.secondary_color || '#64748b';
                document.getElementById('websiteAccentColor').value = data.accent_color || '#22c55e';
                document.getElementById('websitePublished').checked = data.is_published || false;
            }
        } catch (error) {
            console.error('Error loading website settings:', error);
            alert('Website ayarları yüklenirken hata oluştu.');
        }
    },

    async saveWebsiteSettings() {
        try {
            let logoUrl = document.getElementById('websiteLogo').value;
            const logoFile = document.getElementById('websiteLogoFile').files[0];

            if (logoFile) {
                try {
                    logoUrl = await this.uploadImage(logoFile);
                } catch (uploadError) {
                    alert('Logo yüklenirken hata oluştu: ' + uploadError.message);
                    return;
                }
            }

            const settingsData = {
                user_id: this.currentUser.id,
                subdomain: document.getElementById('websiteSubdomain').value.toLowerCase().trim(),
                company_name: document.getElementById('websiteCompanyName').value,
                description: document.getElementById('websiteDescription').value,
                logo_url: logoUrl,
                contact_email: document.getElementById('websiteEmail').value,
                contact_phone: document.getElementById('websitePhone').value,
                address: document.getElementById('websiteAddress').value,
                primary_color: document.getElementById('websitePrimaryColor').value,
                secondary_color: document.getElementById('websiteSecondaryColor').value,
                accent_color: document.getElementById('websiteAccentColor').value,
                is_published: document.getElementById('websitePublished').checked
            };

            if (settingsData.subdomain && !/^[a-z0-9-]+$/.test(settingsData.subdomain)) {
                alert('Subdomain sadece küçük harf, rakam ve tire içerebilir.');
                return;
            }

            const { data, error } = await supabase
                .from('website_settings')
                .upsert(settingsData, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;

            this.currentSettings = data;
            alert('Website ayarları başarıyla kaydedildi!');
            await this.loadWebsiteStats();
        } catch (error) {
            console.error('Error saving website settings:', error);
            alert('Ayarlar kaydedilirken hata oluştu: ' + error.message);
        }
    },

    async checkSubdomain() {
        const subdomain = document.getElementById('websiteSubdomain').value.toLowerCase().trim();
        if (!subdomain) {
            alert('Lütfen bir subdomain girin.');
            return;
        }
        if (!/^[a-z0-9-]+$/.test(subdomain)) {
            alert('Subdomain sadece küçük harf, rakam ve tire içerebilir.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('website_settings')
                .select('subdomain')
                .eq('subdomain', subdomain)
                .neq('user_id', this.currentUser.id)
                .single();

            if (data) {
                alert('❌ Bu subdomain kullanımda. Lütfen başka bir subdomain deneyin.');
            } else {
                alert('✅ Bu subdomain kullanılabilir!');
            }
        } catch (error) {
            if (error.code === 'PGRST116') {
                alert('✅ Bu subdomain kullanılabilir!');
            } else {
                console.error('Error checking subdomain:', error);
                alert('Subdomain kontrol edilirken hata oluştu.');
            }
        }
    },

    // --- PRODUCTS ---
    async loadProducts() {
        try {
            const { data, error } = await supabase
                .from('website_products')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const tbody = document.getElementById('websiteProductsList');
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--secondary);">Henüz ürün eklenmemiş.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(product => `
                <tr>
                    <td><img src="${product.image_url || 'https://via.placeholder.com/50'}" alt="${product.name}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;"></td>
                    <td>${product.name}</td>
                    <td>${product.category || '-'}</td>
                    <td>${product.price ? '₺' + parseFloat(product.price).toFixed(2) : '-'}</td>
                    <td><span class="status-badge ${product.is_active ? 'status-completed' : 'status-pending'}">${product.is_active ? 'Aktif' : 'Pasif'}</span></td>
                    <td>
                        <button onclick="WebsiteManager.openProductModal(${product.id})" class="btn btn-sm"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="WebsiteManager.deleteProduct(${product.id})" class="btn btn-delete btn-sm"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading products:', error);
        }
    },

    async openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalTitle').textContent = 'Ürün Ekle';

        if (productId) {
            document.getElementById('productModalTitle').textContent = 'Ürün Düzenle';
            try {
                const { data, error } = await supabase
                    .from('website_products')
                    .select('*')
                    .eq('id', productId)
                    .single();

                if (data) {
                    document.getElementById('productId').value = data.id;
                    document.getElementById('productName').value = data.name;
                    document.getElementById('productCategory').value = data.category || '';
                    document.getElementById('productPrice').value = data.price || '';
                    document.getElementById('productImage').value = data.image_url || '';
                    document.getElementById('productDescription').value = data.description || '';
                    document.getElementById('productActive').checked = data.is_active;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    async saveProduct() {
        const id = document.getElementById('productId').value;
        const productData = {
            user_id: this.currentUser.id,
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: document.getElementById('productPrice').value || null,
            image_url: document.getElementById('productImage').value,
            description: document.getElementById('productDescription').value,
            is_active: document.getElementById('productActive').checked
        };

        try {
            let error;
            if (id) {
                const res = await supabase.from('website_products').update(productData).eq('id', id);
                error = res.error;
            } else {
                const res = await supabase.from('website_products').insert([productData]);
                error = res.error;
            }

            if (error) throw error;
            alert('Ürün başarıyla kaydedildi.');
            document.getElementById('productModal').style.display = 'none';
            this.loadProducts();
            this.loadWebsiteStats();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Ürün kaydedilirken hata oluştu.');
        }
    },

    async deleteProduct(id) {
        if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
        try {
            await supabase.from('website_products').delete().eq('id', id);
            alert('Ürün silindi.');
            this.loadProducts();
            this.loadWebsiteStats();
        } catch (e) { console.error(e); alert('Silme hatası.'); }
    },

    // --- SERVICES ---
    async loadServices() {
        try {
            const { data, error } = await supabase
                .from('website_services')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const tbody = document.getElementById('websiteServicesList');
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--secondary);">Henüz hizmet eklenmemiş.</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(service => `
                <tr>
                    <td><i class="${service.icon || 'fa-solid fa-briefcase'}" style="font-size:1.5rem;color:var(--primary);"></i></td>
                    <td>${service.name}</td>
                    <td>${service.description ? service.description.substring(0, 50) + '...' : '-'}</td>
                    <td><span class="status-badge ${service.is_active ? 'status-completed' : 'status-pending'}">${service.is_active ? 'Aktif' : 'Pasif'}</span></td>
                    <td>
                        <button onclick="WebsiteManager.openServiceModal(${service.id})" class="btn btn-sm"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="WebsiteManager.deleteService(${service.id})" class="btn btn-delete btn-sm"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error(e); }
    },

    async openServiceModal(serviceId = null) {
        const modal = document.getElementById('serviceModal');
        const form = document.getElementById('serviceForm');
        form.reset();
        document.getElementById('serviceId').value = '';
        document.getElementById('serviceModalTitle').textContent = 'Hizmet Ekle';

        if (serviceId) {
            document.getElementById('serviceModalTitle').textContent = 'Hizmet Düzenle';
            try {
                const { data } = await supabase.from('website_services').select('*').eq('id', serviceId).single();
                if (data) {
                    document.getElementById('serviceId').value = data.id;
                    document.getElementById('serviceName').value = data.name;
                    document.getElementById('serviceIcon').value = data.icon || '';
                    document.getElementById('serviceDescription').value = data.description || '';
                    document.getElementById('serviceActive').checked = data.is_active;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    async saveService() {
        const id = document.getElementById('serviceId').value;
        const serviceData = {
            user_id: this.currentUser.id,
            name: document.getElementById('serviceName').value,
            icon: document.getElementById('serviceIcon').value,
            description: document.getElementById('serviceDescription').value,
            is_active: document.getElementById('serviceActive').checked
        };

        try {
            if (id) await supabase.from('website_services').update(serviceData).eq('id', id);
            else await supabase.from('website_services').insert([serviceData]);

            alert('Hizmet başarıyla kaydedildi.');
            document.getElementById('serviceModal').style.display = 'none';
            this.loadServices();
            this.loadWebsiteStats();
        } catch (e) { console.error(e); alert('Hata oluştu.'); }
    },

    async deleteService(id) {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await supabase.from('website_services').delete().eq('id', id);
            alert('Hizmet silindi.');
            this.loadServices();
            this.loadWebsiteStats();
        } catch (e) { console.error(e); }
    },

    // --- TEAM ---
    async loadTeam() {
        try {
            const { data, error } = await supabase
                .from('website_team')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('display_order', { ascending: true });

            if (error) throw error;
            const grid = document.getElementById('websiteTeamGrid');
            if (!data || data.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">Henüz ekip üyesi eklenmemiş.</div>';
                return;
            }
            grid.innerHTML = data.map(member => `
                <div class="team-member-card" style="background:white;border-radius:12px;padding:1.5rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <img src="${member.photo_url || 'https://via.placeholder.com/150'}" alt="${member.name}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:1rem;">
                    <h3 style="margin:0.5rem 0;font-size:1.1rem;">${member.name}</h3>
                    <p style="color:var(--primary);font-weight:600;margin:0.25rem 0;">${member.position}</p>
                    <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;">
                        <button onclick="WebsiteManager.openTeamModal(${member.id})" class="btn btn-sm"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="WebsiteManager.deleteTeamMember(${member.id})" class="btn btn-delete btn-sm"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },

    async openTeamModal(memberId = null) {
        const modal = document.getElementById('teamModal');
        const form = document.getElementById('teamForm');
        form.reset();
        document.getElementById('teamId').value = '';
        document.getElementById('teamModalTitle').textContent = 'Ekip Üyesi Ekle';

        if (memberId) {
            document.getElementById('teamModalTitle').textContent = 'Ekip Üyesi Düzenle';
            try {
                const { data } = await supabase.from('website_team').select('*').eq('id', memberId).single();
                if (data) {
                    document.getElementById('teamId').value = data.id;
                    document.getElementById('teamName').value = data.name;
                    document.getElementById('teamPosition').value = data.position;
                    document.getElementById('teamPhoto').value = data.photo_url || '';
                    document.getElementById('teamBio').value = data.bio || '';
                    document.getElementById('teamOrder').value = data.display_order || 0;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    async saveTeamMember() {
        const id = document.getElementById('teamId').value;
        const teamData = {
            user_id: this.currentUser.id,
            name: document.getElementById('teamName').value,
            position: document.getElementById('teamPosition').value,
            photo_url: document.getElementById('teamPhoto').value,
            bio: document.getElementById('teamBio').value,
            display_order: parseInt(document.getElementById('teamOrder').value) || 0
        };

        try {
            if (id) await supabase.from('website_team').update(teamData).eq('id', id);
            else await supabase.from('website_team').insert([teamData]);

            alert('Ekip üyesi kaydedildi.');
            document.getElementById('teamModal').style.display = 'none';
            this.loadTeam();
            this.loadWebsiteStats();
        } catch (e) { console.error(e); alert('Hata oluştu.'); }
    },

    async deleteTeamMember(id) {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await supabase.from('website_team').delete().eq('id', id);
            alert('Silindi.');
            this.loadTeam();
            this.loadWebsiteStats();
        } catch (e) { console.error(e); }
    },

    // --- GALLERY ---
    async loadGallery() {
        try {
            const { data, error } = await supabase
                .from('website_gallery')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('display_order', { ascending: true });

            if (error) throw error;
            const grid = document.getElementById('websiteGalleryGrid');
            if (!data || data.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">Henüz görsel eklenmemiş.</div>';
                return;
            }
            grid.innerHTML = data.map(image => `
                <div class="gallery-item" style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <img src="${image.image_url}" alt="${image.title || ''}" style="width:100%;height:200px;object-fit:cover;">
                    <div style="position:absolute;top:8px;right:8px;">
                        <button onclick="WebsiteManager.deleteGalleryImage(${image.id})" class="btn btn-delete btn-sm"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    ${image.title ? `<div style="padding:0.5rem;background:white;"><strong>${image.title}</strong></div>` : ''}
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },

    openGalleryModal() {
        document.getElementById('galleryForm').reset();
        document.getElementById('galleryModal').style.display = 'flex';
    },

    async saveGalleryImage() {
        const galleryData = {
            user_id: this.currentUser.id,
            image_url: document.getElementById('galleryImage').value,
            title: document.getElementById('galleryTitle').value,
            display_order: parseInt(document.getElementById('galleryOrder').value) || 0
        };

        try {
            await supabase.from('website_gallery').insert([galleryData]);
            alert('Görsel eklendi.');
            document.getElementById('galleryModal').style.display = 'none';
            this.loadGallery();
        } catch (e) { console.error(e); alert('Hata oluştu.'); }
    },

    async deleteGalleryImage(id) {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await supabase.from('website_gallery').delete().eq('id', id);
            alert('Silindi.');
            this.loadGallery();
        } catch (e) { console.error(e); }
    },

    // --- PAGES ---
    async loadPages() {
        try {
            const { data, error } = await supabase
                .from('website_pages')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const tbody = document.getElementById('websitePagesList');
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--secondary);">Henüz sayfa eklenmemiş.</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(page => `
                <tr>
                    <td>${page.title}</td>
                    <td><code>${page.slug}</code></td>
                    <td><span class="status-badge ${page.is_published ? 'status-completed' : 'status-pending'}">${page.is_published ? 'Yayında' : 'Taslak'}</span></td>
                    <td>
                        <button onclick="WebsiteManager.openPageModal(${page.id})" class="btn btn-sm"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="WebsiteManager.deletePage(${page.id})" class="btn btn-delete btn-sm"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error(e); }
    },

    async openPageModal(pageId = null) {
        const modal = document.getElementById('pageModal');
        const form = document.getElementById('pageForm');
        form.reset();
        document.getElementById('pageId').value = '';
        document.getElementById('pageModalTitle').textContent = 'Sayfa Ekle';

        if (pageId) {
            document.getElementById('pageModalTitle').textContent = 'Sayfa Düzenle';
            try {
                const { data } = await supabase.from('website_pages').select('*').eq('id', pageId).single();
                if (data) {
                    document.getElementById('pageId').value = data.id;
                    document.getElementById('pageTitle').value = data.title;
                    document.getElementById('pageSlug').value = data.slug;
                    document.getElementById('pageContent').value = data.content || '';
                    document.getElementById('pagePublished').checked = data.is_published;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    generateSlug(text) {
        const slug = text.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        document.getElementById('pageSlug').value = slug;
    },

    async savePage() {
        const id = document.getElementById('pageId').value;
        const pageData = {
            user_id: this.currentUser.id,
            title: document.getElementById('pageTitle').value,
            slug: document.getElementById('pageSlug').value,
            content: document.getElementById('pageContent').value,
            is_published: document.getElementById('pagePublished').checked
        };

        try {
            if (id) await supabase.from('website_pages').update(pageData).eq('id', id);
            else await supabase.from('website_pages').insert([pageData]);

            alert('Sayfa kaydedildi.');
            document.getElementById('pageModal').style.display = 'none';
            this.loadPages();
        } catch (e) { console.error(e); alert('Hata oluştu.'); }
    },

    async deletePage(id) {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await supabase.from('website_pages').delete().eq('id', id);
            alert('Silindi.');
            this.loadPages();
        } catch (e) { console.error(e); }
    },

    async uploadImage(file, bucket = 'website-assets') {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
};

// Expose to global scope
window.WebsiteManager = WebsiteManager;
