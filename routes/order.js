var express = require("express");
var router = express.Router();
const {
  isSignedIn,
  isAuthenticated,
  isAdmin
} = require("../controllers/authentication");
const { pushOrderInPurchaseList, getUserById, checkorderStock } = require("../controllers/user");
const { updateStock } = require("../controllers/product");

const {
  getOrderById,
  createOrder,
  getAllOrders,
  getOrderStatus,
  updateStatus,
  getOrder,
  deleteOrder,
  CashCollected,
  CouponVerification,
  ProcurementList,
  checkStatusValidation,
  GetProcurementList,
  updatePrice,
  discountverify
} = require("../controllers/order");

//params
router.param("userId", getUserById);
router.param("orderId", getOrderById);
router.param("procure", getOrderById);

router.post(
  "/order/create",
  isSignedIn,
  isAuthenticated,
  // discountverify,
  createOrder
);

router.get(
  "/order/:orderId/single",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  getOrder
);
router.get(
  "/order/all",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  getAllOrders
);
router.get(
  "/order/status/:orderId",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  getOrderStatus
);
router.put(
  "/order/:orderId/status",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  checkorderStock,
  checkStatusValidation,
  CouponVerification,
  pushOrderInPurchaseList,
  updateStock,
  updatePrice,
  updateStatus
);
router.patch(
  "/order/:orderId/cash",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  CashCollected
);
router.delete(
  "/order/:orderId/delete",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  deleteOrder
);
router.post(
  "/order/procure",
  ProcurementList
);
router.get(
  "/order/procure",
  GetProcurementList
);
module.exports = router;
