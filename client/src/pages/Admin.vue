<script setup>
  import { ref, reactive, onMounted } from 'vue';
  import { useGlobalStore } from '@/stores/globalStore';
  import * as bootstrap from 'bootstrap';
  import AdminSidebar from '@/components/AdminSidebar.vue';

  const globalStore = useGlobalStore();
  const currentTab = ref('comments'); // Toggles between 'comments' and 'posts'
  const comments = ref([]);
  const loadingComments = ref(false);
  const loadingPosts = ref(false);

  // Expanded tracking states
  const expandedCommentIds = ref(new Set());
  const expandedPostIds = ref(new Set());

  // ─── Curation Queue State ──────────────────────────────────────────────────
    const reviewModalRef = ref(null);
    let reviewModalInstance = null;
    const selectedArtifact = ref(null);
    const isProcessing = ref(false);
    const thumbnailFile = ref(null);

    const reviewForm = reactive({
      name: '',
      description: '',
      era: '',
      tags: '',
      reviewer_note: ''
    });

    const loadQueue = async () => {
      await globalStore.fetchPendingQueue();
    };

    const openReviewModal = (artifact) => {
    selectedArtifact.value = artifact;
    reviewForm.name = artifact.name;
    reviewForm.description = artifact.description;
    reviewForm.era = '';
    reviewForm.tags = '';
    reviewForm.reviewer_note = '';
    thumbnailFile.value = null; // Reset file input

    if (!reviewModalInstance && reviewModalRef.value) {
      reviewModalInstance = new bootstrap.Modal(reviewModalRef.value);
    }
    reviewModalInstance?.show();
  };

  const handleFileUpload = (event) => {
    thumbnailFile.value = event.target.files[0];
  };

  const handleApprove = async () => {
    if (!selectedArtifact.value) return;
    isProcessing.value = true;

    // Build the FormData payload for the multipart request
    const formData = new FormData();
    formData.append('name', reviewForm.name);
    formData.append('description', reviewForm.description);
    if (reviewForm.era) formData.append('era', reviewForm.era);
    if (reviewForm.tags) formData.append('tags', reviewForm.tags);
    if (thumbnailFile.value) {
      formData.append('thumbnail', thumbnailFile.value);
    }

    const success = await globalStore.approveArtifact(selectedArtifact.value._id, formData);
    isProcessing.value = false;
    
    if (success) reviewModalInstance?.hide();
  };

  const handleReject = async () => {
    if (!selectedArtifact.value) return;
    isProcessing.value = true;

    const success = await globalStore.rejectArtifact(selectedArtifact.value._id, reviewForm.reviewer_note);
    isProcessing.value = false;

    if (success) reviewModalInstance?.hide();
  };

  // ─── Manage Exhibits State ─────────────────────────────────────────────────
  const editExhibitModalRef = ref(null);
  let editExhibitModalInstance = null;
  const selectedExhibit = ref(null);
  const isExhibitProcessing = ref(false);
  const exhibitThumbnailFile = ref(null);

  const exhibitForm = reactive({
    name: '',
    description: '',
    wayback_url: '',
    era: '',
    tags: '',
    featured: false,
    display_order: 0,
  });

  const loadExhibits = async () => {
    await globalStore.fetchAllExhibits();
  };

  const openEditExhibitModal = (exhibit) => {
    selectedExhibit.value = exhibit;
    exhibitForm.name = exhibit.name;
    exhibitForm.description = exhibit.description;
    exhibitForm.wayback_url = exhibit.wayback_url || '';
    exhibitForm.era = exhibit.era || '';
    exhibitForm.tags = (exhibit.tags || []).join(',');
    exhibitForm.featured = exhibit.featured;
    exhibitForm.display_order = exhibit.display_order;
    exhibitThumbnailFile.value = null; // Reset file input — omitting it on PATCH leaves the existing thumbnail untouched

    if (!editExhibitModalInstance && editExhibitModalRef.value) {
      editExhibitModalInstance = new bootstrap.Modal(editExhibitModalRef.value);
    }
    editExhibitModalInstance?.show();
  };

  const handleExhibitFileUpload = (event) => {
    exhibitThumbnailFile.value = event.target.files[0];
  };

  const handleEditExhibit = async () => {
    if (!selectedExhibit.value) return;
    isExhibitProcessing.value = true;

    const formData = new FormData();
    formData.append('name', exhibitForm.name);
    formData.append('description', exhibitForm.description);
    formData.append('wayback_url', exhibitForm.wayback_url || '');
    formData.append('era', exhibitForm.era);
    formData.append('tags', exhibitForm.tags);
    formData.append('featured', exhibitForm.featured ? 'true' : 'false');
    formData.append('display_order', exhibitForm.display_order);
    if (exhibitThumbnailFile.value) {
      formData.append('thumbnail', exhibitThumbnailFile.value);
    }

    const success = await globalStore.editExhibitAdmin(selectedExhibit.value._id, formData);
    isExhibitProcessing.value = false;

    if (success) editExhibitModalInstance?.hide();
  };

  const handleHideExhibit = async (exhibit) => {
    // One-way action — backend has no unhide route — so the confirm here
    // matters more than the usual delete confirms.
    if (!confirm(`Remove "${exhibit.name}" from the public gallery? This cannot be undone from here — it would need to be re-submitted and re-approved to come back.`)) return;
    await globalStore.hideExhibit(exhibit._id);
  };


  // ─── FETCH DATA ────────────────────────────────────────────────────────────
  const loadComments = async () => {
    loadingComments.value = true;
    try {
      const res = await globalStore.fetchAllComments(0);
      comments.value = res.data || [];
    } catch (error) {
      // Handled by Notyf in globalStore
    } finally {
      loadingComments.value = false;
    }
  };

  const loadPosts = async () => {
    loadingPosts.value = true;
    try {
      // Pulls down all global posts into globalStore.posts
      await globalStore.fetchFeed(0, false, null);
    } catch (error) {
    } finally {
      loadingPosts.value = false;
    }
  };

  onMounted(() => {
    loadComments();
    loadPosts();
    loadQueue();
    loadExhibits();
  });

  // ─── TOGGLE TEXT PANELS ────────────────────────────────────────────────────
  const toggleCommentText = (commentId) => {
    if (expandedCommentIds.value.has(commentId)) {
      expandedCommentIds.value.delete(commentId);
    } else {
      expandedCommentIds.value.add(commentId);
    }
  };

  const togglePostText = (commentId) => {
    if (expandedPostIds.value.has(commentId)) {
      expandedPostIds.value.delete(commentId);
    } else {
      expandedPostIds.value.add(commentId);
    }
  };

  // ─── DELETION HANDLERS ─────────────────────────────────────────────────────
  const handleDeleteComment = async (comment) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const postId = comment.post_id?._id || comment.post_id;
    if (!postId) return;

    try {
      await globalStore.deleteComment(postId, comment._id);
      comments.value = comments.value.filter(c => c._id !== comment._id);
    } catch (error) {}
  };

  const handleDeletePost = async (postId, postTitle) => {
    if (!confirm(`🚨 CRITICAL: Are you absolutely sure you want to delete the post "${postTitle}"?\nThis action is permanent and drops all associated comments.`)) return;
    try {
      await globalStore.deletePost(postId);
      // Clean up comments view locally if that post was removed
      comments.value = comments.value.filter(c => {
        const cPostId = c.post_id?._id || c.post_id;
        return cPostId !== postId;
      });
    } catch (error) {}
  };
