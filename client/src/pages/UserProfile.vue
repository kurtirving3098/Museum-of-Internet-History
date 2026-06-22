<script setup>
  import { ref, reactive, onMounted } from 'vue';
  import { useGlobalStore } from '@/stores/globalStore';

  const globalStore = useGlobalStore();

  // ─── Note editing — track which item is being edited inline ───────────────
  const editingNoteId = ref(null);
  const noteDrafts     = reactive({}); // { [itemId]: draftText }
  const savingNoteId   = ref(null);

  const startEditingNote = (item) => {
    editingNoteId.value = item._id;
    noteDrafts[item._id] = item.personal_note || '';
  };

  const cancelEditingNote = () => {
    editingNoteId.value = null;
  };

  const saveNote = async (item) => {
    savingNoteId.value = item._id;
    const success = await globalStore.updateSavedItemNote(item._id, noteDrafts[item._id]);
    savingNoteId.value = null;
    if (success) editingNoteId.value = null;
  };

  const handleRemove = async (item) => {
    if (!confirm(`Remove "${item.name || 'this item'}" from your saved items?`)) return;
    await globalStore.removeSavedItem(item._id);
  };

  onMounted(() => {
    globalStore.fetchSavedItems();
  });
</script>

<template>
  <div class="profile-page">
    <div class="container px-4 py-5" style="max-width: 960px;">

      <!-- ── ACCOUNT INFO ───────────────────────────────────────────── -->
      <section class="account-card p-4 p-md-5 mb-5">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <span class="profile-eyebrow">Archaeologist Profile</span>
            <h1 class="profile-username mt-2 mb-1">{{ globalStore.user?.username || 'Unknown' }}</h1>
            <p class="profile-email mb-0">{{ globalStore.user?.email }}</p>
          </div>
          <span
            class="badge fs-6 px-3 py-2"
            :class="globalStore.user?.tier === 'paid' ? 'tier-badge-paid' : 'tier-badge-free'"
          >
            <i class="bi" :class="globalStore.user?.tier === 'paid' ? 'bi-star-fill' : 'bi-compass'"></i>
            {{ globalStore.user?.tier === 'paid' ? 'Certified Archaeologist' : 'Explorer' }}
          </span>
        </div>
      </section>

      <!-- ── SAVED ITEMS ────────────────────────────────────────────── -->
      <h2 class="saved-heading mb-4">My Saved Digs</h2>

      <div v-if="globalStore.loadingSavedItems" class="text-center py-5">
        <div class="spinner-border text-light" role="status"></div>
      </div>

      <div v-else-if="globalStore.savedItems.length === 0" class="empty-card p-5 text-center">
        <i class="bi bi-bookmark display-4 mb-3 d-block" style="color: var(--gold-box);"></i>
        <p class="mb-0 theme-body-text">
          Nothing saved yet. Bookmark exhibits or Wayback captures from the Digging Tool to see them here.
        </p>
      </div>

      <div v-else class="row g-4">
        <div
          v-for="item in globalStore.savedItems"
          :key="item._id"
          class="col-12 col-md-6"
        >
          <div class="saved-card h-100 d-flex flex-column">
            <div class="saved-card-image-wrap">
              <img
                v-if="item.thumbnail_url"
                :src="item.thumbnail_url"
                :alt="item.name || 'Saved item'"
                class="saved-card-image"
              >
              <div v-else class="saved-card-image saved-card-placeholder d-flex align-items-center justify-content-center">
                <i class="bi bi-image fs-1"></i>
              </div>
            </div>

            <div class="p-3 d-flex flex-column flex-grow-1">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <h3 class="saved-card-title mb-0">{{ item.name || 'Untitled' }}</h3>
                <span class="badge bg-custom-pill flex-shrink-0">
                  {{ item.source_type === 'exhibit' ? 'Exhibit' : 'Wayback Capture' }}
                </span>
              </div>

              <router-link
                v-if="item.source_type === 'exhibit' && item.artifact_id"
                :to="{ name: 'ExhibitDetail', params: { id: item.artifact_id } }"
                class="saved-card-link mb-2"
              >
                View Exhibit <i class="bi bi-arrow-right"></i>
              </router-link>
              <a
                v-else-if="item.wayback_url"
                :href="item.wayback_url"
                target="_blank"
                rel="noopener"
                class="saved-card-link mb-2"
              >
                Open Capture <i class="bi bi-box-arrow-up-right"></i>
              </a>

              <!-- ── Personal Note ──────────────────────────────────────── -->
              <div class="mt-auto pt-2">
                <div v-if="editingNoteId === item._id">
                  <textarea
                    v-model="noteDrafts[item._id]"
                    class="form-control form-control-sm mb-2"
                    rows="2"
                    placeholder="Add a personal note..."
                  ></textarea>
                  <div class="d-flex gap-2">
                    <button
                      class="btn btn-sm btn-primary"
                      :disabled="savingNoteId === item._id"
                      @click="saveNote(item)"
                    >
                      <span v-if="savingNoteId === item._id" class="spinner-border spinner-border-sm me-1"></span>
                      Save
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="cancelEditingNote">
                      Cancel
                    </button>
                  </div>
                </div>
                <div v-else>
                  <p v-if="item.personal_note" class="saved-card-note mb-2">
                    <i class="bi bi-quote me-1"></i>{{ item.personal_note }}
                  </p>
                  <div class="d-flex gap-3">
                    <button class="note-action-btn" @click="startEditingNote(item)">
                      <i class="bi bi-pencil me-1"></i>{{ item.personal_note ? 'Edit note' : 'Add note' }}
                    </button>
                    <button class="note-action-btn note-action-danger" @click="handleRemove(item)">
                      <i class="bi bi-trash me-1"></i>Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #2b1c12;
}

