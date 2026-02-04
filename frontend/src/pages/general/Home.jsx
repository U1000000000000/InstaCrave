import React, { useEffect, useState } from 'react'
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import api from '../../services/api';
import '../../styles/reels.css'
import ReelFeed from '../../components/ReelFeed'
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';

const Home = () => {
    function commentVideo(item) {}
    const [videos, setVideos] = useState([]);
    const { data, error, loading, refetch } = useProtectedRequest(
        () => api.get(API_ENDPOINTS.FOOD.FOLLOWED),
        []
    );

    useEffect(() => {
        if (data && Array.isArray(data.data)) {
            setVideos(data.data);
        } else {
            setVideos([]);
        }
    }, [data]);

    useEffect(() => {
        if (error) {
            alert(error?.response?.data?.message || 'Error loading feed. Please try again.');
        }
    }, [error]);

    async function likeVideo(item) {
        try {
            const response = await api.post(API_ENDPOINTS.FOOD.LIKE, { foodId: item._id });
            if (response.data.data) {
                setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount + 1, isLiked: true } : v));
            } else {
                setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount - 1, isLiked: false } : v));
            }
        } catch {}
    }

    async function saveVideo(item) {
        try {
            const response = await api.post(API_ENDPOINTS.FOOD.SAVE, { foodId: item._id });
            if (response.data.data) {
                setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: v.savesCount + 1 } : v));
            } else {
                setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: v.savesCount - 1 } : v));
            }
        } catch {}
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
}

export default Home