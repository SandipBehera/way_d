const mongoose = require("mongoose");
var { ObjectId } = mongoose.Schema;
var Schema = mongoose.Schema;

const productCartSchema = new Schema({
  product: {
    type: ObjectId,
    ref: "product"
  },
  package: {
    type: String
  },
  count: { type: Number },
  name: {
    type: String
  },
  total: { type: Number }
});
const ProductCart = mongoose.model("ProductCart", productCartSchema);

const orderSchema = new Schema(
  {
    products: {
      type: ObjectId,
      ref: "Cart"
    },
    transaction_id: {},
    cart_Type : {
      type : String,
    },
    amount: {
      type: Number
    },
    date : {type : String},
    address: { type: String },
    status: {
      type: String,
      default: "Ordered",
      enum: [
        "Ordered",
        "Confirmed",
        "Cancelled",
        "Shipped",
        "Processing",
        "Recieved",
        "Delivered",
      ]
    },
    payment_status : {
      type : String,
      default : "UNPAID"
    },
    originalAmount : {
      type : Number,
    },
    coupon : {
      type: ObjectId,
      ref: "Discount"
    },
    discountedAmount : {
      type : Number,
    },
    remark : {
      type : String,
    },
    updated: Date,
    user: {
      type: ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = { Order, ProductCart };
