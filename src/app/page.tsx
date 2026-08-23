/*
 * Composition root. Section order is fixed by legacy/index.html.
 *
 * OWNERSHIP: this file is owned by the orchestrator, NOT by block agents.
 * A block agent must never edit it. If a block needs a new prop, the agent
 * reports that instead of editing here — see docs/OWNERSHIP.md.
 */
import Preloader from '@/components/Preloader/Preloader'
import Hero from '@/components/Hero/Hero'
import MarketTape from '@/components/MarketTape/MarketTape'
import Vsl from '@/components/Vsl/Vsl'
import ThreeQuestions from '@/components/ThreeQuestions/ThreeQuestions'
import Phones from '@/components/Phones/Phones'
import SocialIntel from '@/components/SocialIntel/SocialIntel'
import Congress from '@/components/Congress/Congress'
import Pricing from '@/components/Pricing/Pricing'
import Footer from '@/components/Footer/Footer'

export default function Page() {
  return (
    <>
      <Preloader />
      <Hero />
      <MarketTape />
      <Vsl />
      <ThreeQuestions />
      <Phones />
      <SocialIntel />
      <Congress />
      <Pricing />
      <Footer />
    </>
  )
}
