// backend/src/controllers/food.v2.controller.js
const foodModel = require("../models/food.model");
const storageService = require("../services/storage.service");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const followModel = require("../models/follow.model");
const { uuidv4: uuid } = require("../utils/uuid");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { parseQuery } = require("../utils/query");
const responseUtil = require("../utils/response");
const { escapeRegex, normalizeSearchText } = require('../utils/regex');

const sanitizeHtml = require('sanitize-html');

const getFoodItems = catchAsync(async (req, res) => {
  const user = req.user;
  const allowedFilterFields = ["category", "price", "name", "foodPartner", "isOrderable"];
  const { pagination, sort, filters } = parseQuery(req.query, allowedFilterFields);

  // Support partial matching for name filter
  if (filters.name) {
    const normalizedName = normalizeSearchText(filters.name, { maxLength: 100 });
    filters.name = { $regex: escapeRegex(normalizedName), $options: 'i' };
  }

  const [foodItems, total] = await Promise.all([
    foodModel.find(filters)
      .populate({ path: "foodPartner", select: "name profileImage" })
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit),
    foodModel.countDocuments(filters)
  ]);

  let likedFoodIds = [];
  let savedFoodIds = [];
  let followingPartnerIds = [];

  if (user) {
    const likedFoods = await likeModel.find({ user: user._id }).populate("food");
    likedFoodIds = likedFoods.map((like) => like.food._id.toString());
    const savedFoods = await saveModel.find({ user: user._id }).populate("food");
    savedFoodIds = savedFoods.map((save) => save.food._id.toString());
    const followingPartners = await followModel.find({ user: user._id }).populate("foodpartner");
    followingPartnerIds = followingPartners.map((follow) => follow.foodpartner._id.toString());
  }

  const responseFoodItems = foodItems.map((food) => ({
    ...food.toObject(),
    isLiked: likedFoodIds.includes(food._id.toString()),
    isSaved: savedFoodIds.includes(food._id.toString()),
    isFollowing: followingPartnerIds.includes(food.foodPartner._id.toString()),
  }));

  const paginationMeta = {
    total,
    limit: pagination.limit,
    skip: pagination.skip,
    hasNext: pagination.skip + pagination.limit < total,
    hasPrev: pagination.skip > 0,
  };

  responseUtil.sendListResponse(res, {
    data: responseFoodItems,
    message: "Food items fetched successfully",
    pagination: paginationMeta,
    filters,
    sort,
  });
});

const getFollowedFoodItems = catchAsync(async (req, res) => {
  const user = req.user;
  let followingPartnerIds = [];
  if (user) {
    const followingPartners = await followModel.find({ user: user._id }).populate("foodpartner");
    followingPartnerIds = followingPartners.map((follow) => follow.foodpartner._id.toString());
  }
  const allowedFilterFields = ["category", "price", "name", "foodPartner", "isOrderable"];
  const { pagination, sort, filters } = parseQuery(req.query, allowedFilterFields);
  filters.foodPartner = { $in: followingPartnerIds };

  const [foodItems, total] = await Promise.all([
    foodModel.find(filters)
      .populate({ path: "foodPartner", select: "name profileImage" })
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit),
    foodModel.countDocuments(filters)
  ]);

  let likedFoodIds = [];
  let savedFoodIds = [];
  if (user) {
    const likedFoods = await likeModel.find({ user: user._id }).populate("food");
    likedFoodIds = likedFoods.map((like) => like.food._id.toString());
    const savedFoods = await saveModel.find({ user: user._id }).populate("food");
    savedFoodIds = savedFoods.map((save) => save.food._id.toString());
  }

  const responseFoodItems = foodItems.map((food) => ({
    ...food.toObject(),
    isLiked: likedFoodIds.includes(food._id.toString()),
    isSaved: savedFoodIds.includes(food._id.toString()),
    isFollowing: followingPartnerIds.includes(food.foodPartner._id.toString()),
  }));

  const paginationMeta = {
    total,
    limit: pagination.limit,
    skip: pagination.skip,
    hasNext: pagination.skip + pagination.limit < total,
    hasPrev: pagination.skip > 0,
  };

  responseUtil.sendListResponse(res, {
    data: responseFoodItems,
    message: "Followed food items fetched successfully",
    pagination: paginationMeta,
    filters,
    sort,
  });
});

