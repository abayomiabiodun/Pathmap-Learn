'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
const paths = [
  ['ui_data', 'ui_find_patterns_answer_questions_and_turn_information_into_useful_decisions'],
  [
    'ui_web_development',
    'ui_build_accessible_websites_and_useful_applications_one_small_project_at_a_time',
  ],
  ['ui_cybersecurity', 'ui_learn_to_protect_people_devices_and_information_from_digital_threats'],
  [
    'ui_ai_and_machine_learning',
    'ui_explore_how_machines_learn_from_examples_and_solve_everyday_problems',
  ],
  [
    'ui_ui_ux_design',
    'ui_understand_people_s_needs_and_design_experiences_that_work_better_for_everyone',
  ],
  [
    'ui_digital_marketing',
    'ui_help_ideas_reach_the_right_people_through_thoughtful_content_and_campaigns',
  ],
  [
    'ui_business_and_entrepreneurship',
    'ui_test_ideas_understand_customers_and_build_a_sustainable_small_business',
  ],
  [
    'ui_writing_and_communication',
    'ui_express_ideas_clearly_and_connect_with_readers_through_useful_writing',
  ],
  ['ui_project_management', 'ui_help_teams_turn_a_shared_goal_into_organized_achievable_work'],
  [
    'ui_teaching_and_facilitation',
    'ui_create_learning_experiences_that_help_others_understand_and_grow',
  ],
];
export default function Page() {
  const t = useTranslations();
  return (
    <div className="page-container">
      <span className="eyebrow">{t('ui_ten_paths_your_possibilities')}</span>
      <h1>{t('ui_what_could_your_next_chapter_look_like')}</h1>
      <p>
        {t(
          'ui_explore_tech_and_non_tech_skills_you_can_change_your_path_as_you_discover_what_you_enjoy',
        )}
      </p>
      <div className="path-catalog">
        {paths.map(([title, description]) => (
          <article key={title}>
            <h2>{t(title)}</h2>
            <p>{t(description)}</p>
            <Link href="/quiz" className="page-link">
              {t('ui_see_if_this_fits_you')}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
