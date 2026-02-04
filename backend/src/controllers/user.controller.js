
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");
const analyticsService = require("../services/analytics.service");
const logger = require("../services/logger.service");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const responseUtil = require("../utils/response");

const sanitizeHtml = require('sanitize-html');

const getUser = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 404);

  let likedFoods = await likeModel.find({ user: user._id }).populate("food");
  likedFoods = likedFoods
    .filter((like) => like.food)
    .map((like) => ({
      _id: like.food._id,
      name: like.food.name,
      description: like.food.description,
    }));

  let following = await followModel
    .find({ user: user._id })
    .populate("foodpartner");
  following = following
    .filter((follow) => follow.foodpartner)
    .map((follow) => ({
      _id: follow.foodpartner._id,
      name: follow.foodpartner.name,
    }));

  let comments = await commentModel.find({ user: user._id }).populate("food");
  comments = comments
    .filter((comment) => comment.food)
    .map((comment) => ({
      foodId: comment.food._id,
      foodName: comment.food.name,
      comment: comment.comment,
    }));

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'user:profile_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      likedCount: likedFoods.length,
      followingCount: following.length,
      commentsCount: comments.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track profile view', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      likedFoods,
      comments,
      following,
    },
    message: "User fetched successfully",
  });
});

const getComments = catchAsync(async (req, res) => {
  const user = req.user;
  const comments = await commentModel.find({ user: user._id }).populate({
    path: "food",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'user:comments_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      commentsCount: comments?.length || 0,
    },
    request: req,
  }).catch(err => logger.error('Failed to track comments view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: comments || [],
    message: comments && comments.length > 0 ? "Comments fetched successfully" : "No comments found",
  });
});

const getFollowing = catchAsync(async (req, res) => {
  const user = req.user;
  const following = await followModel
    .find({ user: user._id })
    .populate("foodpartner");

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'user:following_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      followingCount: following?.length || 0,
    },
    request: req,
  }).catch(err => logger.error('Failed to track following view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: following?.map((follow) => follow.foodpartner) || [],
    message: following && following.length > 0 ? "Following food partners fetched successfully" : "No follows found",
  });
});

const getLikes = catchAsync(async (req, res) => {
  const user = req.user;
  const likes = await likeModel.find({ user: user._id }).populate({
    path: "food",
    select: "_id name description",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });
  if (!likes || likes.length === 0) throw new AppError("No likes found", 404);

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'user:likes_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      likesCount: likes.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track likes view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: likes,
    message: "Likes fetched successfully",
  });
});

const editUser = catchAsync(async (req, res) => {
  const userId = req.user._id;
  let updateFields = req.body;
  const allowedFields = ["fullName", "password"];
  const updateKeys = Object.keys(updateFields);
  if (updateKeys.length !== 1) throw new AppError("Please send exactly one field to update.", 400);
  if (!allowedFields.includes(updateKeys[0])) throw new AppError(`Cannot update field: ${updateKeys[0]}`, 400);

  let updatedUser;
  if (updateFields.password) {
    // Secure: fetch, set, save (triggers hashing)
    updatedUser = await userModel.findById(userId);
    if (!updatedUser) throw new AppError("User not found", 404);
    updatedUser.password = updateFields.password;
    await updatedUser.save();
  } else if (updateFields.fullName) {
    updateFields.fullName = sanitizeHtml(updateFields.fullName, { allowedTags: [], allowedAttributes: {} });
    updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: { fullName: updateFields.fullName } },
      { new: true }
    );
    if (!updatedUser) throw new AppError("User not found", 404);
  }

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'user:profile_updated',
    userId: updatedUser._id.toString(),
    userType: 'User',
    data: {
      fieldUpdated: updateKeys[0],
    },
    request: req,
  }).catch(err => logger.error('Failed to track profile update', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
    },
    message: "User updated successfully",
  });
});

module.exports = {
  getUser,
  editUser,
  getComments,
  getFollowing,
  getLikes,
};
