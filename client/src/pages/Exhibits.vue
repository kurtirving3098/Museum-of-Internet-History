<script setup>
  import { ref, onMounted } from 'vue';
  import { exhibitApi } from '@/api';

  // ─── Hero (Featured) State ───────────────────────────────────────────────
  const heroExhibit   = ref(null);
  const loadingHero    = ref(true);

  // ─── Grid State ───────────────────────────────────────────────────────────
  const gridExhibits  = ref([]);
  const loadingGrid    = ref(true);

  const GRID_SIZE = 6;

  // ─── Load hero ──────────────────────────────────────────────────────────────
  const loadHero = async () => {
    loadingHero.value = true;
    try {
      const { data } = await exhibitApi.list({ featured: true, page_size: 1 });
      const exhibits = data.data?.exhibits || [];
      heroExhibit.value = exhibits[0] || null;
    } catch (error) {
      heroExhibit.value = null;
    } finally {
      loadingHero.value = false;
    }
  };

  // ─── Load grid ──────────────────────────────────────────────────────────────
  const loadGrid = async () => {
    loadingGrid.value = true;
    try {
      const { data } = await exhibitApi.list({ page_size: GRID_SIZE + 1 });
      let exhibits = data.data?.exhibits || [];

      if (heroExhibit.value) {
        exhibits = exhibits.filter(e => e._id !== heroExhibit.value._id);
      }

      gridExhibits.value = exhibits.slice(0, GRID_SIZE);
    } catch (error) {
      gridExhibits.value = [];
    } finally {
      loadingGrid.value = false;
    }
  };

  onMounted(async () => {
    await loadHero();
    await loadGrid();
  });
</script>

<template>
  <div class="exhibits-page">

    <!-- ── BANNER SECTION ── -->
    <header class="banner-section pt-5 pb-2">
      <div class="container-fluid px-4 px-md-5">
        <div class="exhibits-banner d-flex align-items-center justify-content-center text-center">
          <h1 class="banner-title">EXHIBITS</h1>
        </div>
      </div>
    </header>

    <section class="hero-section">
      <div class="container-fluid px-4 px-md-5 py-4">

        <div v-if="loadingHero" class="hero-card d-flex align-items-center justify-content-center">
          <div class="spinner-border text-light" role="status"></div>
        </div>

        <div v-else-if="!heroExhibit" class="hero-card hero-empty d-flex flex-column align-items-center justify-content-center text-center">
          <i class="bi bi-stars display-4 mb-3" style="color: var(--gold-box);"></i>
          <h2 class="hero-empty-title mb-2">No Featured Exhibit Yet</h2>
          <p class="hero-empty-text mb-0">
            Check back soon — the museum's curators are still selecting this season's centerpiece.
          </p>
        </div>

        <router-link
          v-else
          :to="{ name: 'ExhibitDetail', params: { id: heroExhibit._id } }"
          class="hero-card hero-filled text-decoration-none d-block"
        >
          <div class="row g-0 h-100">
            <div class="col-md-6 hero-image-col">
              <img
                v-if="heroExhibit.thumbnail"
                :src="heroExhibit.thumbnail"
                :alt="heroExhibit.name"
                class="hero-image"
              >
              <div v-else class="hero-image hero-image-placeholder d-flex align-items-center justify-content-center">
                <i class="bi bi-image display-1"></i>
              </div>
            </div>
            <div class="col-md-6 d-flex flex-column justify-content-center p-4 p-md-5">
              <span class="hero-eyebrow mb-2">
                <i class="bi bi-star-fill me-1"></i> Featured Exhibit
              </span>
              <h1 class="hero-title mb-3">{{ heroExhibit.name }}</h1>
              <p class="hero-description mb-4">{{ heroExhibit.description }}</p>
              <div class="hero-meta d-flex flex-wrap gap-2 align-items-center">
                <span v-if="heroExhibit.era" class="badge bg-custom-pill">{{ heroExhibit.era }}</span>
                <span class="badge bg-custom-author">Credited to {{ heroExhibit.credited_to }}</span>
              </div>
            </div>
          </div>
        </router-link>

      </div>
    </section>

    <section class="grid-section">
      <div class="container-fluid px-4 px-md-5 pb-5">
        <h2 class="grid-heading mb-4">From the Collection</h2>

        <div v-if="loadingGrid" class="text-center py-5">
          <div class="spinner-border text-light" role="status"></div>
        </div>

        <div v-else-if="gridExhibits.length === 0" class="empty-grid-card p-5 text-center">
          <i class="bi bi-archive display-4 mb-3 d-block" style="color: var(--gold-box);"></i>
          <p class="mb-0 theme-body-text">No exhibits have been curated yet. Check back soon.</p>
        </div>

        <div v-else class="row g-4">
          <div
            v-for="exhibit in gridExhibits"
            :key="exhibit._id"
            class="col-12 col-sm-6 col-lg-4"
          >
            <router-link
              :to="{ name: 'ExhibitDetail', params: { id: exhibit._id } }"
              class="exhibit-card text-decoration-none d-block h-100"
            >
              <div class="exhibit-card-image-wrap">
                <img
                  v-if="exhibit.thumbnail"
                  :src="exhibit.thumbnail"
                  :alt="exhibit.name"
                  class="exhibit-card-image"
                >
                <div v-else class="exhibit-card-image exhibit-card-placeholder d-flex align-items-center justify-content-center">
                  <i class="bi bi-image fs-1"></i>
                </div>
              </div>
              <div class="p-4">
                <h3 class="exhibit-card-title mb-1">{{ exhibit.name }}</h3>
                <div class="d-flex flex-wrap gap-2 mt-3">
                  <span v-if="exhibit.era" class="badge bg-custom-pill">{{ exhibit.era }}</span>
                  <span class="badge bg-custom-author">{{ exhibit.credited_to }}</span>
                </div>
              </div>
            </router-link>
          </div>
        </div>

      </div>
    </section>

  </div>
