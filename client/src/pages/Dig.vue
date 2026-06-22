<script setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { useGlobalStore } from '@/stores/globalStore';
  import * as bootstrap from 'bootstrap';

  const globalStore = useGlobalStore();

  // ─── Tabs ─────────────────────────────────────────────────────────────
  const activeTab = ref('search'); // 'search' | 'discover'

  // ─── Search form state ───────────────────────────────────────────────
  const searchForm = reactive({
    domain:      'friendster.com',
    url_keyword: '',
    date_from:   '',
    date_to:     '',
    mime_type:   'html',
    status_code: '200', // Changed from '' to '200' for the new default
  });

  const MIME_OPTIONS = [
    { value: 'html',  label: 'HTML pages' },
    { value: 'jpeg',  label: 'JPEG images' },
    { value: 'gif',   label: 'GIF images' },
    { value: 'png',   label: 'PNG images' },
    { value: 'flash', label: 'Flash (.swf)' },
    { value: 'text',  label: 'Plain text' },
  ];

  const handleSearch = async () => {
    if (!searchForm.domain || !searchForm.domain.trim()) return;

    const filters = {
      domain:      searchForm.domain,
      url_keyword: searchForm.url_keyword || null,
      date_from:   searchForm.date_from   || null,
      date_to:     searchForm.date_to     || null,
      mime_type:   searchForm.mime_type,
      status_code: searchForm.status_code || null,
      page:        0,
    };

    try {
      await globalStore.searchDig(filters);
    } catch {
      // Error toast already handled in the store action.
    }
  };

  const handlePageChange = async (direction) => {
    if (!globalStore.digResults) return;
    const nextPage = globalStore.digResults.currentPage + direction;
    if (nextPage < 0) return;
    if (direction > 0 && !globalStore.digResults.hasNextPage) return;
    await globalStore.goToDigPage(nextPage);
  };

  // ─── Discover form state ────────────────────────────────────────────
  const discoverYear    = ref(new Date().getFullYear());
  const discoverCountry = ref('PH');
  const discoverMessage = ref('');

  const currentYear = new Date().getFullYear();

  const handleDiscover = async () => {
    discoverMessage.value = '';

    if (!discoverYear.value || discoverYear.value < 1991 || discoverYear.value > currentYear) {
      discoverMessage.value = `Enter a year between 1991 and ${currentYear}.`;
      return;
    }

    try {
      const result = await globalStore.discoverDig(discoverYear.value, discoverCountry.value);
      if (result && result.success === false) {
        discoverMessage.value = result.message || 'No captures found. Try a different year.';
      }
    } catch {
      // Error toast already handled in the store action.
    }
  };

  // ─── Save action (shared by both tabs' result cards) ────────────────
  const savedUrls = reactive(new Set());

  const handleSave = async (capture) => {
    const ok = await globalStore.saveCapture(
      capture.wayback_url,
      capture.thumbnail_url,
      capture.original_url
    );
    if (ok) savedUrls.add(capture.wayback_url);
  };

  // ─── "Dig deeper" — hand a Discover site off to Advanced Search ─────
  const digDeeper = (site) => {
    searchForm.domain = site.url;
    activeTab.value   = 'search';
  };

  // ─── Submission form state (NEW) ──────────────────────────────────────
    const submitModalRef = ref(null);
    let submitModalInstance = null;

    const selectedCapture = ref(null);
    const submittingArtifact = ref(false);

    const submissionForm = reactive({
      name: '',
      description: '',
      curation_reason: '',
    });

    const openSubmitModal = (capture) => {
      selectedCapture.value = capture;
      submissionForm.name = '';
      submissionForm.description = '';
      submissionForm.curation_reason = '';
      
      if (!submitModalInstance && submitModalRef.value) {
        submitModalInstance = new bootstrap.Modal(submitModalRef.value);
      }
      submitModalInstance?.show();
    };

    const submitForCuration = async () => {
      if (!selectedCapture.value) return;
      
      submittingArtifact.value = true;

      const payload = {
        wayback_url: selectedCapture.value.wayback_url,
        original_url: selectedCapture.value.original_url,
        // Pass the domain dynamically using your existing getHostname helper
        domain: getHostname(selectedCapture.value.original_url),
        name: submissionForm.name,
        description: submissionForm.description,
        curation_reason: submissionForm.curation_reason,
        // Note: capture_timestamp is omitted so the backend defaults it to now,
        // and thumbnail_url is strictly ignored per the backend brief.
      };

      const success = await globalStore.submitArtifact(payload);
      submittingArtifact.value = false;

      if (success) {
        submitModalInstance?.hide();
      }
    };

  // ─── Metadata card visuals ────────────────────────────────────────────
  const getHostname = (url) => {
    if (!url) return '';
    try {
      const withScheme = url.match(/^https?:\/\//i) ? url : `http://${url}`;
      return new URL(withScheme).hostname.replace(/^www\./i, '');
    } catch {
      return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    }
  };

  const getDomainLetter = (url) => {
    const hostname = getHostname(url);
    return hostname ? hostname.charAt(0).toUpperCase() : '?';
  };

  // ─── Dynamic archeology image resolution (.jpg) ────────────────────────
  // 13 Unsplash images available, no longer mapped to specific letters —
  // picked randomly per result for visual variety, but deterministically so
  // the SAME capture always shows the SAME image across re-renders/paging
  // within a session (a simple string hash of wayback_url, not Math.random,
  // so there's no extra state to track and no flicker on re-render).
  const DIG_IMAGE_FILES = [
    'AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN',
    'OP', 'QR', 'ST', 'UV', 'WX', 'YZ',
  ];

  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // force 32-bit int
    }
    return Math.abs(hash);
  };

  const getIconSrc = (capture) => {
    // Prefer the capture's own unique URL as the hash key so each result
    // gets a stable-but-varied pick. Fall back to original_url if
    // wayback_url isn't available for some reason.
    const key = capture?.wayback_url || capture?.original_url;
    if (!key) return null;

    const index = hashString(key) % DIG_IMAGE_FILES.length;
    const filename = DIG_IMAGE_FILES[index];

    return new URL(`../assets/digicons/${filename}.jpg`, import.meta.url).href;
  };



  // ─── Lifecycle ────────────────────────────────────────────────────────
  onMounted(() => {
      globalStore.fetchDigCountries();
      if (globalStore.isAuthenticated) {
        globalStore.fetchDigUsage();
      }
      
      // Initialize modal on mount if the ref exists
      if (submitModalRef.value) {
        submitModalInstance = new bootstrap.Modal(submitModalRef.value);
      }
    });
