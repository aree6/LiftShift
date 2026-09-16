import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const SET_BY_SET_SECTION: HowItWorksSection = {
  id: 'set-by-set',
  title: 'Set-by-set feedback',
  sidebarTitle: 'Set-by-set feedback',
  nodes: [
    {
      type: 'p',
      text:
        'Open any past workout and LiftShift analyzes every single set, comparing each to the one before it, and gives you plain-English feedback. Beginners learn how to progress faster. Experienced lifters spot patterns they\'d miss.',
    },
  ],
  children: [
    {
      id: 'sets-how-works',
      title: 'How it works',
      sidebarTitle: 'How it works',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift compares each set to the previous set on the same exercise. It detects what changed (same weight, weight increase, weight decrease, or support change for assisted lifts), how much output changed, and assigns one of 19 scenarios. Each scenario generates a short badge, a tooltip with exact numbers, an explanation of why it happened, and a suggestion for next session.',
        },
      ],
    },
    {
      id: 'sets-scenarios',
      title: 'Scenarios detected',
      sidebarTitle: 'Scenarios',
      nodes: [
        {
          type: 'p',
          text:
            'The 19 scenarios cover every common set-to-set pattern:',
        },
        {
          type: 'ul',
          items: [
            'Same weight, more reps: "Found More", "Building Momentum". You got stronger within the session.',
            'Same weight, same reps: "Consistent", "Locked In". Steady output.',
            'Same weight, mild drop (1-2 reps): "Normal Fatigue". Expected. Add 30 seconds rest.',
            'Same weight, moderate drop: "Fatigue Building". Take longer rest between sets.',
            'Same weight, severe drop: "Fatigue Spike", "Wiped Out". Reduce weight or stop 1-2 reps before failure.',
            'Weight increase, exceeded target: "Crushed It". You\'re ready for progression.',
            'Weight increase, met target: "Goal Met", "Nailed It". Hold this weight, aim for +1 rep.',
            'Weight increase, slightly below target: "Close Call". Keep the weight, try again.',
            'Weight increase, significantly below target: "Too Heavy", "Overreached". Reduce to a smaller jump.',
            'Weight decrease, met/recovered: "Smart Drop", "Good Reset". This was smart fatigue management.',
            'Weight decrease, still below: "Still Heavy", "Not Quite". Drop a bit more.',
            'Support decrease (assisted): "Exceeded on Less Assist". You\'re progressing toward unassisted.',
            'Support increase (assisted): "Good Support Reset". Rebuilding after a tough session.',
          ],
        },
      ],
    },
    {
      id: 'sets-special',
      title: 'Special set types',
      sidebarTitle: 'Special set types',
      nodes: [
        {
          type: 'p',
          text:
            'Certain set types get specialized commentary: drop sets ("Deep Set Work"), back-off sets ("Volume Builder"), top sets ("Top Set Crushed"), AMRAPs ("AMRAP Push"), failure sets ("Max Effort"), unilateral work ("Side Fatigue"), negatives ("Eccentric Work"), partials, feeder sets, and intensity techniques like myoreps and rest-pause.',
        },
      ],
    },
    {
      id: 'sets-promote-demote',
      title: 'Weight-up / weight-down suggestions',
      sidebarTitle: 'Weight suggestions',
      nodes: [
        {
          type: 'p',
          text:
            'When LiftShift analyzes the overall quality of your sets for an exercise in a workout, it also tells you whether to stay at your current top weight, increase it, or reduce it, with specific numbers. For example: "At 80 kg, you hit at least 8 reps. Keep this load until you can repeat 10+ reps, then move to 82.5 kg."',
        },
      ],
    },
  ],
};
