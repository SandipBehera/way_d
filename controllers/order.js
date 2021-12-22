const Discount = require("../models/discount");
const Procure = require("../models/procurement");
const Product = require("../models/product");
const Pin = require("../models/pin_sp");
const formidable = require("formidable");
const User = require("../models/user");
const fast2sms = require("fast-two-sms");
const moment = require("moment");
const cart = require("../models/cart");
const { Order } = require("../models/oder");
const { updateStock } = require("./product");
const { response } = require("express");
exports.getOrderById = (req, res, next, id) => {
  Order.findById(id)
    // .populate("user", "_id username shop_name phone_number")
    .exec((err, order) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          error: "no order found"
        });
      }
      req.order = order;
      next();
    });
};
exports.getProcureById = (req, res, next, id) => {
  Procure.findById(id)
    // .populate("user", "_id username shop_name phone_number")
    .exec((err, proc) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          error: "no procuremnt list found"
        });
      }
      req.procurement = proc;
      next();
    });
};
exports.CouponVerification = (req, res, next) => {
  // req.body.order.user = req.order.user;

  let coupon = req.order.coupon ? req.order.coupon : req.body.coupon;
  if (coupon && req.body.status === "Confirmed") {
    Discount.findOne({ _id: coupon }).exec((err, disc) => {
      if (!disc) {
        return res.status(400).json({
          error: "coupon does not exist"
        });
      }
      if (disc.order_limit) {
        User.findById({ _id: req.order.user }).exec((err, user) => {
          if (!user) {
            return res.status(400).json({
              error: "User not found"
            });
          }
          // console.log((user.purchases.length + 1) % disc.order_limit === tr,"what")
          let value = (user.purchases.length + 1) % disc.order_limit === 0;
          if (value === false) {
            return res.status(400).json({
              error: `discount not applicable`
            });
          } else {
            req.coupon = disc;
            req.smsuser = user;
            console.log("3");
            next();
          }
        });
      }
    });
  } else {
    User.findById({ _id: req.order.user }).exec((err, user) => {
      console.log(err);
      if (!user) {
        return res.status(400).json({
          error: "User not found"
        });
      }
      req.smsuser = user;
      console.log("3");
      next();
    });
  }
};
exports.discountverify = async (req, res, next) => {
  const cartDetails = await cart
    .find({
      _userID: req.user._id,
      status: "YET_TO_CHECKOUT"
    })
    .exec();
  if (!cartDetails.length > 0) {
    res.status(404).json({
      error: "Cart is empty"
    });
  } else if (cartDetails.length > 0 && !cartDetails[0].numberOfItem > 0) {
    res.status(404).json({
      error: "Cart is empty"
    });
  } else {
    if (req.params.coupon) {
      Discount.findOne({ _id: req.params.coupon }).exec((err, disc) => {
        if (!disc) {
          return res.status(400).json({
            error: "coupon does not exist"
          });
        }
        if (disc.order_limit) {
          User.findById({ _id: req.user._id }).exec((err, user) => {
            if (!user) {
              return res.status(400).json({
                error: "User not found"
              });
            }
            // if ((user.purchases.length + 1) % disc.order_limit === 0)
            if (!user.purchases.length > disc.order_limit) {
              return res.status(400).json({
                error: `discount not applicable minimus order limit is ${disc.order_limit}`
              });
            }
            req.discount = disc;
            req.cartDetails = cartDetails;
            next();
          });
        }
      });
    } else {
      req.cartDetails = cartDetails;
      next();
    }
  }
};
exports.createOrder = async (req, res) => {
  // const cartDetails = req.cartDetails;
  const cartDetails = await cart
    .find({
      _userID: req.user._id,
      status: "YET_TO_CHECKOUT"
    })
    .exec();
  const fastSms = async () => {
    var options = {
      authorization: process.env.SMS_API,
      message: `Your Order is Placed with ${cartDetails[0].numberOfItem} of Rs.${cartDetails[0].cost}
regards
Way-D,Pohulabs`,
      numbers: [req.semuser.phone_number]
    };
    // }
    await fast2sms.sendMessage(options);
  };
  let value = {
    products: cartDetails[0]._id,
    amount: cartDetails[0].cost,
    user: cartDetails[0]._userID,
    originalAmount: cartDetails[0].cost,
    address:
      req.user.address.area +
      "," +
      req.user.address.street +
      "," +
      req.user.address.pincode,
    coupon: cartDetails[0].attached_coupon
      ? cartDetails[0].attached_coupon
      : null
  };
  const order = await new Order(value);
  order.save((err, order) => {
    if (err) {
      return res.status(400).json({
        error: "failed to save order in DB"
      });
    }
    if (req.body.sms) {
      fastSms();
    }
    cart
      .findOneAndUpdate(
        { _userID: req.user._id, status: "YET_TO_CHECKOUT" },
        {
          $set: { attached_order: order._id, status: "YET_TO_CONFIRM" }
        }
      )
      .exec(() => {});
    res.json(order);
  });
};
exports.getAllOrders = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 8;
  sortBy = req.query.limit ? parseInt(req.query.limit) : "_id";
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  Order
    .find()
    .populate("user", "_id username shop_name phone_number")
    .populate("products", "details numberOfItem cost status")
    .sort({ createdAt: -1 })
    .exec((err, order) => {
      if (err) {
        return res.status(400).json({
          error: "no orders found in DB"
        });
      }
      const results = {};
      if (endIndex < order.length) {
        results.next = {
          page: page + 1,
          limit: limit
        };
      }
      results.total = {
        total_records: order.length
      };
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit: limit
        };
      }
      results.results = order.slice(startIndex, endIndex);
      if (!req.query.limit) {
        res.json(order);
      } else {
        res.json(results);
      }
    });
};
// .populate("_userID", "_id username shop_name phone_number")
// // .populate("user", "_id username shop_name phone_number")
// // .populate("products", "details numberOfItem cost status")
// .populate(
//   "attached_order",
//   "cart_Type amount date status address payment_status originalAmount discountedAmount remark"
// )
// .populate("attached_coupon", "code dicount order_limit")
exports.getOrderStatus = (req, res) => {
  let order = req.order;
  let array = [
    "Ordered",
    "Confirmed",
    "Cancelled",
    "Shipped",
    "Processing",
    "Recieved",
    "Delivered"
  ];
  let index1 = array.indexOf(order.status);
  array.splice(0, index1);
  res.json(array);
};

