import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { sendOrderEmail } from "../config/emailService.js";
import { sendInvoiceEmail } from "../config/emailService.js";
import { generateInvoice } from "../config/invoiceGenerator.js";




// global variables
const deliveryCharge = 10;
const currency = "inr";


// Placing Order using COD method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData)
    await newOrder.save();

    // Send Email
    const user = await userModel.findById(userId);
    if (user?.email) {
      await sendOrderEmail(user.email, items, amount);
    }

    await userModel.findByIdAndUpdate(userId, { cartData: {} });
    res.json({ success: true, message: "Order Placed Successfully", });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }

}



// All order data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { 'address.firstName': { $regex: search, $options: 'i' } },
          { 'address.lastName': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const orders = await orderModel.find(query).skip(skip).limit(parseInt(limit)).sort({ date: -1 });
    const totalOrders = await orderModel.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: parseInt(page),
      totalOrders
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

// User Order Data for Frontend
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};



// User Order Data for Frontend
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // Step 1: Update the order status
    const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });

    // Step 2: Check if status is "Delivered"
    if (status === "Delivered") {
      // Populate user for email
      const user = await userModel.findById(updatedOrder.userId);
      if (!user?.email) {
        return res.json({ success: false, message: "User email not found" });
      }

      // Add user details to order (for invoice)
      updatedOrder.user = { email: user.email };

      // Step 3: Generate invoice PDF
      const invoiceBuffer = await generateInvoice(updatedOrder);

      // Step 4: Send Invoice Email
      await sendInvoiceEmail(user.email, invoiceBuffer);
    }

    res.json({ success: true, message: "Status Updated" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};



// Delete Order
const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    await orderModel.findByIdAndDelete(orderId);
    res.json({ success: true, message: "Order Deleted Successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { placeOrder, allOrders, userOrders, updateStatus, deleteOrder }