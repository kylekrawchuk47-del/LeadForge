// AI Ad Generator
// TODO: Replace mock generation with real AI services:
//   - OpenAI (GPT-4) for script and headline generation
//   - ElevenLabs for voiceover audio synthesis
//   - Image generation API (DALL-E, Midjourney, etc.) for scene visuals
//   - FFmpeg backend pipeline for final video rendering

export interface GenerateAdInput {
  businessName: string;
  businessType: string;
  city: string;
  serviceOffered: string;
  targetCustomer: string;
  adTone: string;
  callToAction: string;
}

export interface AdScene {
  sceneNumber: number;
  description: string;
  onScreenText: string;
  durationSeconds: number;
}

export interface AdOutput {
  headline: string;
  voiceoverScript: string;
  scenes: AdScene[];
  finalCallToAction: string;
  durationSeconds: number;
}

const toneDescriptors: Record<string, string> = {
  professional: "expert, reliable, and polished",
  friendly: "warm, approachable, and community-focused",
  urgent: "time-sensitive, compelling, and action-oriented",
  trustworthy: "dependable, proven, and customer-first",
  energetic: "dynamic, exciting, and bold",
};

const serviceTemplates: Record<string, { scenes: string[]; visuals: string[] }> = {
  "Painting": {
    scenes: [
      "Wide shot of a faded, worn exterior — the 'before'",
      "Close-up of a professional painter applying a smooth coat",
      "Time-lapse of the transformation in progress",
      "Homeowner smiling at the stunning new look",
      "Finished home gleaming in perfect condition",
    ],
    visuals: [
      "Before: Faded, chipped exterior paint",
      "Expert painters at work — licensed and insured",
      "Transformation in progress — see the difference",
      "Happy homeowner, gorgeous result",
      "The finished look that turns heads",
    ],
  },
  "Pressure Washing": {
    scenes: [
      "Grimy driveway or siding covered in years of dirt",
      "Pressure washer revealing the clean surface underneath",
      "Worker methodically cleaning a large surface area",
      "Side-by-side comparison of dirty vs. clean",
      "Sparkling clean property with satisfied homeowner",
    ],
    visuals: [
      "Before: Years of grime and buildup",
      "Watch the dirt disappear instantly",
      "Professional-grade equipment, expert results",
      "The difference is night and day",
      "Your property, looking brand new",
    ],
  },
  "Landscaping": {
    scenes: [
      "Overgrown, neglected yard — the starting point",
      "Crew arriving with professional equipment",
      "Precise trimming, edging, and cleanup in action",
      "New plants and mulch transforming the space",
      "Stunning curb appeal — the finished yard",
    ],
    visuals: [
      "Before: Overgrown and neglected",
      "Our expert crew gets to work",
      "Precision and care in every detail",
      "Beautiful new plantings and fresh mulch",
      "Curb appeal that makes the neighborhood notice",
    ],
  },
  "Roofing": {
    scenes: [
      "Damaged, aging roof — showing visible wear",
      "Safety-geared team inspecting the roof",
      "Old materials being carefully removed",
      "New roofing materials installed with precision",
      "Pristine new roof — durable and beautiful",
    ],
    visuals: [
      "Before: Aging roof putting your home at risk",
      "Expert inspection — we find every issue",
      "Safe, professional removal of old materials",
      "Premium materials installed to last decades",
      "Peace of mind — protected for years to come",
    ],
  },
  "Cleaning": {
    scenes: [
      "Cluttered, dusty room or dirty kitchen",
      "Professional cleaner tackling tough areas",
      "Close-up of gleaming surfaces after cleaning",
      "Organized, fresh-smelling space",
      "Happy client in their spotless home",
    ],
    visuals: [
      "Before: The mess that's been building up",
      "Our team tackles every corner and surface",
      "Sparkling clean — even the tough spots",
      "Fresh, organized, and ready to enjoy",
      "This is what a truly clean home feels like",
    ],
  },
  "Line Painting": {
    scenes: [
      "Faded, worn parking lot or athletic field lines",
      "Professional line painting machine in action",
      "Fresh, bright lines emerging on the surface",
      "Worker ensuring perfect precision and spacing",
      "Crisp, professional result — ready for use",
    ],
    visuals: [
      "Before: Faded lines creating confusion",
      "Professional-grade equipment for perfect results",
      "Fresh, bright lines taking shape",
      "Precision that meets code and safety standards",
      "Professional results that last",
    ],
  },
};

const defaultScenes = {
  scenes: [
    "Establishing shot of the property or problem area",
    "Professional team arriving, ready to work",
    "Work in progress — expert techniques on display",
    "The transformation taking shape",
    "The finished result — quality you can see",
  ],
  visuals: [
    "The problem before we arrived",
    "Your local experts, ready to help",
    "Professional techniques, top-tier equipment",
    "Watch the transformation happen",
    "Results that speak for themselves",
  ],
};

// TODO: Replace this entire function with an OpenAI API call
// Example implementation:
//   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//   const completion = await openai.chat.completions.create({
//     model: "gpt-4",
//     messages: [{ role: "user", content: buildPrompt(input) }]
//   });
export function generateAdContent(input: GenerateAdInput): AdOutput {
  const {
    businessName,
    businessType,
    city,
    serviceOffered,
    targetCustomer,
    adTone,
    callToAction,
  } = input;

  const toneDesc = toneDescriptors[adTone.toLowerCase()] || "professional and compelling";

  const templateKey = Object.keys(serviceTemplates).find(
    (k) => businessType.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(businessType.toLowerCase())
  );
  const template = templateKey ? serviceTemplates[templateKey] : defaultScenes;

  const headlines: Record<string, string> = {
    professional: `${city}'s Trusted ${businessType} Experts — ${businessName}`,
    friendly: `Your Neighbors at ${businessName} Are Here to Help`,
    urgent: `Don't Wait — ${businessName} Is Booking ${city} Now`,
    trustworthy: `${city} Homeowners Trust ${businessName} for a Reason`,
    energetic: `Transform Your Property with ${businessName} — ${city}'s Best`,
  };

  const headline = headlines[adTone.toLowerCase()] || headlines["professional"];

  const voiceoverLines = [
    `Are you a ${targetCustomer} in ${city} looking for ${serviceOffered}?`,
    `${businessName} has been delivering ${toneDesc} ${businessType.toLowerCase()} services that ${targetCustomer} in ${city} rely on.`,
    `We specialize in ${serviceOffered} — done right, on time, and within budget.`,
    `Your property deserves the best. That's exactly what ${businessName} delivers.`,
    `${callToAction} — call or book online today. ${businessName}. ${city}'s choice for ${businessType.toLowerCase()}.`,
  ];

  const voiceoverScript = voiceoverLines.join(" ");

  const scenes: AdScene[] = template.scenes.map((desc, i) => ({
    sceneNumber: i + 1,
    description: desc,
    onScreenText: template.visuals[i] || desc,
    durationSeconds: i === 0 ? 4 : i === 4 ? 5 : 4,
  }));

  return {
    headline,
    voiceoverScript,
    scenes,
    finalCallToAction: callToAction,
    durationSeconds: scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
  };
}
