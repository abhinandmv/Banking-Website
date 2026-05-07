import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ApplyCurrentAccount from './pages/ApplyCurrentAccount';
import Dashboard from './pages/Dashboard';
import CurrentDashboard from './pages/CurrentDashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import AccountDetails from './pages/AccountDetails';
import DebitCards from './pages/DebitCards';
import DebitCardDetail from './pages/DebitCardDetail';
import GSTPayment from './pages/GSTPayment';
import Statements from './pages/Statements';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: 13, maxWidth: 380 },
            success: { style: { borderLeft: '4px solid #16a34a' } },
            error: { style: { borderLeft: '4px solid #dc2626' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/current/apply" element={<ApplyCurrentAccount />} />

          {/* Protected (with sidebar layout) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={
              <ProtectedRoute requiredType="SAVINGS"><Dashboard /></ProtectedRoute>
            } />
            <Route path="/current/dashboard" element={
              <ProtectedRoute requiredType="CURRENT"><CurrentDashboard /></ProtectedRoute>
            } />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/account" element={<AccountDetails />} />
            <Route path="/cards" element={
              <ProtectedRoute requiredType="SAVINGS"><DebitCards /></ProtectedRoute>
            } />
            <Route path="/cards/:id" element={
              <ProtectedRoute requiredType="SAVINGS"><DebitCardDetail /></ProtectedRoute>
            } />
            <Route path="/statements" element={<Statements />} />
            <Route path="/current/gst" element={
              <ProtectedRoute requiredType="CURRENT"><GSTPayment /></ProtectedRoute>
            } />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