exports.getAllUniqueCategories = () => {
  Product.distinct("category", {}, (err, category) => {
    if (err) {
      return res.status(400).json({
        error: "category not found"
      });
    }
    res.json(category);
  });
};
exports.updateStatus = (req, res) => {
  const order = req.order;
  order.status = req.body.status;
  if (req.body.status === "Confirmed") {
    order.amount = req.totalAmount;
    order.originalAmount = req.totalAmount;
    order.address = req.body.address ? req.body.address : req.user.location;
  }
  order.originalAmount = req.totalAmount;
  let coupon = req.order.coupon ? req.order.coupon : req.body.coupon;
  if (coupon && req.body.status === "Confirmed") {
    let disc = req.coupon;
    let discount = disc.discount;
    order.originalAmount = order.amount;
    let discountValueAmount =
      parseInt(req.totalAmount) - parseInt(req.coupon.discount);
    order.discountedAmount = discountValueAmount;
    order.amount = discountValueAmount;
    order.coupon = coupon;
  }

  const fastSms = () => {
    User.findById({ _id: req.order.user }).exec((err, user) => {
      if (!user) {
        console.log(err);
        return res.status(400).json({
          error: "User not found"
        });
      }

      var options = {
        authorization: process.env.SMS_API,
        message: `Your Order ${req.order._id} of Rs.${
          req.order.originalAmount
        } is ${req.body.status}
regards,
Way-D,Pohulabs
${new Date()}`,

        numbers: [user.phone_number]
      };
      // }
      fast2sms.sendMessage(options);
    });
  };
  if (req.body.status === "Delivered") {
    if (req.body.amount > order.amount || !req.body.amount) {
      return res.status(400).json({
        error: "provide a valid amount "
      });
    }
    if (req.body.amount !== order.amount) {
      return res.status(400).json({
        error: "Full payment is needed"
      });
    }
    order.payment_status = "PAID";
    order.amount = order.amount - req.body.amount;
    cart
      .findOneAndUpdate(
        {
          _userID: req.order.user,
          status: "YET_TO_CONFIRM",
          attached_order: req.order._id
        },
        {
          $set: { status: "DELIVERED" }
        }
      )
      .exec((err, success) => {});
  }
  order.save((err, UpdateOrder) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        error: "failed to update the order status"
      });
    }
    if (req.body.sms) {
      fastSms();
    }
    res.json(UpdateOrder);
  });
};
exports.updatePrice = (req, res, next) => {
  let status = req.body.status;
  if (status === "Confirmed") {
    let ids = req.cart._productIDArray;
    Product.find({ _id: { $in: ids } }, function (err, array) {
      req.cart._productIDArray.forEach(product => {
        ids.push(product);
      });
      let counts = [];
      req.cart.quantityArray.forEach(product => {
        counts.push(product);
      });
      array.map(arr => {
        let position = ids.indexOf(arr._id);
        if (position !== -1) {
          ids[position] = arr.price;
        }
      });
      let amountVal = [];
      for (let i = 0; i < array.length; i++) {
        let productPrice = parseInt(ids[i]) * parseInt(counts[i]);
        amountVal.push(productPrice);
      }

      let sum = amountVal.reduce((a, b) => {
        return a + b;
      });
      cart
        .findOneAndUpdate(
          {
            _userID: req.order.user,
            status: "YET_TO_CONFIRM",
            attached_order: req.order._id
          },
          {
            $set: { cost: Math.ceil(sum), status: "YET_TO_DELIVER" }
          }
        )
        .exec((err, success) => {
          if (err) {
            res.status(402).json({
              error: "not able to save status"
            });
          }
        });
      req.totalAmount = Math.ceil(sum);
      next();
    });
  } else {
    next();
  }
};

