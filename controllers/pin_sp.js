const formidable = require("formidable");
const Pin = require("../models/pin_sp");

exports.getpinById = (req, res, next, id) => {
  Pin.findById(id).exec((error, pin) => {
    if (error) {
      return res.status(400).json({
        error: "pin not found in DB"
      });
    }
    req.pin = pin;
    next();
  });
};

exports.postPinfromUser = (req, res) => {
  Pin.find().exec((err, pins) => {
    pins.forEach(pinVal => {
      if (pinVal.pincode !== req.body.pincode) {
        const newPin = new Pin(req.body);
        //handle files here
        newPin.save((error, pin) => {
          if (error) {
            res.status(400).json({
              error: "saving pin to DB is failed"
            });
          }
        });
      }
    });
    //restrictions on field
  });
};
exports.AlterProductPriceForpincode = (req, res, next) => {
  if (req.user.address.pincode) {
    Pin.findOne({ pincode: req.user.address.pincode }).exec((err, pins) => {
      //handle files here
      // if (!pins) {
      //   res.status(400).json({
      //     error: "pincode not found"
      //   });
      // }
      req.pincode = pins;
      next();
    });
  } else {
    next();
  }
};
exports.updatePincode = (req, res) => {
  const pincode = req.pin;
  pincode.percent_add = req.body.percent_add;

  pincode.save((err, UpdatedPin) => {
    if (err) {
      return res.status(400).json({
        error: "failed to update the Pin"
      });
    }
    res.json(UpdatedPin);
  });
};

exports.getPincodes = (req,res) => [
  Pin.find().exec((err, pin) => {
    if (err) {
      return res.status(400).json({
        error: "pins not found in db"
      });
    }
    res.json(pin);
  })
];
