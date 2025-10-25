const mongoose = require('mongoose');
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");
const followModel = require("../models/follow.model");

async function search(req, res) {
  const { query, type } = req.query;

  try {
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

    res.status(200).json({
      foodItems,
      foodPartners,
    });
  } catch (error) {
    res.status(500).json({ message: "Error searching", error: error.message });
  }
}

async function explore(req, res) {
  try {
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

    res.status(200).json({
      message: "unfollowed food items and food partners fetched successfully",
      foodItems,
      foodPartners,
    });
  } catch (error) {
    console.error("Error in explore function:", error);
    res.status(500).json({
      message: "Error fetching explore content",
      error: error.message,
    });
  }
}

module.exports = {
  search,
  explore,
};
