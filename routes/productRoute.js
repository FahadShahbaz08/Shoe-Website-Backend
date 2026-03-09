import express from 'express'
// product management endpoints have been disabled; products live in frontend JSON
const productRouter = express.Router();

productRouter.get('/', (req, res) => {
    res.json({ success: false, message: "Product APIs disabled on backend" });
});

export default productRouter


