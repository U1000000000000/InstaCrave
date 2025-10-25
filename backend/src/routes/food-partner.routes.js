const express = require('express');
const foodPartnerController = require("../controllers/food-partner.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const multer = require('multer');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
})

/* /api/food-partner/:id */
router.get("/:id",
    authMiddleware.authUserMiddleware,
    foodPartnerController.getFoodPartnerById)


router.get("/",
    authMiddleware.authFoodPartnerMiddleware,
    foodPartnerController.getFoodPartner)    

router.post("/follow",
    authMiddleware.authUserMiddleware,
    foodPartnerController.followFoodPartner)  
    
router.patch("/edit",
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("profile"),
    foodPartnerController.editFoodPartner)    

module.exports = router;