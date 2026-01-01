
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");

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
  if (!following || following.length === 0) throw new AppError("No following food partners found", 404);
  responseUtil.sendListResponse(res, {
    data: following.map((follow) => follow.foodpartner),
    message: "Following food partners fetched successfully",
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
  if (updateFields.fullName) {
    updateFields.fullName = sanitizeHtml(updateFields.fullName, { allowedTags: [], allowedAttributes: {} });
  }
  // Password will be hashed by model pre-save hook
  const updatedUser = await userModel.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true }
  );
  if (!updatedUser) throw new AppError("User not found", 404);
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
