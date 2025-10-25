import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiVideo, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import '../styles/bottom-nav.css';

const UserBottomNav = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (e, path) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate('/user/login');
    }
  };

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom">
      <div className="bottom-nav__inner">
        <NavLink 
          to="/user/home" 
          end 
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          onClick={(e) => handleNavClick(e, '/user/home')}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <FiHome />
          </span>
        </NavLink>
        <NavLink 
          to="/user/search" 
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          onClick={(e) => handleNavClick(e, '/user/search')}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <FiSearch />
          </span>
        </NavLink>
        <NavLink 
          to="/user/reels" 
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          onClick={(e) => handleNavClick(e, '/user/reels')}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <FiVideo />
          </span>
        </NavLink>
        <NavLink 
          to="/user/profile" 
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          onClick={(e) => handleNavClick(e, '/user/profile')}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <FiUser />
          </span>
        </NavLink>
      </div>
    </nav>
  );
};

export default UserBottomNav;
