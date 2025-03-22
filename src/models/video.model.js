import mongoose ,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";     // allows to write you aggregation queries

const videoSchema = new Schema(
    {
        videoFile:
        {
           type:String, //cloudinary url
           require:true
        },
        thumbnail:
        {
           type:String, //cloudinary url
           require:true
        },
        title:
        {
           type:String,  
           require:true
        },
        description:
        {
            type:String,
            require:true
        },
        duration:
        {
            type:Number, // from cloudinary
            require:true
        },
        views:
        {
           type:Number,
           default:0
        },
        isPublished:
        {
            type:Boolean,
            default:true
        },

        owner:
        {
            type:Schema.Types.ObjectId,
            ref:"User"
        }



    },
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate) // plugIn ek middleware h

export const Video = mongoose.model('Video',videoSchema)