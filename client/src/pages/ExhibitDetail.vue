<script setup>
  import { ref, onMounted, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { exhibitApi } from '@/api';

  const route = useRoute();

  const exhibit  = ref(null);
  const loading  = ref(true);
  const notFound = ref(false);

  const loadExhibit = async (id) => {
    loading.value  = true;
    notFound.value = false;
    exhibit.value  = null;

    try {
      const { data } = await exhibitApi.getById(id);
      exhibit.value = data.data;
    } catch (error) {
      // Covers both a malformed id and a genuinely missing/hidden exhibit —
      // the backend returns a 404 for either, so there's nothing more
      // specific to distinguish here.
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => loadExhibit(route.params.id));

  // Re-fetch if navigating directly from one exhibit detail page to another
  // (e.g. a "related exhibits" link) without an intermediate route change.
  watch(() => route.params.id, (newId) => {
    if (newId) loadExhibit(newId);
  });
</script>

<template>
  <div class="detail-page">
    <div class="container px-4 py-5" style="max-width: 900px;">

      <router-link :to="{ name: 'Exhibits' }" class="back-link mb-4 d-inline-flex align-items-center text-decoration-none">
        <i class="bi bi-arrow-left me-2"></i> Back to the Collection
      </router-link>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-light" role="status"></div>
      </div>

      <div v-else-if="notFound" class="not-found-card p-5 text-center">
        <i class="bi bi-emoji-frown display-3 mb-3 d-block" style="color: var(--gold-box);"></i>
        <h2 class="not-found-title mb-2">Exhibit Not Found</h2>
        <p class="not-found-text mb-4">
          This exhibit may have been removed from the gallery, or the link may be incorrect.
        </p>
        <router-link :to="{ name: 'Exhibits' }" class="btn btn-outline-primary">
          Return to the Collection
        </router-link>
      </div>

      <article v-else-if="exhibit" class="exhibit-detail-card">
        <div class="detail-image-wrap">
          <img
            v-if="exhibit.thumbnail"
            :src="exhibit.thumbnail"
            :alt="exhibit.name"
            class="detail-image"
          >
          <div v-else class="detail-image detail-image-placeholder d-flex align-items-center justify-content-center">
            <i class="bi bi-image display-1"></i>
          </div>
        </div>

        <div class="p-4 p-md-5">
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="badge bg-custom-pill">Exhibit #{{ exhibit.exhibit_number }}</span>
            <span v-if="exhibit.era" class="badge bg-custom-pill">{{ exhibit.era }}</span>
            <span v-if="exhibit.featured" class="badge" style="background-color: var(--gold-box); color: #3e2723;">
              <i class="bi bi-star-fill me-1"></i> Featured
            </span>
          </div>

          <h1 class="detail-title mb-3">{{ exhibit.name }}</h1>

          <p class="detail-description mb-4">{{ exhibit.description }}</p>

          <div v-if="exhibit.wayback_url" class="wayback-link-block mb-4">
            <a
              :href="exhibit.wayback_url"
              target="_blank"
              rel="noopener"
              class="wayback-link"
            >
              <i class="bi bi-archive me-2"></i>View Archived Page
              <i class="bi bi-box-arrow-up-right ms-1 small"></i>
            </a>
          </div>

          <div v-if="(exhibit.tags || []).length > 0" class="d-flex flex-wrap gap-2 mb-4">
            <span v-for="tag in exhibit.tags" :key="tag" class="badge bg-custom-author">
              #{{ tag }}
            </span>
          </div>

          <div class="detail-credit pt-3">
            <i class="bi bi-person-circle me-2"></i>
            Credited to <strong>{{ exhibit.credited_to }}</strong>
          </div>
        </div>
      </article>

    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: calc(100vh - 130px);
}

.back-link {
  color: var(--gold-box);
  font-weight: 600;
}

.back-link:hover {
  color: var(--text-pure);
}

.not-found-card,
.exhibit-detail-card {
  background: transparent;
  border: var(--b-thick);
  overflow: hidden;
}

.not-found-title {
  font-family: var(--f-classic);
  color: var(--text-pure);
}

.not-found-text {
  color: #ffffff;
}

.detail-image-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: var(--b-thick);
}

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-image-placeholder {
  background: rgba(18, 18, 23, 0.5);
  color: rgba(212, 175, 55, 0.4);
}

.detail-title {
  font-family: var(--f-classic);
  color: var(--text-pure);
  font-size: 2rem;
}

.detail-description {
  color: #ffffff;
  line-height: 1.7;
  font-size: 1.05rem;
}

.detail-credit {
  color: #ffffff;
  border-top: var(--b-thin);
}

.wayback-link-block {
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  background: rgba(60, 38, 22, 0.5);
  display: inline-block;
}

.wayback-link {
  color: var(--gold-box);
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
}

.wayback-link:hover {
  color: #f4e0b9;
}

/* ── SHARED BADGES (matches Exhibits.vue / UserProfile.vue) ── */
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