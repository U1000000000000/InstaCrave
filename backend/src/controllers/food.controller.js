const foodModel = require("../models/food.model");
const storageService = require("../services/storage.service");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const followModel = require("../models/follow.model");
const analyticsService = require("../services/analytics.service");
const logger = require("../services/logger.service");
const { uuidv4: uuid } = require("../utils/uuid");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const responseUtil = require("../utils/response");

const sanitizeHtml = require('sanitize-html');

// TODO: Add pagination to getAllFood - currently returns everything which will be slow at scale
const createFood = catchAsync(async (req, res) => {
  const fileUploadResult = await storageService.uploadFile(
    req.file.buffer,
    uuid()
  );
  const cleanDescription = sanitizeHtml(req.body.description, { allowedTags: [], allowedAttributes: {} });
  const foodItem = await foodModel.create({
    name: sanitizeHtml(req.body.name, { allowedTags: [], allowedAttributes: {} }),
    description: cleanDescription,
    video: fileUploadResult.url,
    foodPartner: req.foodPartner._id,
    isOrderable: req.body.isOrderable === 'true',
    price: req.body.isOrderable === 'true' ? parseFloat(req.body.price) : undefined,
  });

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:item_created',
    userId: req.foodPartner._id.toString(),
    userType: 'FoodPartner',
    data: {
      foodId: foodItem._id.toString(),
      foodName: foodItem.name,
      isOrderable: foodItem.isOrderable,
      price: foodItem.price,
    },
    request: req,
  }).catch(err => logger.error('Failed to track food creation', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: foodItem,
    message: "Food created successfully",
  });
});

const getFoodItems = catchAsync(async (req, res) => {
  const user = req.user;
  const foodItems = await foodModel.find({}).populate({
    path: "foodPartner",
    select: "name profileImage",
  });

  let likedFoodIds = [];
  let savedFoodIds = [];
  let followingPartnerIds = [];

  if (user) {
    const likedFoods = await likeModel
      .find({ user: user._id })
      .populate("food");
    likedFoodIds = likedFoods.map((like) => like.food._id.toString());

    const savedFoods = await saveModel
      .find({ user: user._id })
      .populate("food");
    savedFoodIds = savedFoods.map((save) => save.food._id.toString());

    const followingPartners = await followModel
      .find({ user: user._id })
      .populate("foodpartner");
    followingPartnerIds = followingPartners.map((follow) =>
      follow.foodpartner._id.toString()
    );
  }

  const responseFoodItems = foodItems.map((food) => ({
    ...food.toObject(),
    isLiked: likedFoodIds.includes(food._id.toString()),
    isSaved: savedFoodIds.includes(food._id.toString()),
    isFollowing: followingPartnerIds.includes(food.foodPartner._id.toString()),
  }));

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:list_viewed',
    userId: user?._id?.toString(),
    userType: user ? 'User' : null,
    data: {
      totalItems: responseFoodItems.length,
      isAuthenticated: !!user,
    },
    request: req,
  }).catch(err => logger.error('Failed to track food list view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: responseFoodItems,
    message: "Food items fetched successfully",
  });
});

