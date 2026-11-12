import mongoose from 'mongoose';

const ExerciseSchema = new mongoose.Schema({
  id: String,
  name: String,
  muscle: String,
  gif_url: String,
  description1: String,
  description2: String,
  sets: Number,
  reps: Number,
});

const DaySchema = new mongoose.Schema({
  name: String,
  exercises: [ExerciseSchema],
});

// Model name "workoutplan" kept so existing saved plans keep working.
const ProgramSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    days: [DaySchema],
  },
  { timestamps: true },
);

export const Program = mongoose.models.workoutplan || mongoose.model('workoutplan', ProgramSchema);
