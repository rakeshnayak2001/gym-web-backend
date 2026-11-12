import mongoose from 'mongoose';

const FoodLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true },
    date: { type: Date, default: Date.now },
    meals: [
      {
        name: String,
        foodName: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        mealTime: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'snack' },
      },
    ],
    dailyTotals: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fats: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

FoodLogSchema.index({ userId: 1, date: 1 });

FoodLogSchema.methods.recalculate = function recalculate() {
  const t = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  for (const m of this.meals) for (const k of Object.keys(t)) t[k] += m[k] || 0;
  this.dailyTotals = t;
};

export const FoodLog = mongoose.models.foodlog || mongoose.model('foodlog', FoodLogSchema);
