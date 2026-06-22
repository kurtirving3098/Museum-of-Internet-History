<script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useGlobalStore } from '@/stores/globalStore';

  const router      = useRouter();
  const globalStore = useGlobalStore();

  const username        = ref('');
  const email           = ref('');
  const password        = ref('');
  const confirmPassword = ref('');
  const errorMsg        = ref('');
  const submitting      = ref(false);

  const handleSubmit = async () => {
    errorMsg.value = '';

    if (!username.value || !email.value || !password.value || !confirmPassword.value) {
      errorMsg.value = 'All fields are required.';
      return;
    }

    if (password.value.length < 8) {
      errorMsg.value = 'Password must be at least 8 characters.';
      return;
    }

    // Client-side only — the backend does not require or check this field.
    if (password.value !== confirmPassword.value) {
      errorMsg.value = 'Passwords do not match.';
      return;
    }

    submitting.value = true;
    try {
      await globalStore.register({
        username: username.value,
        email:    email.value,
        password: password.value,
      });

      // Register does not log the user in (no token returned), so send them
      // to Login rather than Home.
      router.push('/login');
    } catch (error) {
      errorMsg.value = error.response?.data?.message || 'Registration failed. Please try again.';
    } finally {
      submitting.value = false;
    }
  };
</script>

<template>
  <div class="auth-page d-flex align-items-center">
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-9 col-md-7 col-lg-5">

          <div class="text-center mb-5">
            <span class="small tracking-wider fw-bold lbl">JOIN THE DIG</span>
            <h1 class="display-6 fw-normal mt-2 text-white sec-title">Create an <em>Account</em></h1>
          </div>

          <div class="auth-card p-4 p-md-5">
            <div v-if="errorMsg" class="auth-alert mb-4" role="alert">
              {{ errorMsg }}
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="username" class="form-lbl small fw-bold text-uppercase tracking-wider">Username</label>
                <input
                  id="username"
                  type="text"
                  class="form-input"
                  v-model="username"
                  placeholder="Juan dela Cruz"
                  required
                >
              </div>

              <div class="mb-3">
                <label for="email" class="form-lbl small fw-bold text-uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  type="email"
                  class="form-input"
                  v-model="email"
                  placeholder="you@example.com"
                  required
                >
              </div>

              <div class="mb-3">
                <label for="password" class="form-lbl small fw-bold text-uppercase tracking-wider">Password</label>
                <input
                  id="password"
                  type="password"
                  class="form-input"
                  v-model="password"
                  placeholder="At least 8 characters"
                  required
                >
              </div>

              <div class="mb-4">
                <label for="confirmPassword" class="form-lbl small fw-bold text-uppercase tracking-wider">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  class="form-input"
                  v-model="confirmPassword"
                  placeholder="Re-enter your password"
                  required
                >
              </div>

              <button type="submit" class="form-submit w-100 py-3 fw-bold text-uppercase tracking-wider" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ submitting ? 'Registering...' : 'Register' }}
              </button>
            </form>

            <p class="text-center mt-4 mb-0 auth-footer-text">
              Already have an account?
              <router-link to="/login" class="auth-link">Log in here</router-link>
            </p>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 130px);
}

.auth-card {
  border: var(--b-thick);
  background: transparent;
}

.auth-alert {
  border: 1px solid var(--accent-coral);
  background: rgba(200, 83, 28, 0.12);
  color: var(--text-pure);
  padding: 0.9rem 1.2rem;
  font-size: 0.9rem;
}

.auth-footer-text {
  color: #ffffff;
  font-size: 0.95rem;
}

.auth-link {
  color: var(--gold-box);
  font-weight: 700;
  text-decoration: underline;
}

.auth-link:hover {
  color: var(--text-pure);
}
</style>