</script>

<template>
  <div class="d-flex min-vh-100">
    <AdminSidebar 
      :currentTab="currentTab" 
      :pendingCount="globalStore.pendingQueue.length"
      @updateTab="(tab) => currentTab = tab" 
    />

    <div class="flex-grow-1 p-4" style="background-color: transparent;">
      <div class="container-fluid">
        
        <h2 class="mb-4 text-white" style="font-family: 'Georgia', serif;">
          <span v-if="currentTab === 'comments'">Manage Comments</span>
          <span v-else-if="currentTab === 'posts'">Manage Posts</span>
          <span v-else-if="currentTab === 'queue'">Curation Queue</span>
          <span v-else-if="currentTab === 'exhibits'">Manage Exhibits</span>
        </h2>

        <!-- ── COMMENTS TAB ──────────────────────────────────────────── -->
        <div v-if="currentTab === 'comments'">
          <div v-if="loadingComments" class="text-center py-5">
            <div class="spinner-border text-light" role="status"></div>
          </div>

          <div v-else-if="comments.length === 0" class="card p-4 text-center">
            <span class="theme-body-text">No comments to show.</span>
          </div>

          <div v-else class="card">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Post</th>
                    <th>Comment</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="comment in comments" :key="comment._id">
                    <td>
                      <span class="badge bg-custom-author">{{ comment.author?.username || 'Unknown' }}</span>
                    </td>
                    <td class="text-muted small">
                      {{ comment.post_id?.title || '(post removed)' }}
                    </td>
                    <td>
                      <span
                        :class="{ 'text-truncate d-inline-block': !expandedCommentIds.has(comment._id) }"
                        style="max-width: 280px; cursor: pointer;"
                        @click="toggleCommentText(comment._id)"
                      >
                        {{ comment.body }}
                      </span>
                    </td>
                    <td class="text-muted small">
                      {{ new Date(comment.createdAt).toLocaleDateString() }}
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-danger" @click="handleDeleteComment(comment)">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── POSTS TAB ─────────────────────────────────────────────── -->
        <div v-if="currentTab === 'posts'">
          <div v-if="loadingPosts" class="text-center py-5">
            <div class="spinner-border text-light" role="status"></div>
          </div>

          <div v-else-if="(globalStore.posts || []).length === 0" class="card p-4 text-center">
            <span class="theme-body-text">No posts to show.</span>
          </div>

          <div v-else class="card">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Author</th>
                    <th>Title</th>
                    <th>Body</th>
                    <th>Comments</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="post in globalStore.posts" :key="post._id">
                    <td>
                      <span class="badge bg-custom-author">{{ post.author?.username || 'Unknown' }}</span>
                    </td>
                    <td class="fw-semibold highlight-text">{{ post.title }}</td>
                    <td>
                      <span
                        :class="{ 'text-truncate d-inline-block': !expandedPostIds.has(post._id) }"
                        style="max-width: 280px; cursor: pointer;"
                        @click="togglePostText(post._id)"
                      >
                        {{ post.body }}
                      </span>
                    </td>
                    <td>
                      <span class="badge bg-custom-pill">{{ post.comment_count || 0 }}</span>
                    </td>
                    <td class="text-muted small">
                      {{ new Date(post.createdAt).toLocaleDateString() }}
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-danger" @click="handleDeletePost(post._id, post.title)">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── CURATION QUEUE TAB ────────────────────────────────────── -->
        <div v-if="currentTab === 'queue'">
          <div v-if="(globalStore.pendingQueue || []).length === 0" class="card p-4 text-center">
            <span class="theme-body-text">No pending submissions. The queue is clear.</span>
          </div>

          <div v-else class="card">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Flags</th>
                    <th>Name</th>
                    <th>Submitted By</th>
                    <th>Wayback URL</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="artifact in globalStore.pendingQueue" :key="artifact._id">
                    <td>
                      <span class="badge" :class="artifact.flag_count > 0 ? 'bg-danger' : 'bg-custom-pill'">
                        {{ artifact.flag_count || 0 }}
                      </span>
                    </td>
                    <td class="fw-semibold highlight-text">{{ artifact.name }}</td>
                    <td>
                      <span class="badge bg-custom-author">
                        {{ artifact.userId?.username || 'Unknown' }}
                      </span>
                      <span class="text-muted small ms-1">({{ artifact.userId?.tier || artifact.submitter_tier_at_submission }})</span>
                    </td>
                    <td class="text-truncate d-inline-block" style="max-width: 220px;">
                      <a :href="artifact.wayback_url" target="_blank" rel="noopener" class="btn-link text-decoration-none">
                        {{ artifact.wayback_url }}
                      </a>
                    </td>
                    <td class="text-muted small">
                      {{ new Date(artifact.createdAt).toLocaleDateString() }}
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary" @click="openReviewModal(artifact)">
                        Review
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── MANAGE EXHIBITS TAB ───────────────────────────────────── -->
        <div v-if="currentTab === 'exhibits'">
          <div v-if="globalStore.loadingExhibits" class="text-center py-5">
            <div class="spinner-border text-light" role="status"></div>
          </div>

          <div v-else-if="(globalStore.allExhibits || []).length === 0" class="card p-4 text-center">
            <span class="theme-body-text">No exhibits yet. Approve a submission from the Curation Queue to create one.</span>
          </div>

          <div v-else class="card">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Era</th>
                    <th>Credited To</th>
                    <th>Status</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exhibit in globalStore.allExhibits" :key="exhibit._id" :class="{ 'opacity-50': exhibit.hidden }">
                    <td class="text-muted small">{{ exhibit.exhibit_number }}</td>
                    <td class="fw-semibold highlight-text">{{ exhibit.name }}</td>
                    <td class="text-muted small">{{ exhibit.era || '—' }}</td>
                    <td>
                      <span class="badge bg-custom-author">{{ exhibit.credited_to }}</span>
                    </td>
                    <td>
                      <span v-if="exhibit.hidden" class="badge bg-danger">Hidden</span>
                      <span v-else-if="exhibit.featured" class="badge" style="background-color: var(--gold-box); color: #3e2723;">Featured</span>
                      <span v-else class="badge bg-custom-pill">Live</span>
                    </td>
                    <td class="text-end">
                      <button
                        class="btn btn-sm btn-outline-primary me-2"
                        :disabled="exhibit.hidden"
                        @click="openEditExhibitModal(exhibit)"
                      >
                        Edit
                      </button>
                      <button
                        class="btn btn-sm btn-danger"
                        :disabled="exhibit.hidden"
                        @click="handleHideExhibit(exhibit)"
                      >
                        {{ exhibit.hidden ? 'Removed' : 'Remove' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ── REVIEW MODAL (Approve / Reject) ───────────────────────────── -->
  <div
    class="modal fade"
    ref="reviewModalRef"
    tabindex="-1"
    aria-labelledby="reviewModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content" style="background-color: #f4ebd8; border: 1px solid #c2b29f;">
        <div class="modal-header border-bottom-0">
          <h5 class="modal-title" id="reviewModalLabel" style="font-family: 'Georgia', serif; color: #3e2723; text-transform: uppercase;">
            Review Submission
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body pt-0" v-if="selectedArtifact">
          <div class="mb-4 p-3 rounded modal-info-banner" style="background-color: #e0d4c3; border: 1px solid #c2b29f;">
            <div class="fw-bold small text-truncate" :title="selectedArtifact.wayback_url">
              <a :href="selectedArtifact.wayback_url" target="_blank" rel="noopener" style="color: var(--gold-box);">
                {{ selectedArtifact.wayback_url }} ↗
              </a>
            </div>
            <div class="small">
              Submitted by {{ selectedArtifact.userId?.username || 'Unknown' }}
              ({{ selectedArtifact.submitter_tier_at_submission }} tier at submission)
              · {{ selectedArtifact.flag_count || 0 }} flag(s)
            </div>
            <div class="small mt-2 fst-italic">
              "{{ selectedArtifact.curation_reason }}"
            </div>
          </div>

          <form @submit.prevent>
            <div class="mb-3">
              <label class="form-label fw-semibold small">Name</label>
              <input v-model="reviewForm.name" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Description</label>
              <textarea v-model="reviewForm.description" class="form-control" rows="3"></textarea>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold small">Era (admin only)</label>
                <input v-model="reviewForm.era" type="text" class="form-control" placeholder="e.g. Early 2000s">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold small">Tags (admin only)</label>
                <input v-model="reviewForm.tags" type="text" class="form-control" placeholder="comma,separated,tags">
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Thumbnail (screenshot)</label>
              <input type="file" class="form-control" accept="image/*" @change="handleFileUpload">
              <div class="form-text">Optional on approve — max 8MB, transformed to 640x480.</div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Reviewer Note (used on reject)</label>
              <textarea v-model="reviewForm.reviewer_note" class="form-control" rows="2" placeholder="Why was this rejected? (optional)"></textarea>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-danger" :disabled="isProcessing" @click="handleReject">
                <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
                Reject
              </button>
              <button type="button" class="btn btn-primary" :disabled="isProcessing" @click="handleApprove">
                <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
                Approve &amp; Create Exhibit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- ── EDIT EXHIBIT MODAL ────────────────────────────────────────── -->
  <div
    class="modal fade"
    ref="editExhibitModalRef"
    tabindex="-1"
    aria-labelledby="editExhibitModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content" style="background-color: #f4ebd8; border: 1px solid #c2b29f;">
        <div class="modal-header border-bottom-0">
          <h5 class="modal-title" id="editExhibitModalLabel" style="font-family: 'Georgia', serif; color: #3e2723; text-transform: uppercase;">
            Edit Exhibit
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body pt-0" v-if="selectedExhibit">
          <div class="mb-4 p-3 rounded modal-info-banner" style="background-color: #e0d4c3; border: 1px solid #c2b29f;">
            <div class="small">
              Exhibit #{{ selectedExhibit.exhibit_number }} · Credited to {{ selectedExhibit.credited_to }}
            </div>
          </div>

          <form @submit.prevent>
            <div class="mb-3">
              <label class="form-label fw-semibold small">Name</label>
              <input v-model="exhibitForm.name" type="text" class="form-control">
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Description</label>
              <textarea v-model="exhibitForm.description" class="form-control" rows="3"></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Wayback URL</label>
              <input v-model="exhibitForm.wayback_url" type="url" class="form-control" placeholder="https://web.archive.org/web/...">
              <div class="form-text">Paste the Wayback Machine link shown to visitors on the exhibit page.</div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold small">Era</label>
                <input v-model="exhibitForm.era" type="text" class="form-control" placeholder="e.g. Early 2000s">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold small">Tags</label>
                <input v-model="exhibitForm.tags" type="text" class="form-control" placeholder="comma,separated,tags">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label fw-semibold small">Display Order</label>
                <input v-model.number="exhibitForm.display_order" type="number" class="form-control">
              </div>
              <div class="col-md-6 mb-3 d-flex align-items-end">
                <div class="form-check">
                  <input v-model="exhibitForm.featured" class="form-check-input" type="checkbox" id="featuredCheck">
                  <label class="form-check-label fw-semibold small" for="featuredCheck">
                    Featured
                  </label>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">Replace Thumbnail</label>
              <input type="file" class="form-control" accept="image/*" @change="handleExhibitFileUpload">
              <div class="form-text">Leave empty to keep the existing thumbnail.</div>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-primary" :disabled="isExhibitProcessing" @click="handleEditExhibit">
                <span v-if="isExhibitProcessing" class="spinner-border spinner-border-sm me-2"></span>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  </template>

<style scoped>
/* ── CARD ROOT STYLING (Matched directly from Blog.vue) ── */
.card {
  background: rgba(92, 58, 32, 0.88) !important;
  backdrop-filter: blur(10px);
  border: var(--b-thick) !important;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translate(-4px, -4px);
  box-shadow: 6px 6px 0px var(--gold-box);
}

.card-header {
  background: rgba(60, 38, 22, 0.9) !important;
  border-bottom: var(--b-thick) !important;
  color: #f4e0b9 !important;
}

/* ── TEXT & HEADER COLOR OVERRIDES ── */
.title-accent {
  color: #f4e0b9 !important;
  border-left: 3px solid var(--gold-box);
  padding-left: 10px;
}

.highlight-text {
  color: #f4e0b9 !important;
}

.theme-body-text {
  color: #ffffff !important;
}

.text-muted {
  color: #d9c49a !important;
}

/* ── LIST GROUP (SIDEBAR MENU) ADJUSTMENTS ── */
.list-group-item {
  background: transparent !important;
  color: #d9c49a !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2) !important;
  transition: all 0.2s;
}

.list-group-item.active {
  background: var(--gold-box) !important;
  border-color: var(--gold-box) !important;
  color: #ffffff !important;
}

.list-group-item:hover:not(.active):not(.disabled) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #f4e0b9 !important;
  padding-left: 20px;
}

.list-group-item.disabled {
  color: rgba(217, 196, 154, 0.3) !important;
}

/* ── TABLE THEMING ── */
.table {
  color: #ffffff !important;
  --bs-table-bg: transparent !important;
}

.table thead th {
  color: #f4e0b9 !important;
  background: rgba(60, 38, 22, 0.6) !important;
  border-bottom: 2px solid var(--gold-box) !important;
}

.table tbody tr {
  border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
}

.table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03) !important;
}