exports.checkStatusValidation = (req, res, next) => {
  let status = req.body.status;
  let order = req.order;
  if (!status) {
    return res.status(404).json({
      error: "status is required"
    });
  }
  if (order.status === "Cancelled") {
    return res.status(404).json({
      error: "The Order has been cancelled"
    });
  }
  const statusList = Order.schema.path("status").enumValues;
  let index1 = statusList.indexOf(status);
  let index2 = statusList.indexOf(order.status);
  if (status !== "Cancelled") {
    if (index1 <= index2) {
      return res.status(404).json({
        error: "status cannot be reverted back once it it confirmed"
      });
    }
  }
  next();
};
exports.CashCollected = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields) => {
    if (err) {
      return res.status(400).json({
        error: "problem with images"
      });
    }
    const { remark, cash, ids } = fields;
    if (!remark) {
      return res.status(400).json({
        error: "please provide remark"
      });
    }
    if (!cash) {
      return res.status(400).json({
        error: "please provide cash value"
      });
    }
    let cashIn = parseInt(cash);
    Order.find({ _id: { $in: JSON.parse(ids) } }, function (err, array) {
      if (err) {
        console.log(err);
        // handle error
      } else {
        recursionAlgo(0, cashIn);
        function recursionAlgo(index, cashRecus) {
          if (cashRecus === 0 || index === ids.length) {
            return res.json("cash collected successfully");
          } else {
            const ord = array[index];
            const addAmount = ord.amount - cashRecus;
            let amount = addAmount < 0 ? 0 : addAmount;
            ord.payment_status = amount === 0 ? "PAID" : "UNPAID";
            ord.remark = remark;
            const cashRecusgg =
              ord.amount > cashRecus ? 0 : cashRecus - ord.amount;
            Order.findByIdAndUpdate(array[index]._id, {
              $set: { amount: amount, remark: remark }
            }).exec((err, result) => {
              if (err) {
                return res.status(400).json({
                  error: err
                });
              } else {
                return recursionAlgo(index + 1, cashRecusgg);
              }
            });
            ord.save((err, UpdateOrder) => {
              if (err) {
                return res.status(400).json({
                  error: "failed to update the order status"
                });
              }
            });
          }
        }
      }
    });
    // }

    order.save((err, UpdateOrder) => {
      if (err) {
        return res.status(400).json({
          error: "failed to update the order status"
        });
      }
      res.json(UpdateOrder);
    });
  });
};
exports.getOrder = (req, res) => {
  Order.findOne({ _id: req.order._id })
    .populate("coupon", "_id code")
    .populate("user", "_id username shop_name phone_number")
    .populate("products", "details numberOfItem cost status")
    .exec((err, order) => {
      res.json(order);
    });
};

