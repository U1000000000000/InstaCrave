import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../styles/reels.css';
import ReelFeed from '../../components/ReelFeed';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const UserReels = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  function commentVideo(item) {}
  const [videos, setVideos] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

    const shuffleArray = (array) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useEffect(() => {
        if (!authLoading && isAuthenticated) {
      setDataLoading(true);
      axios.get(`${API_BASE_URL}/api/food`, { withCredentials: true })
        .then(response => {
                    const shuffledReels = shuffleArray(response.data.foodItems || []);
          setVideos(shuffledReels);
          setFetchError(false);
        })
        .catch((error) => {
          console.error('Error fetching reels:', error);
          setFetchError(true);
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [authLoading, isAuthenticated]);

  async function likeVideo(item) {
    const response = await axios.post(`${API_BASE_URL}/api/food/like`, { foodId: item._id }, { withCredentials: true });
    if (response.data.like) {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, likeCount: v.likeCount + 1, isLiked: true } : v));
    } else {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, likeCount: v.likeCount - 1, isLiked: false } : v));
    }
  }

  async function saveVideo(item) {
    const response = await axios.post(`${API_BASE_URL}/api/food/save`, { foodId: item._id }, { withCredentials: true });
    if (response.data.save) {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, savesCount: v.savesCount + 1 } : v));
    } else {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, savesCount: v.savesCount - 1 } : v));
    }
  }

    if (authLoading || dataLoading) {
    return <LoadingSpinner fullScreen color="accent" message="Loading reels..." />;
  }

    if (fetchError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        padding: '20px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Failed to load reels</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <ReelFeed
      items={videos}
      onLike={likeVideo}
      onSave={saveVideo}
      onComment={commentVideo}
      emptyMessage="No videos available."
    />
  );
};

export default UserReels;
