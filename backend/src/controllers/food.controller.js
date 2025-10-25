const foodModel = require("../models/food.model");
const storageService = require("../services/storage.service");
const likeModel = require("../models/likes.model");
const saveModel = require("../models/save.model");
const commentModel = require("../models/comment.model");
const followModel = require("../models/follow.model");
const { v4: uuid } = require("uuid");

async function createFood(req, res) {
  const fileUploadResult = await storageService.uploadFile(
    req.file.buffer,
    uuid()
  );

  const foodItem = await foodModel.create({
    name: req.body.name,
    description: req.body.description,
    video: fileUploadResult.url,
    foodPartner: req.foodPartner._id,
  });

  res.status(201).json({
    message: "food created successfully",
    food: foodItem,
  });
}

async function getFoodItems(req, res) {
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

  res.status(200).json({
    message: "Food items fetched successfully",
    foodItems: responseFoodItems,
  });
}

async function getFollowedFoodItems(req, res) {
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

  res.status(200).json({
    message: "Followed food items fetched successfully",
    foodItems: responseFoodItems,
  });
}

async function likeFood(req, res) {
  const { foodId } = req.body;
  const user = req.user;

  const isAlreadyLiked = await likeModel.findOne({
    user: user._id,
    food: foodId,
  });

  if (isAlreadyLiked) {
    await likeModel.deleteOne({
      user: user._id,
      food: foodId,
    });

    await foodModel.findByIdAndUpdate(foodId, {
      $inc: { likeCount: -1 },
    });

    return res.status(200).json({
      message: "Food unliked successfully",
    });
  }

  const like = await likeModel.create({
    user: user._id,
    food: foodId,
  });

  await foodModel.findByIdAndUpdate(foodId, {
    $inc: { likeCount: 1 },
  });

  res.status(201).json({
    message: "Food liked successfully",
    like,
  });
}

async function saveFood(req, res) {
  const { foodId } = req.body;
  const user = req.user;

  const isAlreadySaved = await saveModel.findOne({
    user: user._id,
    food: foodId,
  });

  if (isAlreadySaved) {
    await saveModel.deleteOne({
      user: user._id,
      food: foodId,
    });

    await foodModel.findByIdAndUpdate(foodId, {
      $inc: { savesCount: -1 },
    });

    return res.status(200).json({
      message: "Food unsaved successfully",
    });
  }

  const save = await saveModel.create({
    user: user._id,
    food: foodId,
  });

  await foodModel.findByIdAndUpdate(foodId, {
    $inc: { savesCount: 1 },
  });

  res.status(201).json({
    message: "Food saved successfully",
    save,
  });
}

async function getSaveFood(req, res) {
  const user = req.user;

  const savedFoods = await saveModel.find({ user: user._id }).populate({
    path: "food",
    populate: {
      path: "foodPartner",
      select: "name profileImage",
    },
  });

  if (!savedFoods || savedFoods.length === 0) {
    return res.status(404).json({ message: "No saved foods found" });
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

  res.status(200).json({
    message: "Saved foods retrieved successfully",
    responseSavedFoods,
  });
}

async function commentOnFood(req, res) {
  const { foodId, comment } = req.body;
  const user = req.user;

  const commented = await commentModel.create({
    user: user._id,
    food: foodId,
    comment: comment,
  });

  await foodModel.findByIdAndUpdate(foodId, {
    $inc: { commentCount: 1 },
  });

  res.status(201).json({
    message: "Commented on food successfully",
    commented,
  });
}

async function getCommentOnFood(req, res) {
  const { foodId } = req.query;

  const comments = await commentModel
    .find({ food: foodId })
    .populate({ path: "user", select: "fullName" });

  if (!comments || comments.length === 0) {
    return res.status(404).json({ message: "No comments yet!" });
  }

  res.status(200).json({
    message: "Comments on food retrieved successfully",
    comments,
  });
}

async function deleteCommentOnFood(req, res) {
  const { commentId } = req.body;
  const user = req.user;

  const comment = await commentModel.findById(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (comment.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this comment" });
  }

  await commentModel.findByIdAndDelete(commentId);

  await foodModel.findByIdAndUpdate(comment.food, {
    $inc: { commentCount: -1 },
  });

  res.status(200).json({
    message: "Comment on food deleted successfully",
  });
}

async function editFood(req, res) {
  try {
    const { foodId } = req.params;
    const foodPartnerId = req.foodPartner._id;
    let updateFields = req.body;

    const food = await foodModel.findById(foodId);

    if (!food) {
      return res.status(404).json({ message: "Food not found" });
    }

    if (food.foodPartner.toString() !== foodPartnerId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this food" });
    }

    if (req.file) {
      const fileUploadResult = await storageService.uploadFile(
        req.file.buffer,
        uuid()
      );
      updateFields.video = fileUploadResult.url;
    }

    const allowedFields = ["name", "description", "video"];
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

    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      message: "Food updated successfully",
      food: updatedFood,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function deleteFood(req, res) {
  const foodId = req.params.foodId;
  const foodPartnerId = req.foodPartner._id;

  const food = await foodModel.findById(foodId);

  if (!food) {
    return res.status(404).json({ message: "Food not found" });
  }

  if (food.foodPartner.toString() !== foodPartnerId.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this food" });
  }

  await foodModel.findByIdAndDelete(foodId);
  await commentModel.deleteMany({ food: foodId });
  await likeModel.deleteMany({ food: foodId });
  await saveModel.deleteMany({ food: foodId });  

  res.status(200).json({
    message: "Food deleted successfully",
  });
}

async function updateShareCount(req, res) {
  if (!req.user) {
    return res.status(403).json({
      message: "User not authenticated",
    });
  }

  const { foodId } = req.body;

  try {
    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      {
        $inc: { shareCount: 1 },
      },
      { new: true }
    );

    if (!updatedFood) {
      return res.status(404).json({
        message: "Food not found",
      });
    }

    res.status(200).json({
      message: "Share count updated successfully",
      currentShareCount: updatedFood.shareCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating share count",
      error: error.message,
    });
  }
}

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
