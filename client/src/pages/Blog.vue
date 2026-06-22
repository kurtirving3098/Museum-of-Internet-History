<script setup>
  import { ref, reactive, onMounted, computed } from 'vue';
  import { useGlobalStore } from '@/stores/globalStore';

  const globalStore = useGlobalStore();

  // ─── Create post ────────────────────────────────────────────────────────
  const newPostTitle = ref('');
  const newPostBody  = ref('');
  const postSubmitting = ref(false);
  const activeTab = ref('all');

  const handleCreatePost = async () => {
    if (!newPostTitle.value.trim() || !newPostBody.value.trim()) return;

    postSubmitting.value = true;
    try {
      await globalStore.createPost({
        title: newPostTitle.value.trim(),
        body:  newPostBody.value.trim(),
      });
      newPostTitle.value = '';
      newPostBody.value  = '';

      // Refresh the currently active view
      if (activeTab.value === 'mine') {
        await loadMyPosts();
      } else {
        await loadAllPosts();
      }
    } finally {
      postSubmitting.value = false;
    }
  };

  // ─── Feed loading ───────────────────────────────────────────────────────
  const loadingMore = ref(false);

  onMounted(() => {
    globalStore.fetchFeed(0, false);
  });

  const handleLoadMore = async () => {
    loadingMore.value = true;
    try {
      await globalStore.fetchFeed(
        globalStore.feedPage + 1,
        true,
        globalStore.currentFeedAuthor // Pass the current filter
      );
    } finally {
      loadingMore.value = false;
    }
  };

  // Tab switching methods
  const loadAllPosts = async () => {
    activeTab.value = 'all';
    await globalStore.fetchFeed(0, false, null);
  };

  const loadMyPosts = async () => {
    // Guests have no user to filter by — bounce them toward login instead
    // of silently doing nothing.
    if (!globalStore.user) return;
    activeTab.value = 'mine';
    await globalStore.fetchFeed(0, false, globalStore.user._id);
  };

  // ─── Inline comments per post ──────────────────────────────────────────
  // Tracks which post cards currently have their comment thread open, and
  // holds the draft text for each post's comment input separately.
  const expandedPostIds = reactive(new Set());
  const commentDrafts   = reactive({});
  const commentSubmitting = reactive({});

  const toggleComments = async (postId) => {
    if (expandedPostIds.has(postId)) {
      expandedPostIds.delete(postId);
      return;
    }
    expandedPostIds.add(postId);
    if (!globalStore.commentsByPostId[postId]) {
      await globalStore.fetchComments(postId);
    }
  };

  const handleAddComment = async (postId) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;

    commentSubmitting[postId] = true;
    try {
      await globalStore.createComment(postId, body);
      commentDrafts[postId] = '';
    } finally {
      commentSubmitting[postId] = false;
    }
  };

  const handleDeleteComment = (postId, commentId) => {
    globalStore.deleteComment(postId, commentId);
  };

  const handleDeletePost = (postId) => {
    globalStore.deletePost(postId);
  };

  // ─── Avatar initials fallback ──────────────────────────────────────────
  const initials = (name) => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };
</script>

