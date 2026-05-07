import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/current/dashboard': 'Dashboard',
  '/deposit': 'Deposit',
  '/withdraw': 'Withdraw',
  '/transfer': 'Transfer Money',
  '/transactions': 'Transactions',
  '/statements': 'Account Statements',
  '/account': 'Account Details',
  '/cards': 'Debit Cards',
  '/current/gst': 'GST / Tax Payments',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isSavings = user?.account_type === 'SAVINGS';
  const currentTitle = PAGE_TITLES[location.pathname] || 'Banking';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">DB</div>
          DBank
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>

          {isSavings ? (
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">⊞</span> Dashboard
            </NavLink>
          ) : (
            <NavLink to="/current/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">⊞</span> Dashboard
            </NavLink>
          )}

          <div className="sidebar-section-label">Transactions</div>

          <NavLink to="/deposit" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">↓</span> Deposit
          </NavLink>
          <NavLink to="/withdraw" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">↑</span> Withdraw
          </NavLink>
          <NavLink to="/transfer" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">⇄</span> Transfer
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">≡</span> Transactions
          </NavLink>
          <NavLink to="/statements" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">⬇</span> Statements
          </NavLink>

          <div className="sidebar-section-label">Account</div>

          <NavLink to="/account" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">◉</span> Account Details
          </NavLink>

          {isSavings && (
            <NavLink to="/cards" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">▬</span> Debit Cards
            </NavLink>
          )}

          {!isSavings && (
            <>
              <div className="sidebar-section-label">Business</div>
              <NavLink to="/current/gst" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-link-icon">₹</span> GST Payments
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-sub">
            <span className={`badge ${isSavings ? 'badge-savings' : 'badge-current'}`}>
              {user?.account_type}
            </span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{currentTitle}</span>
          <span className="topbar-acno">A/C: {user?.acno}</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
