import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/authService';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов.');
            return;
        }

        try {
            const { data } = await registerUser({ email, username, password });
            login(data); // Используем наш context для сохранения данных пользователя и токена
            navigate('/profile'); // Перенаправляем на страницу профиля после успешной регистрации
        } catch (err: any) {
            // Обработка ошибок от Axios
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Произошла ошибка при регистрации.');
            }
        }
    };
    
    // Для простоты используем базовый CSS. Позже можно заменить на UI-библиотеку
    const styles = {
        container: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' },
        formGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '5px' },
        input: { width: '100%', padding: '8px', boxSizing: 'border-box' as 'border-box' },
        button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' },
        error: { color: 'red', marginTop: '10px' }
    };

    return (
        <div style={styles.container}>
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Имя пользователя</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="password" style={styles.label}>Пароль</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
                </div>
                <button type="submit" style={styles.button}>Зарегистрироваться</button>
                {error && <p style={styles.error}>{error}</p>}
            </form>
        </div>
    );
};