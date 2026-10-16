
import { Schema, models, model } from "mongoose";
import User from "@/models/user";

const reviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      trim: true,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.pre("validate", async function () {
  if (this.userName?.trim()) return;

  const user = await User.findById(this.user).select("name").lean();
  if (!user?.name?.trim()) {
    this.invalidate("userName", "Review author name could not be resolved.");
    return;
  }

  this.userName = user.name.trim();
});

reviewSchema.index({ user: 1 }, { unique: true });

const Review =
  models.Review || model("Review", reviewSchema);

export default Review;