/* ── ACCOUNT CARD ── */
.account-card {
  background: rgba(92, 58, 32, 0.88);
  border: var(--b-thick);
  border-radius: 4px;
}

.profile-eyebrow {
  color: var(--gold-box);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.profile-username {
  font-family: 'Georgia', serif;
  color: #f4e0b9;
  font-size: 2rem;
}

.profile-email {
  color: #d9c49a;
}

.tier-badge-paid {
  background-color: var(--gold-box);
  color: #3e2723;
}

.tier-badge-free {
  background-color: rgba(60, 38, 22, 0.9);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #ffffff;
}

/* ── SAVED ITEMS ── */
.saved-heading {
  font-family: 'Georgia', serif;
  color: #f4e0b9;
  border-left: 3px solid var(--gold-box);
  padding-left: 12px;
}

.empty-card {
  background: rgba(92, 58, 32, 0.5);
  border: var(--b-thick);
  border-radius: 4px;
}

.theme-body-text {
  color: #ffffff;
}

.saved-card {
  background: rgba(92, 58, 32, 0.88);
  border: var(--b-thick);
  border-radius: 4px;
  overflow: hidden;
}

.saved-card-image-wrap {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.saved-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.saved-card-placeholder {
  background: rgba(60, 38, 22, 0.9);
  color: rgba(212, 175, 55, 0.4);
}

.saved-card-title {
  font-family: 'Georgia', serif;
  color: #f4e0b9;
  font-size: 1.1rem;
}

.saved-card-link {
  color: var(--gold-box);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.saved-card-link:hover {
  color: #f4e0b9;
}

.saved-card-note {
  color: #d9c49a;
  font-size: 0.85rem;
  font-style: italic;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  padding-top: 0.5rem;
}

.note-action-btn {
  background: none;
  border: none;
  color: #d9c49a;
  font-size: 0.8rem;
  padding: 0;
  cursor: pointer;
}

.note-action-btn:hover {
  color: var(--gold-box);
}

.note-action-danger:hover {
  color: #e57373;
}

/* ── SHARED BADGES (matches Admin.vue / Exhibits.vue) ── */
.bg-custom-pill {
  background-color: rgba(60, 38, 22, 0.9) !important;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #ffffff !important;
}
</style>