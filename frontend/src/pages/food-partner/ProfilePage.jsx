import React, { useEffect, useState, useRef } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { ROUTES } from '../../constants';
import '../../styles/profile.css';
import LoadingSpinner from '../../components/LoadingSpinner';
import { applyTheme } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

function useMealCardHoverStyle() {
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('meal-card-hover-style')) {
      const style = document.createElement('style');
      style.id = 'meal-card-hover-style';
      style.innerHTML = `
        .meal-card-hover:hover .meal-arrow {
          filter: drop-shadow(0 0 6px var(--color-accent));
          color: var(--color-accent-hover);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

const FoodPartnerProfile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
    const aboutRef = useRef(null);
  const followersRef = useRef(null);
  const mealsRef = useRef(null);
  const underlineContainerRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState('');   const fileInputRef = useRef();
  const inputRef = useRef();
  useMealCardHoverStyle();

  const fetchProfile = () => {
    axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true })
      .then(response => {
        setProfile(response.data.foodPartner);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEdit = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
    setError('');
    setMenuOpen('');
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setError('');
    try {
      if (editField === 'profileImage') {
        const file = fileInputRef.current.files[0];
        if (!file) throw new Error('No file selected');
        const formData = new FormData();
        formData.append('profile', file);
        await axios.patch(`${API_BASE_URL}/api/food-partner/edit`, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.patch(`${API_BASE_URL}/api/food-partner/edit`, {
          [editField]: editValue
        }, { withCredentials: true });
      }
      setEditField(null);
      setEditValue('');
      fetchProfile();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error updating');
    }
    setEditLoading(false);
  };

  const handleEditCancel = () => {
    setEditField(null);
    setEditValue('');
    setError('');
    setMenuOpen('');
  };

    const handleLogout = async () => {
    try {
      await logout();
      // Use window.location.href for full page reload to clear all state
      window.location.href = ROUTES.AUTH.FOOD_PARTNER_LOGIN;
    } catch (err) {
      console.error('Logout error:', err);
      // Still redirect even if logout request fails
      window.location.href = ROUTES.AUTH.FOOD_PARTNER_LOGIN;
    }
  };

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeOptions = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];
  const themeMenuRef = useRef();
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const handleThemeChange = (val) => {
    setTheme(val);
    localStorage.setItem('theme', val);
    applyTheme(val);
    setThemeMenuOpen(false);
  };
  useEffect(() => {
    if (!themeMenuOpen) return;
    function handleClick(e) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themeMenuOpen]);

  useEffect(() => {
    function updateUnderline() {
      let ref = null;
      if (activeTab === 'about') ref = aboutRef;
      else if (activeTab === 'followers') ref = followersRef;
      else if (activeTab === 'meals') ref = mealsRef;
      if (ref && ref.current && underlineContainerRef.current) {
        const labelRect = ref.current.getBoundingClientRect();
        const containerRect = underlineContainerRef.current.getBoundingClientRect();
        setUnderline({
          left: labelRect.left - containerRect.left,
          width: labelRect.width
        });
      }
    }
        updateUnderline();
    const raf = requestAnimationFrame(updateUnderline);
    const timeout = setTimeout(updateUnderline, 50);
    window.addEventListener('resize', updateUnderline);
    return () => {
      window.removeEventListener('resize', updateUnderline);
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [activeTab, profile]);

  if (loading) return <LoadingSpinner fullScreen color="accent" />;
  if (!profile) return (
    <div className="empty-state">
      <div className="empty-state-icon">🍽️</div>
      <p>Profile not found.</p>
    </div>
  );

  return (
  <main className="profile-page" style={{paddingBottom: '64px'}}>
      <div className="d-flex align-center justify-between gap-4 mb-4 mt-2">
        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          paddingLeft: '2px',
          margin: 0
        }}>Profile</h2>
        <img
          src={profile.profileImage || 'https://images.unsplash.com/photo-1754653099086-3bddb9346d37?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw0Nnx8fGVufDB8fHx8fA%3D%3D'}
          alt="Profile"
          className="avatar-lg"
          style={{border: '2px solid var(--color-border)'}}
        />
      </div>
      <hr className="profile-sep" />
      <div
        ref={underlineContainerRef}
        style={{
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
          gap: '4px',
          margin:'18px 0 0 0',
          width:'100%',
          position: 'relative',
          minHeight: 40
        }}
      >
  <button onClick={()=>setActiveTab('about')} style={{
          background:'none',
          border:'none',
          color:activeTab==='about'?'var(--color-accent)':'var(--color-text-secondary)',
          fontWeight:activeTab==='about'?700:600,
          fontSize:'1.13rem',
          position:'relative',
          padding:'8px 0',
          cursor:'pointer',
          borderRadius:'6px 6px 0 0',
          outline:'none',
          transition:'all 0.18s',
          minWidth:120
        }}>
          <span ref={aboutRef} style={{display:'inline-block',padding:'0 8px'}}>About</span>
        </button>
  <div style={{width:1, height:28, background:'var(--color-tab-divider, #bbb)'}} />
  <button onClick={()=>setActiveTab('followers')} style={{
          background:'none',
          border:'none',
          color:activeTab==='followers'?'var(--color-accent)':'var(--color-text-secondary)',
          fontWeight:activeTab==='followers'?700:600,
          fontSize:'1.13rem',
          position:'relative',
          padding:'8px 0',
          cursor:'pointer',
          borderRadius:'6px 6px 0 0',
          outline:'none',
          transition:'all 0.18s',
          minWidth:120
        }}>
          <span ref={followersRef} style={{display:'inline-block',padding:'0 8px'}}>Followers</span>
        </button>
  <div style={{width:1, height:28, background:'var(--color-tab-divider, #bbb)'}} />
  <button onClick={()=>setActiveTab('meals')} style={{
          background:'none',
          border:'none',
          color:activeTab==='meals'?'var(--color-accent)':'var(--color-text-secondary)',
          fontWeight:activeTab==='meals'?700:600,
          fontSize:'1.13rem',
          position:'relative',
          padding:'8px 0',
          cursor:'pointer',
          borderRadius:'6px 6px 0 0',
          outline:'none',
          transition:'all 0.18s',
          minWidth:120
        }}>
          <span ref={mealsRef} style={{display:'inline-block',padding:'0 8px'}}>Meals</span>
        </button>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: (typeof underline?.left === 'number' ? underline.left : 0),
          width: (typeof underline?.width === 'number' ? underline.width : 0),
          height: 3,
          background: '#E23747',
          borderRadius: 2,
          transition: 'left 0.18s, width 0.18s',
          pointerEvents: 'none',
          zIndex: 1
        }} />
      </div>
      <section style={{marginTop:0, display:'flex', flexWrap:'wrap', gap:'24px'}}>
        {activeTab === 'about' && (
          <div style={{flex:'1 1 380px', minWidth:320, maxWidth:420, display:'flex', flexDirection:'column', gap:'18px'}}>
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontWeight:600,fontSize:'1.13rem'}}>Business Name:</span>
                {editField !== 'name' && (
                  <span style={{position:'relative'}}>
                    <button className="profile-menu-btn" style={{background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}} onClick={()=>setMenuOpen(menuOpen==='name'?'': 'name')}>
                      <span style={{fontSize:'1.5rem',color:'var(--color-text)',fontWeight:700,lineHeight:1}}>⋮</span>
                    </button>
                    {menuOpen==='name' && (
                      <div className="profile-menu-dropdown" style={{position:'absolute',right:0,top:'110%',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:6,boxShadow:'0 2px 12px 0 rgba(0,0,0,0.13)',zIndex:10,minWidth:90}}>
                        <div style={{padding:'8px 18px',cursor:'pointer',color:'var(--color-text)',fontWeight:600}} onClick={()=>handleEdit('name', profile.name)}>Edit</div>
                      </div>
                    )}
                  </span>
                )}
              </div>
              {editField === 'name' ? (
                <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'stretch'}}>
                  <input
                    ref={editField === 'name' ? inputRef : null}
                    value={editValue}
                    onChange={e=>setEditValue(e.target.value)}
                    style={{
                      fontSize:'1.08rem',
                      padding:'10px 16px',
                      borderRadius:'8px',
                      border:'2px solid #E23747',
                      background:'#232326',
                      color:'var(--color-text)',
                      outline:'none',
                      fontWeight:500,
                      boxShadow:'0 2px 8px 0 rgba(226,55,71,0.08)',
                      width:'100%',
                      transition:'border 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <div style={{display:'flex',gap:8,marginTop:2,justifyContent:'flex-end'}}>
                    <button onClick={handleEditSave} disabled={editLoading} style={{color:'#fff',background:'#E23747',border:'none',borderRadius:4,padding:'6px 18px',fontWeight:600,cursor:'pointer'}}>Save</button>
                    <button onClick={handleEditCancel} style={{color:'#E23747',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{color:'var(--color-text-secondary)',fontSize:'1.08rem'}}>{profile.name}</div>
              )}
            </div>
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontWeight:600,fontSize:'1.13rem'}}>Contact Name:</span>
                {editField !== 'contactName' && (
                  <span style={{position:'relative'}}>
                    <button className="profile-menu-btn" style={{background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}} onClick={()=>setMenuOpen(menuOpen==='contactName'?'': 'contactName')}>
                      <span style={{fontSize:'1.5rem',color:'var(--color-text)',fontWeight:700,lineHeight:1}}>⋮</span>
                    </button>
                    {menuOpen==='contactName' && (
                      <div className="profile-menu-dropdown" style={{position:'absolute',right:0,top:'110%',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:6,boxShadow:'0 2px 12px 0 rgba(0,0,0,0.13)',zIndex:10,minWidth:90}}>
                        <div style={{padding:'8px 18px',cursor:'pointer',color:'var(--color-text)',fontWeight:600}} onClick={()=>handleEdit('contactName', profile.contactName)}>Edit</div>
                      </div>
                    )}
                  </span>
                )}
              </div>
              {editField === 'contactName' ? (
                <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'stretch'}}>
                  <input
                    ref={editField === 'contactName' ? inputRef : null}
                    value={editValue}
                    onChange={e=>setEditValue(e.target.value)}
                    style={{
                      fontSize:'1.08rem',
                      padding:'10px 16px',
                      borderRadius:'8px',
                      border:'2px solid #E23747',
                      background:'#232326',
                      color:'var(--color-text)',
                      outline:'none',
                      fontWeight:500,
                      boxShadow:'0 2px 8px 0 rgba(226,55,71,0.08)',
                      width:'100%',
                      transition:'border 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <div style={{display:'flex',gap:8,marginTop:2,justifyContent:'flex-end'}}>
                    <button onClick={handleEditSave} disabled={editLoading} style={{color:'#fff',background:'#E23747',border:'none',borderRadius:4,padding:'6px 18px',fontWeight:600,cursor:'pointer'}}>Save</button>
                    <button onClick={handleEditCancel} style={{color:'#E23747',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{color:'var(--color-text-secondary)',fontSize:'1.08rem'}}>{profile.contactName || 'N/A'}</div>
              )}
            </div>
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontWeight:600,fontSize:'1.13rem'}}>Address:</span>
                {editField !== 'address' && (
                  <span style={{position:'relative'}}>
                    <button className="profile-menu-btn" style={{background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}} onClick={()=>setMenuOpen(menuOpen==='address'?'': 'address')}>
                      <span style={{fontSize:'1.5rem',color:'var(--color-text)',fontWeight:700,lineHeight:1}}>⋮</span>
                    </button>
                    {menuOpen==='address' && (
                      <div className="profile-menu-dropdown" style={{position:'absolute',right:0,top:'110%',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:6,boxShadow:'0 2px 12px 0 rgba(0,0,0,0.13)',zIndex:10,minWidth:90}}>
                        <div style={{padding:'8px 18px',cursor:'pointer',color:'var(--color-text)',fontWeight:600}} onClick={()=>handleEdit('address', profile.address)}>Edit</div>
                      </div>
                    )}
                  </span>
                )}
              </div>
              {editField === 'address' ? (
                <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'stretch'}}>
                  <input
                    ref={editField === 'address' ? inputRef : null}
                    value={editValue}
                    onChange={e=>setEditValue(e.target.value)}
                    style={{
                      fontSize:'1.08rem',
                      padding:'10px 16px',
                      borderRadius:'8px',
                      border:'2px solid #E23747',
                      background:'#232326',
                      color:'var(--color-text)',
                      outline:'none',
                      fontWeight:500,
                      boxShadow:'0 2px 8px 0 rgba(226,55,71,0.08)',
                      width:'100%',
                      transition:'border 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <div style={{display:'flex',gap:8,marginTop:2,justifyContent:'flex-end'}}>
                    <button onClick={handleEditSave} disabled={editLoading} style={{color:'#fff',background:'#E23747',border:'none',borderRadius:4,padding:'6px 18px',fontWeight:600,cursor:'pointer'}}>Save</button>
                    <button onClick={handleEditCancel} style={{color:'#E23747',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{color:'var(--color-text-secondary)',fontSize:'1.08rem'}}>{profile.address}</div>
              )}
            </div>
            {/* Theme Card (copied from user profile) */}
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)', minHeight: '74px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <div style={{fontWeight:600,fontSize:'1.13rem',marginBottom:6}}>Theme:</div>
              <div ref={themeMenuRef} className="custom-dropdown" style={{width:'100%',maxWidth:220,marginTop:4}}>
                <button
                  type="button"
                  className="dropdown-button"
                  style={{width:'100%',justifyContent:'space-between',fontSize:'1.08rem',padding:'12px 16px'}}
                  onClick={()=>setThemeMenuOpen(v=>!v)}
                >
                  <span>{themeOptions.find(opt=>opt.value===theme)?.label || 'System'}</span>
                  <span style={{color:'#E23747',fontSize:'1.2rem',fontWeight:700,marginLeft:8}}>▼</span>
                </button>
                {themeMenuOpen && (
                  <div className="dropdown-content" style={{width:'100%',minWidth:140}}>
                    {themeOptions.map(opt => (
                      <div
                        key={opt.value}
                        className={`dropdown-item${theme === opt.value ? ' selected' : ''}`}
                        onClick={()=>handleThemeChange(opt.value)}
                        onMouseDown={e=>e.preventDefault()}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              style={{
                width:'100%',
                background:'#232326',
                color:'#fff',
                border:'1.5px solid var(--color-border)',
                borderRadius:12,
                padding:'18px',
                fontWeight:700,
                fontSize:'1.13rem',
                marginTop:0,
                boxShadow:'var(--shadow-sm)',
                cursor:'pointer',
                textAlign:'left',
                transition:'background 0.18s,border 0.18s',
                marginBottom:'8px'
              }}
              onClick={()=>navigate('/food-partner/change-profile-photo')}
            >
              Change Profile Photo
            </button>
            <button
              style={{
                width:'100%',
                background:'#232326',
                color:'#fff',
                border:'1.5px solid var(--color-border)',
                borderRadius:12,
                padding:'18px',
                fontWeight:700,
                fontSize:'1.13rem',
                marginBottom:'8px', // match Change Profile Photo to Change Password spacing
                marginTop:0,
                boxShadow:'var(--shadow-sm)',
                cursor:'pointer',
                textAlign:'left',
                transition:'background 0.18s,border 0.18s'
              }}
              onClick={()=>navigate('/food-partner/change-password')}
            >
              Change Password
            </button>
            <button
              style={{
                width:'100%',
                background:'#E23747',
                color:'#fff',
                border:'1.5px solid #E23747',
                borderRadius:12,
                padding:'18px',
                fontWeight:700,
                fontSize:'1.13rem',
                marginTop:'0', // match Change Password to Logout spacing
                marginBottom:0,
                boxShadow:'var(--shadow-sm)',
                cursor:'pointer',
                textAlign:'left',
                transition:'background 0.18s,border 0.18s,color 0.18s',
                outline:'none',
              }}
              onClick={handleLogout}
              onMouseOver={e => {
                e.currentTarget.style.background = '#c82333';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = '#c82333';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#E23747';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = '#E23747';
              }}
            >
              Logout
            </button>
            {error && <div style={{color:'#E23747',marginTop:8,fontWeight:600}}>{error}</div>}
          </div>
        )}
        {activeTab === 'meals' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Food Items:</div>
              <span style={{
                fontSize: '1.1rem',
                color: '#fff',
                fontWeight: 700,
              }}>{profile.foodItems ? profile.foodItems.length : 0}</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'18px'}}>
              {(profile.foodItems && profile.foodItems.length > 0) ? profile.foodItems.map(item => (
                <div
                  key={item._id}
                  className="dashboard-food-card meal-card-hover"
                  style={{
                    marginBottom:0,
                    cursor:'pointer',
                    borderLeft:'none',
                    boxShadow:'none',
                    padding:'24px 32px',
                    display:'flex',
                    alignItems:'center',
                    minHeight:64,
                    justifyContent:'space-between',
                    transition:'box-shadow 0.18s'
                  }}
                  onClick={() => navigate(`/food-partner/dashboard/${item._id}`)}
                >
                  <span style={{fontWeight:700, fontSize:'1.25rem', color:'var(--color-text)'}}>{item.name}</span>
                  <FaArrowRight className="dashboard-food-card-arrow meal-arrow" style={{
                    fontSize:'1.7rem',
                    color:'#E23747',
                    marginLeft:16,
                    filter:'drop-shadow(0 0 0 #E23747)',
                    transition:'filter 0.18s, color 0.18s',
                  }} />
                </div>
              )) : (
                <div style={{color:'var(--color-text-secondary)', fontStyle:'italic', textAlign:'center', width:'100%'}}>
                  No food items yet, add them{' '}
                  <a href="/create-food" style={{color: 'var(--color-accent)', textDecoration: 'underline', fontStyle: 'normal', fontWeight: 600}}>here</a>.
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'followers' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Followers:</div>
              <span style={{
                fontSize: '1.1rem',
                color: '#fff',
                fontWeight: 700,
              }}>{profile.followers ? profile.followers.length : 0}</span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'18px'}}>
              {(profile.followers && profile.followers.length > 0) ? profile.followers.map((f, idx) => (
                <div
                  key={f.id || f._id || idx}
                  style={{
                    marginBottom:0,
                    background:'var(--color-surface)',
                    borderRadius:18,
                    boxShadow:'0 2px 16px 0 rgba(0,0,0,0.10)',
                    border: '1.5px solid var(--color-border)',
                    padding:'24px 32px',
                    display:'flex',
                    alignItems:'center',
                    minHeight:64,
                    fontWeight:700,
                    fontSize:'1.25rem',
                    color:'var(--color-text)'
                  }}
                >
                  {f.name}
                </div>
              )) : (
                <div style={{color:'var(--color-text-secondary)', fontStyle:'italic', textAlign:'center', width:'100%'}}>No followers yet.</div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default FoodPartnerProfile;
