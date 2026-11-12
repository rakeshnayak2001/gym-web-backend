const ACTIVITY = {
  sedentary: 1.2,
  'lightly active': 1.375,
  'moderately active': 1.55,
  'very active': 1.725,
  'extremely active': 1.9,
};

/**
 * Daily energy + macro targets using Mifflin-St Jeor BMR.
 * Protein is set per kg bodyweight, fat at 25% of energy, carbs fill the rest.
 */
export function calculateTargets({ weight, height, age, gender, activityLevel, dietType, fitnessGoals = [] }) {
  const sexOffset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  let tdee = bmr * (ACTIVITY[activityLevel] ?? 1.55);

  const losing = fitnessGoals.includes('weight loss');
  const gaining = fitnessGoals.includes('muscle gain');
  if (losing) tdee *= 0.85;
  else if (gaining) tdee *= 1.1;

  let protein = weight * (gaining ? 2.2 : losing ? 2.0 : 1.6);
  if (dietType === 'vegetarian' || dietType === 'vegan') protein *= 0.9;
  const fats = (tdee * 0.25) / 9;
  // Carbs take whatever energy is left so the macros always add up to the calorie target.
  const carbs = Math.max(0, (tdee - protein * 4 - fats * 9) / 4);

  return {
    dailyCalorieNeeds: Math.round(tdee),
    dailyProteinNeeds: Math.round(protein),
    dailyCarbsNeeds: Math.round(carbs),
    dailyFatsNeeds: Math.round(fats),
  };
}
