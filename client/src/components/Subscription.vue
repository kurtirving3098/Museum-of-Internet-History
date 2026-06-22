<script setup>
import { useRouter } from 'vue-router';
import { useGlobalStore } from '@/stores/globalStore';

const router = useRouter();
const globalStore = useGlobalStore();

const handleSubscribeClick = () => {
  if (globalStore.isAuthenticated) {
    router.push('/subscription');
  } else {
    router.push('/login');
  }
};
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
            <button @click="router.push('/register')" class="plan-btn ghost w-100 py-2 mt-3">Start for Free</button>
          </div>
        </div>

        <div class="col">
          <div class="plan highlight h-100 p-4 d-flex flex-column justify-content-between position-relative shadow-lg">
            <span class="plan-badge tracking-wider small">RECOMMENDED</span>
            <div>
              <div class="h5 fw-bold text-uppercase tracking-wider text-white-50">Certified Archaeologist</div>
              <div class="display-4 fw-bold my-3 text-white plan-price">$10<sub>/mo</sub></div>
              <p class="small mb-4 plan-blurb">For serious preservationists committed to the historical record.</p>
              <hr class="border-secondary">
              <ul class="list-unstyled d-flex flex-column gap-2 my-4 small plan-features">
                <li>Unlimited use of the Digging Tool</li>
                <li>Submit up to 5 artifact finds per day</li>
                <li>Priority review queue over free-tier submissions</li>
                <li>Post and reply in the Archaeologists Forum</li>
                <li>Username credited in gallery if your find is selected</li>
              </ul>
            </div>
            <button @click="handleSubscribeClick" class="plan-btn solid w-100 py-2 mt-3">Subscribe Now</button>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>