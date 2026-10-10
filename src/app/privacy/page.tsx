'use client';
import { useTranslations } from 'next-intl';
export default function Page() {
  const t = useTranslations();
  return (
    <article className="page-container narrow">
      <span className="eyebrow">{t('ui_your_learning_your_choice')}</span>
      <h1>{t('ui_privacy_comes_first')}</h1>
      <h2>{t('ui_what_we_store')}</h2>
      <p>
        {t(
          'ui_pathmap_learn_uses_your_quiz_answers_learning_progress_and_preferences_to_tailor_your_learning_in_the_local_demo_preferences_are_stored_on_your_device_when_live_accounts_are_configured_your_email_and_learning_records_are_held_in_supabase',
        )}
      </p>
      <h2>{t('ui_you_control_your_visibility')}</h2>
      <p>
        {t(
          'ui_public_portfolios_recruiter_visibility_and_leaderboards_are_opt_in_we_never_send_email_sms_or_whatsapp_reminders_without_your_recorded_permission',
        )}
      </p>
      <h2>{t('comm_title')}</h2>
      <p>{t('comm_consent')}</p>
      <p>{t('comm_mentor_intro')}</p>
      <p>{t('comm_leave_hint')}</p>
      <h2>{t('ui_your_data_rights')}</h2>
      <p>
        {t(
          'ui_you_can_request_an_export_or_deletion_of_your_account_data_through_settings_when_signed_in_clearing_this_site_s_browser_storage_removes_local_demo_data_sign_in_links_are_handled_by_supabase_google_sign_in_shares_the_profile_information_you_approve',
        )}
      </p>
      <h2>{t('ui_offline_learning')}</h2>
      <p>
        {t(
          'ui_saved_lessons_may_be_cached_on_this_device_avoid_saving_personal_information_on_a_shared_device_and_remove_downloads_when_you_finish_using_it',
        )}
      </p>
      <h2>{t('ui_third_party_learning_resources')}</h2>
      <p>
        {t(
          'ui_external_learning_providers_have_their_own_privacy_policies_opening_a_resource_takes_you_to_that_provider_s_website_pathmap_does_not_load_videos_until_you_choose_to_open_them',
        )}
      </p>
    </article>
  );
}
