import mongoose ,{Schema} from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
    {
          username:{
            type:String,
            require:true,
            lowercase:true,
            unique:true,
            trim:true,
            index:true                             // kisi chiz ko searchable bnane k liye.
          },

          email:{
            type:String,
            require:true,
            lowercase:true,
            unique:true,
            trim:true,
          },

          fullname:{
            type:String,
            require:true,
            trim:true,
            index:true
          },

          avatar:{
            type:String, //cloudinary url where the image is stored
            require:true
          },

          coverimage:{
            type:String,
          },

          watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:'Video'
            }
          ],

          password:
          {
            type:String,
            require:[true,"password is required"]
          },
          
          refreshToken:
          {
            type:String
          }
    },
    {
        timestamps:true
    }
)

userSchema.pre("save",async function (next) {

    if(!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password,10)
    next()
})


userSchema.methods.isPasswordCorrect = async function(password) {
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){         // jwt ek bearer token h. means yeh token jo bhi bhejega server usko data bhej dega.
   return jwt.sign(
        {
           _id:this._id,
           email:this.email,
           username:this.username,
           fullname:this.fullname
        },
         process.env.ACCESS_TOKEN_SECRET,
         {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
         }  
    )
}    

userSchema.methods.generateRefreshToken = function(){
  return  jwt.sign(
        {
           _id:this._id,
        },
         process.env.REFRESH_TOKEN_SECRET,
         {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
         }  
    )
}


export const User = mongoose.model('User',userSchema) 
