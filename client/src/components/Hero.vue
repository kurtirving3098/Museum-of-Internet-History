<script setup></script>

<template>
  <section id="hero" class="py-5 my-md-4 text-center">
    <div class="container py-5">
      <h1 class="display-4 fw-normal mb-4 text-white hero-h1">
        Museum of <br class="d-md-none"><em class="font-serif " style="text-underline-offset: 8px;">Internet History</em>
      </h1>
      <div class="hero-sub mx-auto mb-4" style="max-width: 750px;">
        <p style="color: #ffffff !important; font-size: 1.2rem; line-height: 1.7; margin-bottom: 1.5rem;">
          Servers shut down. Files corrupt. Websites vanish without a trace.<br>
          We build the tools to uncover the remnants of these forgotten spaces.
        </p>
          
        <p class="fw-bold" style="color:#f3b61f !important; font-size: 1.15rem; letter-spacing: 0.02em;">
          Every dead link had a story. Let us tell their forgotten story.
        </p>
      </div>
      <div class="d-flex flex-column flex-sm-row justify-content-center gap-3 px-3">
        <router-link to="/dig"><button class="btn btn-coral btn-lg px-4 fs-6">Start Digging Now</button></router-link>
        <!-- Replaced document.getElementById with a standard anchor hash link behavior for Vue -->
        <a href="#gallery" class="btn btn-outline btn-lg px-4 fs-6 d-flex align-items-center justify-content-center text-decoration-none">View Gallery</a>
      </div>
    </div>
  </section>
</template>