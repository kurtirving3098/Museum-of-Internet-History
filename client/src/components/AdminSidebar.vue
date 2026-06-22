<template>
  <div class="d-flex flex-column flex-shrink-0 p-3 bg-dark sidebar-container">
    <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none">
      <span class="fs-4 fw-bold header-text">Admin Panel</span>
    </a>
    <hr class="border-secondary">
    
    <ul class="nav nav-pills flex-column mb-auto gap-2">
      <li class="nav-item">
        <a href="#" 
           class="nav-link d-flex align-items-center" 
           :class="{ 'active-tab': currentTab === 'comments', 'text-light': currentTab !== 'comments' }"
           @click.prevent="$emit('updateTab', 'comments')">
          <i class="bi bi-chat-left-text me-3"></i> Comments
        </a>
      </li>
      <li>
        <a href="#" 
           class="nav-link d-flex align-items-center"
           :class="{ 'active-tab': currentTab === 'posts', 'text-light': currentTab !== 'posts' }"
           @click.prevent="$emit('updateTab', 'posts')">
          <i class="bi bi-file-earmark-text me-3"></i> Posts
        </a>
      </li>
      <li>
        <a href="#" 
           class="nav-link d-flex align-items-center justify-content-between"
           :class="{ 'active-tab': currentTab === 'queue', 'text-light': currentTab !== 'queue' }"
           @click.prevent="$emit('updateTab', 'queue')">
          <div>
            <i class="bi bi-inbox me-3"></i> Curation Queue
          </div>
          <span v-if="pendingCount > 0" class="badge bg-danger rounded-pill">{{ pendingCount }}</span>
        </a>
      </li>
      <li>
        <a href="#" 
           class="nav-link d-flex align-items-center"
           :class="{ 'active-tab': currentTab === 'exhibits', 'text-light': currentTab !== 'exhibits' }"
           @click.prevent="$emit('updateTab', 'exhibits')">
          <i class="bi bi-images me-3"></i> Manage Exhibits
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  currentTab: {
    type: String,
    required: true
  },
  pendingCount: {
    type: Number,
    default: 0
  }
});

defineEmits(['updateTab']);
</script>

<style scoped>
.sidebar-container {
  width: 280px; 
  min-height: 100vh; 
  border-right: 1px solid #5d4037;
  background-color: rgba(60, 38, 22, 0.9) !important;
}

.header-text {
  font-family: 'Georgia', serif; 
  color: #d9c49a;
}

.active-tab {
  background-color: #9e2a2b !important; /* The museum red */
  color: #f4ebd8 !important;
  font-weight: bold;
}

.nav-link:hover:not(.active-tab) {
  background-color: rgba(217, 196, 154, 0.1);
  color: #d9c49a !important;
}
</style>