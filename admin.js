document.addEventListener('DOMContentLoaded', async () => {
    // STRICT ADMIN CHECK
    // We do NOT trust localStorage. We always check the database.
    const user = await Auth.checkAuth();

    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Check DB for is_admin status
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !userData || !userData.is_admin) {
        // Not an admin
        alert('Bu sayfaya erişim yetkiniz yok. Lütfen yönetici girişi yapın.');
        window.location.href = 'admin-login.html';
        return;
    }

    setupTabs();
    await loadDashboard();
    await loadPaymentRequests();
    await loadMessages();
    await loadBlogPosts();
    await loadCareerPositions();
});

function setupTabs() {
    window.switchTab = function (tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        const btn = document.querySelector(`button[onclick="switchTab('${tabName}')"]`);
        if (btn) btn.classList.add('active');

        const tab = document.getElementById(tabName + '-tab');
        if (tab) tab.classList.add('active');
    };
}

async function loadDashboard() {
    const tableBody = document.getElementById('userTableBody');
    const totalUsersEl = document.getElementById('totalUsers');
    const premiumUsersEl = document.getElementById('premiumUsers');
    const trialUsersEl = document.getElementById('trialUsers');

    if (!tableBody) return; // Guard if element missing

    try {
        // Get all users from Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        let premiumCount = 0;
        let trialCount = 0;

        users.forEach(user => {
            if (user.is_premium) {
                premiumCount++;
            } else {
                trialCount++;
            }
        });

        // Update Stats
        if (totalUsersEl) totalUsersEl.textContent = users.length;
        if (premiumUsersEl) premiumUsersEl.textContent = premiumCount;
        if (trialUsersEl) trialUsersEl.textContent = trialCount;

        // Render Table
        tableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');

            const userData = {
                ...user,
                start_date: new Date(user.start_date)
            };

            const daysLeft = Auth.getDaysLeft(userData);
            let statusHtml = '';

            if (user.is_premium) {
                statusHtml = '<span class="status-badge status-premium">Premium</span>';
            } else if (daysLeft < 0) {
                statusHtml = '<span class="status-badge status-expired">Süre Doldu</span>';
            } else {
                statusHtml = `<span class="status-badge status-trial">Deneme (${daysLeft} gün)</span>`;
            }
            // Abonelik bitiş tarihini hesapla
            let endDateText = '-';
            if (user.subscription_status === 'active' && user.subscription_end_date) {
                endDateText = new Date(user.subscription_end_date).toLocaleDateString('tr-TR');
            } else if (user.subscription_status === 'trial' && user.trial_end_date) {
                endDateText = new Date(user.trial_end_date).toLocaleDateString('tr-TR');
            }
            tr.innerHTML = `
                <td>${Security.sanitize(user.company_name)}</td>
                <td>${Security.sanitize(user.username)}</td>
                <td>${new Date(user.start_date).toLocaleDateString('tr-TR')}</td>
                <td>${statusHtml}</td>
                <td>${endDateText}</td>
                <td>
                    ${!user.is_premium ? `<button onclick="upgradeUser('${user.id}')" class="action-btn-sm btn-upgrade">Premium Yap</button>` : ''}
                    <button onclick="deleteUser('${user.id}')" class="action-btn-sm btn-ban">Sil</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // alert('Dashboard yüklenirken bir hata oluştu.');
    }
}

async function loadPaymentRequests() {
    try {
        const { data: payments, error } = await supabase
            .from('payment_requests')
            .select(`
                *,
                users:user_id (username, company_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update stats
        const pending = payments.filter(p => p.status === 'pending').length;
        const approved = payments.filter(p => p.status === 'approved').length;
        const totalRevenue = payments
            .filter(p => p.status === 'approved')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const pendingEl = document.getElementById('pendingPayments');
        const approvedEl = document.getElementById('approvedPayments');
        const revenueEl = document.getElementById('totalRevenue');

        if (pendingEl) pendingEl.textContent = pending;
        if (approvedEl) approvedEl.textContent = approved;
        if (revenueEl) revenueEl.textContent = totalRevenue.toFixed(0) + ' TL';

        // Display payment requests
        const container = document.getElementById('paymentRequestsList');
        if (!container) return;

        if (payments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz ödeme talebi yok.</p>';
            return;
        }

        container.innerHTML = payments.map(payment => `
            <div class="payment-card">
                <div class="payment-header">
                    <div>
                        <h3>${Security.sanitize(payment.users?.company_name || payment.users?.username || 'Bilinmeyen')}</h3>
                        <p style="color: #64748b; font-size: 0.9rem;">@${Security.sanitize(payment.users?.username || 'N/A')}</p>
                    </div>
                    <span class="status-${payment.status}">${getStatusText(payment.status)}</span>
                </div>
                <div class="payment-info">
                    <div class="info-item">
                        <span class="info-label">Paket</span>
                        <span class="info-value">${payment.package_type === 'monthly' ? '📅 Aylık' : '🎯 Yıllık'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tutar</span>
                        <span class="info-value">${payment.amount} TL</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tarih</span>
                        <span class="info-value">${new Date(payment.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                </div>
                ${payment.payment_proof ? `
                    <div>
                        <span class="info-label">Dekont:</span>
                        <a href="${payment.payment_proof}" target="_blank">
                            <img src="${payment.payment_proof}" class="receipt-preview" alt="Dekont" />
                        </a>
                    </div>
                ` : ''}
                ${payment.status === 'pending' ? `
                    <div class="action-buttons">
                        <button class="btn-approve" onclick="approvePayment('${payment.id}', '${payment.user_id}', '${payment.package_type}')">
                            <i class="fas fa-check"></i> Onayla
                        </button>
                        <button class="btn-reject" onclick="rejectPayment('${payment.id}')">
                            <i class="fas fa-times"></i> Reddet
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading payments:', error);
        // alert('Ödeme talepleri yüklenirken hata oluştu!');
    }
}

async function approvePayment(paymentId, userId, packageType) {
    if (!confirm('Bu ödemeyi onaylamak istediğinizden emin misiniz?')) return;

    try {
        const currentUser = await Auth.checkAuth();

        // Update payment status
        const { error: paymentError } = await supabase
            .from('payment_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: currentUser.id
            })
            .eq('id', paymentId);

        if (paymentError) throw paymentError;

        // Activate subscription using SQL function
        const months = packageType === 'monthly' ? 1 : 12;
        const { data, error: activationError } = await supabase
            .rpc('activate_subscription', {
                user_id_param: userId,
                plan_type: packageType,
                months: months
            });

        if (activationError) throw activationError;

        alert(`✅ Ödeme onaylandı! Kullanıcı ${packageType === 'monthly' ? 'aylık' : 'yıllık'} premium üye oldu.\n${data}`);
        loadPaymentRequests();
        loadDashboard(); // Refresh user list too
    } catch (error) {
        console.error('Error approving payment:', error);
        alert('Ödeme onaylanırken hata oluştu: ' + error.message);
    }
}

async function rejectPayment(paymentId) {
    if (!confirm('Bu ödemeyi reddetmek istediğinizden emin misiniz?')) return;

    try {
        const { error } = await supabase
            .from('payment_requests')
            .update({ status: 'rejected' })
            .eq('id', paymentId);

        if (error) throw error;

        alert('❌ Ödeme reddedildi.');
        loadPaymentRequests();
    } catch (error) {
        console.error('Error rejecting payment:', error);
        alert('Ödeme reddedilirken hata oluştu!');
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ Bekliyor',
        'approved': '✅ Onaylandı',
        'rejected': '❌ Reddedildi'
    };
    return statusMap[status] || status;
}

async function upgradeUser(userId) {
    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        if (confirm(`${user.username} kullanıcısını Premium pakete yükseltmek istiyor musunuz?`)) {
            const { error } = await supabase
                .from('users')
                .update({ is_premium: true })
                .eq('id', userId);

            if (error) throw error;

            await loadDashboard();
        }
    } catch (error) {
        console.error('Error upgrading user:', error);
        alert('Kullanıcı yükseltilirken bir hata oluştu.');
    }
}

