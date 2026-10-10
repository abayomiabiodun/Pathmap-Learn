'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  Compass,
  Gamepad2,
  Sprout,
  Code2,
  ChartNoAxesCombined,
  Palette,
  Megaphone,
  BriefcaseBusiness,
  PenLine,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Leaf,
} from 'lucide-react';
import { Button } from './ui/button';
const paths = [
  {
    name: 'Web Development',
    description: 'Build things the world can use.',
    icon: Code2,
    color: 'green',
  },
  {
    name: 'Data',
    description: 'Find the story behind the numbers.',
    icon: ChartNoAxesCombined,
    color: 'amber',
  },
  {
    name: 'UI/UX Design',
    description: 'Make everyday experiences better.',
    icon: Palette,
    color: 'purple',
  },
  {
    name: 'Digital Marketing',
    description: 'Connect good ideas with people.',
    icon: Megaphone,
    color: 'rose',
  },
  {
    name: 'Business',
    description: 'Turn your ideas into opportunities.',
    icon: BriefcaseBusiness,
    color: 'blue',
  },
  {
    name: 'Writing',
    description: 'Make your words make a difference.',
    icon: PenLine,
    color: 'orange',
  },
];
export function Home() {
  const t = useTranslations();
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-spark">✳</span>
            {t('eyebrow')}
          </span>
          <h1>
            {t('headline')
              .split('\n')
              .map((line, i) => (
                <span key={line} className={i ? 'accent-text' : ''}>
                  {line}
                </span>
              ))}
          </h1>
          <p className="hero-description">{t('intro')}</p>
          <div className="hero-buttons">
            <Button asChild>
              <Link prefetch={false} href="/quiz">
                {t('start')}
                <ArrowRight size={19} />
              </Link>
            </Button>
            <Link prefetch={false} href="/quiz?skip=true" className="text-link">
              I already know my path
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Check size={15} />
              Always free
            </span>
            <span>
              <Check size={15} />
              Made for low data
            </span>
            <span>
              <Check size={15} />
              Your own pace
            </span>
          </div>
        </div>
        <div
          className="journey-art"
          role="img"
          aria-label="A winding learning path from a first step to a brighter future"
        >
          <svg viewBox="0 0 510 420" fill="none" aria-hidden="true">
            <circle cx="280" cy="205" r="174" fill="var(--art-circle)" />
            <circle cx="280" cy="205" r="148" stroke="var(--art-line)" strokeDasharray="3 9" />
            <path
              d="M130 340C47 226 335 297 293 202C267 141 140 173 182 104C207 63 322 106 367 55"
              stroke="var(--art-line)"
              strokeWidth="36"
              strokeLinecap="round"
            />
            <path
              d="M130 340C47 226 335 297 293 202C267 141 140 173 182 104C207 63 322 106 367 55"
              stroke="var(--green)"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            <circle cx="130" cy="340" r="17" fill="var(--green)" />
            <circle cx="293" cy="202" r="17" fill="var(--amber)" />
            <circle cx="367" cy="55" r="17" fill="var(--green)" />
            <path d="M360 55l5 5 9-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M119 339h21m-10-10v20" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M406 288c-6-26 7-47 27-51 5 26-7 45-27 51Zm0 0c-27-1-43-15-43-36 25 0 42 13 43 36Z"
              fill="var(--green)"
            />
            <path d="M406 288v30" stroke="var(--green)" strokeWidth="3" />
            <path
              d="m96 125 3-11 3 11 11 3-11 3-3 11-3-11-11-3 11-3Zm302 12 3-11 3 11 11 3-11 3-3 11-3-11-11-3 11-3Z"
              fill="var(--amber)"
            />
          </svg>
          <div className="art-card art-card-start">
            <span className="round-icon green">
              <Compass size={20} />
            </span>
            <div>
              <small>A LITTLE CURIOSITY</small>
              <strong>Your first step</strong>
            </div>
          </div>
          <div className="art-card art-card-middle">
            <span className="round-icon amber">
              <Sparkles size={20} />
            </span>
            <div>
              <small>ONE LESSON AT A TIME</small>
              <strong>Look at you grow!</strong>
            </div>
            <span className="mini-stars">✦</span>
          </div>
          <div className="art-tag">
            <span className="status-dot" />A future full of possibilities
          </div>
          <span className="art-note">Every path starts somewhere.</span>
        </div>
      </section>
      <div className="promise-strip">
        <Leaf size={18} />
        <strong>Big dreams. Small data.</strong>
        <span>Phone-friendly learning. No expensive courses. No pressure to keep up.</span>
      </div>
      <section className="how-section" aria-labelledby="how-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A CLEAR WAY FORWARD</span>
            <h2 id="how-heading">Your journey, made simple.</h2>
          </div>
          <span className="hand-note">A little progress goes a long way ↗</span>
        </div>
        <div className="steps">
          {[
            { key: 'discover', icon: Compass, color: 'green', number: '01' },
            { key: 'try', icon: Gamepad2, color: 'amber', number: '02' },
            { key: 'grow', icon: Sprout, color: 'purple', number: '03' },
          ].map(({ key, icon: Icon, color, number }) => (
            <article className="step-card" key={key}>
              <div className="step-top">
                <span className={`round-icon ${color}`}>
                  <Icon size={23} />
                </span>
                <span className="step-number">{number}</span>
              </div>
              <h3>{t(key)}</h3>
              <p>{t(`${key}Text`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="paths-section" aria-labelledby="paths-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TECH, NON-TECH, AND EVERYTHING YOU CAN BECOME</span>
            <h2 id="paths-heading">There’s more than one way to shine.</h2>
          </div>
          <Link prefetch={false} className="text-link" href="/paths">
            Explore all 10 paths
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="path-grid">
          {paths.map(({ name, description, icon: Icon, color }) => (
            <Link prefetch={false} href="/paths" key={name} className="path-card">
              <span className={`round-icon ${color}`}>
                <Icon size={23} />
              </span>
              <h3>{name}</h3>
              <p>{description}</p>
              <ArrowUpRight className="path-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="bottom-banner">
        <div className="banner-icon">
          <ShieldCheck size={30} />
        </div>
        <div>
          <h2>Wherever you’re starting, you belong here.</h2>
          <p>No experience needed. Just a little curiosity and a first step.</p>
        </div>
        <Button asChild>
          <Link prefetch={false} href="/quiz">
            Let’s find your path
            <ArrowRight size={18} />
          </Link>
        </Button>
      </section>
    </div>
  );
}
