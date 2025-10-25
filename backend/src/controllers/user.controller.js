const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const foodModel = require("../models/food.model");
const foodPartnerModel = require("../models/foodpartner.model");
const bcrypt = require("bcryptjs");

async function getUser(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

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

    res.status(200).json({
      message: "User fetched successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        likedFoods,
        comments,
        following,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
}

async function getComments(req, res) {
  const user = req.user;

  const comments = await commentModel.find({ user: user._id }).populate({
    path: "food",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });

  if (!comments || comments.length === 0) {
    return res.status(404).json({ message: "No comments found" });
  }

  res.status(200).json({
    message: "Comments fetched successfully",
    comments: comments,
  });
}

async function getFollowing(req, res) {
  const user = req.user;

  const following = await followModel
    .find({ user: user._id })
    .populate("foodpartner");

  if (!following || following.length === 0) {
    return res
      .status(404)
      .json({ message: "No following food partners found" });
  }

  res.status(200).json({
    message: "Following food partners fetched successfully",
    following: following.map((follow) => follow.foodpartner),
  });
}

async function getLikes(req, res) {
  const user = req.user;

  const likes = await likeModel.find({ user: user._id }).populate({
    path: "food",
    select: "_id name description",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });

  if (!likes || likes.length === 0) {
    return res.status(404).json({ message: "No likes found" });
  }

  res.status(200).json({
    message: "Likes fetched successfully",
    likes: likes,
  });
}

async function editUser(req, res) {
  const userId = req.user._id;
  let updateFields = req.body;

  const allowedFields = ["fullName", "password"];
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

  const updatedUser = await userModel.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    message: "User updated successfully",
    user: {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
    },
  });
}

module.exports = {
  getUser,
  editUser,
  getComments,
  getFollowing,
  getLikes,
};