async function deleteUser(userId) {
    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        if (confirm(`${user.username} kullanıcısını ve tüm verilerini silmek istiyor musunuz?`)) {
            // Delete user's tasks
            await supabase.from('tasks').delete().eq('user_id', userId);

            // Delete user's employees
            await supabase.from('employees').delete().eq('user_id', userId);

            // Delete user
            await supabase.from('users').delete().eq('id', userId);

            await loadDashboard();
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Kullanıcı silinirken bir hata oluştu.');
    }
}

// --- Messages ---
async function loadMessages() {
    const container = document.getElementById('messagesList');
    if (!container) return;

    try {
        const { data: messages, error } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz mesaj yok.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="payment-card">
                <div class="payment-header">
                    <div>
                        <h3>${Security.sanitize(msg.name)}</h3>
                        <p style="color: #64748b; font-size: 0.9rem;">${Security.sanitize(msg.email)}</p>
                    </div>
                    <span style="color: #64748b; font-size: 0.85rem;">${new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p style="color: #334155;">${Security.sanitize(msg.message)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<p style="text-align: center; color: #ef4444;">Mesajlar yüklenirken hata oluştu.</p>';
    }
}

// --- Blog ---
async function loadBlogPosts() {
    const container = document.getElementById('blogList');
    if (!container) return;

    try {
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz blog yazısı yok.</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="payment-card">
                <div class="payment-header">
                    <div>
                        <h3>${Security.sanitize(post.title)}</h3>
                        <span class="status-badge status-trial" style="margin-top: 5px; display: inline-block;">${Security.sanitize(post.category)}</span>
                    </div>
                    <div class="action-buttons" style="border: none; padding: 0; margin: 0;">
                        <button onclick="editBlogPost('${post.id}')" class="btn-upgrade" style="padding: 6px 12px; font-size: 0.8rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteBlogPost('${post.id}')" class="btn-reject" style="padding: 6px 12px; font-size: 0.8rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p style="color: #64748b; font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${Security.sanitize(post.content)}
                </p>
                <div style="margin-top: 10px; font-size: 0.8rem; color: #94a3b8;">
                    ${new Date(post.created_at).toLocaleDateString('tr-TR')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading blog posts:', error);
        container.innerHTML = '<p style="text-align: center; color: #ef4444;">Yazılar yüklenirken hata oluştu.</p>';
    }
}

window.showAddBlogModal = function () {
    document.getElementById('blogModal').style.display = 'flex';
    document.getElementById('blogForm').reset();
    document.getElementById('blogId').value = '';
}

window.closeBlogModal = function () {
    document.getElementById('blogModal').style.display = 'none';
}

window.editBlogPost = async function (id) {
    try {
        const { data: post, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('blogId').value = post.id;
        document.getElementById('blogTitle').value = post.title;
        document.getElementById('blogCategory').value = post.category;
        document.getElementById('blogContent').value = post.content;

        document.getElementById('blogModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching blog post:', error);
        alert('Yazı bilgileri alınamadı.');
    }
}

window.deleteBlogPost = async function (id) {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return;

    try {
        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadBlogPosts();
    } catch (error) {
        console.error('Error deleting blog post:', error);
        alert('Yazı silinirken hata oluştu.');
    }
}

document.getElementById('blogForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('blogId').value;
    const title = document.getElementById('blogTitle').value;
    const category = document.getElementById('blogCategory').value;
    const content = document.getElementById('blogContent').value;

    try {
        if (id) {
            // Update
            const { error } = await supabase
                .from('blog_posts')
                .update({ title, category, content })
                .eq('id', id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from('blog_posts')
                .insert([{ title, category, content }]);
            if (error) throw error;
        }

        closeBlogModal();
        await loadBlogPosts();
        alert('Blog yazısı kaydedildi!');
    } catch (error) {
        console.error('Error saving blog post:', error);
        alert('Kaydedilirken bir hata oluştu.');
    }
});

// --- Career ---
async function loadCareerPositions() {
    const container = document.getElementById('careerList');
    if (!container) return;

    try {
        const { data: positions, error } = await supabase
            .from('career_positions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (positions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz açık pozisyon yok.</p>';
            return;
        }

        container.innerHTML = positions.map(pos => `
            <div class="payment-card">
                <div class="payment-header">
                    <div>
                        <h3>${Security.sanitize(pos.title)}</h3>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <span class="status-badge status-premium">${Security.sanitize(pos.type)}</span>
                            <span class="status-badge status-trial">${Security.sanitize(pos.location)}</span>
                        </div>
                    </div>
                    <div class="action-buttons" style="border: none; padding: 0; margin: 0;">
                        <button onclick="editCareerPosition('${pos.id}')" class="btn-upgrade" style="padding: 6px 12px; font-size: 0.8rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCareerPosition('${pos.id}')" class="btn-reject" style="padding: 6px 12px; font-size: 0.8rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p style="color: #64748b; font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${Security.sanitize(pos.description)}
                </p>
                <div style="margin-top: 10px; font-size: 0.8rem; color: #94a3b8;">
                    ${new Date(pos.created_at).toLocaleDateString('tr-TR')} • ${Security.sanitize(pos.experience)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading career positions:', error);
        container.innerHTML = '<p style="text-align: center; color: #ef4444;">Pozisyonlar yüklenirken hata oluştu.</p>';
    }
}

window.showAddCareerModal = function () {
    document.getElementById('careerModal').style.display = 'flex';
    document.getElementById('careerForm').reset();
    document.getElementById('careerId').value = '';
}

window.closeCareerModal = function () {
    document.getElementById('careerModal').style.display = 'none';
}

window.editCareerPosition = async function (id) {
    try {
        const { data: pos, error } = await supabase
            .from('career_positions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('careerId').value = pos.id;
        document.getElementById('careerTitle').value = pos.title;
        document.getElementById('careerLocation').value = pos.location;
        document.getElementById('careerType').value = pos.type;
        document.getElementById('careerExperience').value = pos.experience;
        document.getElementById('careerDescription').value = pos.description;

        document.getElementById('careerModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching career position:', error);
        alert('Pozisyon bilgileri alınamadı.');
    }
}

window.deleteCareerPosition = async function (id) {
    if (!confirm('Bu pozisyonu silmek istediğinizden emin misiniz?')) return;

    try {
        const { error } = await supabase
            .from('career_positions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadCareerPositions();
    } catch (error) {
        console.error('Error deleting career position:', error);
        alert('Pozisyon silinirken hata oluştu.');
    }
}

document.getElementById('careerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('careerId').value;
    const title = document.getElementById('careerTitle').value;
    const location = document.getElementById('careerLocation').value;
    const type = document.getElementById('careerType').value;
    const experience = document.getElementById('careerExperience').value;
    const description = document.getElementById('careerDescription').value;

    try {
        if (id) {
            // Update
            const { error } = await supabase
                .from('career_positions')
                .update({ title, location, type, experience, description })
                .eq('id', id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from('career_positions')
                .insert([{ title, location, type, experience, description }]);
            if (error) throw error;
        }

        closeCareerModal();
        await loadCareerPositions();
        alert('Pozisyon kaydedildi!');
    } catch (error) {
        console.error('Error saving career position:', error);
        alert('Kaydedilirken bir hata oluştu.');
    }
});

// Expose to window
window.upgradeUser = upgradeUser;
window.deleteUser = deleteUser;
window.approvePayment = approvePayment;
window.rejectPayment = rejectPayment;
window.switchTab = switchTab;
