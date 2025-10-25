import React, { useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

const ChangeProfilePhoto = () => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const file = fileInputRef.current.files[0];
    if (!file) {
      setError('Please select an image.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('profile', file);
      await axios.patch(`${API_BASE_URL}/api/food-partner/edit`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profile photo updated!');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error updating photo.');
    }
    setLoading(false);
  };

    const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <main className="profile-page" style={{maxWidth:420,margin:'40px auto',paddingTop:'40px'}}>
      <h2 style={{color:'var(--color-text)',fontWeight:700,fontSize:'1.5rem',marginBottom:24,textAlign:'left'}}>Change Profile Photo</h2>
      <div style={{background:'var(--color-surface)',borderRadius:16,boxShadow:'var(--shadow-md)',padding:'32px 24px 24px 24px'}}>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border:'2.5px dashed var(--color-border)',
              borderRadius:12,
              background: dragActive ? 'rgba(226,55,71,0.08)' : 'var(--color-bg)',
              color:'var(--color-text-secondary)',
              padding:'36px 12px',
              textAlign:'center',
              fontWeight:600,
              fontSize:'1.08rem',
              marginBottom:12,
              cursor:'pointer',
              transition:'background 0.18s, border 0.18s',
              outline: dragActive ? '2px solid var(--color-accent)' : 'none',
              position:'relative'
            }}
            onClick={()=>fileInputRef.current.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{width:120,height:120,borderRadius:'50%',objectFit:'cover',margin:'0 auto 12px',border:'2px solid var(--color-border)'}} />
            ) : (
              <>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
                  <span style={{fontSize:'2.5rem',color:'var(--color-accent)',marginBottom:2,display:'block'}}>&uarr;</span>
                  <div style={{fontWeight:700, color:'var(--color-text)', fontSize:'1.18rem', marginBottom:2}}>Tap to upload</div>
                  <div style={{fontWeight:500, color:'var(--color-text-secondary)', fontSize:'1.08rem', marginBottom:2}}>or drag and drop</div>
                  <div style={{fontWeight:500, color:'var(--color-text-secondary)', fontSize:'1.02rem', marginTop:4}}>JPG, PNG, GIF &bull; Up to ~5MB</div>
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{display:'none'}}
            />
          </div>
          {error && <div style={{color:'var(--color-danger)',marginBottom:8,fontWeight:600}}>{error}</div>}
          {success && <div style={{color:'var(--color-accent)',marginBottom:8,fontWeight:600}}>{success}</div>}
          <button type="submit" disabled={loading} style={{marginTop:8,padding:'12px 0',background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:'1.13rem',cursor:'pointer'}}>Update Photo</button>
          <button type="button" onClick={()=>navigate(-1)} style={{marginTop:4,padding:'10px 0',background:'none',color:'var(--color-accent)',border:'none',borderRadius:8,fontWeight:600,fontSize:'1.08rem',cursor:'pointer'}}>Cancel</button>
        </form>
      </div>
    </main>
  );
};

export default ChangeProfilePhoto;
