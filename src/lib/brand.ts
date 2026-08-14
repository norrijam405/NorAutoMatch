export const brand = {
  name: "NorAuto Match",
  tagline: "Tell me the number. I’ll find the car.",
  phoneDisplay: "(405) 861-0061",
  phoneRaw: "+14058610061",
  textHref: "sms:+14058610061",
  cities: [
    "Oklahoma City",
    "Yukon",
    "Edmond",
    "Mustang",
    "Piedmont",
    "Moore",
    "Norman",
    "Midwest City",
  ],
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://norautomatch.com",
};

export const cityDetails: Record<string, { name: string; intro: string; local: string }> = {
  "oklahoma-city": {
    name: "Oklahoma City",
    intro: "A payment-first car search built for OKC drivers.",
    local: "From Northwest Expressway to the south side, get a real shortlist without spending Saturday bouncing between lots.",
  },
  yukon: {
    name: "Yukon",
    intro: "Your car match, sourced across the OKC network.",
    local: "Tell me the monthly target and what has to fit in the garage. I will build the shortlist and bring the process to Yukon.",
  },
  edmond: {
    name: "Edmond",
    intro: "A smarter way to shop the metro from Edmond.",
    local: "Family SUV, commuter sedan, or weekend truck—I narrow the field before you burn a day on dealership rows.",
  },
  mustang: {
    name: "Mustang",
    intro: "Growing families need the right car, not more lot pressure.",
    local: "NorAuto Match helps Mustang drivers match the monthly number to a real SUV, truck, or sedan across the metro.",
  },
  piedmont: {
    name: "Piedmont",
    intro: "Metro-wide inventory without the metro-wide runaround.",
    local: "For Piedmont commuters and growing households, I source around the payment and bring the final steps closer to home.",
  },
  moore: {
    name: "Moore",
    intro: "Know what fits before you cross town.",
    local: "Start with payment, down payment, and must-haves. I turn that into a shortlist for Moore drivers.",
  },
  norman: {
    name: "Norman",
    intro: "Car matching for Norman buyers who value their Saturday.",
    local: "From campus commuters to three-row family SUVs, get a direct recommendation and a clear next step.",
  },
  "midwest-city": {
    name: "Midwest City",
    intro: "A direct line to the car-shopping process.",
    local: "Match a realistic payment to available options, then let me handle the hunt across the Oklahoma City metro.",
  },
};
