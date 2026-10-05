import Icon from '../components/Icons3D';
import { useI18n } from '../lib/i18n';

/** App settings page: language switcher + version/backend info. Monochrome glass UI. */
export default function Settings() {
  const { lang, setLang, t } = useI18n();
  const backendUrl = import.meta.env.VITE_API_URL || 'https://app-backend-api.tapwin.workers.dev';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>{t('settings')}</h1>

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{t('language')}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn ${lang === 'ar' ? '' : 'btn-ghost'}`}
            onClick={() => setLang('ar')}
          >
            <Icon name="globe" size={16} c1="#ffffff" c2="#d9d9d9" />
            {t('arabic')}
          </button>
          <button
            className={`btn ${lang === 'en' ? '' : 'btn-ghost'}`}
            onClick={() => setLang('en')}
          >
            <Icon name="globe" size={16} c1="#ffffff" c2="#d9d9d9" />
            {t('english')}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{t('appearance')}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{t('themeNote')}</p>
      </section>

      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{t('appVersion')}</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 18px', fontSize: 13.5 }}>
          <dt style={{ color: 'var(--muted)' }}>{t('appVersion')}</dt>
          <dd>v1.0.0</dd>
          <dt style={{ color: 'var(--muted)' }}>{t('backendUrl')}</dt>
          <dd style={{ direction: 'ltr', textAlign: 'end' }}>{backendUrl}</dd>
        </dl>
      </section>
    </div>
  );
}
