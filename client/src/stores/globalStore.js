import { defineStore } from 'pinia';
import { Notyf } from 'notyf';
import api from '@/api';
import { adminApi } from '@/api';
import { subscriptionApi } from '@/api';
import { savedApi } from '@/api';

const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'top' },
});

// ─── localStorage helpers ──────────────────────────────────────────────────
// Kept local to this file — globalStore is the only thing that should ever
// touch these keys directly. api.js's 401/403 handler goes through logout()
// rather than poking localStorage itself, to keep this the single source of truth.
const TOKEN_KEY = 'mih_token';
const USER_KEY  = 'mih_user';

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupted JSON in storage shouldn't crash app boot
    return null;
  }
};

export const useGlobalStore = defineStore('global', {
  state: () => ({

    // ── Admin Queue ───────────────────────────────────────────────────────
    pendingQueue: [],
    loadingQueue: false,
    // ── Admin Exhibit Management ─────────────────────────────────────────
    allExhibits: [],
    loadingExhibits: false,
    // ── Subscriptions ─────────────────────────────────────────────────────
    plans: [],
    loadingPlans: false,
    subscribing: false,
    // ── Saved Items (user profile) ──────────────────────────────────────────
    savedItems: [],
    loadingSavedItems: false,
    // ── Auth ──────────────────────────────────────────────────────────────
    token: localStorage.getItem(TOKEN_KEY) || null,
    user:  loadStoredUser(),

    // ── Blog / posts ──────────────────────────────────────────────────────
    posts:       [],
    feedPage:    0,
    feedPageSize: 20,
    feedTotal:   0,
    currentFeedAuthor: null,
    currentPost: null,

    // Keyed by postId so multiple feed cards can each hold their own comment
    // thread open at once, e.g. { [postId]: [...comments] }
    commentsByPostId:        {},
    commentsLoadingByPostId: {},

    // ── DIG (Wayback search & discover) ─────────────────────────────────
    digCountries:    [],
    digUsage:        null,   // { used, limit, remaining, tier, upgrade_prompt }
    digResults:      null,   // { results, totalPages, currentPage }
    digSearching:    false,
    discoverResult:  null,   // full discoverRandom() response shape
    discovering:     false,
    lastDigFilters:  null,   // remembered for "Load more" / page navigation

    // ── UI flags ──────────────────────────────────────────────────────────
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin:         (state) => state.user?.role === 'admin',

    // Owner-or-admin — mirrors deletePost in postController.js
    canDeletePost: (state) => (post) => {
      if (!state.user || !post) return false;
      const authorId = post.author?._id || post.author;
      return state.isAdmin || authorId === state.user._id;
    },

    // Comment-owner OR post-author OR admin — mirrors deleteComment in commentController.js
    canDeleteComment: (state) => (comment, post) => {
      if (!state.user || !comment) return false;
      const commentAuthorId = comment.author?._id || comment.author;
      const postAuthorId    = post?.author?._id || post?.author;
      return (
        state.isAdmin ||
        commentAuthorId === state.user._id ||
        postAuthorId === state.user._id
      );
    },

    // True while loaded posts haven't yet reached the server-reported total
    hasMorePosts: (state) => state.posts.length < state.feedTotal,

    // Conservative default — if usage hasn't loaded yet, don't block the UI.
    // Real enforcement happens server-side via user.canDig() regardless.
    canDig: (state) => {
      if (!state.digUsage) return true;
      return state.digUsage.limit === null || state.digUsage.remaining > 0;
    },
  },

  actions: {
    // ─── AUTH ──────────────────────────────────────────────────────────────

    async register(payload) {
      this.loading = true;
      try {
        const { data } = await api.post('/users/register', payload);
        notyf.success(data.message || 'Registered successfully');
        return data.result;
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Registration failed');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async login(payload) {
      this.loading = true;
      try {
        const { data } = await api.post('/users/login', payload);
        this.setToken(data.access);

        // Login only returns a JWT — fetch the full user separately so the
        // UI has username/role/tier available right away.
        await this.fetchMe();

        notyf.success('Logged in successfully');
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Login failed');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      try {
        const { data } = await api.get('/users/me');
        this.setUser(data.result || data.data || data);
      } catch (error) {
        notyf.error('Could not load your profile');
        throw error;
      }
    },

    logout() {
      this.token = null;
      this.user  = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      notyf.success('Logged out');
    },

    setToken(token) {
      this.token = token;
      localStorage.setItem(TOKEN_KEY, token);
    },

    setUser(user) {
      this.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    // ─── BLOG / POSTS ──────────────────────────────────────────────────────

    async fetchFeed(page = 0, append = false, authorId = null) {
      this.loading = true;
      this.currentFeedAuthor = authorId; // Save filter for 'Load More'
      try {
        const params = { page, limit: this.feedPageSize };
        if (authorId) {
          params.author = authorId; // Send to backend if filtering by user
        }

        const { data } = await api.get('/posts', { params });
        this.posts         = append ? [...this.posts, ...data.data] : data.data;
        this.feedPage       = data.page;
        this.feedPageSize   = data.pageSize;
        this.feedTotal      = data.total;
      } catch (error) {
        notyf.error('Could not load the feed');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPostById(id) {
      this.loading = true;
      try {
        const { data } = await api.get(`/posts/${id}`);
        this.currentPost = data.data;
        await this.fetchComments(id);
        // (fetchComments below writes into commentsByPostId[id])
      } catch (error) {
        notyf.error('Could not load this post');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createPost(payload) {
      try {
        const { data } = await api.post('/posts', payload);
        notyf.success(data.message || 'Post created');
        return data.result;
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not create post');
        throw error;
      }
    },

    async deletePost(id) {
      try {
        await api.delete(`/posts/${id}`);
        this.posts = this.posts.filter((p) => p._id !== id);
        notyf.success('Post deleted');
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not delete post');
        throw error;
      }
    },

    async editPost(postId, payload) {
      try {
        const { data } = await api.patch(`/posts/${postId}`, payload);
        notyf.success('Post updated successfully');

        // Patch the local state so the UI updates instantly without a refetch
        const updatedPost = data.result;
        const idx = this.posts.findIndex((p) => p._id === postId);
        if (idx !== -1) {
          // Merge to preserve nested populated fields (like author) that the 
          // PATCH route might not return in full.
          this.posts[idx] = { ...this.posts[idx], ...updatedPost };
        }

        // Keep the single-post view in sync if it's currently open
        if (this.currentPost && this.currentPost._id === postId) {
          this.currentPost = { ...this.currentPost, ...updatedPost };
        }
        
        return true;
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not update post');
        return false;
      }
    },

    // ─── COMMENTS ──────────────────────────────────────────────────────────

    async fetchAllComments(page = 0) {
      try {
        const { data } = await api.get('/comments', {
          params: { page, limit: 20 }
        });
        return data; // Return this directly to the Admin component
      } catch (error) {
        notyf.error('Could not load global comments');
        throw error;
      }
    },

    async fetchComments(postId) {
      this.commentsLoadingByPostId[postId] = true;
      try {
        const { data } = await api.get(`/posts/${postId}/comments`);
        this.commentsByPostId[postId] = data.data;
      } catch (error) {
        notyf.error('Could not load comments');
        throw error;
      } finally {
        this.commentsLoadingByPostId[postId] = false;
      }
    },

    async createComment(postId, body) {
      try {
        const { data } = await api.post(`/posts/${postId}/comments`, { body });
        notyf.success('Comment added');
        await this.fetchComments(postId);
        return data.result;
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not add comment');
        throw error;
      }
    },

    // Needs both IDs in the URL even though the backend derives the parent
    // post from the comment itself — see backend quirk noted earlier.
    async deleteComment(postId, commentId) {
      try {
        await api.delete(`/posts/${postId}/comments/${commentId}`);
        const existing = this.commentsByPostId[postId] || [];
        this.commentsByPostId[postId] = existing.filter((c) => c._id !== commentId);
        notyf.success('Comment deleted');
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not delete comment');
        throw error;
      }
    },

    async editComment(postId, commentId, payload) {
      try {
        const { data } = await api.patch(`/posts/${postId}/comments/${commentId}`, payload);
        notyf.success('Comment updated successfully');

        // Patch the local state so the UI updates instantly
        const updatedComment = data.result;
        const thread = this.commentsByPostId[postId];
        
        if (thread) {
          const idx = thread.findIndex((c) => c._id === commentId);
          if (idx !== -1) {
            thread[idx] = { ...thread[idx], ...updatedComment };
          }
        }
        
        return true;
      } catch (error) {
        notyf.error(error.response?.data?.message || 'Could not update comment');
        return false;
      }
    },

    // ─── DIG (Wayback search & discover) ────────────────────────────────

    async fetchDigCountries() {
      try {
        const { data } = await api.get('/dig/countries');
        this.digCountries = data.data;
      } catch (error) {
        // Non-fatal — country dropdown just won't populate
        console.error('Could not load countries:', error.message);
      }
    },

    async fetchDigUsage() {
      try {
        const { data } = await api.get('/dig/usage');
        this.digUsage = data.data;
      } catch (error) {
        // Non-fatal — usage badge just won't show
        console.error('Could not load dig usage:', error.message);
      }
    },

    async searchDig(filters) {
      this.digSearching = true;
      this.lastDigFilters = filters;
      try {
        const { data } = await api.get('/dig', { params: filters });
        this.digResults = data.data;
        this.digUsage    = data.usage;
        return data;
      } catch (error) {
        const payload = error.response?.data;
        if (payload?.usage) this.digUsage = payload.usage;
        notyf.error(payload?.message || 'Search failed');
        throw error;
      } finally {
        this.digSearching = false;
      }
    },

    async goToDigPage(page) {
      if (!this.lastDigFilters) return;
      await this.searchDig({ ...this.lastDigFilters, page });
    },

    async discoverDig(year, country) {
      this.discovering = true;
      try {
        const { data } = await api.get('/dig/discover', { params: { year, country } });
        this.discoverResult = data.data;
        this.digUsage         = data.usage;
        return data;
      } catch (error) {
        const payload = error.response?.data;
        if (payload?.usage) this.digUsage = payload.usage;
        // 404 ("no captures found") is an expected outcome, not a real error —
        // surface it as the result itself rather than a toast.
        if (error.response?.status === 404) {
          this.discoverResult = null;
          return { success: false, message: payload?.message };
        }
        notyf.error(payload?.message || 'Discover failed');
        throw error;
      } finally {
        this.discovering = false;
      }
    },

    async saveCapture(waybackUrl, thumbnailUrl, name) {
      try {
        await api.post('/saved', {
          source_type:   'wayback_capture',
          wayback_url:   waybackUrl,
          thumbnail_url: thumbnailUrl,
          name:          name || null,
        });
        notyf.success('Saved to your dashboard');
        return true;
      } catch (error) {
        // 409 = already saved — treat as a soft success so the UI can still
        // flip the button to "Saved" instead of showing an error toast.
        if (error.response?.status === 409) {
          notyf.success('Already saved');
          return true;
        }
        notyf.error(error.response?.data?.message || 'Could not save');
        return false;
      }
    },

    // ─── ARTIFACT SUBMISSION ─────────────────────────────────────────────

        async submitArtifact(payload) {
          try {
            const { data } = await api.post('/artifacts', payload);
            
            // Handle deduplication soft-success
            if (data.already_submitted) {
              notyf.success('This artifact has already been submitted, but your flag count was added!');
            } else {
              notyf.success('Artifact successfully submitted for curation!');
            }
            
            return true;
          } catch (error) {
            if (error.response?.status === 429) {
              notyf.error('Daily submission limit exceeded. Please try again tomorrow.');
            } else {
              notyf.error(error.response?.data?.message || 'Could not submit artifact');
            }
            return false;
          }
        },

    // ─── ADMIN CURATION ACTIONS ──────────────────────────────────────────

        async fetchPendingQueue() {
          this.loadingQueue = true;
          try {
            const { data } = await adminApi.getQueue();
            this.pendingQueue = data.data?.artifacts || [];
          } catch (error) {
            notyf.error('Failed to load curation queue');
          } finally {
            this.loadingQueue = false;
          }
        },

        async approveArtifact(id, formData) {
          try {
            await adminApi.approve(id, formData);
            notyf.success('Exhibit created successfully!');
            // Remove from local queue so admin doesn't have to refresh
            this.pendingQueue = this.pendingQueue.filter(a => a._id !== id);
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Approval failed');
            return false;
          }
        },

        async rejectArtifact(id, reviewerNote) {
          try {
            await adminApi.reject(id, reviewerNote);
            notyf.success('Artifact rejected.');
            // Remove from local queue
            this.pendingQueue = this.pendingQueue.filter(a => a._id !== id);
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Rejection failed');
            return false;
          }
        },    

    // ─── ADMIN EXHIBIT MANAGEMENT ACTIONS ────────────────────────────────

        async fetchAllExhibits() {
          this.loadingExhibits = true;
          try {
            const { data } = await adminApi.listExhibits();
            this.allExhibits = data.data?.exhibits || [];
          } catch (error) {
            notyf.error('Failed to load exhibits');
          } finally {
            this.loadingExhibits = false;
          }
        },

        async editExhibitAdmin(id, formData) {
          try {
            const { data } = await adminApi.editExhibit(id, formData);
            notyf.success('Exhibit updated.');
            // Patch the local copy in place so the Manage Exhibits table
            // reflects the edit without a full refetch.
            const updated = data.data;
            const idx = this.allExhibits.findIndex(e => e._id === id);
            if (idx !== -1) this.allExhibits[idx] = updated;
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Update failed');
            return false;
          }
        },

        async hideExhibit(id) {
          try {
            const { data } = await adminApi.hideExhibit(id);
            notyf.success('Exhibit removed from the gallery.');
            // One-way action — patch local state to hidden:true rather than
            // removing the row, so the admin can still see it happened.
            const updated = data.data;
            const idx = this.allExhibits.findIndex(e => e._id === id);
            if (idx !== -1) this.allExhibits[idx] = updated;
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Failed to remove exhibit');
            return false;
          }
        },

    // ─── SUBSCRIPTION ACTIONS ─────────────────────────────────────────────

        async fetchPlans() {
          this.loadingPlans = true;
          try {
            const { data } = await subscriptionApi.getPlans();
            this.plans = data.data || [];
          } catch (error) {
            notyf.error('Failed to load membership plans');
          } finally {
            this.loadingPlans = false;
          }
        },

        // Simulated payment — no real charge happens server-side (see
        // subscriptionController.js). Paymentmethod selection on the frontend
        // is cosmetic for this demo; only `plan` is actually sent.
        async subscribeToPlan(plan) {
          this.subscribing = true;
          try {
            await subscriptionApi.subscribe(plan);
            notyf.success('Subscription activated — welcome to the paid tier!');
            this.user.tier = 'paid'; // keep in-memory user in sync immediately
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Subscription failed');
            return false;
          } finally {
            this.subscribing = false;
          }
        },

        async cancelSubscription() {
          try {
            await subscriptionApi.cancel();
            notyf.success('Subscription cancelled.');
            this.user.tier = 'free';
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Cancellation failed');
            return false;
          }
        },

    // ─── SAVED ITEMS ACTIONS (User Profile) ────────────────────────────────

        async fetchSavedItems() {
          this.loadingSavedItems = true;
          try {
            const { data } = await savedApi.list();
            this.savedItems = data.data || [];
          } catch (error) {
            notyf.error('Failed to load saved items');
          } finally {
            this.loadingSavedItems = false;
          }
        },

        async removeSavedItem(id) {
          try {
            await savedApi.remove(id);
            notyf.success('Removed from saved items');
            this.savedItems = this.savedItems.filter(item => item._id !== id);
            // Keep the cached counter in sync, mirroring the backend's own
            // floor-at-0 decrement (see savedItemController.js's remove).
            if (this.user) {
              this.user.saves_count = Math.max(0, (this.user.saves_count || 0) - 1);
            }
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Failed to remove item');
            return false;
          }
        },

        async updateSavedItemNote(id, personalNote) {
          try {
            const { data } = await savedApi.patchNote(id, personalNote);
            const updated = data.data;
            const idx = this.savedItems.findIndex(item => item._id === id);
            if (idx !== -1) this.savedItems[idx] = updated;
            notyf.success('Note updated');
            return true;
          } catch (error) {
            notyf.error(error.response?.data?.message || 'Failed to update note');
            return false;
          }
        },
  },
});