const createFood = catchAsync(async (req, res) => {
  const fileUploadResult = await storageService.uploadFile(
    req.file.buffer,
    uuid()
  );
  const foodItem = await foodModel.create({
    name: sanitizeHtml(req.body.name, { allowedTags: [], allowedAttributes: {} }),
    description: sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} }),
    video: fileUploadResult.url,
    foodPartner: req.foodPartner._id,
    isOrderable: req.body.isOrderable === 'true',
    price: req.body.isOrderable === 'true' ? parseFloat(req.body.price) : undefined,
  });
  responseUtil.sendItemResponse(res, {
    data: foodItem,
    message: "Food created successfully",
  });
});

const likeFood = catchAsync(async (req, res) => {
  const { foodId } = req.body;
  const user = req.user;

  const isAlreadyLiked = await likeModel.findOne({
    user: user._id,
    food: foodId,
  });

  if (isAlreadyLiked) {
    await likeModel.deleteOne({ user: user._id, food: foodId });
    await foodModel.findByIdAndUpdate(foodId, { $inc: { likeCount: -1 } });
    return responseUtil.sendItemResponse(res, {
      data: null,
      message: "Food unliked successfully",
    });
  }
  const like = await likeModel.create({ user: user._id, food: foodId });
  await foodModel.findByIdAndUpdate(foodId, { $inc: { likeCount: 1 } });
  responseUtil.sendItemResponse(res, {
    data: like,
    message: "Food liked successfully",
  });
});

const saveFood = catchAsync(async (req, res) => {
  const { foodId } = req.body;
  const user = req.user;

  const isAlreadySaved = await saveModel.findOne({
    user: user._id,
    food: foodId,
  });

  if (isAlreadySaved) {
    await saveModel.deleteOne({ user: user._id, food: foodId });
    await foodModel.findByIdAndUpdate(foodId, { $inc: { savesCount: -1 } });
    return responseUtil.sendItemResponse(res, {
      data: null,
      message: "Food unsaved successfully",
    });
  }
  const save = await saveModel.create({ user: user._id, food: foodId });
  await foodModel.findByIdAndUpdate(foodId, { $inc: { savesCount: 1 } });
  responseUtil.sendItemResponse(res, {
    data: save,
    message: "Food saved successfully",
  });
});

const getSaveFood = catchAsync(async (req, res) => {
  const user = req.user;
  const { pagination } = parseQuery(req.query, []);

  const savedFoodDocs = await saveModel.find({ user: user._id })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .populate({
      path: "food",
      populate: {
        path: "foodPartner",
        select: "name profileImage",
      },
    });

  const total = await saveModel.countDocuments({ user: user._id });

  if (!savedFoodDocs || savedFoodDocs.length === 0) {
    return responseUtil.sendListResponse(res, {
      data: [],
      message: "No saved foods found",
      pagination: {
        total: 0,
        limit: pagination.limit,
        skip: pagination.skip,
        hasNext: false,
        hasPrev: false,
      }
    });
  }

  let likedFoodIds = [];
  let savedFoodIds = [];
  let followingPartnerIds = [];

  if (user) {
    const likedFoodsDocs = await likeModel
      .find({ user: user._id })
      .populate("food");
    likedFoodIds = likedFoodsDocs.map((like) => like.food._id.toString());

    const savedFoodsDocs = await saveModel
      .find({ user: user._id })
      .populate("food");
    savedFoodIds = savedFoodsDocs.map((save) => save.food._id.toString());

    const followingPartners = await followModel
      .find({ user: user._id })
      .populate("foodpartner");
    followingPartnerIds = followingPartners.map((follow) =>
      follow.foodpartner._id.toString()
    );
  }

  const responseSavedFoods = savedFoodDocs.map((save) => {
    const food = save.food;
    return {
      ...food.toObject(),
      isLiked: likedFoodIds.includes(food._id.toString()),
      isSaved: savedFoodIds.includes(food._id.toString()),
      isFollowing: food.foodPartner
        ? followingPartnerIds.includes(food.foodPartner._id.toString())
        : false,
    };
  });

  const paginationMeta = {
    total,
    limit: pagination.limit,
    skip: pagination.skip,
    hasNext: pagination.skip + pagination.limit < total,
    hasPrev: pagination.skip > 0,
  };

  responseUtil.sendListResponse(res, {
    data: responseSavedFoods,
    message: "Saved foods retrieved successfully",
    pagination: paginationMeta,
  });
});

