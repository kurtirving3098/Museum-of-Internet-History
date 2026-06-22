<script setup>
  import { ref, onMounted, computed } from 'vue';
  import * as bootstrap from 'bootstrap';
  import { useGlobalStore } from '@/stores/globalStore';

  const globalStore = useGlobalStore();

  // ─── Subscribe Modal — two steps: choose duration, then payment method ────
  const subscribeModalRef = ref(null);
  let subscribeModalInstance = null;

  const STEP_DURATION = 'duration';
  const STEP_PAYMENT   = 'payment';
  const currentStep    = ref(STEP_DURATION);

  const selectedPlan   = ref(null); // 'monthly' | 'yearly'
  const selectedMethod = ref(null); // 'debit' | 'credit' | 'paypal'

  const PRICES = {
    monthly: { amount: 10,  label: '$10', period: 'per month' },
    yearly:  { amount: 120, label: '$120', period: 'per year' },
  };

  const selectedPriceLabel = computed(() => {
    if (!selectedPlan.value) return '';
    return PRICES[selectedPlan.value].label;
  });

  const openSubscribeModal = () => {
    currentStep.value    = STEP_DURATION;
    selectedPlan.value   = null;
    selectedMethod.value = null;

    if (!subscribeModalInstance && subscribeModalRef.value) {
      subscribeModalInstance = new bootstrap.Modal(subscribeModalRef.value);
    }
    subscribeModalInstance?.show();
  };

  const chooseDuration = (plan) => {
    selectedPlan.value = plan;
    currentStep.value  = STEP_PAYMENT;
  };

  const backToDuration = () => {
    currentStep.value    = STEP_DURATION;
    selectedMethod.value = null;
  };

  const choosePaymentMethod = (method) => {
    selectedMethod.value = method;
  };

  const confirmPayment = async () => {
    if (!selectedPlan.value || !selectedMethod.value) return;

    const success = await globalStore.subscribeToPlan(selectedPlan.value);
    if (success) {
      subscribeModalInstance?.hide();
    }
  };

  // ─── Cancel (for already-paid users) ───────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm('Cancel your membership? You will lose paid-tier access immediately.')) return;
    await globalStore.cancelSubscription();
  };

  const isPaid = computed(() => globalStore.user?.tier === 'paid');

  onMounted(() => {
    globalStore.fetchPlans();
  });
</script>

