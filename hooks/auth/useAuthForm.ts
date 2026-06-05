import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { logErrorToDB } from '@/utils/errorLogger';
import { useAuthStore } from '@/store/useAuthStore';
import { initializeX25519Keys } from '@/utils/chatCrypto';

export const useAuthForm = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form Fields
    const [identifier, setIdentifier] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Mode flags
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleForgotPassword = async () => {
        if (!resetEmail.trim() || !resetEmail.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                redirectTo: 'chatwarriors://reset-password',
            });
            if (error) throw error;
            Alert.alert('Success', 'Password reset link sent to your email!');
            setIsForgotPassword(false);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        useAuthStore.getState().setIsRegistering(true);
        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

            // Check if phone already exists
            const { data: existingUser } = await supabase.from('profiles').select('id').eq('phone', formattedPhone).maybeSingle();
            if (existingUser) {
                Alert.alert('Error', 'An account with this phone number already exists.');
                useAuthStore.getState().setIsRegistering(false);
                setLoading(false);
                return;
            }
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: { data: { phone: formattedPhone } }
            });

            if (error) throw error;

            if (data.session) {
                // Wait for Supabase trigger to create the profile row
                let profileExists = false;
                for (let i = 0; i < 10; i++) {
                    const { data: p } = await supabase.from('profiles').select('id').eq('id', data.session.user.id).single();
                    if (p) { profileExists = true; break; }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (profileExists) {
                    await supabase.from('profiles').update({
                        phone: formattedPhone,
                        current_session_id: data.session.user.id
                    }).eq('id', data.session.user.id);
                    
                    try {
                        const publicKeyBase64 = await initializeX25519Keys(data.session.user.id, password);
                        await supabase.from('profiles').update({ public_key: publicKeyBase64 }).eq('id', data.session.user.id);
                    } catch(e) {
                        console.warn("E2EE Init Error:", e);
                    }
                }

                const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();
                
                if (profile) {
                    useAuthStore.setState({ profile });
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('Verify Email', 'Please check your email to verify your account.');
            }
        } catch (error: any) {
            logErrorToDB(error, 'Auth: Sign Up', undefined, email);
            Alert.alert('Sign Up Failed', error.message);
        } finally {
            useAuthStore.getState().setIsRegistering(false);
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!identifier.trim()) {
            Alert.alert('Error', 'Please enter your email or phone number');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        useAuthStore.getState().setIsRegistering(true);
        try {
            let loginEmail = identifier.trim().toLowerCase();

            if (!loginEmail.includes('@')) {
                const searchPhone = loginEmail.startsWith('+') ? loginEmail : `+91${loginEmail}`;
                const { data: profileMatch, error: searchError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('phone', searchPhone)
                    .maybeSingle();

                if (searchError) throw searchError;
                if (profileMatch?.email) {
                    loginEmail = profileMatch.email;
                } else {
                    throw new Error("No account found with this phone number. Try your email or Sign Up.");
                }
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: password,
            });

            if (error) throw error;

            if (data.session) {
                await supabase.from('profiles').update({
                    current_session_id: data.session.user.id
                }).eq('id', data.session.user.id);
                
                try {
                    const publicKeyBase64 = await initializeX25519Keys(data.session.user.id, password);
                    await supabase.from('profiles').update({ public_key: publicKeyBase64 }).eq('id', data.session.user.id);
                } catch(e) {
                    console.warn("E2EE Init Error:", e);
                }

                const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();

                if (profile) {
                    useAuthStore.setState({ profile });
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            logErrorToDB(error, 'Auth: Login', undefined, identifier);
            Alert.alert('Login Failed', error.message);
        } finally {
            useAuthStore.getState().setIsRegistering(false);
            setLoading(false);
        }
    };

    const handleAuth = () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isForgotPassword) {
            handleForgotPassword();
        } else if (isSignUp) {
            handleSignUp();
        } else {
            handleLogin();
        }
    };

    const toggleMode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isForgotPassword) {
            setIsForgotPassword(false);
        } else {
            setIsSignUp(prev => !prev);
        }
        setPassword('');
        setConfirmPassword('');
    };

    return {
        // State
        loading,
        identifier, setIdentifier,
        email, setEmail,
        phone, setPhone,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPassword, setShowPassword,
        isSignUp,
        isForgotPassword, setIsForgotPassword,
        resetEmail, setResetEmail,
        // Actions
        handleAuth,
        toggleMode,
    };
};