const getFollowedFoodItems = catchAsync(async (req, res) => {
  const user = req.user;

  let followingPartnerIds = [];
  if (user) {
    const followingPartners = await followModel
      .find({ user: user._id })
      .populate("foodpartner");
    followingPartnerIds = followingPartners.map((follow) =>
      follow.foodpartner._id.toString()
    );
  }

  const foodItems = await foodModel
    .find({
      foodPartner: { $in: followingPartnerIds },
    })
    .populate({
      path: "foodPartner",
      select: "name profileImage",
    })
    .sort({ createdAt: -1 });

  let likedFoodIds = [];
  let savedFoodIds = [];

  if (user) {
    const likedFoods = await likeModel
      .find({ user: user._id })
      .populate("food");
    likedFoodIds = likedFoods.map((like) => like.food._id.toString());

    const savedFoods = await saveModel
      .find({ user: user._id })
      .populate("food");
    savedFoodIds = savedFoods.map((save) => save.food._id.toString());
  }

  const responseFoodItems = foodItems.map((food) => ({
    ...food.toObject(),
    isLiked: likedFoodIds.includes(food._id.toString()),
    isSaved: savedFoodIds.includes(food._id.toString()),
    isFollowing: followingPartnerIds.includes(food.foodPartner._id.toString()),
  }));

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:followed_list_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      totalItems: responseFoodItems.length,
      followingCount: followingPartnerIds.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track followed food view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: responseFoodItems,
    message: "Followed food items fetched successfully",
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

    // Track unlike
    await analyticsService.trackEvent({
      eventType: 'food:item_unliked',
      userId: user._id.toString(),
      userType: 'User',
      data: { foodId: foodId.toString() },
      request: req,
    }).catch(err => logger.error('Failed to track unlike', { error: err.message }));

    return responseUtil.sendItemResponse(res, {
      data: null,
      message: "Food unliked successfully",
    });
  }
  const like = await likeModel.create({ user: user._id, food: foodId });
  await foodModel.findByIdAndUpdate(foodId, { $inc: { likeCount: 1 } });

  // Track like
  await analyticsService.trackEvent({
    eventType: 'food:item_liked',
    userId: user._id.toString(),
    userType: 'User',
    data: { foodId: foodId.toString() },
    request: req,
  }).catch(err => logger.error('Failed to track like', { error: err.message }));

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

    // Track unsave
    await analyticsService.trackEvent({
      eventType: 'food:item_unsaved',
      userId: user._id.toString(),
      userType: 'User',
      data: { foodId: foodId.toString() },
      request: req,
    }).catch(err => logger.error('Failed to track unsave', { error: err.message }));

    return responseUtil.sendItemResponse(res, {
      data: null,
      message: "Food unsaved successfully",
    });
  }
  const save = await saveModel.create({ user: user._id, food: foodId });
  await foodModel.findByIdAndUpdate(foodId, { $inc: { savesCount: 1 } });

  // Track save
  await analyticsService.trackEvent({
    eventType: 'food:item_saved',
    userId: user._id.toString(),
    userType: 'User',
    data: { foodId: foodId.toString() },
    request: req,
  }).catch(err => logger.error('Failed to track save', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: save,
    message: "Food saved successfully",
  });
});

const getSaveFood = catchAsync(async (req, res) => {
  const user = req.user;

  const savedFoods = await saveModel.find({ user: user._id }).populate({
    path: "food",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });

  if (!savedFoods || savedFoods.length === 0) throw new AppError("No saved foods found", 404);

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

  const responseSavedFoods = savedFoods.map((save) => {
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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:saved_list_viewed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      savedCount: responseSavedFoods.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track saved list view', { error: err.message }));

  responseUtil.sendListResponse(res, {
    data: responseSavedFoods,
    message: "Saved foods retrieved successfully",
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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:comment_created',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      foodId: foodId.toString(),
      commentId: commented._id.toString(),
      commentLength: cleanComment.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track comment', { error: err.message }));

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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:comments_viewed',
    userId: req.user?._id?.toString(),
    userType: req.user ? 'User' : null,
    data: {
      foodId: foodId.toString(),
      commentsCount: comments.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track comments view', { error: err.message }));

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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:comment_deleted',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      foodId: comment.food.toString(),
      commentId: commentId.toString(),
    },
    request: req,
  }).catch(err => logger.error('Failed to track comment deletion', { error: err.message }));

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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:item_updated',
    userId: req.foodPartner._id.toString(),
    userType: 'FoodPartner',
    data: {
      foodId: foodId.toString(),
      fieldUpdated: updateKeys[0],
    },
    request: req,
  }).catch(err => logger.error('Failed to track food update', { error: err.message }));

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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:item_deleted',
    userId: req.foodPartner._id.toString(),
    userType: 'FoodPartner',
    data: {
      foodId: foodId.toString(),
      foodName: food.name,
    },
    request: req,
  }).catch(err => logger.error('Failed to track food deletion', { error: err.message }));

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

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'food:item_shared',
    userId: req.user._id.toString(),
    userType: 'User',
    data: {
      foodId: foodId.toString(),
      newShareCount: updatedFood.shareCount,
    },
    request: req,
  }).catch(err => logger.error('Failed to track share', { error: err.message }));

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
