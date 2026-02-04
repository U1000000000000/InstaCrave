const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");
const mongoose = require('mongoose');
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");
const followModel = require("../models/follow.model");
const { trackSearch } = require("../utils/analytics.helper");
const { escapeRegex, normalizeSearchText } = require("../utils/regex");

const search = catchAsync(async (req, res) => {
  const { query, type } = req.query;
  if (!query) throw new AppError("Query parameter is required", 400);

  const normalizedQuery = normalizeSearchText(query, { maxLength: 100 });
  if (normalizedQuery.length === 0) {
    throw new AppError("Query parameter is required", 400);
  }

  const safeRegex = new RegExp(escapeRegex(normalizedQuery), 'i');
  let foodItems = [];
  let foodPartners = [];
  
  // TODO: Search is doing multiple DB queries - should use aggregation pipeline instead
  // Tried MongoDB text search but results were not relevant enough
  // Current regex approach works but won't scale past 10k documents
  if (type === "food" || type === "all") {
    foodItems = await foodModel.find({
      $or: [
        { name: safeRegex },
        { description: safeRegex },
      ],
    });
  }
  if (type === "partner" || type === "all") {
    foodPartners = await foodPartnerModel.find({
      name: safeRegex,
    });
  }
  
  // Track search event
  const totalResults = foodItems.length + foodPartners.length;
  await trackSearch(req, normalizedQuery, totalResults, { type });
  
  responseUtil.sendItemResponse(res, {
    data: { foodItems, foodPartners },
    message: "Search results fetched successfully",
  });
});

const explore = catchAsync(async (req, res) => {
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
  const foodItems = await foodModel.find({
    foodPartner: { $nin: followingPartnerIds },
  });
  const foodPartners = await foodPartnerModel.aggregate([
    {
      $match: {
        _id: {
          $nin: followingPartnerIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      },
    },
    {
      $lookup: {
        from: "foods",
        localField: "_id",
        foreignField: "foodPartner",
        as: "foodItems",
      },
    },
    {
      $project: {
        name: 1,
        profileImage: 1,
        followCount: 1,
        mealCount: { $size: "$foodItems" },
      },
    },
  ]);
  
  // Track explore page view
  const { trackPageView } = require("../utils/analytics.helper");
  await trackPageView(req, 'explore', {
    foodItemsCount: foodItems.length,
    partnersCount: foodPartners.length,
  });
  
  responseUtil.sendItemResponse(res, {
    data: { foodItems, foodPartners },
    message: "Unfollowed food items and food partners fetched successfully",
  });
});

module.exports = {
  search,
  explore,
};
