import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { MainLayout } from './components/layout/MainLayout';
import { CheckersLobbyPage } from './pages/CheckersLobbyPage';
import type { JSX } from 'react';
// Импортируем остальные страницы, когда они будут созданы
// import { LoginPage } from './pages/LoginPage'; 
// import { ProfilePage } from './pages/ProfilePage';

// Компонент для защиты роутов
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Публичные роуты */}
            <Route path="/login" element={/*<LoginPage />*/ <div>Login Page</div>} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Приватные роуты (пример) */}
            <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/lobby/checkers" element={<CheckersLobbyPage />} />
              {/* <Route path="/lobby/tic-tac-toe" element={<TicTacToeLobbyPage />} /> */}
              {/* <Route path="/game/:gameType/:gameId" element={<GamePage />} /> */}
            </Route>


            {/* Роут по умолчанию */}
            <Route path="*" element={<Navigate to="/profile" />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;