<template>
  <div class="container py-4">
    <div class="row g-4">

      <div class="archaeo-header mt-3 mb-4 text-center">
        <span class="lbl">Field Log</span>
        <h2 class="sec-title">
          Archaeologist's <em>Notes</em>
        </h2>
        <p class="sub mb-0">Findings, theories, and confessions from fellow internet archaeologists.</p>
      </div>

      <!-- ── LEFT SIDEBAR: user info ─────────────────────────────────────── -->
      <div class="col-12 col-md-4 col-lg-3">
        <div v-if="globalStore.isAuthenticated" class="card text-center p-3 sidebar-card">
          <div class="card-body">
            <div
              v-if="!globalStore.user?.avatar"
              class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
              style="width: 80px; height: 80px; font-size: 2rem;"
            >
              {{ initials(globalStore.user?.username) }}
            </div>
            <img
              v-else
              :src="globalStore.user.avatar"
              alt="avatar"
              class="rounded-circle mx-auto mb-3 d-block"
              style="width: 80px; height: 80px; object-fit: cover;"
            >

            <h5 class="mb-1">{{ globalStore.user?.username || 'Guest' }}</h5>
            <p class="text-muted small mb-2">{{ globalStore.user?.email }}</p>

            <span
              class="badge"
              :class="globalStore.user?.tier === 'paid' ? 'bg-warning text-dark' : 'bg-secondary'"
            >
              {{ globalStore.user?.tier || 'free' }} tier
            </span>
            <span v-if="globalStore.isAdmin" class="badge bg-danger ms-1">admin</span>
          </div>
        </div>

        <!-- Guest sidebar — no profile to show, just a CTA -->
        <div v-else class="card text-center p-3 sidebar-card">
          <div class="card-body">
            <h5 class="mb-2">Browsing as a guest</h5>
            <p class="text-muted small mb-3">Log in to post, comment, and save your own digs.</p>
            <router-link to="/login" class="btn btn-primary btn-sm">Log In</router-link>
          </div>
        </div>
      </div>

      <!-- ── RIGHT COLUMN: create post + feed ────────────────────────────── -->
      <div class="col-12 col-md-8 col-lg-9">

        <div class="d-flex gap-2 mt-3 mb-3 feed-tabs">
          <button
            class="btn flex-fill fw-bold"
            :class="activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'"
            @click="loadAllPosts"
          >
            Everyone's Posts
          </button>
          <button
            v-if="globalStore.isAuthenticated"
            class="btn flex-fill fw-bold"
            :class="activeTab === 'mine' ? 'btn-primary' : 'btn-outline-primary'"
            @click="loadMyPosts"
          >
            My Posts
          </button>
          <router-link
            v-else
            to="/login"
            class="btn btn-outline-primary flex-fill fw-bold"
          >
            Log In to See My Posts
          </router-link>
        </div>

        <div v-if="globalStore.isAuthenticated" class="card mb-4 p-3">
          <div class="card-body">
            <h6 class="mb-3">Write a new post</h6>
            <input
              v-model="newPostTitle"
              type="text"
              class="form-control mb-2"
              placeholder="Title"
            >
            <textarea
              v-model="newPostBody"
              class="form-control mb-3"
              rows="3"
              placeholder="What's on your mind?"
            ></textarea>
            <button
              class="btn btn-primary"
              :disabled="postSubmitting || !newPostTitle.trim() || !newPostBody.trim()"
              @click="handleCreatePost"
            >
              <span v-if="postSubmitting" class="spinner-border spinner-border-sm me-2"></span>
              {{ postSubmitting ? 'Posting...' : 'Post' }}
            </button>
          </div>
        </div>

        <div v-else class="alert alert-secondary mb-4">
          <router-link to="/login">Log in</router-link> to write a post.
        </div>

        <!-- Loading state -->
        <div v-if="globalStore.loading && globalStore.posts.length === 0" class="text-center py-5">
          <span class="spinner-border"></span>
        </div>

        <!-- Empty state -->
        <div v-else-if="globalStore.posts.length === 0" class="text-center text-muted py-5">
          No posts yet. Be the first to write one.
        </div>

        <!-- Feed -->
        <div v-for="post in globalStore.posts" :key="post._id" class="card mb-4 p-3">
          <div class="card-body">

            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <div
                  class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                  style="width: 40px; height: 40px; font-size: 1.1rem;"
                >
                  {{ initials(post.author?.username) }}
                </div>
                <div>
                  <div class="fw-bold">{{ post.author?.username || 'Unknown' }}</div>
                  <div class="text-muted small">{{ formatDate(post.createdAt) }}</div>
                </div>
              </div>

              <button
                v-if="globalStore.canDeletePost(post)"
                class="btn btn-sm btn-outline-danger"
                @click="handleDeletePost(post._id)"
              >
                Delete
              </button>
            </div>

            <h5 class="card-title">{{ post.title }}</h5>
            <p class="card-text">{{ post.body }}</p>

            <button class="btn btn-sm btn-outline-secondary mb-3" @click="toggleComments(post._id)">
              {{ expandedPostIds.has(post._id) ? 'Hide' : 'View' }} comments ({{ post.comment_count || 0 }})
            </button>

            <!-- Inline comment thread -->
            <div v-if="expandedPostIds.has(post._id)" class="comment-thread pt-3 mt-3 pb-3 rounded shadow-sm">

              <div v-if="globalStore.commentsLoadingByPostId[post._id]" class="text-center py-2">
                <span class="spinner-border spinner-border-sm"></span>
              </div>

              <div v-else>
                <div
                    v-for="comment in globalStore.commentsByPostId[post._id]"
                    :key="comment._id"
                    class="comment-item d-flex justify-content-between align-items-start mb-2 p-2 rounded"
                  >
                  <div>
                    <span class="fw-bold small text-primary">{{ comment.author?.username || 'Unknown' }}</span>
                    <span class="ms-2 small text-dark">{{ comment.body }}</span>
                  </div>
                  <button
                    v-if="globalStore.canDeleteComment(comment, post)"
                    class="btn btn-sm btn-link text-danger p-0 ms-2"
                    @click="handleDeleteComment(post._id, comment._id)"
                  >
                    Delete
                  </button>
                </div>

                <div
                  v-if="!globalStore.commentsByPostId[post._id]?.length"
                  class="text-muted small mb-2"
                >
                  No comments yet.
                </div>
              </div>

              <!-- Add comment -->
              <div v-if="globalStore.isAuthenticated" class="d-flex gap-2 mt-2">
                <input
                  v-model="commentDrafts[post._id]"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Write a comment..."
                  @keyup.enter="handleAddComment(post._id)"
                >
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="commentSubmitting[post._id] || !(commentDrafts[post._id] || '').trim()"
                  @click="handleAddComment(post._id)"
                >
                  Send
                </button>
              </div>

              <div v-else class="guest-alert mb-4 p-3 rounded">
                <router-link to="/login">Log in</router-link> to write a post.
              </div>

            </div>

          </div>
        </div>

        <!-- Load more -->
        <div v-if="globalStore.hasMorePosts" class="text-center mb-4">
          <button class="btn btn-outline-primary" :disabled="loadingMore" @click="handleLoadMore">
            <span v-if="loadingMore" class="spinner-border spinner-border-sm me-2"></span>
            {{ loadingMore ? 'Loading...' : 'Load More' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-card {
  position: sticky;
  top: 90px;
  background: transparent !important;
  border: var(--b-thick);
  backdrop-filter: blur(10px);
}
.sidebar-card h5,
.sidebar-card .fw-bold {
  color: var(--text-pure) !important;
  font-family: var(--f-classic);
}
.sidebar-card .text-muted,
.sidebar-card p {
  color: #ffffff !important;
}

.feed-tabs {
  position: relative;
  z-index: 1;
}
.feed-tabs .btn-primary {
  background: var(--gold-box) !important;
  border-color: var(--gold-box) !important;
  color: var(--bg) !important;
}
.feed-tabs .btn-outline-primary {
  border-color: var(--gold-box) !important;
  color: var(--gold-box) !important;
}
.feed-tabs .btn-outline-primary:hover {
  background: var(--gold-box) !important;
  color: var(--bg) !important;
}

.archaeo-header {
  border-left: 4px solid var(--gold-box);
  padding-left: 1.5rem;
}
.archaeo-header .sec-title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 0.4rem 0 0.6rem;
}
.archaeo-header .sub {
  max-width: 100%;
  margin-top: 0;
  font-size: 0.95rem;
}

.card {
  background: transparent !important;
  backdrop-filter: blur(10px);
  border: var(--b-thick) !important;
}
.card:hover {
  transform: translate(-4px, -4px);
  box-shadow: 6px 6px 0px var(--gold-box);
}
.card-title,
.card h6 {
  color: var(--text-pure) !important;
  font-family: var(--f-classic);
}
.card .fw-bold {
  color: var(--text-pure) !important;
}
.card .text-muted {
  color: #ffffff !important;
}

.card .btn-primary {
  background: var(--gold-box) !important;
  border-color: var(--gold-box) !important;
  color: var(--bg) !important;
}
.card .btn-outline-secondary {
  border-color: var(--gold-box) !important;
  color: var(--gold-box) !important;
}
.card .btn-outline-secondary:hover {
  background: var(--gold-box) !important;
  color: var(--bg) !important;
}

/* Delete buttons — tinted red at rest, full red on hover */
.btn-outline-danger {
  background: rgba(220, 53, 69, 0.18) !important;
  border-color: rgba(220, 53, 69, 0.7) !important;
  color: #ff8a93 !important;
}
.btn-outline-danger:hover {
  background: #dc3545 !important;
  border-color: #dc3545 !important;
  color: #ffffff !important;
}

.comment-thread {
  background: transparent !important;
  border-top: var(--b-thick) !important;
}
.comment-item {
  background: transparent !important;
  border: var(--b-thin) !important;
}
.comment-item .text-dark {
  color: #ffffff !important;
}
.comment-item .text-primary {
  color: var(--gold-box) !important;
}

.guest-alert {
  background: transparent;
  border: var(--b-thick);
  color: var(--text-pure);
}
.guest-alert a {
  color: var(--gold-box);
  text-decoration: underline;
}
</style>