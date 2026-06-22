<script setup></script>

<template>
  <section id="gallery" class="sec sec-alt py-5">
    <div class="container py-4">
      <div class="text-center mb-5 gallery-head">
        <h2 class="display-5 fw-normal mt-2 text-white sec-title">Visit the <em>Past</em></h2>
        <p class="mx-auto sub" style="max-width: 600px;">
          Preserved relics from the early Philippine internet. Each artifact is a window
          into a world before the algorithm took over.
        </p>
      </div>

      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center">
        
        <div class="col">
          <div class="card h-100 border-0 shadow-sm artifact-card">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex justify-content-end align-items-center small mb-3 card-num">
                <span class="card-era">c. 2002 – 2011</span>
              </div>
              <div class="card-img-holder rounded overflow-hidden mb-3">
                <img src="../assets/images/friendster.webp" alt="Friendster profile screenshot from mid 2000s">
              </div>
              <h3 class="card-title h4 mb-2 text-white card-name">Friendster.com</h3>
              <p class="card-text small flex-grow-1 card-desc">
                Before Facebook rewired the world, Friendster was where Filipinos built
                their first digital social lives — complete with glittery profile layouts
                and "Testimonials" from barkada.
              </p>
              <div class="mb-4 d-flex flex-wrap gap-1 card-tags">
                <span class="tag">Social Media</span>
                <span class="tag">Filipino Culture</span>
                <span class="tag">2000s</span>
              </div>
              <router-link :to="{ name: 'Exhibits' }" class="card-cta btn-sm w-100 mt-auto py-2 d-block text-center text-decoration-none">View Exhibit →</router-link>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card h-100 border-0 shadow-sm artifact-card">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex justify-content-end align-items-center small mb-3 card-num">
                <span class="card-era">c. 2000 – Present</span>
              </div>
              <div class="card-img-holder rounded overflow-hidden mb-3">
                <img src="../assets/images/pinoyexchange.webp" alt="PinoyExchange forum layout screenshot">
              </div>
              <h3 class="card-title h4 mb-2 text-white card-name">PinoyExchange.com</h3>
              <p class="card-text small flex-grow-1 card-desc">
                The digital town square for Filipinos. From political debate to Buhay Pinoy
                threads, PEx is where generations of Filipinos argued, laughed, and found
                community online.
              </p>
              <div class="mb-4 d-flex flex-wrap gap-1 card-tags">
                <span class="tag">Forum</span>
                <span class="tag">Community</span>
                <span class="tag">Taglish</span>
              </div>
              <router-link :to="{ name: 'Exhibits' }" class="card-cta btn-sm w-100 mt-auto py-2 d-block text-center text-decoration-none">View Exhibit →</router-link>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card h-100 border-0 shadow-sm artifact-card">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex justify-content-end align-items-center small mb-3 card-num">
                <span class="card-era">c. 2000s</span>
              </div>
              <div class="card-img-holder rounded overflow-hidden mb-3">
                <img src="../assets/images/sfogs.jpg" alt="Singapore's First Online Ghost Stories homepage screenshot">
              </div>
              <h3 class="card-title h4 mb-2 text-white card-name">SFOGS.com</h3>
              <p class="card-text small flex-grow-1 card-desc">
                Singapore's First Online Ghost Stories — a landmark of Southeast Asian
                internet horror. Its user-submitted tales became regional legends passed
                around in hushed whispers.
              </p>
              <div class="mb-4 d-flex flex-wrap gap-1 card-tags">
                <span class="tag">Horror</span>
                <span class="tag">SEA Culture</span>
                <span class="tag">Folklore</span>
              </div>
              <router-link :to="{ name: 'Exhibits' }" class="card-cta btn-sm w-100 mt-auto py-2 d-block text-center text-decoration-none">View Exhibit →</router-link>
            </div>
          </div>
        </div>

      </div>

      <div class="text-center mt-5">
        <router-link :to="{ name: 'Exhibits' }" class="btn btn-outline px-4 py-2">View More Artifacts</router-link>
      </div>
    </div>
  </section>
</template>