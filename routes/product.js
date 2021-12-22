const express = require("express");
const router = express.Router();
const multer = require("multer");
const Product = require("../models/product");
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "./public/products/");
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  }
});

const upload = multer({ storage: storage });
const {
  getProductById,
  createProduct,
  getProduct,
  photo,
  deleteProduct,
  updateProduct,
  getAllProducts,
  getAllUniqueCategories,
  createProductPackage,
  updateProductPackage,
  deleteProductPackage,
  stockInOut,
  stockImages,
  updateStockLogById,
  pushStockinProductList,
  pushStockDaily
} = require("../controllers/product");
const {
  isSignedIn,
  isAuthenticated,
  isAdmin
} = require("../controllers/authentication");
const { getUserById } = require("../controllers/user");
const { AlterProductPriceForpincode } = require("../controllers/pin_sp");
const { getProcureById } = require("../controllers/order");

//all of params
router.param("userId", getUserById);
router.param("productId", getProductById);
router.param("procureId", getProcureById);

//all of actual routes
router.get("/product/:productId", getProduct);
router.get(
  "/products",
  isSignedIn,
  isAuthenticated,
  AlterProductPriceForpincode,
  getAllProducts
);

router.delete(
  "/product/:productId",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  deleteProduct
);
router.put(
  "/product/:productId",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  updateProduct,
  pushStockDaily,
  upload.single("photo"),
  (req, res) => {
    Product.findById(req.params.productId).then(product => {
      product.photo = req.file.originalname;

      product
        .save()
        .then(() => res.json("image uploaded"))
        .catch(err => res.status(400).json(`Error: ${err}`));
    });
  }
);
router.put(
  "/product/:productId/package/:userId",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  createProductPackage
);
router.put(
  "/product/stock/update/:productId",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  // stockInOut,
  pushStockinProductList
);
router.put(
  "/product/:productId/stock/:stockId/update",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  updateStockLogById
);
router.put(
  "/product/:productId/package/update",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  updateProductPackage
);
router.delete(
  "/product/:productId/package/delete",
  isSignedIn,
  isAuthenticated,
  isAdmin,
  deleteProductPackage
);
router.put("/product/categories", getAllUniqueCategories);

router.post(
  "/product/create",
  upload.single("photo"),

  (req, res) => {
    const product = new Product({
      name: req.body.name,
      isPiece: req.body.ispiece,
      description: req.body.description,
      category: req.body.category,
      grade: req.body.grade,
      stock: req.body.stock,
      price: req.body.price,
      photo: req.file.originalname
    });
    const { name, description, price, category, stock, grade } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Please include product name"
      });
    }
    if (!req.file) {
      return res.status(400).json({
        error: "Please include image"
      });
    }

    if (!description) {
      return res.status(400).json({
        error: "Please include product description"
      });
    }

    if (!price) {
      return res.status(400).json({
        error: "Please include product price"
      });
    }

    if (!category) {
      return res.status(400).json({
        error: "Please include product category"
      });
    }

    if (!stock) {
      return res.status(400).json({
        error: "Please include product stock"
      });
    }
    if (!grade) {
      return res.status(400).json({
        error: "Please include product grade"
      });
    }

    product.save((error, product) => {
      if (error) {
        res.status(400).json({
          error: " saving product to DB is failed"
        });
      }
      res.json(product);
    });
  }
);

router.post("/multiple-file-upload", (req, res) => {});

module.exports = router;
