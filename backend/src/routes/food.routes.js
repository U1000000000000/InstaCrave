const express = require('express');
const foodController = require("../controllers/food.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const router = express.Router();
const multer = require('multer');


const upload = multer({
    storage: multer.memoryStorage(),
})


/* POST /api/food/ [protected]*/
router.post('/',
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("mama"),
    foodController.createFood)


/* GET /api/food/ [protected] */
router.get("/",
    authMiddleware.authUserMiddleware,
    foodController.getFoodItems)

router.get("/followed",
    authMiddleware.authUserMiddleware,
    foodController.getFollowedFoodItems)


router.post('/like',
    authMiddleware.authUserMiddleware,
    foodController.likeFood)


router.post('/save',
    authMiddleware.authUserMiddleware,
    foodController.saveFood
)


router.get('/save',
    authMiddleware.authUserMiddleware,
    foodController.getSaveFood
)

router.post('/comment',
    authMiddleware.authUserMiddleware,
    foodController.commentOnFood
)

router.get('/comment',
    authMiddleware.authUserMiddleware,
    foodController.getCommentOnFood
)

router.get('/comments',
    authMiddleware.authFoodPartnerMiddleware,
    foodController.getCommentOnFood
)

router.post('/delete-comment',
    authMiddleware.authUserMiddleware,
    foodController.deleteCommentOnFood
)

router.patch('/:foodId',
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("video"), 
    foodController.editFood
);

router.delete('/:foodId',
    authMiddleware.authFoodPartnerMiddleware,
    foodController.deleteFood
);

router.post('/share',
    authMiddleware.authUserMiddleware,
    foodController.updateShareCount
)

module.exports = router