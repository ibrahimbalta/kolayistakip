const Auth = {
    // Constants
    TRIAL_DAYS: 7,

    // Methods
    register: async (username, password, companyName) => {
        try {
            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: username + '@kolayistakip.com',
                password: password,
                options: {
                    data: {
                        username: username,
                        company_name: companyName
                    }
                }
            });

            if (authError) {
                return { success: false, message: authError.message };
            }

            // Calculate trial dates
            const now = new Date();
            const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

            // Create user profile in database (Backup for trigger)
            const { error: profileError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    username: username,
                    company_name: companyName,
                    is_premium: false,
                    start_date: now.toISOString(),
                    created_at: now.toISOString(),
                    trial_start_date: now.toISOString(),
                    trial_end_date: trialEnd.toISOString(),
                    subscription_status: 'trial',
                    subscription_plan: 'free'
                }])
                .select();

            if (profileError) {
                // Ignore duplicate key error (if trigger already created it)
                if (profileError.code !== '23505') {
                    console.error('Profile creation error:', profileError);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: error.message };
        }
    },

    login: async (username, password) => {
        try {
            // Sign in with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username + '@kolayistakip.com',
                password: password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, message: 'Kullanıcı adı veya şifre hatalı.' };
                }
                return { success: false, message: error.message };
            }

            // Check if user is admin
            const { data: userData } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', data.user.id)
                .single();

            if (userData && userData.is_admin) {
                localStorage.setItem('isAdmin', 'true');
                return { success: true, isAdmin: true };
            }

            localStorage.removeItem('isAdmin');
            return { success: true, isAdmin: false };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Giriş başarısız: ' + error.message };
        }
    },

    resetPassword: async (email) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login.html',
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, message: error.message };
        }
    },

    updatePassword: async (newPassword) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
        } catch (error) {
            console.error('Password update error:', error);
            return { success: false, message: error.message };
        }
    },

    logout: async (shouldRedirect = true) => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem('isAdmin');
            if (shouldRedirect) {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (shouldRedirect) {
                window.location.href = 'login.html';
            }
        }
    },

    getCurrentUser: async () => {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return null;
        }

        try {
            // Get user profile from database
            let { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            // Self-healing: If user exists in Auth but not in users table, try to create it
            if (error && error.code === 'PGRST116') {
                console.log('User profile missing, creating now...');
                const now = new Date();
                const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

                const { data: newData, error: createError } = await supabase
                    .from('users')
                    .insert([{
                        id: session.user.id,
                        username: session.user.user_metadata.username || session.user.email.split('@')[0],
                        company_name: session.user.user_metadata.company_name || 'Firma',
                        is_premium: false,
                        start_date: now.toISOString(),
                        created_at: now.toISOString(),
                        trial_start_date: now.toISOString(),
                        trial_end_date: trialEnd.toISOString(),
                        subscription_status: 'trial',
                        subscription_plan: 'free'
                    }])
                    .select()
                    .single();

                if (!createError) {
                    data = newData;
                    error = null;
                } else {
                    console.error('Error creating missing profile:', createError);
                }
            }

            // If we have data, return it
            if (data) {
                return {
                    id: data.id,
                    username: data.username,
                    company_name: data.company_name,
                    is_premium: data.is_premium || false,
                    is_admin: data.is_admin || false,
                    start_date: new Date(data.start_date),
                    trial_end_date: data.trial_end_date ? new Date(data.trial_end_date) : null,
                    subscription_status: data.subscription_status || 'trial',
                    subscription_plan: data.subscription_plan || 'free',
                    subscription_end_date: data.subscription_end_date ? new Date(data.subscription_end_date) : null
                };
            }

            // FALLBACK: If DB fetch failed (RLS or other error), return session data
            console.warn('Could not fetch user profile, using session data fallback. Error:', error);
            const now = new Date();
            const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

            return {
                id: session.user.id,
                username: session.user.user_metadata.username || session.user.email.split('@')[0],
                company_name: session.user.user_metadata.company_name || 'Firma',
                is_premium: false,
                start_date: now,
                trial_end_date: trialEnd,
                subscription_status: 'trial',
                subscription_plan: 'free',
                is_fallback: true
            };

        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            const now = new Date();
            const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

            // Still return session data if possible
            return {
                id: session.user.id,
                username: session.user.email.split('@')[0],
                company_name: 'Firma',
                is_premium: false,
                start_date: now,
                trial_end_date: trialEnd,
                subscription_status: 'trial',
                subscription_plan: 'free',
                is_fallback: true
            };
        }
    },

    checkAuth: async () => {
        const user = await Auth.getCurrentUser();

        if (!user) {
            window.location.href = 'login.html';
            return null;
        }

        // Check if trial expired and user is not premium/admin
        if (user.subscription_status === 'trial' && user.trial_end_date) {
            const now = new Date();
            const trialEnd = new Date(user.trial_end_date);

            if (now > trialEnd && !user.is_premium && !user.is_admin) {
                // Trial expired - show message and redirect to pricing
                alert('⚠️ Deneme süreniz sona ermiştir.\n\nPremium özelliklere devam etmek için lütfen bir abonelik paketi seçin.');
                window.location.href = 'index.html#pricing';
                return null;
            }
        }

        // Check if subscription expired
        if (user.subscription_status === 'active' && user.subscription_end_date) {
            const now = new Date();
            const subEnd = new Date(user.subscription_end_date);

            if (now > subEnd) {
                // Subscription expired - show message and redirect to pricing
                const planText = user.subscription_plan === 'yearly' ? 'Yıllık' : 'Aylık';
                alert(`⚠️ ${planText} premium aboneliğiniz sona ermiştir.\n\nDevam etmek için lütfen aboneliğinizi yenileyin.`);
                window.location.href = 'index.html#pricing';
                return null;
            }
        }

        return user;
    },

    getDaysLeft: (user) => {
        if (!user) return 0;

        // If active subscription, check subscription end date
        if (user.subscription_status === 'active' && user.subscription_end_date) {
            const now = new Date();
            const end = new Date(user.subscription_end_date);
            const diffTime = end - now;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // If trial, check trial end date
        if (user.subscription_status === 'trial' && user.trial_end_date) {
            const now = new Date();
            const end = new Date(user.trial_end_date);
            const diffTime = end - now;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Fallback to old calculation
        const start = new Date(user.start_date);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Auth.TRIAL_DAYS - diffDays;
    }
};