exports.deleteOrder = (req, res) => {
  let order = req.order;
  order.remove((err, deletedOrder) => {
    if (err) {
      return res.status(400).json({
        error: "failed to delete the order"
      });
    }
    res.json({
      message: "deleted successfully"
    });
  });
};

exports.ProcurementList = async (req, res) => {
  let orderList = req.body.order_list;

  const array = await Order.find({ _id: { $in: orderList } });
  let procurement = [];
  let procurements = [];
  let ConditionStatus = true;
  // console.log(array);
  // if (err) {
  //   console.log(err);
  // } else {
  const arrayMapping = async next =>
    await array.map(async (arr, index) => {
      const products = await cart.find({ _id: arr.products });
      for (let i = 0; i < products[0].details.length; i++) {
        let insideproduct = products[0].details[i];
        console.log(insideproduct);
        procurement.push({
          _id: insideproduct._id.toString(),
          name: insideproduct.name,
          count: insideproduct.Selectedquantity
        });
      }
      if (arr.status !== "Ordered") {
        res.status(402).json({
          error: "List is genenated only for Ordered Orders"
        });
      }
      if (array.length - 1 === index) {
        next();
      }
    });

  const duplicate = id => {
    let values = procurements.filter(proc => proc._id === id);
    if (values.length > 0) {
      return true;
    }
    return false;
  };
  const procureThis = next => {
    console.log(procurements, procurement);
    procurement.forEach((procure, index) => {
      if (duplicate(procure._id)) {
        let pos = procurements
          .map(function (e) {
            return e._id;
          })
          .indexOf(procure._id);
        procurements[pos].count += procure.count;
      } else {
        procurements.push({
          _id: procure._id,
          name: procure.name,
          count: procure.count
        });
      }
    });
    next();
  };

  let date = moment(new Date()).format("YYYY MM DD").replace(/ /g, "-");
  arrayMapping(() => procureThis(() => finalCallback()));
  const finalCallback = () => {
    Procure.findOne({ date: date }).exec((err, found) => {
      if (!found) {
        const procure = new Procure({
          list: procurements,
          date: date
        });
        procure.save((error, proc) => {
          if (error) {
            console.log(error);
          }
        });
      }
    });
    res.json(procurements);
  };
};

exports.GetProcurementList = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 8;
  sortBy = req.query.limit ? parseInt(req.query.limit) : "_id";
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  Procure.find()
    .sort({ createdAt: -1 })
    .exec((err, proc) => {
      if (err) {
        return res.status(400).json({
          error: "no list found in DB"
        });
      }
      const results = {};
      if (endIndex < proc.length) {
        results.next = {
          page: page + 1,
          limit: limit
        };
      }
      results.total = {
        total_records: proc.length
      };
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit: limit
        };
      }

      results.results = proc.slice(startIndex, endIndex);
      if (!req.query.limit) {
        res.json(proc);
      } else {
        res.json(results);
      }
    });
};
