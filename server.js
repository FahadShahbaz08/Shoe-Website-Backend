import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import cron from 'node-cron'
import axios from 'axios'

import connectDB from './config/mongodb.js'
import userRouter from './routes/userRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'

// App Config
const app = express()
const port = process.env.PORT || 4000
connectDB()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/user', userRouter)
// product endpoints have been removed; products are now served from frontend JSON
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)

app.get('/alive', (req, res) => {
    res.json({ status: 'Server is alive' });
});

app.get('/', (req, res) => {
    res.send("API working")
})
// runs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
    try {
        console.log("Running cron job...")

        const response = await axios.get(`http://localhost:${port}/alive`)

        console.log("Cron API response:", response.data)
    } catch (error) {
        console.error("Cron error:", error.message)
    }
})
app.listen(port, () => console.log('Server started on PORT : ' + port))