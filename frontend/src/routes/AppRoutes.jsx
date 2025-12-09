import React from 'react'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import UserRegister from '../pages/auth/UserRegister';
import ChooseRegister from '../pages/auth/ChooseRegister';
import UserLogin from '../pages/auth/UserLogin';
import FoodPartnerRegister from '../pages/auth/FoodPartnerRegister';
import FoodPartnerLogin from '../pages/auth/FoodPartnerLogin';
import Home from '../pages/general/Home';
import Saved from '../pages/general/Saved';
import BottomNav from '../components/BottomNav';
import BottomNavFoodPartner from '../components/BottomNavFoodPartner';
import CreateFood from '../pages/food-partner/CreateFood';
import FoodPartnerProfile from '../pages/food-partner/ProfilePage';
import PreviewProfile from '../pages/food-partner/PreviewProfile';
import Dashboard from '../pages/food-partner/Dashboard';
import ReelDashboard from '../pages/food-partner/ReelDashboard';
import ChangePassword from '../pages/food-partner/ChangePassword';
import ChangeProfilePhoto from '../pages/food-partner/ChangeProfilePhoto';
import UserBottomNav from '../components/UserBottomNav';
import UserHome from '../pages/user/Home';
import UserSearch from '../pages/user/Search';
import UserReels from '../pages/user/Reels';
import UserProfile from '../pages/user/Profile';
import UserChangePassword from '../pages/user/ChangePassword';
import Orders from '../pages/user/Orders';
import PublicFoodPartnerProfile from '../pages/food-partner/PublicProfile';
import ReelPage from '../pages/user/ReelPage';
import ProtectedRoute from '../components/ProtectedRoute';
import PartnerOrders from '../pages/food-partner/PartnerOrders';

const AnimatedRoutes = () => {
    const location = useLocation();
    
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/register" element={<PageTransition><ChooseRegister /></PageTransition>} />
                <Route path="/user/register" element={<PageTransition><UserRegister /></PageTransition>} />
                <Route path="/user/login" element={<PageTransition><UserLogin /></PageTransition>} />
                <Route path="/food-partner/register" element={<PageTransition><FoodPartnerRegister /></PageTransition>} />
                <Route path="/food-partner/login" element={<PageTransition><FoodPartnerLogin /></PageTransition>} />
                <Route path="/food-partner/:foodPartnerId" element={
                    <PageTransition>
                        <ProtectedRoute allowGuest={true}>
                            <PublicFoodPartnerProfile />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/reels/:fooditemId" element={<PageTransition><ReelPage /></PageTransition>} />
                <Route path="/" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserHome /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/saved" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <Saved /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/home" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserHome /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/search" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserSearch /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/reels" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserReels /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/profile" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserProfile /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/change-password" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <UserChangePassword /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/user/orders" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="user">
                            <Orders /><UserBottomNav />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/create-food" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <CreateFood /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/preview" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <PreviewProfile /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/dashboard" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <Dashboard /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/dashboard/:id" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <ReelDashboard /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/profile" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <FoodPartnerProfile /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/change-password" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <ChangePassword /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/change-profile-photo" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <ChangeProfilePhoto /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
                <Route path="/food-partner/orders" element={
                    <PageTransition>
                        <ProtectedRoute requiredUserType="food-partner">
                            <PartnerOrders /><BottomNavFoodPartner />
                        </ProtectedRoute>
                    </PageTransition>
                } />
            </Routes>
        </AnimatePresence>
    );
};

const AppRoutes = () => {
    return (
        <Router>
            <AnimatedRoutes />
        </Router>
    )
}

export default AppRoutes