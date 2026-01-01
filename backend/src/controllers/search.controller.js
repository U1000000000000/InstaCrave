const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");
const mongoose = require('mongoose');
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");
const followModel = require("../models/follow.model");

const search = catchAsync(async (req, res) => {
  const { query, type } = req.query;
  if (!query) throw new AppError("Query parameter is required", 400);
  let foodItems = [];
  let foodPartners = [];
  if (type === "food" || type === "all") {
    foodItems = await foodModel.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });
  }
  if (type === "partner" || type === "all") {
    foodPartners = await foodPartnerModel.find({
      name: { $regex: query, $options: "i" },
    });
  }
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
  responseUtil.sendItemResponse(res, {
    data: { foodItems, foodPartners },
    message: "Unfollowed food items and food partners fetched successfully",
  });
});

module.exports = {
  search,
  explore,
};
