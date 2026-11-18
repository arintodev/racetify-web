import {
  ClipboardList,
  CreditCard,
  Images,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

export const siteNav = [
  { label: "Product", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
] as const

export const features: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: "Registration",
    description:
      "Create races and categories, set fees, and open a shareable registration link.",
    icon: ClipboardList,
  },
  {
    title: "Participants",
    description:
      "Keep participant details, bib names, categories, and emergency contacts in one place.",
    icon: Users,
  },
  {
    title: "Orders and payment status",
    description:
      "Track registration orders, totals, payment status, and refunds from the same workspace.",
    icon: CreditCard,
  },
  {
    title: "Race-day media",
    description:
      "Organize event galleries and help participants find photos from the race.",
    icon: Images,
  },
  {
    title: "Results and certificates",
    description:
      "Publish race results and issue participant certificates when results are ready.",
    icon: Trophy,
  },
  {
    title: "Team access",
    description:
      "Work with event teams using role-based access and a shared workspace.",
    icon: ShieldCheck,
  },
]

export const howItWorks = [
  {
    title: "Set up the event",
    description:
      "Add races, categories, fees, and the details organizers need before registration opens.",
  },
  {
    title: "Open registration",
    description:
      "Share one registration link and manage participants as they sign up.",
  },
  {
    title: "Run the race",
    description:
      "Publish results, share galleries, and issue certificates after race day.",
  },
] as const

export const faqs = [
  {
    question: "Who is Racetify for?",
    answer:
      "Racetify is built for race organizers, race directors, event operations teams, and media partners working with organizers.",
  },
  {
    question: "Does Racetify handle registration payments?",
    answer:
      "Racetify organizes registration orders and payment status in the organizer workspace. Payment processing is a separate integration and can be discussed with our team.",
  },
  {
    question: "Can I manage more than one event?",
    answer:
      "Yes. The workspace is organized by organization and event, so teams can manage multiple events from one place.",
  },
  {
    question: "Can my team access the same workspace?",
    answer:
      "Yes. Team members can be added with roles and permissions that match their responsibilities.",
  },
  {
    question: "How do I get started?",
    answer:
      "Send us a short note about your event through the contact page, or sign in to the organizer app.",
  },
] as const

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "Contact", href: "/contact" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
] as const