<template>
  <section id="membership" class="sec py-5">
    <div class="container py-4">
      <div class="text-center mb-5">
        <span class="small tracking-wider fw-bold lbl">MEMBERSHIP</span>
        <h2 class="display-5 fw-normal mt-2 text-white sec-title">Join the <em>Dig</em></h2>
        <p class="sub mx-auto" style="max-width: 600px;">
          Become a certified Internet Archaeologist and help decide what gets preserved for future generations.
        </p>
      </div>

      <div class="row row-cols-1 row-cols-md-2 g-4 justify-content-center mx-auto" style="max-width: 900px;">

        <div class="col">
          <div class="plan h-100 p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="h5 fw-bold text-uppercase tracking-wider text-white-50">Explorer</div>
              <div class="display-4 fw-bold my-3 text-white plan-price">Free</div>
              <p class="small mb-4 plan-blurb">Start your journey into digital archaeology at no cost.</p>
              <hr class="border-secondary">
              <ul class="list-unstyled d-flex flex-column gap-2 my-4 small plan-features">
                <li>Digging Tool limited to 5 uses per day</li>
                <li>Submit one artifact find for curation per day</li>
                <li>Read-only access to the Archaeologists Forum</li>
              </ul>
            </div>
            <button v-if="isPaid" class="plan-btn ghost w-100 py-2 mt-3" @click="handleCancel">
              Downgrade to Free
            </button>
            <span v-else class="plan-btn ghost w-100 py-2 mt-3 d-block text-center" style="opacity: 0.6; cursor: default;">
              Current Plan
            </span>
          </div>
        </div>

        <div class="col">
          <div class="plan highlight h-100 p-4 d-flex flex-column justify-content-between position-relative shadow-lg">
            <span class="plan-badge tracking-wider small">RECOMMENDED</span>
            <div>
              <div class="h5 fw-bold text-uppercase tracking-wider text-white-50">Certified Archaeologist</div>
              <div class="display-4 fw-bold my-3 text-white plan-price">$10<sub>/mo</sub></div>
              <p class="small mb-2 plan-blurb">For serious preservationists committed to the historical record.</p>
              <p class="small mb-4 plan-blurb" style="opacity: 0.7;">Or $120 billed yearly.</p>
              <hr class="border-secondary">
              <ul class="list-unstyled d-flex flex-column gap-2 my-4 small plan-features">
                <li>Unlimited use of the Digging Tool</li>
                <li>Submit up to 5 artifact finds per day</li>
                <li>Priority review queue over free-tier submissions</li>
                <li>Post and reply in the Archaeologists Forum</li>
                <li>Username credited in gallery if your find is selected</li>
              </ul>
            </div>
            <button v-if="isPaid" class="plan-btn solid w-100 py-2 mt-3" style="opacity: 0.6; cursor: default;" disabled>
              Current Plan
            </button>
            <button v-else class="plan-btn solid w-100 py-2 mt-3" @click="openSubscribeModal">
              Subscribe Now
            </button>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- ── SUBSCRIBE MODAL (Duration -> Payment) ─────────────────────── -->
  <div
    class="modal fade"
    ref="subscribeModalRef"
    tabindex="-1"
    aria-labelledby="subscribeModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" style="background-color: #f4ebd8; border: 1px solid #c2b29f;">
        <div class="modal-header border-bottom-0">
          <h5 class="modal-title" id="subscribeModalLabel" style="font-family: 'Georgia', serif; color: #3e2723; text-transform: uppercase;">
            <span v-if="currentStep === 'duration'">Choose Your Plan</span>
            <span v-else>Payment Method</span>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body pt-0">

          <!-- ── STEP 1: Duration ──────────────────────────────────────── -->
          <div v-if="currentStep === 'duration'">
            <p class="text-dark small mb-4">
              How would you like to be billed?
            </p>

            <div class="d-flex flex-column gap-3">
              <button
                type="button"
                class="duration-option text-start p-3"
                @click="chooseDuration('monthly')"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-dark">Monthly</span>
                  <span class="fw-bold text-dark">$10<span class="small fw-normal">/mo</span></span>
                </div>
                <div class="text-muted small mt-1">Billed every month, cancel anytime.</div>
              </button>

              <button
                type="button"
                class="duration-option text-start p-3"
                @click="chooseDuration('yearly')"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-dark">Yearly</span>
                  <span class="fw-bold text-dark">$120<span class="small fw-normal">/yr</span></span>
                </div>
                <div class="text-muted small mt-1">Billed once a year.</div>
              </button>
            </div>
          </div>

          <!-- ── STEP 2: Payment Method ────────────────────────────────── -->
          <div v-else>
            <div class="mb-4 p-3 rounded" style="background-color: #e0d4c3; border: 1px solid #c2b29f;">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-dark fw-semibold">{{ selectedPlan === 'monthly' ? 'Monthly Membership' : 'Yearly Membership' }}</span>
                <span class="text-dark fw-bold">{{ selectedPriceLabel }}</span>
              </div>
            </div>

            <p class="text-dark small mb-3">Select a payment method</p>

            <div class="d-flex flex-column gap-3 mb-4">
              <button
                type="button"
                class="payment-option text-start p-3 d-flex align-items-center gap-3"
                :class="{ 'payment-option-selected': selectedMethod === 'debit' }"
                @click="choosePaymentMethod('debit')"
              >
                <i class="bi bi-credit-card fs-4 text-dark"></i>
                <span class="fw-semibold text-dark">Debit Card</span>
              </button>

              <button
                type="button"
                class="payment-option text-start p-3 d-flex align-items-center gap-3"
                :class="{ 'payment-option-selected': selectedMethod === 'credit' }"
                @click="choosePaymentMethod('credit')"
              >
                <i class="bi bi-credit-card-2-front fs-4 text-dark"></i>
                <span class="fw-semibold text-dark">Credit Card</span>
              </button>

              <button
                type="button"
                class="payment-option text-start p-3 d-flex align-items-center gap-3"
                :class="{ 'payment-option-selected': selectedMethod === 'paypal' }"
                @click="choosePaymentMethod('paypal')"
              >
                <i class="bi bi-paypal fs-4 text-dark"></i>
                <span class="fw-semibold text-dark">PayPal</span>
              </button>
            </div>

            <div class="d-flex justify-content-between gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="backToDuration">
                Back
              </button>
              <button
                type="button"
                class="btn btn-primary flex-grow-1"
                :disabled="!selectedMethod || globalStore.subscribing"
                @click="confirmPayment"
              >
                <span v-if="globalStore.subscribing" class="spinner-border spinner-border-sm me-2"></span>
                Confirm Payment
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.duration-option,
.payment-option {
  background: #ffffff;
  border: 2px solid #c2b29f;
  border-radius: 4px;
  transition: all 0.15s ease;
  width: 100%;
}

.duration-option:hover,
.payment-option:hover {
  border-color: var(--gold-box);
  background: #faf3e3;
}

.payment-option-selected {
  border-color: var(--gold-box) !important;
  background: #faf3e3;
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3);
}
</style>