const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const searchController = require("../controllers/search.controller");

router.get("/", 
    authMiddleware.authUserMiddleware, 
    searchController.search
);

router.get("/explore",
    authMiddleware.authUserMiddleware,
    searchController.explore
)

module.exports = router;