// Website Manager - Handles all website management functionality
const WebsiteManager = {
    currentUser: null,
    currentSettings: null,
    isInitialized: false,

    async init() {
        this.currentUser = await Auth.checkAuth();
        if (!this.currentUser) return;

        // Setup tab switching and event listeners (only once)
        if (!this.isInitialized) {
            this.setupTabs();
            this.isInitialized = true;
        }

        // Load initial data (every time)
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
                document.getElementById('websiteSlogan').value = data.slogan || '';
                document.getElementById('websiteDescription').value = data.description || '';
                document.getElementById('websiteLogo').value = data.logo_url || '';
                document.getElementById('websiteHeroImage').value = data.hero_image_url || '';

                // Update Logo Preview
                const logoPreview = document.getElementById('logoPreview');
                const logoPreviewImg = document.getElementById('logoPreviewImg');
                if (data.logo_url && logoPreview && logoPreviewImg) {
                    logoPreviewImg.src = data.logo_url;
                    logoPreview.style.display = 'block';
                }

                // Update Hero Preview
                const heroPreview = document.getElementById('heroPreview');
                const heroPreviewImg = document.getElementById('heroPreviewImg');
                if (data.hero_image_url && heroPreview && heroPreviewImg) {
                    heroPreviewImg.src = data.hero_image_url;
                    heroPreview.style.display = 'block';
                }

                document.getElementById('websiteEmail').value = data.contact_email || '';
                document.getElementById('websitePhone').value = data.contact_phone || '';
                document.getElementById('websiteWhatsapp').value = data.whatsapp_phone || '';
                document.getElementById('websiteAddress').value = data.address || '';
                document.getElementById('websitePrimaryColor').value = data.primary_color || '#667eea';
                document.getElementById('websiteSecondaryColor').value = data.secondary_color || '#764ba2';
                document.getElementById('websiteAccentColor').value = data.accent_color || '#22c55e';
                document.getElementById('websitePublished').checked = data.is_published || false;

                // Appointment and Reservation Links
                document.getElementById('websiteAppointmentLink').value = data.appointment_link || '';
                document.getElementById('websiteReservationLink').value = data.reservation_link || '';

                // Social Media Links
                document.getElementById('websiteFacebook').value = data.facebook_url || '';
                document.getElementById('websiteTwitter').value = data.twitter_url || '';
                document.getElementById('websiteInstagram').value = data.instagram_url || '';
                document.getElementById('websiteLinkedin').value = data.linkedin_url || '';
                document.getElementById('websiteYoutube').value = data.youtube_url || '';
                document.getElementById('websiteTiktok').value = data.tiktok_url || '';
            }
        } catch (error) {
            console.error('Error loading website settings:', error);
            alert('Website ayarları yüklenirken hata oluştu.');
        }
    },

    async saveWebsiteSettings() {
        try {
            let logoUrl = document.getElementById('websiteLogo').value;
            let heroImageUrl = document.getElementById('websiteHeroImage').value;

            const settingsData = {
                user_id: this.currentUser.id,
                subdomain: document.getElementById('websiteSubdomain').value.toLowerCase().trim(),
                company_name: document.getElementById('websiteCompanyName').value,
                slogan: document.getElementById('websiteSlogan').value,
                description: document.getElementById('websiteDescription').value,
                logo_url: logoUrl,
                hero_image_url: heroImageUrl,
                contact_email: document.getElementById('websiteEmail').value,
                contact_phone: document.getElementById('websitePhone').value,
                whatsapp_phone: document.getElementById('websiteWhatsapp').value,
                address: document.getElementById('websiteAddress').value,
                primary_color: document.getElementById('websitePrimaryColor').value,
                secondary_color: document.getElementById('websiteSecondaryColor').value,
                accent_color: document.getElementById('websiteAccentColor').value,
                is_published: document.getElementById('websitePublished').checked,
                // Appointment and Reservation Links
                appointment_link: document.getElementById('websiteAppointmentLink').value,
                reservation_link: document.getElementById('websiteReservationLink').value,
                // Social Media Links
                facebook_url: document.getElementById('websiteFacebook').value,
                twitter_url: document.getElementById('websiteTwitter').value,
                instagram_url: document.getElementById('websiteInstagram').value,
                linkedin_url: document.getElementById('websiteLinkedin').value,
                youtube_url: document.getElementById('websiteYoutube').value,
                tiktok_url: document.getElementById('websiteTiktok').value
            };

            if (settingsData.subdomain && !/^[a-z0-9-]+$/.test(settingsData.subdomain)) {
                alert('Firma adresi sadece küçük harf, rakam ve tire içerebilir.');
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

            const grid = document.getElementById('websiteProductsGrid');
            if (!grid) {
                console.error('Product grid element not found');
                return;
            }

            if (!data || data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">
                        <i class="fa-solid fa-box" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Henüz ürün eklenmemiş.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = data.map(product => `
                <div class="product-card" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border);">
                    <div style="height: 150px; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${product.image_url
                    ? `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<i class="fa-solid fa-box" style="font-size: 3rem; color: white; opacity: 0.5;"></i>`
                }
                    </div>
                    <div style="padding: 1rem;">
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--dark);">${product.name}</h3>
                        ${product.category ? `<span style="display: inline-block; background: #eff6ff; color: var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 0.5rem;">${product.category}</span>` : ''}
                        <p style="color: var(--secondary); font-size: 0.9rem; margin: 0.5rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.description || ''}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                            <span style="font-weight: 700; color: var(--primary);">${product.price ? '₺' + parseFloat(product.price).toLocaleString('tr-TR') : '-'}</span>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="WebsiteManager.openProductModal(${product.id})" class="btn btn-sm" style="padding: 6px 10px; font-size: 0.85rem;">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button onclick="WebsiteManager.deleteProduct(${product.id})" class="btn btn-delete btn-sm" style="padding: 6px 10px; font-size: 0.85rem; background: #fee2e2; color: #dc2626; border: none;">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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

            const grid = document.getElementById('websiteServicesGrid');
            if (!grid) {
                console.error('Services grid element not found');
                return;
            }

            if (!data || data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">
                        <i class="fa-solid fa-briefcase" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Henüz hizmet eklenmemiş.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = data.map(service => `
                <div class="service-card" style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border);">
                    <div style="display: flex; align-items: flex-start; gap: 1rem;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="${service.icon || 'fa-solid fa-briefcase'}" style="font-size: 1.25rem; color: white;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--dark);">${service.name}</h3>
                            <p style="color: var(--secondary); font-size: 0.9rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${service.description || ''}</p>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <span class="status-badge ${service.is_active ? 'status-completed' : 'status-pending'}" style="font-size: 0.8rem;">${service.is_active ? 'Aktif' : 'Pasif'}</span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="WebsiteManager.openServiceModal(${service.id})" class="btn btn-sm" style="padding: 6px 10px; font-size: 0.85rem;">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button onclick="WebsiteManager.deleteService(${service.id})" class="btn btn-delete btn-sm" style="padding: 6px 10px; font-size: 0.85rem; background: #fee2e2; color: #dc2626; border: none;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },

    async openServiceModal(serviceId = null) {
        const modal = document.getElementById('serviceModal');
        const form = document.getElementById('serviceForm');

        if (!modal) {
            console.error('serviceModal element not found');
            return;
        }
        if (form) form.reset();

        const serviceIdInput = document.getElementById('serviceId');
        const serviceModalTitle = document.getElementById('serviceModalTitle');
        if (serviceIdInput) serviceIdInput.value = '';
        if (serviceModalTitle) serviceModalTitle.textContent = 'Hizmet Ekle';

        if (serviceId) {
            if (serviceModalTitle) serviceModalTitle.textContent = 'Hizmet Düzenle';
            try {
                const { data } = await supabase.from('website_services').select('*').eq('id', serviceId).single();
                if (data) {
                    if (serviceIdInput) serviceIdInput.value = data.id;
                    const serviceName = document.getElementById('serviceName');
                    const serviceIcon = document.getElementById('serviceIcon');
                    const serviceDescription = document.getElementById('serviceDescription');
                    const serviceActive = document.getElementById('serviceActive');
                    if (serviceName) serviceName.value = data.name;
                    if (serviceIcon) serviceIcon.value = data.icon || '';
                    if (serviceDescription) serviceDescription.value = data.description || '';
                    if (serviceActive) serviceActive.checked = data.is_active;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    async saveService() {
        // Ensure we have currentUser
        if (!this.currentUser) {
            this.currentUser = await Auth.checkAuth();
        }
        if (!this.currentUser) {
            alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        const serviceIdEl = document.getElementById('serviceId');
        const serviceNameEl = document.getElementById('serviceName');
        const serviceIconEl = document.getElementById('serviceIcon');
        const serviceDescEl = document.getElementById('serviceDescription');
        const serviceActiveEl = document.getElementById('serviceActive');

        const id = serviceIdEl ? serviceIdEl.value : '';
        const serviceData = {
            user_id: this.currentUser.id,
            name: serviceNameEl ? serviceNameEl.value : '',
            icon: serviceIconEl ? serviceIconEl.value : '',
            description: serviceDescEl ? serviceDescEl.value : '',
            is_active: serviceActiveEl ? serviceActiveEl.checked : true
        };

        try {
            let error;
            if (id) {
                const res = await supabase.from('website_services').update(serviceData).eq('id', id);
                error = res.error;
            } else {
                const res = await supabase.from('website_services').insert([serviceData]);
                error = res.error;
            }

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            alert('Hizmet başarıyla kaydedildi.');
            const modal = document.getElementById('serviceModal');
            if (modal) modal.style.display = 'none';
            this.loadServices();
            this.loadWebsiteStats();
        } catch (e) {
            console.error('Save service error:', e);
            alert('Hata oluştu: ' + (e.message || e));
        }
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
            if (!grid) {
                console.error('Team grid element not found');
                return;
            }

            if (!data || data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">
                        <i class="fa-solid fa-users" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Henüz ekip üyesi eklenmemiş.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = data.map(member => `
                <div class="team-member-card" style="background:white;border-radius:12px;padding:1.5rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border);">
                    <img src="${member.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.name) + '&background=667eea&color=fff&size=100'}" alt="${member.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:1rem; border: 3px solid var(--border);">
                    <h3 style="margin:0.5rem 0;font-size:1.05rem; color: var(--dark);">${member.name}</h3>
                    <p style="color:var(--primary);font-weight:600;font-size:0.9rem;margin:0.25rem 0;">${member.position}</p>
                    ${member.bio ? `<p style="color:var(--secondary);font-size:0.85rem;margin:0.5rem 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${member.bio}</p>` : ''}
                    <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <button onclick="WebsiteManager.openTeamModal(${member.id})" class="btn btn-sm" style="padding: 6px 10px;"><i class="fa-solid fa-edit"></i></button>
                        <button onclick="WebsiteManager.deleteTeamMember(${member.id})" class="btn btn-delete btn-sm" style="padding: 6px 10px; background: #fee2e2; color: #dc2626; border: none;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (e) { console.error('Error loading team:', e); }
    },

    async openTeamModal(memberId = null) {
        const modal = document.getElementById('teamModal');
        const form = document.getElementById('teamForm');

        if (!modal) {
            console.error('teamModal element not found');
            return;
        }
        if (form) form.reset();

        const teamIdInput = document.getElementById('teamId');
        const teamModalTitle = document.getElementById('teamModalTitle');
        if (teamIdInput) teamIdInput.value = '';
        if (teamModalTitle) teamModalTitle.textContent = 'Ekip Üyesi Ekle';

        if (memberId) {
            if (teamModalTitle) teamModalTitle.textContent = 'Ekip Üyesi Düzenle';
            try {
                const { data } = await supabase.from('website_team').select('*').eq('id', memberId).single();
                if (data) {
                    if (teamIdInput) teamIdInput.value = data.id;
                    const teamName = document.getElementById('teamName');
                    const teamPosition = document.getElementById('teamPosition');
                    const teamPhoto = document.getElementById('teamPhoto');
                    const teamBio = document.getElementById('teamBio');
                    const teamOrder = document.getElementById('teamOrder');
                    if (teamName) teamName.value = data.name;
                    if (teamPosition) teamPosition.value = data.position;
                    if (teamPhoto) teamPhoto.value = data.photo_url || '';
                    if (teamBio) teamBio.value = data.bio || '';
                    if (teamOrder) teamOrder.value = data.display_order || 0;
                }
            } catch (e) { console.error(e); }
        }
        modal.style.display = 'flex';
    },

    async saveTeamMember() {
        // Ensure we have currentUser
        if (!this.currentUser) {
            this.currentUser = await Auth.checkAuth();
        }
        if (!this.currentUser) {
            alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        const teamIdEl = document.getElementById('teamId');
        const teamNameEl = document.getElementById('teamName');
        const teamPositionEl = document.getElementById('teamPosition');
        const teamPhotoEl = document.getElementById('teamPhoto');
        const teamBioEl = document.getElementById('teamBio');
        const teamOrderEl = document.getElementById('teamOrder');

        const id = teamIdEl ? teamIdEl.value : '';
        const teamData = {
            user_id: this.currentUser.id,
            name: teamNameEl ? teamNameEl.value : '',
            position: teamPositionEl ? teamPositionEl.value : '',
            photo_url: teamPhotoEl ? teamPhotoEl.value : '',
            bio: teamBioEl ? teamBioEl.value : '',
            display_order: teamOrderEl ? (parseInt(teamOrderEl.value) || 0) : 0
        };

        try {
            let error;
            if (id) {
                const res = await supabase.from('website_team').update(teamData).eq('id', id);
                error = res.error;
            } else {
                const res = await supabase.from('website_team').insert([teamData]);
                error = res.error;
            }

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            alert('Ekip üyesi kaydedildi.');
            const modal = document.getElementById('teamModal');
            if (modal) modal.style.display = 'none';
            this.loadTeam();
            this.loadWebsiteStats();
        } catch (e) {
            console.error('Save team error:', e);
            alert('Hata oluştu: ' + (e.message || e));
        }
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
            if (!grid) {
                console.error('Gallery grid element not found');
                return;
            }

            if (!data || data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; color:var(--secondary); padding: 3rem;">
                        <i class="fa-solid fa-images" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Henüz görsel eklenmemiş.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = data.map(image => `
                <div class="gallery-item" style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border);">
                    <img src="${image.image_url}" alt="${image.title || ''}" style="width:100%;height:180px;object-fit:cover;">
                    <div style="position:absolute;top:8px;right:8px;">
                        <button onclick="WebsiteManager.deleteGalleryImage(${image.id})" class="btn btn-delete btn-sm" style="padding: 6px 10px; background: rgba(220,38,38,0.9); color: white; border: none;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    ${image.title ? `<div style="padding:0.75rem;background:white;"><strong style="font-size:0.9rem;">${image.title}</strong></div>` : ''}
                </div>
            `).join('');
        } catch (e) { console.error('Error loading gallery:', e); }
    },

    openGalleryModal() {
        const modal = document.getElementById('galleryModal');
        const form = document.getElementById('galleryForm');

        if (!modal) {
            console.error('galleryModal element not found');
            return;
        }
        if (form) form.reset();
        modal.style.display = 'flex';
    },

    async saveGalleryImage() {
        // Ensure we have currentUser
        if (!this.currentUser) {
            this.currentUser = await Auth.checkAuth();
        }
        if (!this.currentUser) {
            alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        const galleryImageEl = document.getElementById('galleryImage');
        const galleryTitleEl = document.getElementById('galleryTitle');
        const galleryOrderEl = document.getElementById('galleryOrder');

        const galleryData = {
            user_id: this.currentUser.id,
            image_url: galleryImageEl ? galleryImageEl.value : '',
            title: galleryTitleEl ? galleryTitleEl.value : '',
            display_order: galleryOrderEl ? (parseInt(galleryOrderEl.value) || 0) : 0
        };

        try {
            const { error } = await supabase.from('website_gallery').insert([galleryData]);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            alert('Görsel eklendi.');
            const modal = document.getElementById('galleryModal');
            if (modal) modal.style.display = 'none';
            this.loadGallery();
        } catch (e) {
            console.error('Save gallery error:', e);
            alert('Hata oluştu: ' + (e.message || e));
        }
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
            if (!tbody) {
                console.error('Pages tbody element not found');
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--secondary); padding: 2rem;">Henüz sayfa eklenmemiş.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(page => `
                <tr>
                    <td style="font-weight: 500;">${page.title}</td>
                    <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem;">/${page.slug}</code></td>
                    <td><span class="status-badge ${page.is_published ? 'status-completed' : 'status-pending'}">${page.is_published ? 'Yayında' : 'Taslak'}</span></td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="WebsiteManager.openPageModal(${page.id})" class="btn btn-sm" style="padding: 6px 10px;"><i class="fa-solid fa-edit"></i></button>
                            <button onclick="WebsiteManager.deletePage(${page.id})" class="btn btn-delete btn-sm" style="padding: 6px 10px; background: #fee2e2; color: #dc2626; border: none;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error('Error loading pages:', e); }
    },

    async openPageModal(pageId = null) {
        const modal = document.getElementById('pageModal');
        const form = document.getElementById('pageForm');

        if (!modal) {
            console.error('pageModal element not found');
            return;
        }
        if (form) form.reset();

        const pageIdInput = document.getElementById('pageId');
        const pageModalTitle = document.getElementById('pageModalTitle');
        if (pageIdInput) pageIdInput.value = '';
        if (pageModalTitle) pageModalTitle.textContent = 'Sayfa Ekle';

        if (pageId) {
            if (pageModalTitle) pageModalTitle.textContent = 'Sayfa Düzenle';
            try {
                const { data } = await supabase.from('website_pages').select('*').eq('id', pageId).single();
                if (data) {
                    if (pageIdInput) pageIdInput.value = data.id;
                    const pageTitle = document.getElementById('websitePageTitle');
                    const pageSlug = document.getElementById('pageSlug');
                    const pageContent = document.getElementById('pageContent');
                    const pagePublished = document.getElementById('pagePublished');
                    if (pageTitle) pageTitle.value = data.title;
                    if (pageSlug) pageSlug.value = data.slug;
                    if (pageContent) pageContent.value = data.content || '';
                    if (pagePublished) pagePublished.checked = data.is_published;
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
        // Ensure we have currentUser
        if (!this.currentUser) {
            this.currentUser = await Auth.checkAuth();
        }
        if (!this.currentUser) {
            alert('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        const pageIdEl = document.getElementById('pageId');
        const pageTitleEl = document.getElementById('websitePageTitle');
        const pageSlugEl = document.getElementById('pageSlug');
        const pageContentEl = document.getElementById('pageContent');
        const pagePublishedEl = document.getElementById('pagePublished');

        // Get values with safe null checks
        const title = (pageTitleEl && pageTitleEl.value) ? pageTitleEl.value.trim() : '';
        const slug = (pageSlugEl && pageSlugEl.value) ? pageSlugEl.value.trim() : '';

        // Validate required fields
        if (!title) {
            alert('Lütfen sayfa başlığını girin.');
            if (pageTitleEl) pageTitleEl.focus();
            return;
        }
        if (!slug) {
            alert('Lütfen slug (URL kısmı) girin.');
            if (pageSlugEl) pageSlugEl.focus();
            return;
        }

        const id = pageIdEl ? pageIdEl.value : '';
        const pageData = {
            user_id: this.currentUser.id,
            title: title,
            slug: slug,
            content: pageContentEl ? pageContentEl.value : '',
            is_published: pagePublishedEl ? pagePublishedEl.checked : false
        };

        try {
            let error;
            if (id) {
                const res = await supabase.from('website_pages').update(pageData).eq('id', id);
                error = res.error;
            } else {
                const res = await supabase.from('website_pages').insert([pageData]);
                error = res.error;
            }

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            alert('Sayfa kaydedildi.');
            const modal = document.getElementById('pageModal');
            if (modal) modal.style.display = 'none';
            this.loadPages();
        } catch (e) {
            console.error('Save page error:', e);
            alert('Hata oluştu: ' + (e.message || e));
        }
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
    },

    async uploadLogo(input) {
        const file = input.files[0];
        if (!file) return;

        const btn = input.parentElement.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        btn.disabled = true;

        try {
            const url = await this.uploadImage(file, 'website-assets');
            document.getElementById('websiteLogo').value = url;

            // Show preview
            const preview = document.getElementById('logoPreview');
            const previewImg = document.getElementById('logoPreviewImg');
            previewImg.src = url;
            preview.style.display = 'block';

            alert('Logo başarıyla yüklendi!');
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Logo yüklenirken hata oluştu: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    async uploadHeroImage(input) {
        const file = input.files[0];
        if (!file) return;

        const btn = input.parentElement.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        btn.disabled = true;

        try {
            const url = await this.uploadImage(file, 'website-assets');
            document.getElementById('websiteHeroImage').value = url;

            // Show preview
            const preview = document.getElementById('heroPreview');
            const previewImg = document.getElementById('heroPreviewImg');
            previewImg.src = url;
            preview.style.display = 'block';

            alert('Hero görseli başarıyla yüklendi!');
        } catch (error) {
            console.error('Error uploading hero image:', error);
            alert('Hero görseli yüklenirken hata oluştu: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    async uploadProductImage(input) {
        const file = input.files[0];
        if (!file) return;

        const btn = input.parentElement.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        btn.disabled = true;

        try {
            const url = await this.uploadImage(file, 'website-assets');
            document.getElementById('productImage').value = url;

            // Show preview
            const preview = document.getElementById('productImagePreview');
            const previewImg = document.getElementById('productImagePreviewImg');
            previewImg.src = url;
            preview.style.display = 'block';

            alert('Ürün görseli başarıyla yüklendi!');
        } catch (error) {
            console.error('Error uploading product image:', error);
            alert('Ürün görseli yüklenirken hata oluştu: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    async uploadTeamPhoto(input) {
        const file = input.files[0];
        if (!file) return;

        const btn = input.parentElement.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        btn.disabled = true;

        try {
            const url = await this.uploadImage(file, 'website-assets');
            document.getElementById('teamPhoto').value = url;

            // Show preview
            const preview = document.getElementById('teamPhotoPreview');
            const previewImg = document.getElementById('teamPhotoPreviewImg');
            previewImg.src = url;
            preview.style.display = 'block';

            alert('Ekip üyesi fotoğrafı başarıyla yüklendi!');
        } catch (error) {
            console.error('Error uploading team photo:', error);
            alert('Fotoğraf yüklenirken hata oluştu: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    async uploadGalleryImage(input) {
        const file = input.files[0];
        if (!file) return;

        const btn = input.parentElement.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        btn.disabled = true;

        try {
            const url = await this.uploadImage(file, 'website-assets');
            document.getElementById('galleryImage').value = url;

            // Show preview
            const preview = document.getElementById('galleryImagePreview');
            const previewImg = document.getElementById('galleryImagePreviewImg');
            previewImg.src = url;
            preview.style.display = 'block';

            alert('Galeri görseli başarıyla yüklendi!');
        } catch (error) {
            console.error('Error uploading gallery image:', error);
            alert('Görsel yüklenirken hata oluştu: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// Expose to global scope
window.WebsiteManager = WebsiteManager;
