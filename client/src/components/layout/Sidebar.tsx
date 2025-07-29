import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
    const { logout, user } = useAuth();
    
    // Стилизуем NavLink для отображения активной ссылки
    const navLinkStyles = ({ isActive }: { isActive: boolean }) => ({
        display: 'block',
        padding: '10px 15px',
        color: isActive ? '#007bff' : 'white',
        backgroundColor: isActive ? 'white' : 'transparent',
        textDecoration: 'none',
        borderRadius: '5px',
        marginBottom: '5px'
    });
    
    const styles = {
        sidebar: { width: '220px', background: '#333', color: 'white', height: '100vh', padding: '20px', display: 'flex', flexDirection: 'column' as 'column' },
        userInfo: { marginBottom: '30px', borderBottom: '1px solid #555', paddingBottom: '20px' },
        nav: { flexGrow: 1 },
        logoutButton: { background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', width: '100%', cursor: 'pointer' }
    };

    return (
        <div style={styles.sidebar}>
            <div style={styles.userInfo}>
                <h3>{user?.username}</h3>
                <p>{user?.email}</p>
            </div>
            <nav style={styles.nav}>
                <NavLink to="/profile" style={navLinkStyles}>Профиль</NavLink>
                <NavLink to="/lobby/tic-tac-toe" style={navLinkStyles}>Крестики-нолики</NavLink>
                <NavLink to="/lobby/checkers" style={navLinkStyles}>Шашки</NavLink>
                {/* Добавим сюда ссылки на другие игры и турниры позже */}
            </nav>
            <button onClick={logout} style={styles.logoutButton}>Выйти</button>
        </div>
    );
};