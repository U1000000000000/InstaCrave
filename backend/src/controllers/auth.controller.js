const userModel = require("../models/user.model");
const foodPartnerModel = require("../models/foodpartner.model");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const tokenService = require("../services/token.service");
const Session = require("../models/session.model");
const userAgentParser = require("ua-parser-js");
const storageService = require("../services/storage.service");
const { uuidv4: uuid } = require("../utils/uuid");

const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");
const logger = require('../services/logger.service');

// Background job queue imports
const { addEmailJob, addAnalyticsJob, JOB_TYPES } = require('../queue/index');

const getAccessCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 15 * 60 * 1000,
});
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

const sanitizeHtml = require("sanitize-html");

// NOTE: Argon2 config in .env was tuned through trial and error
// Started with defaults, but login was taking 500ms on M1 Mac
// Reduced to current settings which gives ~150ms (acceptable tradeoff)
const registerUser = catchAsync(async (req, res) => {
  const { fullName, email, password } = req.body;
  const isUserAlreadyExists = await userModel.findOne({ email });
  if (isUserAlreadyExists) throw new AppError("User already exists", 400);
  const user = await userModel.create({
    fullName: sanitizeHtml(fullName, {
      allowedTags: [],
      allowedAttributes: {},
    }),
    email,
    password,
  });
  // Session-based refresh token logic
  const payload = { id: user._id, role: "user" };
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken();
  const refreshTokenHash = await tokenService.hashRefreshToken(refreshToken);
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip;
  const session = await Session.create({
    userId: user._id,
    userType: "User",
    userAgent,
    ip,
    tokenHash: refreshTokenHash,
  });
  res.cookie("accessToken", accessToken, getAccessCookieOptions());
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
  res.cookie("sessionId", session._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  
  // Send welcome email in background (non-blocking)
  try {
    await addEmailJob(JOB_TYPES.SEND_WELCOME_EMAIL, {
      to: user.email,
      userName: user.fullName,
    });
    
    // Track user registration for analytics
    await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, {
      userId: user._id.toString(),
      action: 'user_registered',
      metadata: {
        userType: 'User',
        registrationDate: new Date().toISOString(),
      },
    });
  } catch (jobError) {
    logger.error('Failed to queue welcome email job', {
      error: jobError.message,
      userId: user._id.toString(),
      email: user.email,
    });
  }
  
  responseUtil.sendItemResponse(res, {
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
    },
    message: "User registered successfully",
  });
});

const loginUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) throw new AppError("Invalid email or password", 400);
  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 400);
  // Session-based refresh token logic
  const payload = { id: user._id, role: "user" };
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken();
  const refreshTokenHash = await tokenService.hashRefreshToken(refreshToken);
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip;
  const session = await Session.create({
    userId: user._id,
    userType: "User",
    userAgent,
    ip,
    tokenHash: refreshTokenHash,
  });
  res.cookie("accessToken", accessToken, getAccessCookieOptions());
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
  res.cookie("sessionId", session._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  responseUtil.sendItemResponse(res, {
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
    },
    message: "User logged in successfully",
  });
});

const logoutUser = catchAsync(async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const refreshToken = req.cookies.refreshToken;
  
  // Use sessionId for direct lookup (much faster)
  if (sessionId && refreshToken) {
    try {
      const session = await Session.findById(sessionId);
      if (session) {
        const isMatch = await tokenService.compareRefreshToken(
          refreshToken,
          session.tokenHash
        );
        if (isMatch) {
          await session.deleteOne();
        }
      }
    } catch (error) {
      // Session not found or already deleted, continue with logout
      logger.debug('Session cleanup error during user logout', {
        error: error.message,
        userId: req.user?.id,
      });
    }
  }
  
  res.clearCookie("accessToken", getAccessCookieOptions());
  res.clearCookie("refreshToken", getRefreshCookieOptions());
  res.clearCookie("sessionId", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  responseUtil.sendItemResponse(res, {
    data: null,
    message: "User logged out successfully",
  });
});

const registerFoodPartner = catchAsync(async (req, res) => {
  let profileImageUrl;
  if (req.file) {
    const fileUploadResult = await storageService.uploadFile(
      req.file.buffer,
      uuid()
    );
    profileImageUrl = fileUploadResult.url;
  } else {
    profileImageUrl = foodPartnerModel.schema.path("profileImage").defaultValue;
  }
  const { name, email, password, phone, address, contactName } = req.body;
  const isAccountAlreadyExists = await foodPartnerModel.findOne({ email });
  if (isAccountAlreadyExists)
    throw new AppError("Food partner account already exists", 400);
  const foodPartner = await foodPartnerModel.create({
    name: sanitizeHtml(name, { allowedTags: [], allowedAttributes: {} }),
    email,
    password,
    phone,
    address: sanitizeHtml(address, { allowedTags: [], allowedAttributes: {} }),
    contactName: sanitizeHtml(contactName, {
      allowedTags: [],
      allowedAttributes: {},
    }),
    profileImage: profileImageUrl,
  });
  // Session-based refresh token logic
  const payload = { id: foodPartner._id, role: "foodPartner" };
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken();
  const refreshTokenHash = await tokenService.hashRefreshToken(refreshToken);
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip;
  const session = await Session.create({
    userId: foodPartner._id,
    userType: "FoodPartner",
    userAgent,
    ip,
    tokenHash: refreshTokenHash,
  });
  res.cookie("accessToken", accessToken, getAccessCookieOptions());
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
  res.cookie("sessionId", session._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  responseUtil.sendItemResponse(res, {
    data: {
      _id: foodPartner._id,
      email: foodPartner.email,
      name: foodPartner.name,
      address: foodPartner.address,
      contactName: foodPartner.contactName,
      phone: foodPartner.phone,
      profileImage: foodPartner.profileImage,
    },
    message: "Food partner registered successfully",
  });
});

const loginFoodPartner = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const foodPartner = await foodPartnerModel.findOne({ email });
  if (!foodPartner) throw new AppError("Invalid email or password", 400);
  const isPasswordValid = await foodPartner.verifyPassword(password);
  if (!isPasswordValid) throw new AppError("Invalid email or password", 400);
  // Session-based refresh token logic
  const payload = { id: foodPartner._id, role: "foodPartner" };
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken();
  const refreshTokenHash = await tokenService.hashRefreshToken(refreshToken);
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip;
  const session = await Session.create({
    userId: foodPartner._id,
    userType: "FoodPartner",
    userAgent,
    ip,
    tokenHash: refreshTokenHash,
  });
  res.cookie("accessToken", accessToken, getAccessCookieOptions());
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());
  res.cookie("sessionId", session._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  responseUtil.sendItemResponse(res, {
    data: {
      _id: foodPartner._id,
      email: foodPartner.email,
      name: foodPartner.name,
    },
    message: "Food partner logged in successfully",
  });
});