const commentOnFood = catchAsync(async (req, res) => {
  const { foodId, comment } = req.body;
  const user = req.user;
  const cleanComment = sanitizeHtml(comment, { allowedTags: [], allowedAttributes: {} });
  const commented = await commentModel.create({
    user: user._id,
    food: foodId,
    comment: cleanComment,
  });
  await foodModel.findByIdAndUpdate(foodId, { $inc: { commentCount: 1 } });
  responseUtil.sendItemResponse(res, {
    data: commented,
    message: "Commented on food successfully",
  });
});

const getCommentOnFood = catchAsync(async (req, res) => {
  const { foodId } = req.query;

  const comments = await commentModel
    .find({ food: foodId })
    .populate({ path: "user", select: "fullName" });

  if (!comments || comments.length === 0) throw new AppError("No comments yet!", 404);

  responseUtil.sendListResponse(res, {
    data: comments,
    message: "Comments on food retrieved successfully",
  });
});

const deleteCommentOnFood = catchAsync(async (req, res) => {
  const { commentId } = req.body;
  const user = req.user;

  const comment = await commentModel.findById(commentId);

  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.user.toString() !== user._id.toString()) throw new AppError("You are not authorized to delete this comment", 403);

  await commentModel.findByIdAndDelete(commentId);

  await foodModel.findByIdAndUpdate(comment.food, {
    $inc: { commentCount: -1 },
  });

  responseUtil.sendItemResponse(res, {
    data: null,
    message: "Comment on food deleted successfully",
  });
});

const editFood = catchAsync(async (req, res) => {
  // Support both :id and :foodId as route params for compatibility
  const foodId = req.params.id || req.params.foodId;
  const foodPartnerId = req.foodPartner._id;
  let updateFields = req.body;
  const food = await foodModel.findById(foodId);
  if (!food) throw new AppError("Food not found", 404);
  if (food.foodPartner.toString() !== foodPartnerId.toString()) throw new AppError("You are not authorized to edit this food", 403);
  if (req.file) {
    const fileUploadResult = await storageService.uploadFile(
      req.file.buffer,
      uuid()
    );
    updateFields.video = fileUploadResult.url;
  }
  // Sanitize fields if present
  if (updateFields.name) {
    updateFields.name = sanitizeHtml(updateFields.name, { allowedTags: [], allowedAttributes: {} });
  }
  if (updateFields.description) {
    updateFields.description = sanitizeHtml(updateFields.description, { allowedTags: [], allowedAttributes: {} });
  }
  const allowedFields = ["name", "description", "video", "price", "isOrderable"];
  const updateKeys = Object.keys(updateFields);
  if (updateKeys.length !== 1) throw new AppError("Please send exactly one field to update.", 400);
  if (!allowedFields.includes(updateKeys[0])) throw new AppError(`Cannot update field: ${updateKeys[0]}`, 400);
  const updatedFood = await foodModel.findByIdAndUpdate(
    foodId,
    { $set: updateFields },
    { new: true }
  );
  responseUtil.sendItemResponse(res, {
    data: updatedFood,
    message: "Food updated successfully",
  });
});

const deleteFood = catchAsync(async (req, res) => {
  const foodId = req.params.foodId;
  const foodPartnerId = req.foodPartner._id;
  const food = await foodModel.findById(foodId);
  if (!food) throw new AppError("Food not found", 404);
  if (food.foodPartner.toString() !== foodPartnerId.toString()) throw new AppError("You are not authorized to delete this food", 403);
  await foodModel.findByIdAndDelete(foodId);
  await commentModel.deleteMany({ food: foodId });
  await likeModel.deleteMany({ food: foodId });
  await saveModel.deleteMany({ food: foodId });
  responseUtil.sendItemResponse(res, {
    data: null,
    message: "Food deleted successfully",
  });
});

const updateShareCount = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError("User not authenticated", 403);
  const { foodId } = req.body;
  const updatedFood = await foodModel.findByIdAndUpdate(
    foodId,
    { $inc: { shareCount: 1 } },
    { new: true }
  );
  if (!updatedFood) throw new AppError("Food not found", 404);
  responseUtil.sendItemResponse(res, {
    data: { currentShareCount: updatedFood.shareCount },
    message: "Share count updated successfully",
  });
});

module.exports = {
  createFood,
  getFoodItems,
  likeFood,
  saveFood,
  getSaveFood,
  commentOnFood,
  getCommentOnFood,
  deleteCommentOnFood,
  editFood,
  deleteFood,
  updateShareCount,
  getFollowedFoodItems,
};
