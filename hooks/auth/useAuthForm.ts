import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { logErrorToDB } from '@/utils/errorLogger';

export const useAuthForm = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form Fields
    const [identifier, setIdentifier] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
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

        setLoading(true);
        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: { data: { phone: formattedPhone } }
            });

            if (error) throw error;

            if (data.session) {
                await supabase.from('profiles').update({
                    phone: formattedPhone,
                    current_session_id: data.session.user.id
                }).eq('id', data.session.user.id);

                const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (!profile?.username) {
                    router.replace('/setup-profile');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                Alert.alert('Verify Email', 'Please check your email to verify your account.');
            }
        } catch (error: any) {
            logErrorToDB(error, 'Auth: Sign Up', undefined, email);
            Alert.alert('Sign Up Failed', error.message);
        } finally {
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

                const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.session.user.id).single();

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (!profile?.username) {
                    router.replace('/setup-profile');
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            logErrorToDB(error, 'Auth: Login', undefined, identifier);
            Alert.alert('Login Failed', error.message);
        } finally {
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
    };

    return {
        // State
        loading,
        identifier, setIdentifier,
        email, setEmail,
        phone, setPhone,
        password, setPassword,
        showPassword, setShowPassword,
        isSignUp,
        isForgotPassword, setIsForgotPassword,
        resetEmail, setResetEmail,
        // Actions
        handleAuth,
        toggleMode,
    };
};
