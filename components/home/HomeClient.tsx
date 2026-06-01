"use client"

import Link from "next/link"
import { HeroCarousel } from "@/components/home/HeroCarousel"
import { FeatureCards } from "@/components/home/FeatureCards"
import { HowToUse } from "@/components/home/HowToUse"
import { TemplateSection } from "@/components/home/TemplateSection"
import { Testimonials } from "@/components/home/Testimonials"

interface Slide { title: string; highlight: string; suffix: string; description: string; accent: string; btnBorder: string; highlightColor: string; subColor: string; btnText: string; href: string; subText?: string }
interface LinkItem { emoji: string; label: string; href: string; external?: boolean }
interface FeatureItem { emoji: string; title: string; description: string; href: string }
interface StepItem { num: string; label: string; desc: string }
interface TestimonialItem { quote: string; author: string; role: string }
interface TemplateItem { emoji: string; title: string; desc: string; href: string }
interface CtaData { title: string; subtitle: string; buttonText: string; buttonHref: string }

interface Props {
  home_hero_slides: Slide[]
  home_hero_links: LinkItem[]
  home_features: { title: string; subtitle: string; items: FeatureItem[] }
  home_steps: { title: string; items: StepItem[]; ctaText: string; ctaHref: string }
  home_testimonials: { title: string; items: TestimonialItem[] }
  home_cta: CtaData
  home_templates: { title: string; items: TemplateItem[]; moreText: string; moreHref: string }
}

export function HomeClient(props: Props) {
  const { home_hero_slides, home_hero_links, home_features, home_steps, home_testimonials, home_cta, home_templates } = props

  return (
    <div className="bg-zinc-950">
      <HeroCarousel slides={home_hero_slides} quickLinks={home_hero_links} />
      <HowToUse title={home_steps.title} steps={home_steps.items} ctaText={home_steps.ctaText} ctaHref={home_steps.ctaHref} />
      <FeatureCards title={home_features.title} subtitle={home_features.subtitle} items={home_features.items} />
      <TemplateSection title={home_templates.title} items={home_templates.items} moreText={home_templates.moreText} moreHref={home_templates.moreHref} />
      <Testimonials title={home_testimonials.title} items={home_testimonials.items} />

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-zinc-900/50 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{home_cta.title}</h2>
          <p className="text-zinc-400 mb-8">{home_cta.subtitle}</p>
          <Link
            href={home_cta.buttonHref}
            className="inline-block bg-red-600 text-white font-bold py-3 px-10 rounded-full hover:bg-red-500 transition-all transform hover:scale-105 text-lg shadow-lg shadow-red-900/30"
          >
            {home_cta.buttonText}
          </Link>
        </div>
      </section>
    </div>
  )
}
