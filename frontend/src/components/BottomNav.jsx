import React from 'react'
import { NavLink } from 'react-router-dom'
import { FaPlus, FaRegEye, FaUserCircle } from 'react-icons/fa';
import '../styles/bottom-nav.css'

const BottomNav = ({ isFoodPartner }) => {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom">
      <div className="bottom-nav__inner">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <span className="bottom-nav__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5"/>
              <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>
            </svg>
          </span>
          <span className="bottom-nav__label">Home</span>
        </NavLink>

        <NavLink to="/saved" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <span className="bottom-nav__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>
            </svg>
          </span>
          <span className="bottom-nav__label">Saved</span>
        </NavLink>
        {isFoodPartner && (
          <>
            <NavLink to="/create-food" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} 
              style={{fontSize: '1.5rem'}} 
            >
              <span className="bottom-nav__icon" aria-hidden="true"><FaPlus /></span>
              <span className="bottom-nav__label">Add</span>
            </NavLink>
            <NavLink to="/food-partner/profile" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} 
              style={{fontSize: '1.5rem'}} 
            >
              <span className="bottom-nav__icon" aria-hidden="true"><FaUserCircle /></span>
              <span className="bottom-nav__label">Profile</span>
            </NavLink>
            <NavLink to="/food-partner/preview" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} 
              style={{fontSize: '1.5rem'}} 
            >
              <span className="bottom-nav__icon" aria-hidden="true"><FaRegEye /></span>
              <span className="bottom-nav__label">Preview</span>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  )
}

export default BottomNav
