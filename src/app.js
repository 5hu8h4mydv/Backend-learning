import express from 'express';

import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express()


app.use(cors({
    origin:process.env.CORS_ORIGIN,         //To communicate between diffrent resources
    credentials:true,

}))


// 'use' ka use middleware lgaate h

app.use(express.json({limit:"16kb"}))                           //json data k liye. form bhrne k liye.  
app.use(express.urlencoded({extended:true,limit:"16kb"}))       //url se data aa rha ho toh.

app.use(express.static("public"))                               //public assets. khud k server pr kuch bhi file ya data store rkhne k liye.

app.use(cookieParser())                                         // user k browser ki cookies ko access krne aur set krne k liye.


//routes
import userRouter from './routes/user.routes.js'



//routes declaration
app.use("/api/v1/users",userRouter)

export { app }