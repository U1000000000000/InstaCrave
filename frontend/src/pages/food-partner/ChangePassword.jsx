import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || !confirm) {
      setError('Please fill all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/food-partner/edit`, { password }, { withCredentials: true });
      setSuccess('Password changed successfully!');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error changing password.');
    }
    setLoading(false);
  };

  return (
    <main className="profile-page" style={{maxWidth:420,margin:'40px auto',paddingTop:'40px'}}>
      <h2 style={{color:'var(--color-text)',fontWeight:700,fontSize:'1.5rem',marginBottom:24,textAlign:'left'}}>Change Password</h2>
      <div style={{background:'var(--color-surface)',borderRadius:16,boxShadow:'var(--shadow-md)',padding:'32px 24px 24px 24px'}}>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
          <label style={{fontWeight:600, color:'var(--color-text)'}}>New Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            style={{padding:'12px 16px',borderRadius:8,border:'1.5px solid var(--color-border)',background:'var(--color-bg)',color:'var(--color-text)',fontSize:'1.08rem',marginBottom:8}} />
          <label style={{fontWeight:600, color:'var(--color-text)'}}>Confirm Password</label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
            style={{padding:'12px 16px',borderRadius:8,border:'1.5px solid var(--color-border)',background:'var(--color-bg)',color:'var(--color-text)',fontSize:'1.08rem',marginBottom:8}} />
          {error && <div style={{color:'var(--color-danger)',marginBottom:8,fontWeight:600}}>{error}</div>}
          {success && <div style={{color:'var(--color-accent)',marginBottom:8,fontWeight:600}}>{success}</div>}
          <button type="submit" disabled={loading} style={{marginTop:8,padding:'12px 0',background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:'1.13rem',cursor:'pointer'}}>Change Password</button>
          <button type="button" onClick={()=>navigate(-1)} style={{marginTop:4,padding:'10px 0',background:'none',color:'var(--color-accent)',border:'none',borderRadius:8,fontWeight:600,fontSize:'1.08rem',cursor:'pointer'}}>Cancel</button>
        </form>
      </div>
    </main>
  );
};

export default ChangePassword;
