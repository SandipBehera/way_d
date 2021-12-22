var express = require("express");
var router = express.Router();
const {
    isSignedIn,
    isAuthenticated,
    isAdmin,
  } = require("../controllers/authentication");
  const {checkIsCartEmpty,addProductToCart,updateCart,updateOrderForCart} = require("../controllers/cart");
const { discountverify } = require("../controllers/order");
const { getProductById } = require("../controllers/product");

  router.param("pid", getProductById);

  router.get('/check',isSignedIn,isAuthenticated,checkIsCartEmpty);
  router.post('/add/:pid',isSignedIn,isAuthenticated,addProductToCart);
  router.post('/update/:action/:pid',isSignedIn,isAuthenticated,updateCart);
  router.patch('/discount/:action/:coupon',isSignedIn,isAuthenticated,discountverify,updateOrderForCart);
  module.exports = router;