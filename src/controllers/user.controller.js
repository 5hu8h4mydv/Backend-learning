import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
         
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save( {validateBeforeSave:false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new apiError(500,"Something went wrong While generating refresh and access token.")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //      message: "OK"
    //      //get user details from frontend. if not then get from postmsn.
    //      //validation(check user validation)-not empty
    //      //check id user already exists: username, email
    //      //check for images , check for avatar
    //      //if available upload them on cloudinary,avatar
    //      //craete user object- create entry in db
    //      //remove password and refresh token field from response.
    //      //check for user creation
    //      //return res
    // })

    const { fullname, email, username, password } = req.body
    console.log("email: ", email)
    // console.log(req.body)

    // if(fullname===""){
    //     throw new apiError(400,"fullname is required")
    // }

    if (
        [fullname, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are requird")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "user with email or username already exist.")
    }

    console.log(req.files);
    
    const avatarlocalpath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path


    let coverImageLocalPath;
    if(req.files&& Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    

    if (!avatarlocalpath) {
        throw new apiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new apiError(500, " something went wrong while registering the User")
        
    }

    return res.status(201).json(
        new apiResponse(200,createdUser,"user registered successfully.")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    //req body -->  data
    //username or email
    // find the user
    // pasword check
    //access and refresh token
    // send cookies

    const {email,username,password}= req.body  // login k liye data

    if(!(username||email)){
        throw new apiError(400, "username or email is required.");
    }

    const user = await User.findOne({$or:[{username},{email}]})

    if (!user){
        throw new apiError(404, "User is not registered")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid){
    throw new apiError(401, "Invalid user credentials")
     }

   const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)


   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options= {
        httpOnly:true,
        secure:true
   }
    
    return res.status(200)
              .cookie("accessToken",accessToken,options)
              .cookie("refreshToken",refreshToken,options)
              .json(
                new apiResponse(
                    200,
                   { 
                    user:loggedInUser,accessToken,refreshToken

                   },
                   "user logged In seccessfully"
                )
              )

})


const logoutUser = asyncHandler(async(req,res)=>{
       await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken: undefined
                }
            },
            {
                new:true
            }
        )

        const options= {
            httpOnly:true,
            secure:true
       }

       return res
       .status(200)
       .clearCookie("accessToken",options)
       .json(new apiResponse(200,{},"user logged out"))

})


const refreshAccessToken = asyncHandler(async(req,res)=>
{
    const incomingRefreshToken = req.cookies.refreshToken ||req.body

    if(!incomingRefreshToken){
        throw new apiError(401,"unauthorized request.")
    }

   try {
     const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new apiError(401,"Invalid refresh token")
     }
 
     if(incomingRefreshToken!==user?.refreshToken){
         throw new apiError(401,"refresh token is expired or used.")
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     const {newaccessToken,newrefreshToken} =await generateAccessAndRefreshTokens(user._id)
 
          return res.status(200)
          .cookie("accessToken",newaccessToken,options)
         .cookie("refreshToken",newrefreshToken,options)
         .json(
             new apiResponse(
                 200,
                 {accessToken,refreshToken:newrefreshToken},
                 "Access token refreshed successfully."
             )
         )
     
   } catch (error) {
        throw new apiError(401,error?.message||"invalid refresh token")
   }
    
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

   const user =await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
       throw new apiError(400,"Invalid old password.")
   }

   user.password = newPassword
   await user.save({validateBeforeSave:false})

   return res
    .status(200)
    .json(new apiResponse(200,{}, "password changed successfuly."))
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched Successfully.")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email}= req.body

    if(!fullname||!email){
        throw new apiError(400, "All fields are required")
    }

  const user  = await User.findById(req.user?._id,
                                {$set:
                                     {fullname:fullname,
                                    email:email
                                  }},
                                {new:true}
  ).select("-password")

  return res
         .status(200)
         .json(new apiResponse(200,user,"Account details updated successfully."))
})

const updateUserAvater = asyncHandler(async(req,res)=>{
    
})

export { registerUser,loginUser,logoutUser ,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails}