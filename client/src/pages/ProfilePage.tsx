import React, { useState, useEffect } from 'react';
import { getProfile } from '../api/userService';
import { type IUserProfile } from '../types/user.types';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
    const [profile, setProfile] = useState<IUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { logout } = useAuth();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await getProfile();
                setProfile(data);
            } catch (err: any) {
                setError('Не удалось загрузить профиль. Попробуйте войти снова.');
                if (err.response && err.response.status === 401) {
                    logout(); // Если токен невалидный, разлогиниваем пользователя
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [logout]);

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;
    if (!profile) return <div>Профиль не найден.</div>;
    
    // Стили для наглядности
    const styles = {
        page: { fontFamily: 'sans-serif', padding: '20px' },
        card: { background: '#f4f4f4', padding: '20px', borderRadius: '8px', maxWidth: '600px', margin: 'auto' },
        avatar: { width: '100px', height: '100px', borderRadius: '50%', background: '#ccc', marginBottom: '20px' },
        stat: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '10px 0' },
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.avatar}><img src={profile.avatarUrl} alt="avatar" style={{width: '100%', borderRadius: '50%'}}/></div>
                <h2>{profile.username}</h2>
                <p>Email: {profile.email}</p>
                
                <div style={styles.stat}>
                    <span>Основной баланс:</span>
                    <strong>${profile.balance.toFixed(2)}</strong>
                </div>
                <div style={styles.stat}>
                    <span>Бонусный баланс:</span>
                    <strong>${profile.bonusBalance.toFixed(2)}</strong>
                </div>
                
                <h3 style={{marginTop: '30px'}}>Статистика</h3>
                <div style={styles.stat}><span>Всего игр сыграно:</span> <strong>{profile.stats.gamesPlayed}</strong></div>
                <div style={styles.stat}><span>Часов в игре:</span> <strong>{(profile.stats.hoursPlayed / 60).toFixed(1)}</strong></div>
                <div style={styles.stat}><span>Всего заработано:</span> <strong>${profile.stats.moneyEarned.toFixed(2)}</strong></div>
            </div>
        </div>
    );
};