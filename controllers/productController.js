// Products are now defined client-side in a JSON file.
// This controller is retained for reference but no longer serves product data.

import productModel from "../models/productModel.js";

// placeholder functions (not used)
const addProduct = async (req, res) => {
    res.json({ success: false, message: "Product management moved to frontend JSON" });
};

const listProducts = async (req, res) => {
    res.json({ success: false, message: "Product list disabled on backend" });
};

const removeProduct = async (req, res) => {
    res.json({ success: false, message: "Product management moved to frontend JSON" });
};

const singleProduct = async (req, res) => {
    res.json({ success: false, message: "Product lookup disabled" });
};

export { listProducts, addProduct, removeProduct, singleProduct };
