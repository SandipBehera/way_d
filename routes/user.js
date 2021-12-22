const express = require("express");
var router = express.Router();
const Order = require("../models/oder");

const {
  getUserById,
  getUser,
  updateUser,
  userPurchaseList
} = require("../controllers/user");
const {
  isSignedIn,
  isAuthenticated,
  isAdmin
} = require("../controllers/authentication");

router.param("userId", getUserById);
router.get("/user/:userId", getUser);
router.put("/user/:userId", isSignedIn, isAuthenticated, updateUser);
router.get("/orders/user/:userId", userPurchaseList);

module.exports = router;
