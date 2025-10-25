import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiPlusSquare, FiUser, FiEye } from 'react-icons/fi';
import '../styles/bottom-nav.css';

const BottomNavFoodPartner = () => {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom">
      <div className="bottom-nav__inner">
        <NavLink to="/food-partner/dashboard" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          style={{fontSize: '1.5rem'}}
        >
          <span className="bottom-nav__icon" aria-hidden="true"><FiGrid style={{borderRadius: 6}} /></span>
        </NavLink>
        <NavLink to="/create-food" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          style={{fontSize: '1.5rem'}}
        >
          <span className="bottom-nav__icon" aria-hidden="true"><FiPlusSquare style={{borderRadius: 6}} /></span>
        </NavLink>
        <NavLink to="/food-partner/profile" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          style={{fontSize: '1.5rem'}}
        >
          <span className="bottom-nav__icon" aria-hidden="true"><FiUser /></span>
        </NavLink>
        <NavLink to="/food-partner/preview" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          style={{fontSize: '1.5rem'}}
        >
          <span className="bottom-nav__icon" aria-hidden="true"><FiEye /></span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNavFoodPartner;
