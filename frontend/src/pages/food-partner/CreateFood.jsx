import React, { useRef, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import '../../styles/create-food.css';

const CreateFood = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isOrderable, setIsOrderable] = useState(false);
    const [price, setPrice] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [videoURL, setVideoURL] = useState('');
    const [fileError, setFileError] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!videoFile) {
            setVideoURL('');
            return;
        }
        const url = URL.createObjectURL(videoFile);
        setVideoURL(url);
        return () => URL.revokeObjectURL(url);
    }, [videoFile]);

    const onFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) { setVideoFile(null); setFileError(''); return; }
        if (!file.type.startsWith('video/')) { setFileError('Please select a valid video file.'); return; }
        setFileError('');
        setVideoFile(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer?.files?.[0];
        if (!file) { return; }
        if (!file.type.startsWith('video/')) { setFileError('Please drop a valid video file.'); return; }
        setFileError('');
        setVideoFile(file);
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    const openFileDialog = () => fileInputRef.current?.click();

    const onSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('isOrderable', isOrderable);
            if (isOrderable) formData.append('price', price);
            formData.append('mama', videoFile);
            await axios.post(`${API_BASE_URL}/api/food`, formData, { withCredentials: true });
            navigate('/food-partner/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = useMemo(() => !name.trim() || !videoFile || loading || (isOrderable && !price), [name, videoFile, loading, isOrderable, price]);

    return (
                <main className="profile-page">
                    <div className="d-flex align-center justify-between gap-4 mb-4 mt-2">
                        <h2 style={{
                          fontWeight: 700,
                          fontSize: '2.1rem',
                          color: 'var(--color-text)',
                          letterSpacing: '-1px',
                          paddingLeft: '2px',
                          margin: 0
                        }}>Create Food</h2>
                    </div>
                    <hr className="profile-sep" />
                            <form onSubmit={onSubmit} className="create-food-form-container">
                                    <label htmlFor="foodVideo" className="form-field-label">Food Video</label>
                    <div className="form-input-card form-input-card--video">
                                        <input
                                            id="foodVideo"
                                            ref={fileInputRef}
                                            type="file"
                                            accept="video/*"
                                            style={{ display: 'none' }}
                                            onChange={onFileChange}
                                        />
                                        <div
                                            className="video-upload-dropzone"
                                            onClick={openFileDialog}
                                            onDrop={onDrop}
                                            onDragOver={onDragOver}
                                            tabIndex={0}
                                            role="button"
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openFileDialog(); }}
                                        >
                                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="video-upload-icon" aria-hidden="true">
                                                            <path d="M12 16V4M12 4L7 9M12 4l5 5" stroke="#E23747" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <rect x="4" y="16" width="16" height="4" rx="2" fill="#E23747" fillOpacity="0.08"/>
                                                        </svg>
                                                        {videoFile ? (
                                                            <span className="video-file-name">{videoFile.name}</span>
                                                        ) : (
                                                            <>
                                                                <span className="video-upload-primary-text">Tap to upload</span>
                                                                <span className="video-upload-secondary-text">or drag and drop</span>
                                                                <span className="video-upload-hint-text">MP4, WebM, MOV • Up to ~100MB</span>
                                                            </>
                                                        )}
                                                    </div>
                                        {fileError && <div className="file-error-message">{fileError}</div>}
                                                                {videoURL && (
                                                                    <div className="video-preview-container">
                                                                        <video
                                                                            src={videoURL}
                                                                            autoPlay
                                                                            muted
                                                                            loop
                                                                            playsInline
                                                                            controls
                                                                            className="video-preview-player custom-video-controls"
                                                                        />
                                                                        <style>{`
                                                                            .custom-video-controls::-webkit-media-controls-panel { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-play-button { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-current-time-display { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-time-remaining-display { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-mute-button { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-volume-slider { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-fullscreen-button { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-enclosure { overflow: visible !important; }
                                                                            .custom-video-controls::-webkit-media-controls-overlay-play-button { display: none !important; }
                                                                            .custom-video-controls::-webkit-media-controls-timeline { display: block !important; }
                                                                        `}</style>
                                                                    </div>
                                                                )}
                                    </div>
                                    <label htmlFor="foodName" className="form-field-label">Name</label>
                                    <div className="form-input-card">
                                                    <input
                                                        id="foodName"
                                                        type="text"
                                                        value={name}
                                                        onChange={e => setName(e.target.value)}
                                                        required
                                                        className="form-text-input"
                                                        placeholder="e.g., Spicy Paneer Wrap"
                                                    />
                                    </div>
                                    <label htmlFor="foodDesc" className="form-field-label">Description</label>
                                    <div className="form-input-card">
                                                    <textarea
                                                        id="foodDesc"
                                                        rows={4}
                                                        value={description}
                                                        onChange={e => setDescription(e.target.value)}
                                                        className="form-textarea-input"
                                                        placeholder="Write a short description: ingredients, taste, spice level, etc."
                                                    />
                                    </div>
                                    <div className="form-input-card" style={{display:'flex',flexDirection:'column',padding:'12px 16px',background:'var(--color-surface-alt)',borderRadius:8,border:'1.5px solid var(--color-border)'}}>
                                        <div style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:18}}>
                                            <label htmlFor="orderable-toggle" style={{fontWeight:600,fontSize:'1.08rem',color:'var(--color-text)',cursor:'pointer',marginBottom:0}}>
                                                Make this food available for ordering
                                            </label>
                                            <input
                                                id="orderable-toggle"
                                                type="checkbox"
                                                checked={isOrderable}
                                                onChange={e => setIsOrderable(e.target.checked)}
                                                style={{display:'none'}}
                                            />
                                            <span
                                                onClick={()=>setIsOrderable(v=>!v)}
                                                style={{
                                                    display:'inline-block',
                                                    width:44,
                                                    height:24,
                                                    borderRadius:12,
                                                    background:isOrderable?'var(--color-accent)':'#ccc',
                                                    position:'relative',
                                                    cursor:'pointer',
                                                    transition:'background 0.2s',
                                                }}
                                            >
                                                <span style={{
                                                    position:'absolute',
                                                    left:isOrderable?22:2,
                                                    top:2,
                                                    width:20,
                                                    height:20,
                                                    borderRadius:'50%',
                                                    background:'#fff',
                                                    boxShadow:'0 1px 4px 0 rgba(0,0,0,0.10)',
                                                    transition:'left 0.2s',
                                                }}></span>
                                            </span>
                                        </div>
                                    </div>
                                    {isOrderable && (
                                        <div className="form-input-card">
                                            <label htmlFor="price" className="form-field-label">Price ($)</label>
                                            <input
                                                id="price"
                                                type="number"
                                                value={price}
                                                onChange={e => setPrice(e.target.value)}
                                                required
                                                className="form-text-input"
                                                placeholder="e.g., 10.99"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    )}
                                            <button
                                                type="submit"
                                                disabled={isDisabled}
                                                className="form-submit-button"
                                            >
                                                {loading ? 'Saving...' : 'Save Food'}
                                            </button>
                                            <div className="bottom-spacer"></div>
                                                </form>
                </main>
    );
};

export default CreateFood;