import React, { useEffect, useState } from 'react'
import axios from 'axios';
import '../../styles/reels.css'
import ReelFeed from '../../components/ReelFeed'
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';

const Home = () => {
    function commentVideo(item) {}
    const [ videos, setVideos ] = useState([])
    
    useEffect(() => {
        axios.get(`${API_BASE_URL}${API_ENDPOINTS.FOOD.FOLLOWED}`, { withCredentials: true })
            .then(response => {
                const videosArr = Array.isArray(response?.data?.data) ? response.data.data : [];
                setVideos(videosArr);
            })
            .catch((error) => {
                setVideos([]);
                if (error?.response?.data?.message) {
                    alert('Error: ' + error.response.data.message);
                } else {
                    alert('Error loading feed. Please try again.');
                }
            })
    }, [])

    
    async function likeVideo(item) {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.FOOD.LIKE}`, { foodId: item._id }, {withCredentials: true})
        if(response.data.data){
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount + 1, isLiked: true } : v))
        }else{
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, likeCount: v.likeCount - 1, isLiked: false } : v))
        }
    }

    async function saveVideo(item) {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.FOOD.SAVE}`, { foodId: item._id }, { withCredentials: true })
        
        if(response.data.data){
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: v.savesCount + 1 } : v))
        }else{
            setVideos((prev) => prev.map((v) => v._id === item._id ? { ...v, savesCount: v.savesCount - 1 } : v))
        }
    }

    return (
        <ReelFeed
            items={videos}
            onLike={likeVideo}
            onSave={saveVideo}
            onComment={commentVideo}
            emptyMessage="No videos available."
        />
    )
}

export default Home