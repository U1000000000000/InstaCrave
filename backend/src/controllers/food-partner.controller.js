const foodPartnerModel = require("../models/foodpartner.model");
const foodModel = require("../models/food.model");
const followModel = require("../models/follow.model");
const { v4: uuid } = require("uuid");
const storageService = require("../services/storage.service");
const bcrypt = require("bcryptjs");

async function getFoodPartnerById(req, res) {
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

  if (!foodPartner) {
    return res.status(404).json({ message: "Food partner not found" });
  }

  res.status(200).json({
    message: "Food partner retrieved successfully",
    foodPartner: {
      ...foodPartner.toObject(),
      foodItems: foodItemsByFoodPartner,
    },
    isFollowing: isFollowing,
  });
}

async function getFoodPartner(req, res) {
  const foodPartnerId = req.foodPartner._id;

  const foodPartner = await foodPartnerModel.findById(foodPartnerId);

  if (!foodPartner) {
    return res.status(404).json({ message: "Food partner not found" });
  }

  const foodItemsByFoodPartner = await foodModel.find({
    foodPartner: foodPartnerId,
  });
  const followers = await followModel
    .find({
      foodpartner: foodPartnerId,
    })
    .populate("user", "fullName");

  res.status(200).json({
    message: "Food partner retrieved successfully",
    foodPartner: {
      ...foodPartner.toObject(),
      foodItems: foodItemsByFoodPartner,
      followers: followers.map((follower) => ({
        id: follower.user._id,
        name: follower.user.fullName,
      })),
    },
  });
}

async function followFoodPartner(req, res) {
  const foodPartnerId = req.body.foodpartner;
  const user = req.user;

  const foodPartner = await foodPartnerModel.findById(foodPartnerId);

  if (!foodPartner) {
    return res.status(404).json({ message: "Food partner not found" });
  }

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

    return res.status(200).json({
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

  res.status(201).json({
    message: "Food Partner Followed successfully",
    follow,
  });
}

async function editFoodPartner(req, res) {
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
    return res
      .status(400)
      .json({ message: "Please send exactly one field to update." });
  }

  if (!allowedFields.includes(updateKeys[0])) {
    return res
      .status(400)
      .json({ message: `Cannot update field: ${updateKeys[0]}` });
  }

  if (updateFields.password) {
    const hashedPassword = await bcrypt.hash(updateFields.password, 10);
    updateFields.password = hashedPassword;
  }

  const updatedFoodPartner = await foodPartnerModel.findByIdAndUpdate(
    foodPartnerId,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedFoodPartner) {
    return res.status(404).json({ message: "Food partner not found" });
  }

  res.status(200).json({
    message: "Food partner updated successfully",
    foodPartner: updatedFoodPartner,
  });
}

module.exports = {
  getFoodPartnerById,
  followFoodPartner,
  getFoodPartner,
  editFoodPartner,
};
