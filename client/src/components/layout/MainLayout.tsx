import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const MainLayout = () => {
    const styles = {
        layout: { display: 'flex' },
        mainContent: { flexGrow: 1, padding: '20px', height: '100vh', overflowY: 'auto' as 'auto' }
    };

    return (
        <div style={styles.layout}>
            <Sidebar />
            <main style={styles.mainContent}>
                <Outlet /> {/* Здесь будут рендериться наши страницы */}
            </main>
        </div>
    );
};