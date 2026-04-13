import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { sendAdminOrderEmail } from "../config/emailService.js";
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
      userId: userId || "guest",
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData)
    await newOrder.save();

    res.json({ success: true, message: "Order Placed Successfully", order: newOrder });
    
    // Run non-critical side effects in background so API response is instant.
    setImmediate(async () => {
      try {
        const sideEffectTasks = [];

        // Send email to buyer (disabled as requested)
        // const buyerEmail = address?.email || req.body.email;
        // if (buyerEmail) {
        //   sideEffectTasks.push(sendOrderEmail(buyerEmail, items, amount));
        // } else if (userId) {
        //   sideEffectTasks.push(
        //     userModel.findById(userId).then((user) => {
        //       if (user?.email) {
        //         return sendOrderEmail(user.email, items, amount);
        //       }
        //       return null;
        //     })
        //   );
        // }
        
        // Send email to admin
        const adminEmail = process.env.ORDER_ALERT_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
          sideEffectTasks.push(sendAdminOrderEmail(adminEmail, newOrder));
        }

        // Clear cart if logged in
        if (userId) {
          sideEffectTasks.push(userModel.findByIdAndUpdate(userId, { cartData: {} }));
        }

        const results = await Promise.allSettled(sideEffectTasks);
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Order side effect failed:", result.reason);
          }
        });
      } catch (backgroundError) {
        console.error("Background order side effects failed:", backgroundError);
      }
    });

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