/* ── EXPANDED BOX AND LINK OVERRIDES ── */
.custom-context-box {
  background: rgba(60, 38, 22, 0.6) !important;
  border-color: rgba(212, 175, 55, 0.3) !important;
  color: #d9c49a !important;
}

.btn-link {
  color: var(--gold-box) !important;
}

.btn-link:hover {
  color: #ffffff !important;
}

/* ── BADGES & SPINNERS ── */
.bg-custom-author {
  background-color: rgba(212, 175, 55, 0.2) !important;
  border: 1px solid var(--gold-box);
  color: #f4e0b9 !important;
}

.bg-custom-pill {
  background-color: rgba(60, 38, 22, 0.9) !important;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #ffffff !important;
}

.text-gold {
  color: var(--gold-box) !important;
}

/* ── MODAL CONTENT THEMING ── */
/* Both modals use background-color: #f4ebd8 (parchment). Bootstrap's default
   text colour is fine on that but several elements needed explicit overrides. */

/* All form labels inside modals → black for legibility on the parchment bg */
:deep(.modal-content) .form-label {
  color: #1a1a1a !important;
  font-weight: 600;
}

/* Input / textarea / file inputs → light background, black text */
:deep(.modal-content) .form-control {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  border-color: #c2b29f !important;
}

:deep(.modal-content) .form-control:focus {
  border-color: var(--gold-box) !important;
  box-shadow: 0 0 0 0.2rem rgba(212, 175, 55, 0.25) !important;
}

