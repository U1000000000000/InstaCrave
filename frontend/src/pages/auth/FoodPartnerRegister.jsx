import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/auth-shared.css';
import { authApi } from '../../services/api';
import { ROUTES } from '../../constants';
import LoadingSpinner from '../../components/LoadingSpinner';

const FoodPartnerRegister = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210");
  const navigate = useNavigate();
  const fileInputRef = React.useRef();
  
  const handleSubmit = async (e) => { 
    e.preventDefault();
    setError("");
    const businessName = e.target.businessName.value.trim();
    const contactName = e.target.contactName.value.trim();
    const phone = e.target.phone.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const address = e.target.address.value.trim();

        if (!businessName || !contactName || !phone || !email || !password || !address) {
      setError("Please fill in all fields.");
      return;
    }
        const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (!/^[0-9+\s-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError("Please add a valid phone number.");
      return;
    }
    // If phoneDigits is more than 10 and does not start with '+', show error
    if (phoneDigits.length > 10 && !phone.trim().startsWith('+')) {
      setError("Please add a valid phone number.");
      return;
    }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please add a valid email address.");
      return;
    }

        const formData = new FormData();
    formData.append('name', businessName);
    formData.append('contactName', contactName);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('address', address);
    if (profile) {
      formData.append('profile', profile);
    }

    setIsLoading(true);
    try {
      const response = await authApi.registerFoodPartner(formData);
      
            if (response.data.user?._id) {
        localStorage.setItem('userId', response.data.user._id);
      }
      
      setError("");
            window.location.href = ROUTES.FOOD_PARTNER.CREATE_FOOD;
    } catch (error) {
      setError(error.response?.data?.message || "There was an error registering!");
    } finally {
      setIsLoading(false);
    }
  };

    const handleProfileChange = (e) => {
    const file = e.target.files[0];
    setProfile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setProfilePreview("https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210");
    }
  };

  return (
    <div className="auth-page-wrapper">
      {isLoading && <LoadingSpinner fullScreen color="accent" />}
      <div className="auth-card" role="region" aria-labelledby="partner-register-title">
        <div className="d-flex justify-center mb-4 position-relative">
          <img
            src={profilePreview}
            alt="Profile preview"
            className="avatar-xl cursor-pointer auth-avatar-upload"
            onClick={() => fileInputRef.current?.click()}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="position-absolute d-flex align-center justify-center cursor-pointer auth-upload-button"
            aria-label="Change profile photo"
          >
            <svg width="16" height="16" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="3.5"/>
              <path d="M9.5 3h5a2 2 0 0 1 2 2l.5 2H21a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1h4l.5-2a2 2 0 0 1 2-2z"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileChange}
            className="d-none"
            aria-label="Upload profile photo"
          />
        </div>
        <header>
          <h1 id="partner-register-title" className="auth-title">Partner sign up</h1>
          <p className="auth-subtitle">Grow your business with our platform.</p>
        </header>
        {error && <div className="auth-error text-center mb-3">{error}</div>}
        <nav className="auth-alt-action auth-alt-action-adjusted">
          <strong className="text-bold">Switch:</strong> <Link to={ROUTES.AUTH.USER_REGISTER}>User</Link> • <Link to={ROUTES.AUTH.FOOD_PARTNER_REGISTER}>Food partner</Link>
        </nav>
        <form className="auth-form" onSubmit={handleSubmit} noValidate encType="multipart/form-data">
          <div className="field-group">
            <label htmlFor="businessName">Business Name</label>
            <input id="businessName" name="businessName" placeholder="Tasty Bites" autoComplete="organization" />
          </div>
          <div className="two-col">
            <div className="field-group">
              <label htmlFor="contactName">Contact Name</label>
              <input id="contactName" name="contactName" placeholder="Jane Doe" autoComplete="name" />
            </div>
            <div className="field-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" placeholder="+1 555 123 4567" autoComplete="tel" type="tel" pattern="[0-9+\s-]*" inputMode="tel" minLength="7" maxLength="18" />
            </div>
          </div>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="business@example.com" autoComplete="email" />
            </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Create password" autoComplete="new-password" />
          </div>
          <div className="field-group">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" placeholder="123 Market Street" autoComplete="street-address" />
            <p className="small-note">Full address helps customers find you faster.</p>
          </div>
          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Partner Account'}
          </button>
        </form>
        <div className="auth-alt-action">
          Already a partner? <Link to={ROUTES.AUTH.FOOD_PARTNER_LOGIN}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPartnerRegister;