const logoutFoodPartner = catchAsync(async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const refreshToken = req.cookies.refreshToken;
  
  // Use sessionId for direct lookup (much faster)
  if (sessionId && refreshToken) {
    try {
      const session = await Session.findById(sessionId);
      if (session) {
        const isMatch = await tokenService.compareRefreshToken(
          refreshToken,
          session.tokenHash
        );
        if (isMatch) {
          await session.deleteOne();
        }
      }
    } catch (error) {
      // Session not found or already deleted, continue with logout
      logger.debug('Session cleanup error during food partner logout', {
        error: error.message,
        partnerId: req.user?.id,
      });
    }
  }
  
  res.clearCookie("accessToken", getAccessCookieOptions());
  res.clearCookie("refreshToken", getRefreshCookieOptions());
  res.clearCookie("sessionId", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  responseUtil.sendItemResponse(res, {
    data: null,
    message: "Food partner logged out successfully",
  });
});
// Refresh Token Endpoint (for both user and food partner)
const refreshToken = catchAsync(async (req, res) => {
  // Debug: log incoming cookies for refresh
  const refreshToken = req.cookies.refreshToken;
  const sessionId = req.cookies.sessionId;
  if (!refreshToken || !sessionId)
    throw new AppError("No refresh token or sessionId provided", 401);
  // Find session by sessionId
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Invalid session", 401);
  const isValid = await tokenService.compareRefreshToken(
    refreshToken,
    session.tokenHash
  );
  if (!isValid) throw new AppError("Invalid refresh token", 401);
  // Rotate: remove old, add new
  const newRefreshToken = tokenService.generateRefreshToken();
  const newRefreshTokenHash = await tokenService.hashRefreshToken(
    newRefreshToken
  );
  session.tokenHash = newRefreshTokenHash;
  session.lastUsedAt = new Date();
  await session.save();
  // Issue new access token
  let entity;
  if (session.userType === "User") {
    entity = await userModel.findById(session.userId);
  } else {
    entity = await foodPartnerModel.findById(session.userId);
  }
  if (!entity) throw new AppError("Session user not found", 401);
  const payload =
    session.userType === "User"
      ? { id: entity._id, role: "user" }
      : { id: entity._id, role: "foodPartner" };
  const newAccessToken = tokenService.generateAccessToken(payload);
  res.cookie("accessToken", newAccessToken, getAccessCookieOptions());
  res.cookie("refreshToken", newRefreshToken, getRefreshCookieOptions());
  return responseUtil.sendItemResponse(res, {
    data: null,
    message: "Token refreshed successfully",
  });
});

const getCurrentUser = catchAsync(async (req, res) => {
  let userType;
  let user;
  if (req.foodPartner) {
    user = req.foodPartner;
    userType = "food-partner";
  } else if (req.user) {
    user = req.user;
    userType = "user";
  }
  responseUtil.sendItemResponse(res, {
    data: { type: userType, id: user._id },
    message: "Current user type fetched successfully",
  });
});

// List active sessions for current user
const listSessions = catchAsync(async (req, res) => {
  let userId, userType;
  if (req.foodPartner) {
    userId = req.foodPartner._id;
    userType = "FoodPartner";
  } else if (req.user) {
    userId = req.user._id;
    userType = "User";
  } else {
    throw new AppError("Not authenticated", 401);
  }
  const sessions = await Session.find({ userId, userType }).select(
    "-tokenHash"
  );
  return responseUtil.sendItemResponse(res, {
    data: sessions,
    message: "Active sessions listed successfully",
  });
});

// Revoke a session by sessionId (support both user and foodPartner)
const revokeSession = catchAsync(async (req, res) => {
  let userId, userType;
  if (req.foodPartner) {
    userId = req.foodPartner._id;
    userType = "FoodPartner";
  } else if (req.user) {
    userId = req.user._id;
    userType = "User";
  } else {
    throw new AppError("Not authenticated", 401);
  }
  const { sessionId } = req.params;
  const session = await Session.findOne({ _id: sessionId, userId, userType });
  if (!session) throw new AppError("Session not found", 404);
  await session.deleteOne();
  return responseUtil.sendItemResponse(res, {
    data: null,
    message: "Session revoked successfully",
  });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  registerFoodPartner,
  loginFoodPartner,
  logoutFoodPartner,
  getCurrentUser,
  refreshToken,
  listSessions,
  revokeSession,
};
