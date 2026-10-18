import { GymEntry, GymExercise } from './gym.model';
export const WEEKLY_PLAN_ID = 'variety-five-day-v1';
export const WEEKLY_PLAN_FOCUS = [
  'Full-body strength + short WOD',
  'HIIT conditioning',
  'Lower body + glutes',
  'Upper body + conditioning',
  'Functional full-body WOD',
];
const guidance =
  'First 2 weeks: strength 5-6/10, conditioning 6-7/10. Then gradually work toward strength 6-7/10 and conditioning 7-8/10. Increase only one of weight, time, reps or rounds at once. Scale back movements that cause the pulling hip pain described in your plan, especially shooting pain, tingling, numbness or weakness.';
export function buildWeeklyPlan(existing: GymExercise[], entries: GymEntry[]) {
  const exercises: GymExercise[] = [];
  const additions: GymEntry[] = [];
  const counters = [0, 0, 0, 0, 0];
  function add(
    day: number,
    section: string,
    name: string,
    sets: number,
    reps: string,
    muscle: string,
    equipment: string,
    notes = '',
    rest = 0,
  ) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let exercise = [...existing, ...exercises].find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    if (!exercise) {
      exercise = { id: `variety-${key}`, name, muscle, equipment, notes: '' };
      exercises.push(exercise);
    }
    const index = counters[day]++;
    const id = `${WEEKLY_PLAN_ID}-${day}-${index}`;
    if (entries.some((e) => e.id === id)) return;
    const offset = Math.max(0, ...entries.filter((e) => e.day === day).map((e) => e.order));
    additions.push({
      id,
      exerciseId: exercise.id,
      day,
      sets,
      reps,
      rest,
      weight: '',
      order: offset + index + 1,
      notes:
        `${section}. ${notes} ${rest === 0 ? 'No rest duration specified in the source; 0 is a placeholder unless continuous work is prescribed.' : ''}`.trim(),
    });
  }
  const a = add;
  a(0, 'Warm-up (7 minutes)', 'Easy bike', 1, '3 min', 'Cardio', 'Bike');
  a(0, 'Warm-up', 'Brisk treadmill walk', 1, '2 min', 'Cardio', 'Treadmill');
  a(0, 'Warm-up', 'Side steps', 1, '30 sec/side', 'Mobility', 'Bodyweight');
  a(0, 'Warm-up', 'Sit-to-stand', 1, '10 reps', 'Legs', 'Bench');
  for (const [name, muscle, equipment] of [
    ['Leg press', 'Legs', 'Leg press machine'],
    ['Machine chest press', 'Chest', 'Chest press machine'],
    ['Seated cable row', 'Back', 'Cable station'],
    ['Seated hamstring curl', 'Legs', 'Hamstring curl machine'],
  ])
    a(0, 'Strength', name, 3, '10-12 reps', muscle, equipment, 'Keep about 3 reps in reserve.');
  a(
    0,
    'Strength',
    'Calf raise',
    2,
    '15 reps',
    'Legs',
    'Calf raise machine',
    'Keep about 3 reps in reserve.',
  );
  for (const [name, reps, muscle, equipment] of [
    ['Bike', '45 sec strong', 'Cardio', 'Bike'],
    ['Low step-ups', '8/leg', 'Legs', 'Low step'],
    ['Elevated push-ups', '8-10 reps', 'Chest', 'Bench'],
    ['Bench burpee (step-back, no jump)', '6 reps', 'Full body', 'Bench'],
    ['Curved treadmill brisk walk', '45 sec', 'Cardio', 'Curved treadmill'],
  ])
    a(
      0,
      '10-minute WOD',
      name,
      1,
      reps,
      muscle,
      equipment,
      'Repeat the circuit continuously for 10 minutes. Strength first, conditioning second.',
    );
  a(0, 'Core', 'Abdominal brace', 5, '10 sec', 'Core', 'Mat');
  a(0, 'Core', 'Dead-bug heel tap', 2, '6/side', 'Core', 'Mat');
  a(0, 'Core', 'Bird dog', 2, '5/side', 'Core', 'Mat');
  a(
    1,
    'Warm-up',
    'Easy bike or treadmill',
    1,
    '5 min',
    'Cardio',
    'Bike or treadmill',
    'No strength block today.',
  );
  a(
    1,
    'Block A: bike intervals',
    'Bike',
    8,
    '30 sec hard',
    'Cardio',
    'Bike',
    '30 sec easy recovery after each work interval.',
    30,
  );
  a(
    1,
    'Block B: step-up intervals',
    'Low step-ups',
    6,
    '40 sec continuous',
    'Legs',
    'Low step',
    '20 sec rest after each interval.',
    20,
  );
  a(
    1,
    'Block C: treadmill intervals',
    'Curved treadmill brisk walk',
    6,
    '45 sec brisk',
    'Cardio',
    'Curved treadmill',
    '45 sec easy recovery after each interval.',
    45,
  );
  a(
    1,
    'Final 5-minute challenge',
    'Bike and step-up intervals',
    1,
    '5 min total',
    'Cardio',
    'Bike and low step',
    'Alternate 30 sec bike, 30 sec easy, 30 sec step-ups, 30 sec rest. Repeat until 5 minutes is up.',
  );
  a(1, 'Core', 'Dead bug', 2, '6/side', 'Core', 'Mat');
  a(1, 'Core', 'Glute bridge', 2, '12 reps', 'Legs', 'Mat');
  a(1, 'Core', 'Side plank from knees', 2, '15-20 sec/side', 'Core', 'Mat');
  a(2, 'Warm-up', 'Bike', 1, '5 min', 'Cardio', 'Bike');
  a(2, 'Warm-up', 'Sit-to-stand', 1, '10 reps', 'Legs', 'Bench');
  a(2, 'Warm-up', 'Low step-ups', 1, '5/leg', 'Legs', 'Low step');
  for (const [name, sets, reps, equipment] of [
    ['Leg press', 3, '10-12 reps', 'Leg press machine'],
    ['Seated hamstring curl', 3, '10-12 reps', 'Hamstring curl machine'],
    ['Hip abductor', 3, '12-15 reps', 'Hip abductor machine'],
    ['Low step-ups', 3, '8/leg', 'Low step'],
    ['Glute bridge / light hip thrust', 3, '10-12 reps', 'Mat or bench'],
    ['Calf raise', 3, '15 reps', 'Calf raise machine'],
  ] as const)
    a(2, 'Lower-body strength', name, sets, reps, 'Legs', equipment);
  for (const [name, reps, muscle, equipment] of [
    ['Bike', '40 sec', 'Cardio', 'Bike'],
    ['Low step-ups', '10/leg', 'Legs', 'Low step'],
    ['Sit-to-stand', '12 reps', 'Legs', 'Bench'],
    ['Bench burpee (step-back, no jump)', '6 reps', 'Full body', 'Bench'],
    ['Easy walk / recovery', '1 min', 'Cardio', 'Walking space'],
  ])
    a(
      2,
      '10-minute EMOM',
      name,
      2,
      reps,
      muscle,
      equipment,
      'One exercise at the start of each minute, in listed order. Recover for the remainder of the minute. Repeat the 5-minute sequence twice; do not complete both sets consecutively.',
    );
  a(2, 'Core', 'Bird dog', 2, '6/side', 'Core', 'Mat');
  a(2, 'Core', 'Dead-bug heel tap', 2, '8/side', 'Core', 'Mat');
  a(2, 'Core', 'Glute bridge hold', 3, '20 sec', 'Legs', 'Mat');
  for (const [name, sets, reps, muscle, equipment] of [
    ['Machine chest press', 3, '10-12 reps', 'Chest', 'Chest press machine'],
    ['Lat pulldown', 3, '10-12 reps', 'Back', 'Lat pulldown machine'],
    ['Seated cable row', 3, '10-12 reps', 'Back', 'Cable station'],
    ['Reverse pec deck', 2, '12 reps', 'Back', 'Pec deck'],
    ['Seated lateral raise', 2, '12 reps', 'Shoulders', 'Dumbbells'],
    ['Triceps pressdown', 2, '12 reps', 'Arms', 'Cable station'],
    ['Seated biceps curl', 2, '12 reps', 'Arms', 'Dumbbells'],
  ] as const)
    a(3, 'Upper-body strength', name, sets, reps, muscle, equipment);
  for (const [name, reps, muscle, equipment] of [
    ['Bike', '60 sec', 'Cardio', 'Bike'],
    ['Elevated push-ups', '8 reps', 'Chest', 'Bench'],
    ['Low step-ups', '6/leg', 'Legs', 'Low step'],
    ['Bench burpee (step-back, no jump)', '6 reps', 'Full body', 'Bench'],
    ['Curved treadmill brisk walk', '60 sec', 'Cardio', 'Curved treadmill'],
  ])
    a(
      3,
      '12-minute density circuit',
      name,
      1,
      reps,
      muscle,
      equipment,
      'Repeat the listed circuit for 12 minutes. Move continuously.',
    );
  a(3, 'Core', 'Abdominal brace', 5, '10 sec', 'Core', 'Mat');
  a(3, 'Core', 'Dead bug', 2, '6/side', 'Core', 'Mat');
  a(3, 'Core', 'Bird dog', 2, '5/side', 'Core', 'Mat');
  for (const [name, reps, muscle, equipment] of [
    ['Bike', '1 min', 'Cardio', 'Bike'],
    ['Sit-to-stand', '12 reps', 'Legs', 'Bench'],
    ['Elevated push-ups', '10 reps', 'Chest', 'Bench'],
    ['Low step-ups', '8/leg', 'Legs', 'Low step'],
    ['Farmer carry', '20-30 m', 'Full body', 'Light weights'],
    ['Bench burpee (step-back, no jump)', '6 reps', 'Full body', 'Bench'],
    ['Curved treadmill brisk walk', '1 min', 'Cardio', 'Curved treadmill'],
  ])
    a(
      4,
      '20-minute AMRAP',
      name,
      1,
      reps,
      muscle,
      equipment,
      'Complete as many controlled rounds of this circuit as possible in 20 minutes. Focus on flow, not maximal loading.' +
        (name === 'Farmer carry'
          ? ' Start light, weights at your sides. Replace with another bike interval if carries irritate your back.'
          : ''),
    );
  a(
    4,
    'Optional final challenge',
    'Bike',
    5,
    '20 sec strong',
    'Cardio',
    'Bike',
    'Only if you still feel good. Follow each strong interval with 40 sec easy, for 5 minutes total.',
    40,
  );
  a(4, 'Core', 'Dead-bug heel tap', 2, '8/side', 'Core', 'Mat');
  a(4, 'Core', 'Bird dog', 2, '6/side', 'Core', 'Mat');
  a(4, 'Core', 'Side plank from knees', 2, '15-20 sec/side', 'Core', 'Mat');
  a(4, 'Core', 'Glute bridge', 2, '12 reps', 'Legs', 'Mat');
  for (let day = 0; day < 5; day++) {
    for (const name of ['Supine hamstring stretch', 'Piriformis stretch', 'Side / QL stretch'])
      a(day, 'Post-training stretching', name, 2, '20-30 sec/side', 'Mobility', 'Mat');
    a(day, 'Post-training mobility', 'Pelvic tilts', 1, '8-10 slow reps', 'Mobility', 'Mat');
    a(
      day,
      'Post-training mobility',
      'Gentle lumbar rotation',
      1,
      '8-10 reps/side',
      'Mobility',
      'Mat',
    );
    const first = additions.find((e) => e.day === day);
    if (first) first.notes = `${WEEKLY_PLAN_FOCUS[day]}. ${guidance} ${first.notes}`;
  }
  return { exercises, entries: additions };
}
