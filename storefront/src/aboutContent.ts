export type AboutFact = { title: string; detail: string }

export type AboutPageContent = {
  heroEyebrow: string
  heroTitle: string
  heroTitleAccent: string
  heroText: string
  heroImage: string
  heroImageAlt: string
  heroImageCaption: string
  heroPrimaryLabel: string
  heroSecondaryLabel: string
  statementLocation: string
  statementQuote: string
  profileEyebrow: string
  profileTitle: string
  profileTitleAccent: string
  profileLead: string
  profileStory: string
  profileImage: string
  profileDetailImage: string
  profileImageAlt: string
  profileDetailImageAlt: string
  profileCaption: string
  profileButtonLabel: string
  facts: AboutFact[]
  visionEyebrow: string
  visionTitle: string
  visionText: string
  visionOwner: string
  visionImage: string
  visionImageAlt: string
  practiceEyebrow: string
  practiceTitle: string
  practiceText: string
  practiceItems: string[]
  ctaEyebrow: string
  ctaTitle: string
  ctaText: string
  ctaButtonLabel: string
}

export const defaultAboutPage: AboutPageContent = {
  heroEyebrow: "Mthunzi · Artist & founder",
  heroTitle: "Art shaped by place, made with",
  heroTitleAccent: "purpose.",
  heroText: "From a studio in Blantyre, Mthunzi creates expressive work that turns observation, memory, and everyday Malawian life into colour, line, and form.",
  heroImage: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1100&q=90",
  heroImageAlt: "Expressive original artwork",
  heroImageCaption: "Colour, culture & connection",
  heroPrimaryLabel: "View available work",
  heroSecondaryLabel: "Contact the studio",
  statementLocation: "Based in Blantyre, Malawi",
  statementQuote: "The goal is not only to make something beautiful. It is to make something honest: work that carries a feeling, starts a conversation, and stays with you.",
  profileEyebrow: "The story",
  profileTitle: "From first marks to an independent",
  profileTitleAccent: "studio.",
  profileLead: "Mthunzi’s practice began with curiosity: a natural instinct to draw, observe, and translate the world around him into images.",
  profileStory: "Largely self-taught, he learned by making: experimenting with drawing, painting, illustration, and print until each medium became part of a distinctive visual language. The process was patient, practical, and shaped by a belief that strong creative work comes from attention and consistency.\n\nThat personal practice grew into Mthunzi Creations, an independent creative enterprise in Blantyre. Today the studio produces original artwork and also works across screen printing, murals, sign-writing, illustration, art lessons, and creative consultancy.",
  profileImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=90",
  profileDetailImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=700&q=90",
  profileImageAlt: "Artist tools and paint in a working studio",
  profileDetailImageAlt: "Detail of an original artwork",
  profileCaption: "Working across painting, drawing, print, and public art",
  profileButtonLabel: "Work with the studio",
  facts: [
    { title: "Blantyre", detail: "Home of the studio" },
    { title: "Self-taught", detail: "Built through practice" },
    { title: "Multi-disciplinary", detail: "From canvas to public space" },
    { title: "Malawian made", detail: "Created with local perspective" },
  ],
  visionEyebrow: "The studio vision",
  visionTitle: "Local stories, shared through art.",
  visionText: "Mthunzi Creations is guided by a vision to make thoughtful, honest work rooted in Malawian life and to share it with people everywhere. The studio brings artists, communities, and collectors together through craft, collaboration, and a lasting respect for where each story begins.",
  visionOwner: "Mthunzi · Artist & founder",
  visionImage: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1000&q=90",
  visionImageAlt: "Artwork in the Mthunzi Creations studio",
  practiceEyebrow: "The practice",
  practiceTitle: "Built for expression in many forms.",
  practiceText: "The studio brings the same attention to craft and storytelling to every scale of work.",
  practiceItems: [
    "Original painting & drawing",
    "Private commissions",
    "Murals & public artwork",
    "Illustration & sign-writing",
    "Screen printing",
    "Lessons & creative consultancy",
  ],
  ctaEyebrow: "Create together",
  ctaTitle: "Have an idea for a custom piece?",
  ctaText: "From private commissions to murals and illustration, bring your story to the studio.",
  ctaButtonLabel: "Start a conversation",
}