/* Helper text beneath fields */
:deep(.modal-content) .form-text {
  color: #6b5744 !important;
}

/* The "Exhibit #N · Credited to..." info banner */
:deep(.modal-content) .modal-info-banner {
  color: var(--gold-box) !important;
}

/* Fallback: any .text-muted inside the modal gets gold instead of grey */
:deep(.modal-content) .text-muted {
  color: var(--gold-box) !important;
}

/* Checkbox label */
:deep(.modal-content) .form-check-label {
  color: #1a1a1a !important;
}

/* Save / Approve / Reject buttons — override Bootstrap's .btn-primary blue
   with the site's rust accent to stay on-brand inside the modal */
:deep(.modal-content) .btn-primary {
  background-color: var(--accent-coral) !important;
  border-color: var(--accent-coral) !important;
  color: #ffffff !important;
}

:deep(.modal-content) .btn-primary:hover {
  background-color: transparent !important;
  color: var(--accent-coral) !important;
  border-color: var(--accent-coral) !important;
}
.btn-danger {
  background: rgba(220, 53, 69, 0.18) !important;
  border-color: rgba(220, 53, 69, 0.7) !important;
  color: #ff8a93 !important;
}

.btn-danger:hover {
  background: #dc3545 !important;
  border-color: #dc3545 !important;
  color: #ffffff !important;
}
</style>