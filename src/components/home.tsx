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
    name: 'ui_web_development',
    description: 'ui_build_things_the_world_can_use',
    icon: Code2,
    color: 'green',
  },
  {
    name: 'ui_data',
    description: 'ui_find_the_story_behind_the_numbers',
    icon: ChartNoAxesCombined,
    color: 'amber',
  },
  {
    name: 'ui_ui_ux_design',
    description: 'ui_make_everyday_experiences_better',
    icon: Palette,
    color: 'purple',
  },
  {
    name: 'ui_digital_marketing',
    description: 'ui_connect_good_ideas_with_people',
    icon: Megaphone,
    color: 'rose',
  },
  {
    name: 'ui_business',
    description: 'ui_turn_your_ideas_into_opportunities',
    icon: BriefcaseBusiness,
    color: 'blue',
  },
  {
    name: 'ui_writing',
    description: 'ui_make_your_words_make_a_difference',
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
              {t('ui_i_already_know_my_path')}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Check size={15} />
              {t('ui_always_free')}
            </span>
            <span>
              <Check size={15} />
              {t('ui_made_for_low_data')}
            </span>
            <span>
              <Check size={15} />
              {t('ui_your_own_pace')}
            </span>
          </div>
        </div>
        <div
          className="journey-art"
          role="img"
          aria-label={t('ui_a_winding_learning_path_from_a_first_step_to_a_brighter_future')}
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
              <small>{t('ui_a_little_curiosity')}</small>
              <strong>{t('ui_your_first_step')}</strong>
            </div>
          </div>
          <div className="art-card art-card-middle">
            <span className="round-icon amber">
              <Sparkles size={20} />
            </span>
            <div>
              <small>{t('ui_one_lesson_at_a_time')}</small>
              <strong>{t('ui_look_at_you_grow')}</strong>
            </div>
            <span className="mini-stars">✦</span>
          </div>
          <div className="art-tag">
            <span className="status-dot" />
            {t('ui_a_future_full_of_possibilities')}
          </div>
          <span className="art-note">{t('ui_every_path_starts_somewhere')}</span>
        </div>
      </section>
      <div className="promise-strip">
        <Leaf size={18} />
        <strong>{t('ui_big_dreams_small_data')}</strong>
        <span>{t('ui_phone_friendly_learning_no_expensive_courses_no_pressure_to_keep_up')}</span>
      </div>
      <section className="how-section" aria-labelledby="how-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('ui_a_clear_way_forward')}</span>
            <h2 id="how-heading">{t('ui_your_journey_made_simple')}</h2>
          </div>
          <span className="hand-note">{t('ui_a_little_progress_goes_a_long_way')}</span>
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
            <span className="eyebrow">{t('ui_tech_non_tech_and_everything_you_can_become')}</span>
            <h2 id="paths-heading">{t('ui_there_s_more_than_one_way_to_shine')}</h2>
          </div>
          <Link prefetch={false} className="text-link" href="/paths">
            {t('ui_explore_all_10_paths')}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="path-grid">
          {paths.map(({ name, description, icon: Icon, color }) => (
            <Link prefetch={false} href="/paths" key={name} className="path-card">
              <span className={`round-icon ${color}`}>
                <Icon size={23} />
              </span>
              <h3>{t(name)}</h3>
              <p>{t(description)}</p>
              <ArrowUpRight className="path-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="bottom-banner">
        <div>
          <h2>{t('eng_eyebrow')}</h2>
          <p>{t('eng_top')}</p>
          <Link prefetch={false} href="/dashboard" className="button button-primary">
            {t('eng_dashboard')} →
          </Link>
          <br />
          <Link prefetch={false} href="/recruiter" className="button button-outline">
            {t('eng_recruiter')} →
          </Link>
        </div>
      </section>
      <section className="bottom-banner">
        <div className="banner-icon">
          <ShieldCheck size={30} />
        </div>
        <div>
          <h2>{t('ui_wherever_you_re_starting_you_belong_here')}</h2>
          <p>{t('ui_no_experience_needed_just_a_little_curiosity_and_a_first_step')}</p>
        </div>
        <Button asChild>
          <Link prefetch={false} href="/quiz">
            {t('ui_let_s_find_your_path')}
            <ArrowRight size={18} />
          </Link>
        </Button>
      </section>
    </div>
  );
}
