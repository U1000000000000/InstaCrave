
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/reels.css';
import axios from 'axios';
import ReelFeed from '../../components/ReelFeed';
import { API_BASE_URL } from '../../config';

const Saved = () => {
    const [videos, setVideos] = useState([]);
    const location = useLocation();

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/food/save`, { withCredentials: true })
            .then(response => {
                const foods = response.data.responseSavedFoods || [];
                const savedFoods = foods.map((item) => ({
                    _id: item._id,
                    name: item.name || '',
                    video: item.video,
                    description: item.description,
                    likeCount: item.likeCount,
                    savesCount: item.savesCount,
                    commentCount: item.commentCount,
                    commentsCount: item.commentCount,
                    foodPartner: {
                        _id: item.foodPartner?._id,
                        name: (typeof item.foodPartner?.name === 'string' && item.foodPartner.name.trim().length > 0)
                            ? item.foodPartner.name
                            : 'Store',
                        profileImage: item.foodPartner?.profileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210',
                    },
                    isFollowing: item.isFollowing || false,
                    isLiked: item.isLiked || false,
                    isSaved: item.isSaved || false,
                    shareCount: item.shareCount || 0,
                }));
                                const params = new URLSearchParams(location.search);
                const highlightId = params.get('highlight');
                if (highlightId) {
                  const idx = savedFoods.findIndex(f => f._id === highlightId);
                  if (idx > 0) {
                    const [highlighted] = savedFoods.splice(idx, 1);
                    savedFoods.unshift(highlighted);
                  }
                }
                setVideos(savedFoods);
            });
    }, []);

    async function likeVideo(item) {
        const response = await axios.post(`${API_BASE_URL}/api/food/like`, { foodId: item._id }, { withCredentials: true });
        if (response.data.like) {
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount + 1, isLiked: true } : v));
        } else {
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount - 1, isLiked: false } : v));
        }
    }

    async function saveVideo(item) {
        const response = await axios.post(`${API_BASE_URL}/api/food/save`, { foodId: item._id }, { withCredentials: true });
        if (response.data.save) {
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: v.savesCount + 1, isSaved: true } : v));
        } else {
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: Math.max(0, (v.savesCount ?? 1) - 1), isSaved: false } : v));
        }
    }

    function commentVideo(item) {}

        const handleFollow = (item) => {
        setVideos(prev => prev.map(v => {
            if (v.foodPartner && v.foodPartner._id === item.foodPartner._id) {
                return {
                    ...v,
                    isFollowing: !v.isFollowing
                };
            }
            return v;
        }));
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--color-bg, #18191a)' }}>
            <div style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                height: 40,
                pointerEvents: 'none',
            }}>
                <div style={{ position: 'relative', width: 120, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.25 }}>
                        <path
                            d="M2 2 H118 Q118 2 118 28 Q118 38 108 38 H12 Q2 38 2 28 Q2 2 2 2 Z"
                            fill="var(--color-surface-alt, #fffbe6)"
                            stroke="var(--color-border, #222)"
                            strokeWidth="2"
                        />
                    </svg>
                    <span style={{
                        position: 'relative',
                        color: 'var(--color-text, #222)',
                        fontWeight: 600,
                        fontSize: '0.98rem',
                        letterSpacing: '0.01em',
                        pointerEvents: 'auto',
                        padding: '4px 0',
                        textAlign: 'center',
                        width: '100%',
                        userSelect: 'none',
                        transition: 'color 0.2s',
                    }}>
                        Saved
                    </span>
                </div>
            </div>
            <ReelFeed
                items={videos}
                onLike={likeVideo}
                onSave={saveVideo}
                onComment={commentVideo}
                onFollow={handleFollow}
                emptyMessage="No saved videos yet."
            />
        </div>
    );
};

export default Saved;
