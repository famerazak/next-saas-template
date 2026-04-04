type ProfileSettingsFormProps = {
  email: string;
  initialFullName: string;
  initialJobTitle: string;
  initialSuccess?: string;
  initialError?: string;
};

export function ProfileSettingsForm({
  email,
  initialFullName,
  initialJobTitle,
  initialSuccess = "",
  initialError = ""
}: ProfileSettingsFormProps) {
  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Profile settings</h1>
        <p className="auth-subtitle">Manage your basic profile information.</p>
        <form className="auth-form" data-testid="profile-form" method="post" action="/api/profile">
          <label htmlFor="email">
            Email
            <input id="email" name="email" type="email" value={email} readOnly />
          </label>
          <label htmlFor="fullName">
            Full name
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Taylor Smith"
              maxLength={80}
              defaultValue={initialFullName}
            />
          </label>
          <label htmlFor="jobTitle">
            Job title
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              placeholder="Operations Manager"
              maxLength={80}
              defaultValue={initialJobTitle}
            />
          </label>
          {initialError ? (
            <p role="alert" className="auth-error" data-testid="profile-error">
              {initialError}
            </p>
          ) : null}
          {initialSuccess ? (
            <p role="status" className="auth-success" data-testid="profile-success">
              {initialSuccess}
            </p>
          ) : null}
          <button type="submit">Save profile</button>
        </form>
      </section>
    </main>
  );
}
