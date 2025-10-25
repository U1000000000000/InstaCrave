import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth-shared.css';
import { ROUTES } from '../../constants';

const ChooseRegister = () => {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="choose-register-title">
        <header>
          <h1 id="choose-register-title" className="auth-title">Register</h1>
          <p className="auth-subtitle">Pick how you want to join the platform.</p>
        </header>
        <div className="d-flex flex-column gap-4">
          <Link to={ROUTES.AUTH.USER_REGISTER} className="btn btn-primary btn-block" style={{textDecoration: 'none'}}>
            Register as normal user
          </Link>
          <Link to={ROUTES.AUTH.FOOD_PARTNER_REGISTER} className="btn btn-secondary btn-block" style={{textDecoration: 'none'}}>
            Register as food partner
          </Link>
        </div>
        <div className="auth-alt-action mt-2">
          Already have an account? <Link to={ROUTES.AUTH.USER_LOGIN}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ChooseRegister;