</template>

<style scoped>
.exhibits-page {
  min-height: calc(100vh - 130px);
}

/* ── BANNER ── */
.exhibits-banner {
  background: transparent;
  border: var(--b-thick);
  padding: 3rem 1rem;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
}

.banner-title {
  font-family: var(--f-classic);
  color: var(--gold-box); /* Changed to gold */
  font-size: clamp(3.5rem, 8vw, 6rem); 
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8); /* Darkened the shadow to make the gold pop */
}

/* ── HERO ── */
.hero-card {
  min-height: 420px;
  background: transparent;
  border: var(--b-thick);
  overflow: hidden;
}

.hero-empty {
  /* Inherits transparent background and thick border from .hero-card */
}

.hero-empty-title {
  font-family: var(--f-classic);
  color: var(--text-pure);
}

.hero-empty-text {
  color: #ffffff;
  max-width: 420px;
}

.hero-filled {
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero-filled:hover {
  transform: translate(-4px, -4px);
  box-shadow: 6px 6px 0px var(--gold-box);
}

.hero-image-col {
  min-height: 320px;
  border-right: var(--b-thick);
}

/* Switches to a bottom border when stacking on mobile view */
@media (max-width: 767px) {
  .hero-image-col {
    border-right: none;
    border-bottom: var(--b-thick);
  }
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-image-placeholder {
  background: rgba(18, 18, 23, 0.5);
  color: rgba(212, 175, 55, 0.4);
  min-height: 320px;
}

.hero-eyebrow {
  color: var(--gold-box);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-title {
  font-family: var(--f-classic);
  color: var(--text-pure);
  font-size: 2.25rem;
}

.hero-description {
  color: #ffffff;
  line-height: 1.6;
}

/* ── GRID ── */
.grid-heading {
  font-family: var(--f-classic);
  color: var(--text-pure);
  border-left: 3px solid var(--gold-box);
  padding-left: 12px;
}

.empty-grid-card {
  background: transparent;
  border: var(--b-thick);
}

.theme-body-text {
  color: #ffffff;
}

.exhibit-card {
  background: transparent;
  border: var(--b-thick);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.exhibit-card:hover {
  transform: translate(-4px, -4px);
  box-shadow: 6px 6px 0px var(--gold-box);
}

.exhibit-card-image-wrap {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-bottom: var(--b-thick);
}

.exhibit-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.exhibit-card-placeholder {
  background: rgba(18, 18, 23, 0.5);
  color: rgba(212, 175, 55, 0.4);
}

.exhibit-card-title {
  font-family: var(--f-classic);
  color: var(--text-pure);
  font-size: 1.1rem;
}

/* ── SHARED BADGES (matches ExhibitDetail.vue) ── */
.bg-custom-author {
  background-color: rgba(212, 175, 55, 0.12) !important;
  border: 1px solid var(--gold-box);
  color: var(--gold-box) !important;
}

.bg-custom-pill {
  background-color: transparent !important;
  border: var(--b-thin);
  color: #ffffff !important;
}
</style>