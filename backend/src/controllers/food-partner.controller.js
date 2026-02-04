const foodPartnerModel = require("../models/foodpartner.model");
const sanitizeHtml = require('sanitize-html');
const foodModel = require("../models/food.model");
const followModel = require("../models/follow.model");
const analyticsService = require("../services/analytics.service");
const logger = require("../services/logger.service");
const { uuidv4: uuid } = require("../utils/uuid");
const storageService = require("../services/storage.service");

const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");

const getFoodPartnerById = catchAsync(async (req, res) => {
  const foodPartnerId = req.params.id;
  const user = req.user;

  const foodPartner = await foodPartnerModel.findById(foodPartnerId);
  const foodItemsByFoodPartner = await foodModel.find({
    foodPartner: foodPartnerId,
  });

  let isFollowing = false;

  if (user) {
    const followRecord = await followModel.findOne({
      user: user._id,
      foodpartner: foodPartnerId,
    });
    isFollowing = !!followRecord;
  }

  if (!foodPartner) throw new AppError("Food partner not found", 404);

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'partner:profile_viewed',
    userId: user?._id?.toString(),
    userType: user ? 'User' : null,
    data: {
      partnerId: foodPartnerId.toString(),
      partnerName: foodPartner.name,
      foodItemsCount: foodItemsByFoodPartner.length,
      isFollowing,
    },
    request: req,
  }).catch(err => logger.error('Failed to track partner profile view', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: {
      ...foodPartner.toObject(),
      foodItems: foodItemsByFoodPartner,
      isFollowing: isFollowing,
    },
    message: "Food partner retrieved successfully",
  });
});

const getFoodPartner = catchAsync(async (req, res) => {
  const foodPartnerId = req.foodPartner._id;

  const foodPartner = await foodPartnerModel.findById(foodPartnerId);

  if (!foodPartner) throw new AppError("Food partner not found", 404);

  const foodItemsByFoodPartner = await foodModel.find({
    foodPartner: foodPartnerId,
  });
  const followers = await followModel
    .find({
      foodpartner: foodPartnerId,
    })
    .populate("user", "fullName");

  responseUtil.sendItemResponse(res, {
    data: {
      ...foodPartner.toObject(),
      foodItems: foodItemsByFoodPartner,
      followers: followers.map((follower) => ({
        id: follower.user._id,
        name: follower.user.fullName,
      })),
    },
    message: "Food partner retrieved successfully",
  });

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'partner:own_profile_viewed',
    userId: req.foodPartner._id.toString(),
    userType: 'FoodPartner',
    data: {
      foodItemsCount: foodItemsByFoodPartner.length,
      followersCount: followers.length,
    },
    request: req,
  }).catch(err => logger.error('Failed to track own profile view', { error: err.message }));
});

const followFoodPartner = catchAsync(async (req, res) => {
  const foodPartnerId = req.body.foodpartner;
  const user = req.user;

  const foodPartner = await foodPartnerModel.findById(foodPartnerId);

  if (!foodPartner) throw new AppError("Food partner not found", 404);

  const isAlreadyFollowed = await followModel.findOne({
    user: user._id,
    foodpartner: foodPartnerId,
  });

  if (isAlreadyFollowed) {
    await followModel.deleteOne({
      user: user._id,
      foodpartner: foodPartnerId,
    });

    await foodPartnerModel.findByIdAndUpdate(foodPartnerId, {
      $inc: { followCount: -1 },
    });

    // Track unfollow
    await analyticsService.trackEvent({
      eventType: 'partner:unfollowed',
      userId: user._id.toString(),
      userType: 'User',
      data: {
        partnerId: foodPartnerId.toString(),
        partnerName: foodPartner.name,
      },
      request: req,
    }).catch(err => logger.error('Failed to track unfollow', { error: err.message }));

    return responseUtil.sendItemResponse(res, {
      data: null,
      message: "Food Partner unfollowed successfully",
    });
  }

  const follow = await followModel.create({
    user: user._id,
    foodpartner: foodPartnerId,
  });

  await foodPartnerModel.findByIdAndUpdate(foodPartnerId, {
    $inc: { followCount: 1 },
  });

  // Track follow
  await analyticsService.trackEvent({
    eventType: 'partner:followed',
    userId: user._id.toString(),
    userType: 'User',
    data: {
      partnerId: foodPartnerId.toString(),
      partnerName: foodPartner.name,
    },
    request: req,
  }).catch(err => logger.error('Failed to track follow', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: follow,
    message: "Food Partner Followed successfully",
  });
});

const editFoodPartner = catchAsync(async (req, res) => {
  const foodPartnerId = req.foodPartner._id;
  let updateFields = req.body;
  let profileImage;

  if (req.file) {
    const fileUploadResult = await storageService.uploadFile(
      req.file.buffer,
      uuid()
    );
    profileImage = fileUploadResult.url;
    updateFields.profileImage = profileImage;
  }

  const allowedFields = [
    "name",
    "address",
    "profileImage",
    "contactName",
    "password",
  ];
  const updateKeys = Object.keys(updateFields);

  if (updateKeys.length !== 1) {
    throw new AppError("Please send exactly one field to update.", 400);
  }

  if (!allowedFields.includes(updateKeys[0])) {
    throw new AppError(`Cannot update field: ${updateKeys[0]}`, 400);
  }

  let updatedFoodPartner;
  if (updateFields.password) {
    // Secure: fetch, set, save (triggers hashing)
    updatedFoodPartner = await foodPartnerModel.findById(foodPartnerId);
    if (!updatedFoodPartner) throw new AppError("Food partner not found", 404);
    updatedFoodPartner.password = updateFields.password;
    await updatedFoodPartner.save();
  } else {
    if (updateFields.name) {
      updateFields.name = sanitizeHtml(updateFields.name, { allowedTags: [], allowedAttributes: {} });
    }
    if (updateFields.address) {
      updateFields.address = sanitizeHtml(updateFields.address, { allowedTags: [], allowedAttributes: {} });
    }
    if (updateFields.contactName) {
      updateFields.contactName = sanitizeHtml(updateFields.contactName, { allowedTags: [], allowedAttributes: {} });
    }
    updatedFoodPartner = await foodPartnerModel.findByIdAndUpdate(
      foodPartnerId,
      { $set: updateFields },
      { new: true }
    );
    if (!updatedFoodPartner) throw new AppError("Food partner not found", 404);
  }

  // Track analytics
  await analyticsService.trackEvent({
    eventType: 'partner:profile_updated',
    userId: updatedFoodPartner._id.toString(),
    userType: 'FoodPartner',
    data: {
      fieldUpdated: updateKeys[0],
    },
    request: req,
  }).catch(err => logger.error('Failed to track partner profile update', { error: err.message }));

  responseUtil.sendItemResponse(res, {
    data: updatedFoodPartner,
    message: "Food partner updated successfully",
  });
});

module.exports = {
  getFoodPartnerById,
  followFoodPartner,
  getFoodPartner,
  editFoodPartner,
};