</script>

<template>
  <div class="container py-4">

    <!-- ── Page header ──────────────────────────────────────────────── -->
    <div class="dig-page-header mb-5">
      <span class="small tracking-wider fw-bold lbl">THE ARCHIVE AWAITS</span>
      <h2 class="mb-2 mt-2 sec-title">Find a <em>Lost Artifact</em></h2>
      <p class="mb-0 sub">
        Search the Wayback Machine for pages buried in time — or let Discover surface a forgotten corner of the internet you never knew existed.
      </p>

      <div v-if="globalStore.isAuthenticated && globalStore.digUsage" class="mt-3">
        <span v-if="globalStore.digUsage.limit === null" class="dig-badge dig-badge--unlimited">
          ∞ &nbsp;Unlimited digs &mdash; {{ globalStore.digUsage.tier }} tier
        </span>
        <span v-else class="dig-badge" :class="globalStore.digUsage.remaining > 0 ? 'dig-badge--ok' : 'dig-badge--empty'">
          {{ globalStore.digUsage.remaining }} of {{ globalStore.digUsage.limit }} digs remaining today
        </span>
      </div>
    </div>

    <!-- ── Guest placeholder ────────────────────────────────────────── -->
    <div v-if="!globalStore.isAuthenticated" class="dig-alert dig-alert--info">
      <router-link to="/login" class="dig-alert-link">Log in</router-link> to start digging through archived pages.
    </div>

    <template v-else>

      <!-- ── Upgrade prompt ─────────────────────────────────────────── -->
      <div
        v-if="globalStore.digUsage?.upgrade_prompt && globalStore.digUsage?.tier !== 'paid'"
        class="dig-alert dig-alert--warn mb-4"
      >
        <span>You're on your last dig for today — make it count.</span>
        <router-link to="/subscriptions/plans" class="dig-alert-link ms-2">Upgrade for unlimited access →</router-link>
      </div>

      <!-- ── Exhausted digs message ─────────────────────────────────── -->
      <div
        v-if="globalStore.digUsage && globalStore.digUsage.remaining === 0 && globalStore.digUsage.tier !== 'paid'"
        class="dig-exhausted-banner mb-4"
      >
        <div class="dig-exhausted-inner">
          <p class="dig-exhausted-title">You've reached your daily dig limit.</p>
          <p class="dig-exhausted-body">
            Your discoveries await — 
            <router-link to="/subscriptions/plans" class="dig-exhausted-link">subscribe for unlimited digs</router-link>, 
            or <router-link to="/exhibits" class="dig-exhausted-link">explore our curated gallery</router-link> in the meantime.
          </p>
        </div>
      </div>

      <!-- ── Tabs ────────────────────────────────────────────────────── -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'search' }"
            @click="activeTab = 'search'"
          >
            Digging Tool
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'discover' }"
            @click="activeTab = 'discover'"
          >
            Find New Digsites
          </button>
        </li>
      </ul>

      <!-- ── SEARCH TAB ──────────────────────────────────────────────── -->
      <div v-if="activeTab === 'search'">

        <div class="card mb-4">
          <div class="card-body">
            <div class="row g-3">

              <div class="col-12 col-md-6">
                <label class="form-label">Domain</label>
                <input
                  v-model="searchForm.domain"
                  type="text"
                  class="form-control"
                  placeholder="e.g. friendster.com, geocities.com"
                >
                <div class="mt-2 d-flex gap-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="searchForm.domain = 'friendster.com'"
                  >
                    Friendster
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="searchForm.domain = 'pinoyexchange.com'"
                  >
                    PinoyExchange
                  </button>
                </div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Keyword / path (optional)</label>
                <input
                  v-model="searchForm.url_keyword"
                  type="text"
                  class="form-control"
                  placeholder="e.g. profile/username"
                >
              </div>

              <div class="col-12 col-md-3">
                <label class="form-label">From (year &amp; month)</label>
                <input v-model="searchForm.date_from" type="month" class="form-control">
              </div>

              <div class="col-12 col-md-3">
                <label class="form-label">To (year &amp; month)</label>
                <input v-model="searchForm.date_to" type="month" class="form-control">
              </div>

              <div class="col-12 col-md-3">
                <label class="form-label">File type</label>
                <select v-model="searchForm.mime_type" class="form-select">
                  <option v-for="opt in MIME_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div class="col-12 col-md-3">
                <label class="form-label">Capture status</label>
                <select v-model="searchForm.status_code" class="form-select">
                  <option value="200">Only success (status code 200)</option>
                  <option value="">Any (including 404s)</option>
                </select>
              </div>

            </div>

            <button
              class="btn btn-primary mt-3"
              :disabled="globalStore.digSearching || !globalStore.canDig"
              @click="handleSearch"
            >
              <span v-if="globalStore.digSearching" class="spinner-border spinner-border-sm me-2"></span>
              {{ globalStore.digSearching ? 'Excavating...' : 'Excavate' }}
            </button>
          </div>
        </div>

        <!-- Results -->
        <div v-if="globalStore.digResults">

          <div v-if="globalStore.digResults.results.length === 0" class="text-center text-muted py-5">
            No captures found for these filters.
          </div>

          <div v-else class="row g-3">
            <div
              v-for="capture in globalStore.digResults.results"
              :key="capture.wayback_url"
              class="col-12 col-md-6 col-lg-4"
            >
              <div class="card h-100 shadow-sm">
                <!-- Square, Full-Bleed Image Container (No Background Color showing) -->
                <div class="position-relative overflow-hidden w-100" style="aspect-ratio: 1 / 1;">
                  <img 
                    v-if="getIconSrc(capture)"
                    :src="getIconSrc(capture)" 
                    class="w-100 h-100"
                    style="object-fit: cover;"
                    alt="Historical Site Artifact"
                  />
                  <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center bg-dark text-white fw-bold" style="font-size: 3rem;">
                    {{ getDomainLetter(capture.original_url) }}
                  </div>
                </div>
                
                <div class="card-body d-flex flex-column">
                  <p class="card-text small text-truncate mb-1" :title="capture.original_url">
                    {{ capture.original_url }}
                  </p>
                  <p class="card-text small text-muted mb-1">{{ capture.capture_date_readable }}</p>
                  <p class="card-text small text-muted mb-3">
                    {{ capture.mime_type }} · {{ capture.file_size || 'unknown size' }} · status {{ capture.status_code }}
                  </p>

                  <div class="mt-auto d-flex gap-2">
                    <a
                      :href="capture.wayback_url"
                      target="_blank"
                      rel="noopener"
                      class="btn btn-sm btn-outline-secondary flex-fill"
                    >
                      View
                    </a>
                    <button
                      class="btn btn-sm flex-fill"
                      :class="savedUrls.has(capture.wayback_url) ? 'btn-success' : 'btn-outline-primary'"
                      :disabled="savedUrls.has(capture.wayback_url)"
                      @click="handleSave(capture)"
                    >
                      {{ savedUrls.has(capture.wayback_url) ? 'Saved' : 'Save' }}
                    </button>
                  </div>

                  <button 
                    class="btn btn-sm btn-outline-secondary mt-2" 
                    title="Submit this artifact for review"
                    @click="openSubmitModal(capture)"
                  >
                    Submit for Curation
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="globalStore.digResults.currentPage > 0 || globalStore.digResults.hasNextPage"
            class="d-flex justify-content-center align-items-center gap-3 mt-4"
          >
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="globalStore.digResults.currentPage <= 0 || globalStore.digSearching"
              @click="handlePageChange(-1)"
            >
              Previous
            </button>
            <span class="small text-muted">
              Page {{ globalStore.digResults.currentPage + 1 }}
            </span>
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="!globalStore.digResults.hasNextPage || globalStore.digSearching"
              @click="handlePageChange(1)"
            >
              Next
            </button>
          </div>

        </div>

      </div>

      <!-- ── DISCOVER TAB ────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'discover'">

        <div class="card mb-4">
          <div class="card-body">
            <div class="row g-3 align-items-end">

              <div class="col-12 col-md-4">
                <label class="form-label">Year</label>
                <input
                  v-model.number="discoverYear"
                  type="number"
                  class="form-control"
                  :min="1991"
                  :max="currentYear"
                >
              </div>

              <div class="col-12 col-md-4">
                <label class="form-label">Country</label>
                <select v-model="discoverCountry" class="form-select">
                  <option
                    v-for="country in globalStore.digCountries"
                    :key="country.code"
                    :value="country.code"
                    :disabled="!country.available"
                  >
                    {{ country.flag }} {{ country.label }} {{ !country.available ? '(coming soon)' : '' }}
                  </option>
                </select>
              </div>

              <div class="col-12 col-md-4">
                <button
                  class="btn btn-primary w-100"
                  :disabled="globalStore.discovering || !globalStore.canDig"
                  @click="handleDiscover"
                >
                  <span v-if="globalStore.discovering" class="spinner-border spinner-border-sm me-2"></span>
                  {{ globalStore.discovering ? 'Scouting...' : 'Discover' }}
                </button>
              </div>

            </div>
          </div>
        </div>

        <div v-if="discoverMessage" class="alert alert-secondary">
          {{ discoverMessage }}
        </div>

        <!-- Discover result -->
        <div v-if="globalStore.discoverResult">

          <!-- Activity timeline -->
          <div v-if="Object.keys(globalStore.discoverResult.timeline).length" class="card mb-4">
                      <div class="card-body">
                        <h6 class="mb-1">Activity by year</h6>
                        <p class="text-muted small mb-3">
                          This website was active in these years, there is a high chance that you might find an artifact in these years!
                        </p>
                        <div class="d-flex align-items-end gap-1" style="height: 140px;">
                          <div 
                            v-for="(count, year) in globalStore.discoverResult.timeline" 
                            :key="year"
                            class="d-flex flex-column justify-content-end h-100 flex-fill"
                          >
                            <div
                              class="w-100"
                              style="min-height: 2px; background: var(--gold-box);"
                              :style="{ height: (count / Math.max(...Object.values(globalStore.discoverResult.timeline)) * 100) + '%' }"
                              :title="`${year}: ${count} captures`"
                            ></div>
                            <span class="small text-muted mt-1" style="font-size: 0.65rem; writing-mode: vertical-rl;">{{ year }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

          <div class="card mb-4">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h5 class="card-title mb-1">{{ globalStore.discoverResult.site.name || globalStore.discoverResult.site.url }}</h5>
                  
                  <p v-if="globalStore.discoverResult.site.description" class="text-dark small mb-2">
                    {{ globalStore.discoverResult.site.description }}
                  </p>
                  
                  <p class="card-text text-muted small mb-1">
                    Found in {{ globalStore.discoverResult.searched_year }} ·
                    {{ globalStore.discoverResult.country }} ·
                    {{ globalStore.discoverResult.results.results.length }} capture(s) shown
                  </p>
                  <p
                    v-if="globalStore.discoverResult.results.results.length >= 25"
                    class="card-text text-muted small mb-3 fst-italic"
                  >
                    Showing the first 25 — this site may have more. Use "Dig deeper" for full pagination.
                  </p>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  @click="digDeeper(globalStore.discoverResult.site)"
                >
                  Dig deeper on this site
                </button>
              </div>

              <div class="row g-3">
                <div
                  v-for="capture in globalStore.discoverResult.results.results"
                  :key="capture.wayback_url"
                  class="col-12 col-md-6 col-lg-4"
                >
                  <div class="card h-100 shadow-sm">
                    <!-- Discover Tab Square Image Container -->
                    <div class="position-relative overflow-hidden w-100" style="aspect-ratio: 1 / 1;">
                      <img 
                        v-if="getIconSrc(capture)"
                        :src="getIconSrc(capture)" 
                        class="w-100 h-100"
                        style="object-fit: cover;"
                        alt="Historical Site Artifact"
                      />
                      <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center bg-dark text-white fw-bold" style="font-size: 3rem;">
                        {{ getDomainLetter(capture.original_url) }}
                      </div>
                    </div>
                    
                    <div class="card-body d-flex flex-column">
                      <p class="card-text small text-truncate mb-1" :title="capture.original_url">
                        {{ capture.original_url }}
                      </p>
                      <p class="card-text small text-muted mb-3">{{ capture.capture_date_readable }}</p>

                      <div class="mt-auto d-flex gap-2">
                        <a
                          :href="capture.wayback_url"
                          target="_blank"
                          rel="noopener"
                          class="btn btn-sm btn-outline-secondary flex-fill"
                        >
                          View
                        </a>
                        <button
                          class="btn btn-sm flex-fill"
                          :class="savedUrls.has(capture.wayback_url) ? 'btn-success' : 'btn-outline-primary'"
                          :disabled="savedUrls.has(capture.wayback_url)"
                          @click="handleSave(capture)"
                        >
                          {{ savedUrls.has(capture.wayback_url) ? 'Saved' : 'Save' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <!-- Peak years -->
          <div v-if="globalStore.discoverResult.peak_years.length" class="mb-3">
            <span class="small text-muted me-2">Peak years:</span>
            <span
              v-for="yr in globalStore.discoverResult.peak_years"
              :key="yr"
              class="badge bg-secondary me-1"
            >
              {{ yr }}
            </span>
          </div>

          <!-- Related sites -->
          <div v-if="globalStore.discoverResult.related_sites.length">
            <p class="small text-muted mb-2">Related sites — click to dig into one:</p>
            <div class="d-flex flex-wrap gap-2">
              <button
                v-for="site in globalStore.discoverResult.related_sites"
                :key="site.id"
                type="button"
                class="related-site-chip"
                @click="digDeeper(site)"
              >
                {{ site.name || site.url }}
              </button>
            </div>
          </div>

        </div>

      </div>

    </template>

    <!-- ── Updated Global Platform Credit Footer ────────────────────── -->
    <footer class="mt-5 pt-4 border-top">
      <p class="text-muted small text-center mb-0">
        All digital artifact imagery and historical photography sourced royalty-free from 
        <a href="https://unsplash.com" target="_blank" rel="noopener" class="text-decoration-none fw-semibold">Unsplash</a>.
      </p>
    </footer>

  </div>

  <!-- ── Submission Modal ─────────────────────────────────────────── -->
      <div 
        class="modal fade" 
        ref="submitModalRef" 
        tabindex="-1" 
        aria-labelledby="submitModalLabel" 
        aria-hidden="true"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" style="background-color: #f4ebd8; border: 1px solid #c2b29f;">
            <div class="modal-header border-bottom-0">
              <h5 class="modal-title" id="submitModalLabel" style="font-family: 'Georgia', serif; color: #3e2723; text-transform: uppercase;">
                Submit Artifact
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body pt-0">
              <p class="small text-muted mb-4">
                Submit this capture to the admin queue for curation. If approved, it will be added to the permanent museum exhibit.
              </p>

              <div v-if="selectedCapture" class="mb-4 p-3 rounded modal-info-banner" style="background-color: #e0d4c3; border: 1px solid #c2b29f;">
                <div class="fw-bold small text-truncate" :title="selectedCapture.original_url">
                  {{ selectedCapture.original_url }}
                </div>
                <div class="small">
                  {{ selectedCapture.capture_date_readable || 'Unknown Date' }}
                </div>
              </div>

              <form @submit.prevent="submitForCuration">
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Artifact Name <span class="text-danger">*</span></label>
                  <input 
                    v-model="submissionForm.name" 
                    type="text" 
                    class="form-control" 
                    placeholder="e.g. Friendster Login Page 2005" 
                    required
                  >
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold small">Historical Description <span class="text-danger">*</span></label>
                  <textarea 
                    v-model="submissionForm.description" 
                    class="form-control" 
                    rows="3" 
                    placeholder="Describe what this page is and what people used it for." 
                    required
                  ></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold small">Reason for Curation <span class="text-danger">*</span></label>
                  <textarea 
                    v-model="submissionForm.curation_reason" 
                    class="form-control" 
                    rows="2" 
                    placeholder="Why does this belong in the museum?" 
                    required
                  ></textarea>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" :disabled="submittingArtifact">Cancel</button>
                  <button type="submit" class="btn btn-primary" :disabled="submittingArtifact">
                    <span v-if="submittingArtifact" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {{ submittingArtifact ? 'Submitting...' : 'Submit to Curators' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  
</template>

<style scoped>
/* ── PAGE HEADER ─────────────────────────────────────────────────────── */
.dig-page-header {
  border-left: 4px solid var(--gold-box);
  padding-left: 2rem;
}

/* ── DIG USAGE BADGES ────────────────────────────────────────────────── */
.dig-badge {
  display: inline-block;
  font-family: var(--f-modern);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.4rem 1rem;
  border: 2px solid;
}
.dig-badge--unlimited {
  border-color: var(--gold-box);
  color: var(--gold-box);
  background: rgba(212, 175, 55, 0.1);
}
.dig-badge--ok {
  border-color: var(--gold-box);
  color: var(--gold-box);
  background: rgba(212, 175, 55, 0.08);
}
.dig-badge--empty {
  border-color: var(--accent-coral);
  color: var(--accent-coral);
  background: rgba(200, 83, 28, 0.1);
}

/* ── ALERT / GUEST STRIP ─────────────────────────────────────────────── */
.dig-alert {
  padding: 1rem 1.4rem;
  font-size: 0.95rem;
  border-left: 4px solid;
  color: #ffffff;
}
.dig-alert--info  { border-color: var(--gold-box); background: rgba(212,175,55,0.08); }
.dig-alert--warn  { border-color: var(--accent-coral); background: rgba(200,83,28,0.10); }
.dig-alert-link   { color: var(--gold-box); font-weight: 700; text-decoration: underline; }
.dig-alert-link:hover { color: #ffffff; }

/* ── EXHAUSTED DIGS BANNER ───────────────────────────────────────────── */
.dig-exhausted-banner {
  border: var(--b-thick);
  background: transparent;
  position: relative;
  overflow: hidden;
}
.dig-exhausted-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(200, 83, 28, 0.04) 0px,
    rgba(200, 83, 28, 0.04) 2px,
    transparent 2px,
    transparent 12px
  );
}
.dig-exhausted-inner {
  position: relative;
  padding: 1.8rem 2rem;
}
.dig-exhausted-title {
  font-family: var(--f-classic);
  font-size: 1.3rem;
  color: var(--text-pure);
  margin-bottom: 0.5rem;
}
.dig-exhausted-body {
  color: #ffffff;
  font-size: 1rem;
  margin: 0;
}
.dig-exhausted-link {
  color: var(--gold-box);
  font-weight: 700;
  text-decoration: underline;
}
.dig-exhausted-link:hover { color: #ffffff; }

/* ── TABS ────────────────────────────────────────────────────────────── */
.nav-tabs { border-color: rgba(212, 175, 55, 0.3); }
.nav-link {
  color: rgba(255,255,255,0.6) !important;
  border: none;
  font-family: var(--f-modern);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1.5rem;
  transition: color 0.2s;
}
.nav-link:hover { color: #ffffff !important; }
.nav-link.active {
  background: transparent !important;
  border-bottom: 2px solid var(--gold-box) !important;
  color: var(--gold-box) !important;
}

/* ── FORM CARDS (Digging Tool + Discover) ────────────────────────────── */
.card {
  background: transparent !important;
  border: var(--b-thick) !important;
  backdrop-filter: blur(6px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.form-label {
  color: #ffffff !important;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-control,
.form-select {
  background: rgba(18, 18, 23, 0.8) !important;
  border: 1px solid var(--gold-box) !important;
  color: #ffffff !important;
  font-family: var(--f-modern);
}
.form-control:focus,
.form-select:focus {
  border-color: var(--accent-coral) !important;
  box-shadow: 0 0 0 0.2rem rgba(200, 83, 28, 0.2) !important;
}
.form-control::placeholder { color: rgba(255,255,255,0.35) !important; }

/* Month pickers and number inputs */
input[type="month"],
input[type="number"] {
  color-scheme: dark;
}

/* Preset domain quick-select buttons */
.btn-outline-secondary {
  border: var(--b-thin) !important;
  color: rgba(255,255,255,0.7) !important;
  background: transparent !important;
}
.btn-outline-secondary:hover {
  border-color: var(--gold-box) !important;
  color: var(--gold-box) !important;
}

/* ── PRIMARY ACTION BUTTONS ──────────────────────────────────────────── */
.btn-primary {
  background: var(--accent-coral) !important;
  border-color: var(--accent-coral) !important;
  color: #ffffff !important;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}
.btn-primary:hover:not(:disabled) {
  background: transparent !important;
  color: var(--accent-coral) !important;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0px var(--accent-coral);
}
.btn-primary:disabled { opacity: 0.45; }

/* ── RESULT CARDS ────────────────────────────────────────────────────── */
.card.h-100 {
  border: var(--b-thick) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card.h-100:hover {
  transform: translate(-4px, -4px);
  box-shadow: 6px 6px 0px var(--gold-box) !important;
}

.card-body { color: var(--text-pure); }

/* Save / Saved toggle */
.btn-outline-primary {
  border-color: var(--gold-box) !important;
  color: var(--gold-box) !important;
  background: transparent !important;
  font-size: 0.78rem;
  font-weight: 700;
}
.btn-outline-primary:hover:not(:disabled) {
  background: var(--gold-box) !important;
  color: var(--bg) !important;
}
.btn-success {
  background: rgba(31, 157, 85, 0.2) !important;
  border-color: #1f9d55 !important;
  color: #4ade80 !important;
  font-size: 0.78rem;
  font-weight: 700;
}

/* Submit for Curation button on result card */
.btn-sm.btn-outline-secondary.mt-2 {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(212, 175, 55, 0.7) !important;
  border-color: rgba(212, 175, 55, 0.3) !important;
  transition: all 0.2s;
}
.btn-sm.btn-outline-secondary.mt-2:hover {
  color: var(--gold-box) !important;
  border-color: var(--gold-box) !important;
}

/* ── ACTIVITY CHART ──────────────────────────────────────────────────── */
.card-body .text-muted { color: rgba(255,255,255,0.6) !important; }

/* ── RELATED SITE CHIPS ──────────────────────────────────────────────── */
.related-site-chip {
  font-family: var(--f-modern);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.3rem 0.8rem;
  background: transparent;
  border: 1px solid var(--gold-box);
  color: var(--gold-box);
  cursor: pointer;
  transition: all 0.2s ease;
}
.related-site-chip:hover {
  background: var(--gold-box);
  color: var(--bg);
}

/* ── PAGINATION ──────────────────────────────────────────────────────── */
.btn-outline-secondary.btn-sm {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── FOOTER CREDIT ───────────────────────────────────────────────────── */
footer.mt-5 {
  border-color: rgba(212, 175, 55, 0.3) !important;
}
footer.mt-5 .text-muted {
  color: rgba(255,255,255,0.4) !important;
}
footer.mt-5 a {
  color: var(--gold-box) !important;
}

/* ── SUBMISSION MODAL ────────────────────────────────────────────────── */
/* Info banner inside the parchment modal */
:deep(.modal-content) .modal-info-banner {
  color: var(--gold-box) !important;
}

/* All form labels → black on the parchment background */
:deep(.modal-content) .form-label {
  color: #1a1a1a !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

/* Modal intro text */
:deep(.modal-content) .text-muted {
  color: #6b5744 !important;
}

/* Input fields inside modal → white bg, black text */
:deep(.modal-content) .form-control {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  border-color: #c2b29f !important;
}
:deep(.modal-content) .form-control:focus {
  border-color: var(--gold-box) !important;
  box-shadow: 0 0 0 0.2rem rgba(212, 175, 55, 0.25) !important;
}

/* Submit / Cancel buttons in modal */
:deep(.modal-content) .btn-primary {
  background-color: var(--accent-coral) !important;
  border-color: var(--accent-coral) !important;
  color: #ffffff !important;
  transform: none !important;
  box-shadow: none !important;
}
:deep(.modal-content) .btn-primary:hover {
  background-color: transparent !important;
  color: var(--accent-coral) !important;
}
:deep(.modal-content) .btn-outline-secondary {
  border-color: #c2b29f !important;
  color: #3e2723 !important;
  background: transparent !important;
}
:deep(.modal-content) .btn-outline-secondary:hover {
  background: #e0d4c3 !important;
  color: #1a1a1a !important;
}
</style>