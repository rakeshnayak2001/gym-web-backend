import mongoose from 'mongoose';

// Collection name "accounts" (model "account") is kept for compatibility with existing data.
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    password: { type: String, required: true, select: false },
    weight: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    age: { type: Number, default: 0 },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly active', 'moderately active', 'very active', 'extremely active'],
      default: 'moderately active',
    },
    dietType: { type: String, enum: ['vegetarian', 'non-vegetarian', 'vegan'], default: 'non-vegetarian' },
    fitnessGoals: { type: [String], default: ['weight maintenance'] },
    dailyCalorieNeeds: { type: Number, default: 0 },
    dailyProteinNeeds: { type: Number, default: 0 },
    dailyCarbsNeeds: { type: Number, default: 0 },
    dailyFatsNeeds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UserSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    weight: this.weight,
    height: this.height,
    age: this.age,
    gender: this.gender,
    activityLevel: this.activityLevel,
    dietType: this.dietType,
    fitnessGoals: this.fitnessGoals,
    dailyCalorieNeeds: this.dailyCalorieNeeds,
    dailyProteinNeeds: this.dailyProteinNeeds,
    dailyCarbsNeeds: this.dailyCarbsNeeds,
    dailyFatsNeeds: this.dailyFatsNeeds,
  };
};

export const User = mongoose.models.account || mongoose.model('account', UserSchema);
