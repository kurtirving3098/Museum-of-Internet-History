<script setup>
import { ref } from 'vue';

// ─── Form state ───────────────────────────────────────────────────────────
// Bound via v-model purely so handleSubmit can clear the fields after
// "sending" — there's no real backend call here (web3forms integration is
// future work), this just simulates a successful send for now.
const name    = ref('');
const email   = ref('');
const message = ref('');

// ─── Toast state ──────────────────────────────────────────────────────────
const showToast = ref(false);
let toastTimer   = null;

const handleSubmit = () => {
  // No actual network request — see note above. Just clear the form and
  // show a success toast so the UI doesn't feel broken while the real
  // integration is pending.
  name.value    = '';
  email.value   = '';
  message.value = '';

  showToast.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { showToast.value = false; }, 3000);
};
</script>

<template>
  <section id="contact" class="sec py-5">
    <div class="container py-4">
      <div class="row contact-grid g-5">
        
        <div class="col-md-5">
          <span class="small tracking-wider fw-bold lbl">CONTACT</span>
          <h2 class="display-5 fw-normal mt-2 mb-3 text-white sec-title">Tell us what you <em>Think</em></h2>
          <p class="sub">
            Found an artifact we've missed? Have a suggestion? Want to contribute to
            the archive? We'd love to hear from you.
          </p>
        </div>

        <div class="col-md-7">
          <form @submit.prevent="handleSubmit" class="p-4 rounded border-gold-box">
            <div class="form-row mb-3">
              <label class="form-lbl small fw-bold text-uppercase tracking-wider">Your Name</label>
              <input v-model="name" type="text" class="form-input form-control-lg fs-6" placeholder="Juan dela Cruz">
            </div>
            <div class="form-row mb-3">
              <label class="form-lbl small fw-bold text-uppercase tracking-wider">Email Address</label>
              <input v-model="email" type="email" class="form-input form-control-lg fs-6" placeholder="you@example.com">
            </div>
            <div class="form-row mb-4">
              <label class="form-lbl small fw-bold text-uppercase tracking-wider">Message</label>
              <textarea v-model="message" class="form-area form-control-lg fs-6" rows="4" placeholder="Tell us about an artifact you remember..."></textarea>
            </div>
            <button type="submit" class="form-submit w-100 py-3 fw-bold text-uppercase tracking-wider">Send Message</button>
          </form>
        </div>

      </div>
    </div>

    <!-- ── Toast notification ──────────────────────────────────────────────
         Lightweight, self-contained — no external toast library. Fixed to
         the viewport corner, auto-dismisses after 3s. -->
    <Transition name="toast-fade">
      <div v-if="showToast" class="contact-toast" role="status">
        <span class="contact-toast-icon">✓</span>
        Message sent
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.contact-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #1f9d55;
  color: #ffffff;
  font-family: var(--f-modern);
  font-size: 0.95rem;
  font-weight: 700;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.contact-toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 0.85rem;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>