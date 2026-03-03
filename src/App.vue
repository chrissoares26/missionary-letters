<template>
  <main class="page-shell">
    <section class="card hero">
      <p class="eyebrow">Missionary Monday</p>
      <h1>Warm outreach, reliable workflow.</h1>
      <p class="hero-copy">
        Design-system scaffold loaded. Use these tokens and component styles as the baseline for
        campaign creation, approval, and send logging flows.
      </p>
      <div class="actions">
        <button class="btn btn-primary">Create Monday Campaign</button>
        <button class="btn btn-secondary">Preview Recipient Log</button>
      </div>
    </section>

    <section class="card preview">
      <div class="preview-header">
        <h2>Status Tokens</h2>
        <span class="chip chip-info">In Progress</span>
      </div>
      <div class="chip-row">
        <span class="chip chip-success">Sent</span>
        <span class="chip chip-warning">Pending</span>
        <span class="chip chip-error">Failed</span>
      </div>
      <p class="note">
        Tokens are defined in <code>src/styles/tokens.css</code> and globally available.
      </p>
    </section>
  </main>
</template>

<style scoped>
.page-shell {
  width: min(860px, 100% - 2rem);
  margin: var(--space-12) auto;
  display: grid;
  gap: var(--space-6);
}

.card {
  background: color-mix(in srgb, var(--bg-surface) 88%, var(--bg-muted));
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}

.hero {
  display: grid;
  gap: var(--space-4);
}

.eyebrow {
  font-size: var(--fs-label);
  letter-spacing: 0.02em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--action-secondary);
}

h1 {
  font-size: var(--fs-display);
  line-height: 1.12;
}

h2 {
  font-size: var(--fs-h2);
  line-height: 1.2;
}

.hero-copy {
  max-width: 56ch;
  font-size: var(--fs-body);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.btn {
  min-height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  padding: 0.65rem 1rem;
  font-weight: 600;
  transition:
    background-color var(--motion-normal) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
  cursor: pointer;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--action-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--action-primary-hover);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--action-secondary);
}

.btn-secondary:hover {
  background: var(--bg-muted);
}

.preview {
  display: grid;
  gap: var(--space-4);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.chip-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.chip {
  border-radius: var(--radius-pill);
  padding: 0.35rem 0.65rem;
  font-size: var(--fs-body-sm);
  font-weight: 600;
}

.chip-success {
  background: color-mix(in srgb, var(--state-success) 16%, white);
  color: var(--state-success);
}

.chip-warning {
  background: color-mix(in srgb, var(--state-warning) 16%, white);
  color: var(--state-warning);
}

.chip-error {
  background: color-mix(in srgb, var(--state-error) 16%, white);
  color: var(--state-error);
}

.chip-info {
  background: color-mix(in srgb, var(--state-info) 16%, white);
  color: var(--state-info);
}

.note {
  font-size: var(--fs-body-sm);
}

@media (max-width: 640px) {
  .page-shell {
    width: min(100% - 1rem, 860px);
    margin-top: var(--space-6);
  }

  .card {
    padding: var(--space-5);
  }
}
</style>
