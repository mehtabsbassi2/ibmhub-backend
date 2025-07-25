const express = require("express")

const router = express.Router()

const userController = require("../controllers/userController")

router.post('/login', userController.login);
router.post('/', userController.createUser);
router.get('/',userController.getAllUsers) 
router.get("/:id",userController.getUserById)           
router.get('/profile/:email', userController.getProfile);
router.put('/profile/:email', userController.updateProfile);
router.get('/dashboard/:userId',userController.getDashboardData)

module.exports = router;