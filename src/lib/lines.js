// Madam Chonk's voice. Three tones, pools per moment. Picks are stable per day and moment.
// Tokens: {dur} duration, {cat} category, {over} overtime, {left} hours left.

const P = {
  gentle: {
    morning: ['Good morning. Take a breath before the first bell.', 'A new day. Tea first, then the timetable.', 'You have a full day ahead, so be kind to yourself in it.'],
    lessons: ['Lovely work so far. The biscuits are in the staff room.', 'You are doing well. Do take your break.', 'Halfway through, and still standing. I am proud.'],
    after: ['The bell has gone. It really is allowed to be home time.', 'Lovely work today. Now please go home.', 'The school will still be there tomorrow. I promise.'],
    over: ['That is a lot of hours today. Please rest this evening.', 'You gave plenty today. Time to give some to yourself.'],
    off: ['No school today. Doing nothing is your job right now.', 'A day off. I will be napping, and you should too.'],
    weekend: ['It is the weekend. The marking can wait, truly.', 'Rest day. I am keeping an eye on you, kindly.'],
    logged: ['{dur} of {cat}, safely written down. Well done.', 'Noted: {dur} of {cat}. Thank you for telling me.', '{dur} of {cat} logged. You are doing wonderfully.'],
    reportOver: ['A lot of effort this week. Please let some of it go.'],
    reportOk: ['A good, balanced week. I am very pleased with you.'],
    reportEmpty: ['A quiet week so far. Nothing to worry about.'],
    bell: ['Gently now. One round at a time.', 'You are doing lovely work. Keep breathing.'],
    breakTime: ['Time for a break. Stretch, drink some water.'],
    takeback: ['Go and enjoy it. You have earned every minute.'],
    term: ['A whole term. Please rest properly before the next.'],
  },
  classic: {
    morning: ['The day begins. The marking does not care that you are not ready.', 'Good morning. The staff room kettle is the only reliable colleague.', 'A new day, a full timetable and a cat who is watching.'],
    lessons: ['Four hours in, and the staff room biscuits remain unvisited.', 'Lessons are in progress. Your break is not decorative.', 'Still teaching? Admirable. Have you drunk anything today?'],
    after: ['The bell has gone. I notice you have not.', 'School is over. This is the part where you leave.', 'Great effort, but needs to work on leaving the building.'],
    over: ['That is over plan. I have noted it, and I am not impressed.', 'More hours than planned. Heroic, and also a mistake.'],
    off: ['No school today. This is not a trap, you may rest.', 'A day off. I expect nothing from you, and I mean it.'],
    weekend: ['It is the weekend. Close the laptop and be a person.', 'Weekend work is still work. I am watching.'],
    logged: ['{dur} of {cat}. Noted, and underlined.', '{dur} of {cat}, recorded. I shall pretend to be surprised.', 'Logged: {dur} of {cat}. The register thanks you.'],
    reportOver: ['Great effort, but needs to work on leaving the building.', 'Hard worker. Poor at stopping. See me.'],
    reportOk: ['A sensible week. I am suspicious, but pleased.', 'On plan, more or less. Do not let it go to your head.'],
    reportEmpty: ['Very little recorded so far. Either a quiet week or a forgetful teacher.'],
    bell: ['Twenty-five minutes. The marking will still be there, sadly.', 'Focus. I will be here, judging quietly.'],
    breakTime: ['Break time. Stand up. Yes, now.'],
    takeback: ['Finally. Go. Take a coat.', 'Spent wisely. I approve.'],
    term: ['That is a term. I have noted every hour, and I am not impressed.'],
  },
  strict: {
    morning: ['Good morning. The timetable is a promise, so keep it.', 'You are on time, which is the least I expect.'],
    lessons: ['Lessons in progress. Do not skip lunch, I will know.', 'Eyes on the clock. You finish at the bell, not after.'],
    after: ['It is gone the bell. I will not ask twice.', 'School is finished. Leave the building. Now.'],
    over: ['Over plan. This is a pattern, and I do not like patterns.', 'That is more than agreed. See me after.'],
    off: ['A day off. Using it is compulsory.', 'No work today. That is an instruction.'],
    weekend: ['It is the weekend. Why is the app open?', 'Weekend. Laptop closed. I said closed.'],
    logged: ['{dur} of {cat}. Recorded. Do not make it a habit.', '{cat}, {dur}. Logged. Now stop.', '{dur} of {cat}. Fine. That will do.'],
    reportOver: ['Overworked and over plan. Unacceptable, and I mean that kindly.'],
    reportOk: ['Satisfactory. Keep it up, and keep it short.'],
    reportEmpty: ['Where are your hours? A register does not fill itself.'],
    bell: ['Focus. No phone. No excuses.', 'Twenty-five minutes. Begin.'],
    breakTime: ['Break. Away from the desk. That is an order.'],
    takeback: ['Take it. All of it. Go.'],
    term: ['Term is over. Your overtime is noted, and it stays noted.'],
  },
};

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export function pick({ tone = 'classic', kind = false, heavy = false, moment, seed = '', vars = {} }) {
  const t = kind && heavy ? 'gentle' : tone;
  const pool = (P[t] && P[t][moment]) || P.classic[moment] || [''];
  let line = pool[hash(`${seed}|${moment}|${t}`) % pool.length];
  for (const [k, v] of Object.entries(vars)) line = line.split(`{${k}}`).join(v);
  return line;
}
export const TONES = [
  { id: 'gentle', name: 'Gentle', quote: '"Lovely work today. Now please go home."', pose: 'loving' },
  { id: 'classic', name: 'Classic', quote: '"Great effort, but needs to work on leaving the building."', pose: 'teaching' },
  { id: 'strict', name: 'Headmistress', quote: '"It is gone six. I will not ask twice."', pose: 'strict' },
];
