const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");
const { route } = require('./food.routes');

router.get("/", 
    authMiddleware.authUserMiddleware, 
    userController.getUser
);

router.get("/comments",
    authMiddleware.authUserMiddleware,
    userController.getComments
);

router.get("/follows",
    authMiddleware.authUserMiddleware,
    userController.getFollowing
);

router.get("/likes",
    authMiddleware.authUserMiddleware,
    userController.getLikes
);

router.patch("/",
    authMiddleware.authUserMiddleware,
    userController.editUser
);

module.exports = router;