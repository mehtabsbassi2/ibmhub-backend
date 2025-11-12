const express = require("express");
const router = express.Router();
const { getAllBadges, getUserBadges } = require("../controllers/badgeController");

router.get("/", getAllBadges);
router.get("/user/:userId", getUserBadges);

module.exports = router;
