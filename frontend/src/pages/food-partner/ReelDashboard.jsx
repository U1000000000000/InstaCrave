import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import '../../styles/profile.css';
import LoadingSpinner from '../../components/LoadingSpinner';

const tabStyles = {
  base: {
    fontSize: '1.3rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0 8px',
    border: 'none',
    background: 'none',
    outline: 'none',
    color: 'var(--color-text)',
    textDecoration: 'underline',
  },
  active: {
    color: 'var(--color-accent)',
    textDecoration: 'underline',
  },
};

const ReelDashboard = () => {
  const { id } = useParams();
  const [foodItem, setFoodItem] = useState(null);
  const [comments, setComments] = useState([]);
    const [showComments, setShowComments] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true })
      .then(response => {
        const found = (response.data.foodPartner.foodItems || []).find(f => f._id === id || f.id === id);
        setFoodItem(found);
        setNameInput(found?.name || '');
        setDescInput(found?.description || '');
      });
        axios.get(`${API_BASE_URL}/api/food/comments?foodId=${id}`, { withCredentials: true })
      .then(response => {
        setComments(response.data.comments || []);
      })
      .catch(error => {
        console.error('Error fetching comments:', error);
        setComments([]);
      });
  }, [id]);

  const handleSaveField = async (field) => {
    setIsSaving(true);
    try {
      const payload = {};
      if (field === 'name') payload.name = nameInput;
      if (field === 'description') payload.description = descInput;
      await axios.patch(`${API_BASE_URL}/api/food/${id}`, payload, { withCredentials: true });
      setFoodItem(f => ({ ...f, ...payload }));
      if (field === 'name') setEditingName(false);
      if (field === 'description') setEditingDescription(false);
    } catch (e) {
      alert('Failed to update.');
    }
    setIsSaving(false);
  };

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    if (!videoFile) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      await axios.patch(`${API_BASE_URL}/api/food/${id}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
            axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true })
        .then(response => {
          const found = (response.data.foodPartner.foodItems || []).find(f => f._id === id || f.id === id);
          setFoodItem(found);
        });
      setVideoFile(null);
          } catch (e) {
          }
    setIsSaving(false);
  };

  if (!foodItem) return <LoadingSpinner fullScreen color="accent" />;
  
  return (
    <>
      <main className="reel-dashboard-page" style={{minHeight:'100vh',background:'var(--color-bg)',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
        <div style={{padding:'24px 0 0 0',display:'flex',flexDirection:'column',alignItems:'center',width:'100%'}}>
          <div style={{width:'100%',maxWidth:480,margin:'0 auto',marginBottom:0,padding:'0 20px'}}>
            <div style={{color:'var(--color-text)',fontWeight:700,fontSize:'2rem',textAlign:'left',marginBottom:16}}>{foodItem.name}</div>
            <div style={{position:'relative',width:'100%'}}>
              <video
                style={{ objectFit: 'cover', width: '100%', height: 520, aspectRatio: '9/16', borderRadius: 24, background:'var(--color-surface)', display:'block', margin:'0 auto' }}
                src={foodItem.video}
                muted
                loop
                playsInline
                autoPlay
              ></video>
            </div>
          </div>
          <div style={{marginTop:0,background:'transparent',borderRadius:'0 0 24px 24px',width:'100%',maxWidth:480,padding:'0 20px 24px 20px',boxSizing:'border-box'}}>
            <hr style={{margin:'18px 0',border:'none',borderTop:'2px solid var(--color-border)',width:'100%'}}/>
            <div style={{padding:'0 4px',color:'var(--color-text)',fontSize:'1.15rem',fontWeight:500}}>
              <div style={{marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8,position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:600,marginBottom:8}}>Name:</div>
                {!editingName && (
                  <button onClick={e=>{e.stopPropagation();setEditingName(true);}} style={{background:'none',border:'none',color:'var(--color-accent)',fontWeight:700,cursor:'pointer',fontSize:'1rem',marginLeft:8}}>Edit</button>
                )}
              </div>
              {editingName ? (
                <div style={{marginTop:4}}>
                  <input
                    value={nameInput}
                    onChange={e=>setNameInput(e.target.value)}
                    style={{
                      fontSize: '1.08rem',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-border)',
                      width: '100%',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)',
                      transition: 'border 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.border = '1.5px solid var(--color-accent)'}
                    onBlur={e => e.target.style.border = '1.5px solid var(--color-border)'}
                  />
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button onClick={()=>handleSaveField('name')} disabled={isSaving} style={{flex:1,background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Save</button>
                    <button onClick={()=>{setEditingName(false);setNameInput(foodItem.name);}} style={{flex:1,background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid var(--color-border)',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:'1rem',lineHeight:1.4,marginTop:4}}>{foodItem.name}</div>
              )}
            </div>
            <div style={{marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8,position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:600,marginBottom:8}}>Description:</div>
                {!editingDescription && (
                  <button onClick={e=>{e.stopPropagation();setEditingDescription(true);}} style={{background:'none',border:'none',color:'var(--color-accent)',fontWeight:700,cursor:'pointer',fontSize:'1rem',marginLeft:8}}>Edit</button>
                )}
              </div>
              {editingDescription ? (
                <div style={{marginTop:4}}>
                  <textarea
                    value={descInput}
                    onChange={e=>setDescInput(e.target.value)}
                    style={{
                      fontSize: '1.08rem',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--color-border)',
                      width: '100%',
                      minHeight: 140,
                      maxHeight: 320,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)',
                      transition: 'border 0.2s',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#E23747 var(--color-surface)',
                    }}
                    className="custom-scrollbar"
                    onFocus={e => e.target.style.border = '1.5px solid var(--color-accent)'}
                    onBlur={e => e.target.style.border = '1.5px solid var(--color-border)'}
                  />
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button onClick={()=>handleSaveField('description')} disabled={isSaving} style={{flex:1,background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Save</button>
                    <button onClick={()=>{setEditingDescription(false);setDescInput(foodItem.description);}} style={{flex:1,background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid var(--color-border)',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:'1rem',lineHeight:1.4,marginTop:4}}>{foodItem.description}</div>
              )}
            </div>
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8}}>
                <span>Likes:</span>
                <span style={{fontWeight:700,fontSize:'1.3rem'}}>{foodItem.likeCount ?? 0}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'stretch',
                  marginBottom: 16,
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                  maxHeight: showComments ? 340 : 56,
                  overflow: 'hidden',
                }}
                onClick={() => setShowComments(!showComments)}
              >
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>Comments:</span>
                  <span style={{fontWeight:700,fontSize:'1.3rem'}}>{comments.length}</span>
                </div>
                {showComments && (
                  <div
                    style={{
                      marginTop: 16,
                      flex: 1,
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'var(--color-accent) var(--color-surface-alt)',
                      msOverflowStyle: 'none',
                    }}
                    className="custom-scrollbar"
                    onClick={e => e.stopPropagation()}
                  >
                    {comments.length > 0 ? (
                      comments.map((comment, index) => (
                        <div key={index} style={{padding:'8px 12px',marginBottom:8,backgroundColor:'var(--color-surface)',borderRadius:6,borderLeft:'3px solid var(--color-accent)'}}>
                          <div style={{fontSize:'0.9rem',color:'var(--color-text-secondary)',marginBottom:4}}>{comment.user?.fullName || 'Anonymous'}</div>
                          <div style={{fontSize:'1rem'}}>{comment.comment}</div>
                          <div style={{fontSize:'0.8rem',color:'var(--color-text-secondary)',marginTop:4}}>{new Date(comment.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{marginTop:8,textAlign:'center',color:'var(--color-text-secondary)',fontStyle:'italic'}}>
                        No comments yet on this reel.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8}}>
                <span>Saves:</span>
                <span style={{fontWeight:700,fontSize:'1.3rem'}}>{foodItem.savesCount ?? 0}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8}}>
                <span>Shares:</span>
                <span style={{fontWeight:700,fontSize:'1.3rem'}}>{foodItem.shareCount ?? 0}</span>
              </div>
            </>
            <div style={{marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8}}>
              <form onSubmit={handleVideoUpload} style={{display:'flex',flexDirection:'column',gap:8}}>
                <label style={{fontWeight:600,marginBottom:4}}>Update Video:</label>
                <label htmlFor="video-upload-input" style={{
                  display: 'inline-block',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  fontWeight: 600,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginBottom: 4,
                  width: 'fit-content',
                  boxShadow: 'none',
                  letterSpacing: 0.1,
                }}>
                  {videoFile ? videoFile.name : 'Choose File'}
                  <input
                    id="video-upload-input"
                    type="file"
                    accept="video/*"
                    onChange={e=>setVideoFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
                <button type="submit" disabled={isSaving || !videoFile} style={{background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer'}}>Upload</button>
              </form>
            </div>
            <div style={{marginBottom:16,padding:'8px 16px',backgroundColor:'var(--color-surface-alt)',borderRadius:8,display:'flex',flexDirection:'column',gap:8}}>
              <label style={{fontWeight:600,color:'var(--color-accent)'}}>Delete Food Item:</label>
              <div>
                <button
                  type="button"
                  style={{background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:4,padding:'8px 0',fontWeight:700,cursor:'pointer',width:'100%'}}
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Permanently
                </button>
              </div>
            </div>
            {showDeleteModal && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.18)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: 'var(--color-surface)',
                  padding: '20px 18px 18px 18px',
                  borderRadius: 12,
                  boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)',
                  minWidth: 260,
                  maxWidth: 320,
                  margin: '0 16px',
                }}>
                  <div style={{fontWeight:700,fontSize:'1.08rem',marginBottom:12,color:'var(--color-accent)'}}>Confirm Deletion</div>
                  <div style={{marginBottom:18,fontSize:'0.98rem',color:'var(--color-text-secondary)'}}>Are you sure you want to permanently delete this food item? This action cannot be undone.</div>
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      style={{background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid var(--color-border)',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:'pointer'}}
                    >Cancel</button>
                    <button
                      onClick={async () => {
                        setShowDeleteModal(false);
                        try {
                          await axios.delete(`${API_BASE_URL}/api/food/${id}`, { withCredentials: true });
                          window.location.href = '/food-partner/dashboard';
                        } catch (err) {
                                                  }
                      }}
                      style={{background:'var(--color-accent)',color:'#fff',border:'none',borderRadius:4,padding:'7px 18px',fontWeight:700,cursor:'pointer'}}
                    >Delete Permanently</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div> {/* Close main content wrapper div */}
        <div style={{height: 48}}></div>
      </main>
    </>
  );
};

export default ReelDashboard;
