// ========================================
// ONBOARDING / WALKTHROUGH SYSTEM
// ========================================

const Onboarding = {
    currentStep: 0,
    totalSteps: 6,
    isCompleted: false,

    // Onboarding steps configuration
    steps: [
        {
            title: "Hoş Geldiniz! 👋",
            type: "welcome",
            icon: "fa-hand-wave",
        },
        {
            title: "İş Takibi",
            description: "Çalışanlarınıza görev atayın ve ilerlemelerini takip edin. Termin tarihli işler için bildirim alın.",
            icon: "fa-list-check",
            tip: "İpucu: Görevlere müşteri atayarak daha düzenli takip yapabilirsiniz.",
            highlightElement: ".menu-item[onclick*='tasks']"
        },
        {
            title: "Randevu Yönetimi",
            description: "Müşterileriniz online randevu alabilir. Takvim üzerinden müsait saatlerinizi belirleyin ve WhatsApp ile hatırlatma gönderin.",
            icon: "fa-calendar-check",
            tip: "İpucu: Paylaşım linkini web sitenize ekleyerek müşterilerinizin kolayca randevu almasını sağlayın.",
            highlightElement: ".menu-item[onclick*='appointments']"
        },
        {
            title: "Müşteri & Teklif Yönetimi",
            description: "Müşteri bilgilerinizi saklayın, profesyonel teklifler hazırlayın ve PDF/Excel olarak dışa aktarın.",
            icon: "fa-users",
            tip: "İpucu: Müşteri kartlarından geçmiş işleri ve iletişim geçmişini takip edebilirsiniz.",
            highlightElement: ".menu-item[onclick*='customers']"
        },
        {
            title: "Alan Rezervasyonu",
            description: "Kiralık alanlarınızı (stand, masa, saha vb.) yönetin, doluluk takibi yapın ve ödeme durumlarını izleyin.",
            icon: "fa-calendar-days",
            tip: "İpucu: Toplu alan oluşturma özelliği ile saniyeler içinde onlarca alan tanımlayabilirsiniz.",
            highlightElement: ".menu-item[onclick*='reservations']"
        },
        {
            title: "Kendi Websitenizi Yönetin",
            description: "İşletmeniz için profesyonel bir web sitesi oluşturun. Hizmetlerinizi, galerinizi ve iletişim bilgilerinizi kolayca güncelleyin.",
            icon: "fa-globe",
            tip: "İpucu: Web siteniz üzerinden gelen mesajlar ve randevu talepleri doğrudan panelinize düşer.",
            highlightElement: ".menu-item[onclick*='website']"
        }
    ],

    // Initialize onboarding
    init() {
        // Check if onboarding was completed before
        const completed = localStorage.getItem('kolaycrm_onboarding_completed');
        const skipped = localStorage.getItem('kolaycrm_onboarding_skipped');

        if (completed === 'true' || skipped === 'true') {
            this.isCompleted = true;
            return;
        }

        // Show onboarding after a small delay
        setTimeout(() => this.show(), 800);
    },

    // Create and show onboarding modal
    show() {
        if (this.isCompleted) return;

        const overlay = document.createElement('div');
        overlay.id = 'onboardingOverlay';
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = this.getModalHTML();

        document.body.appendChild(overlay);
        this.updateStep(0);
    },

    // Get modal HTML
    getModalHTML() {
        return `
            <div class="onboarding-modal">
                <!-- Close Button -->
                <button class="onboarding-close" onclick="Onboarding.close()" aria-label="Kapat">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- Header -->
                <div class="onboarding-header">
                    <div class="welcome-icon">👋</div>
                    <h1>Kolay İş Takip'e Hoş Geldiniz!</h1>
                    <p>İşletmenizi yönetmenin en kolay yolu</p>
                </div>
                
                <!-- Body -->
                <div class="onboarding-body">
                    <!-- Steps Indicator -->
                    <div class="onboarding-steps">
                        ${this.steps.map((_, i) => `<div class="step-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`).join('')}
                    </div>
                    
                    <!-- Welcome Step (Step 0) -->
                    <div class="walkthrough-step active" data-step="0">
                        <div class="onboarding-features">
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-list-check"></i>
                                <h3>İş Takibi</h3>
                                <p>Görevleri atayın ve takip edin</p>
                            </div>
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-calendar-check"></i>
                                <h3>Randevu</h3>
                                <p>Online randevu sistemi</p>
                            </div>
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-users"></i>
                                <h3>Müşteri CRM</h3>
                                <p>Müşteri bilgilerini saklayın</p>
                            </div>
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-file-invoice-dollar"></i>
                                <h3>Teklif Hazırlama</h3>
                                <p>Profesyonel teklifler oluşturun</p>
                            </div>
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-calendar-days"></i>
                                <h3>Alan Rezervasyonu</h3>
                                <p>Alanlarınızı kolayca yönetin</p>
                            </div>
                            <div class="onboarding-feature">
                                <i class="fa-solid fa-globe"></i>
                                <h3>Website Yönetimi</h3>
                                <p>Kendi sitenizi tasarlayın</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 1rem;">
                            <p style="color: #64748b; font-size: 0.9rem;">
                                <i class="fa-solid fa-clock" style="color: #667eea;"></i>
                                Hızlı bir tur yapalım mı? Sadece 1 dakika sürecek.
                            </p>
                        </div>
                    </div>
                    
                    <!-- Step 1: İş Takibi -->
                    <div class="walkthrough-step" data-step="1">
                        <h2><i class="fa-solid fa-list-check"></i> İş Takibi</h2>
                        <p>Çalışanlarınıza görev atayın ve ilerlemelerini anlık olarak takip edin. Termin tarihli işler için otomatik bildirim alın.</p>
                        
                        <div class="walkthrough-tip">
                            <i class="fa-solid fa-lightbulb"></i>
                            <span>İpucu: Görevlere müşteri atayarak daha düzenli takip yapabilirsiniz.</span>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Görev oluştur ve çalışana ata</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Termin takibi ve bildirimler</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>WhatsApp ile görev gönderimi</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 2: Randevu -->
                    <div class="walkthrough-step" data-step="2">
                        <h2><i class="fa-solid fa-calendar-check"></i> Randevu Yönetimi</h2>
                        <p>Müşterileriniz web sitenizden online randevu alabilir. Takvim üzerinden müsait saatlerinizi belirleyin.</p>
                        
                        <div class="walkthrough-tip">
                            <i class="fa-solid fa-lightbulb"></i>
                            <span>İpucu: WhatsApp hatırlatma göndererek randevu kaçırmalarını azaltın!</span>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Online randevu linki paylaşımı</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Randevu onay/red sistemi</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>WhatsApp hatırlatmaları</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 3: Müşteri & Teklif -->
                    <div class="walkthrough-step" data-step="3">
                        <h2><i class="fa-solid fa-users"></i> Müşteri & Teklif Yönetimi</h2>
                        <p>Müşteri bilgilerinizi tek merkezde saklayın. Profesyonel teklifler hazırlayın ve PDF olarak gönderin.</p>
                        
                        <div class="walkthrough-tip">
                            <i class="fa-solid fa-lightbulb"></i>
                            <span>İpucu: Müşteri kartlarından geçmiş işleri ve iletişim geçmişini takip edin.</span>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Müşteri veritabanı</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Teklif oluşturma ve takibi</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>PDF/Excel dışa aktarma</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: Rezervasyon -->
                    <div class="walkthrough-step" data-step="4">
                        <h2><i class="fa-solid fa-calendar-days"></i> Alan Rezervasyon Yönetimi</h2>
                        <p>Fuar standı, toplantı salonu veya masa gibi alanlarınızı tanımlayın. Doluluk durumlarını anlık takip edin.</p>
                        
                        <div class="walkthrough-tip">
                            <i class="fa-solid fa-lightbulb"></i>
                            <span>İpucu: Kroki yükleyerek görsel üzerinden takip yapabilirsiniz.</span>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Toplu alan tanımlama ve fiyatlandırma</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Opsiyonlu ve kesin rezervasyon takibi</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>WhatsApp ile müsaitlik paylaşımı</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 5: Website -->
                    <div class="walkthrough-step" data-step="5">
                        <h2><i class="fa-solid fa-globe"></i> Website Yönetimi</h2>
                        <p>Kod yazmadan kendi profesyonel web sitenizi oluşturun. Tüm içerikleri panel üzerinden yönetin.</p>
                        
                        <div class="walkthrough-tip">
                            <i class="fa-solid fa-lightbulb"></i>
                            <span>İpucu: SEO ayarlarını yaparak Google'da üst sıralara çıkın!</span>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Sürükle bırak banner ve içerik yönetimi</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Hizmetler ve Galeri modülü</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; color: #1e293b; margin-top: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                                <span>Online randevu entegrasyonu</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="onboarding-footer">
                    <label class="onboarding-checkbox" id="dontShowAgainLabel" style="display: none;">
                        <input type="checkbox" id="dontShowAgain">
                        <span>Bir daha gösterme</span>
                    </label>
                    <button class="onboarding-btn onboarding-btn-skip" onclick="Onboarding.skip()">
                        Atla
                    </button>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="onboarding-btn onboarding-btn-skip" id="prevBtn" onclick="Onboarding.prev()" style="display: none;">
                            <i class="fa-solid fa-arrow-left"></i> Geri
                        </button>
                        <button class="onboarding-btn onboarding-btn-next" id="nextBtn" onclick="Onboarding.next()">
                            Tura Başla <i class="fa-solid fa-arrow-right"></i>
                        </button>
                        <button class="onboarding-btn onboarding-btn-start" id="startBtn" onclick="Onboarding.complete()" style="display: none;">
                            <i class="fa-solid fa-rocket"></i> Başlayalım!
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Update step display
    updateStep(step) {
        this.currentStep = step;

        // Update step dots
        document.querySelectorAll('.step-dot').forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i < step) dot.classList.add('completed');
            if (i === step) dot.classList.add('active');
        });

        // Update step content
        document.querySelectorAll('.walkthrough-step').forEach((el, i) => {
            el.classList.toggle('active', i === step);
        });

        // Update buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const startBtn = document.getElementById('startBtn');
        const dontShowLabel = document.getElementById('dontShowAgainLabel');

        if (prevBtn) prevBtn.style.display = step > 0 ? 'inline-flex' : 'none';

        if (step === 0) {
            // Welcome screen
            nextBtn.innerHTML = 'Tura Başla <i class="fa-solid fa-arrow-right"></i>';
            nextBtn.style.display = 'inline-flex';
            startBtn.style.display = 'none';
            dontShowLabel.style.display = 'none';
        } else if (step === this.totalSteps - 1) {
            // Last step
            nextBtn.style.display = 'none';
            startBtn.style.display = 'inline-flex';
            dontShowLabel.style.display = 'flex';
        } else {
            // Middle steps
            nextBtn.innerHTML = 'Devam <i class="fa-solid fa-arrow-right"></i>';
            nextBtn.style.display = 'inline-flex';
            startBtn.style.display = 'none';
            dontShowLabel.style.display = 'none';
        }
    },

    // Next step
    next() {
        if (this.currentStep < this.totalSteps - 1) {
            this.updateStep(this.currentStep + 1);
        }
    },

    // Previous step
    prev() {
        if (this.currentStep > 0) {
            this.updateStep(this.currentStep - 1);
        }
    },

    // Skip onboarding
    skip() {
        localStorage.setItem('kolaycrm_onboarding_skipped', 'true');
        this.close();
    },

    // Complete onboarding
    complete() {
        const dontShow = document.getElementById('dontShowAgain');
        if (dontShow && dontShow.checked) {
            localStorage.setItem('kolaycrm_onboarding_completed', 'true');
        }
        this.close();

        // Show success toast
        this.showToast('🎉 Harika! Artık Kolay İş Takip\'i kullanmaya hazırsınız!');
    },

    // Close modal
    close() {
        const overlay = document.getElementById('onboardingOverlay');
        if (overlay) {
            overlay.style.animation = 'onboarding-fade-in 0.3s ease reverse';
            setTimeout(() => overlay.remove(), 300);
        }
        this.isCompleted = true;
    },

    // Show toast notification
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'onboarding-toast';
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
            z-index: 10001;
            animation: toast-slide-up 0.5s ease forwards;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toast-slide-up {
                to { transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'toast-slide-up 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Reset onboarding (for testing)
    reset() {
        localStorage.removeItem('kolaycrm_onboarding_completed');
        localStorage.removeItem('kolaycrm_onboarding_skipped');
        this.isCompleted = false;
        console.log('Onboarding reset. Refresh the page to see it again.');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let the main content load first
    setTimeout(() => Onboarding.init(), 500);
});

// Export for manual triggering
window.Onboarding = Onboarding;
