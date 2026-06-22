<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { useGlobalStore } from '@/stores/globalStore';
  import { useTheme } from '@/stores/useTheme'; // 1. Import your unified theme hook

  const router      = useRouter();
  const globalStore = useGlobalStore();
  
  // 2. Pull reactive state and setter from the global theme hook
  const { currentTheme, setTheme } = useTheme();

  // ─── Theme Switcher Execution ─────────────────────────────────────────────
  const isDropdownOpen = ref(false); // Add this to track dropdown visibility

  const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value;
  };

  const changeTheme = (name) => {
    setTheme(name); 
    isDropdownOpen.value = false; // Close the menu automatically when a layout is chosen!
  };

  // ─── Slim-on-scroll ──────────────────────────────────────────────────────
  const isSlim = ref(false);
  const handleScroll = () => {
    isSlim.value = window.scrollY > 60;
  };
  onMounted(() => window.addEventListener('scroll', handleScroll));
  onUnmounted(() => window.removeEventListener('scroll', handleScroll));
  
  const handleLogout = () => {
    globalStore.logout();
    router.push('/');
  };

  const goToAdmin = () => {
    router.push('/admin');
  };

  const goToProfile = () => {
    router.push('/profile');
  };
</script>

<template>
  <nav id="nav" class="navbar navbar-expand-lg sticky-top py-3" :class="{ slim: isSlim }">
    <div class="container">
      <router-link class="navbar-brand fw-bold fs-4 text-uppercase tracking-wider text-white" to="/">
        Museum <span class="fw-normal lowercase font-serif">of</span> Internet History
      </router-link>

      <button
        class="navbar-toggler border-white text-white"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
        aria-controls="navbarContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon" style="filter: invert(1);"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarContent">

        <ul v-if="!globalStore.isAdmin" class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
          <li class="nav-item"><router-link class="nav-link text-white" to="/exhibits">Gallery</router-link></li>
          <li class="nav-item"><router-link class="nav-link text-white" to="/dig">Dig Now!</router-link></li>
          <li class="nav-item"><router-link class="nav-link text-white" to="/subscription">Membership</router-link></li>
          <li class="nav-item"><router-link class="nav-link text-white" to="/forum">Forum</router-link></li>
          <li class="nav-item"><router-link class="nav-link text-white" to="/blog">Blog</router-link></li>
        </ul>
        <div v-else class="mx-auto"></div>

        <div class="d-flex gap-2 mt-2 mt-lg-0 align-items-center">

         <!-- ── Theme / Layout Switcher ── -->
          <div class="dropdown">
            <!-- 1. Added @click trigger and dynamic aria-expanded attribute -->
            <button class="btn-nav btn-outline-nav px-3 py-2 theme-toggle dropdown-toggle"
                    type="button"
                    @click="toggleDropdown"
                    :aria-expanded="isDropdownOpen">
              Layout
            </button>
            
            <!-- 2. Added dynamic structural :class binding to force show/hide states -->
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end theme-menu"
                :class="{ show: isDropdownOpen }">
              <li>
                <button class="dropdown-item theme-item" :class="{ active: currentTheme === 'default' }" @click="changeTheme('default')">
                  Default
                </button>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li><h6 class="dropdown-header">── Friendster ──</h6></li>
              <li><button class="dropdown-item theme-item" :class="{ active: currentTheme === 'emo' }" @click="changeTheme('emo')">Emo</button></li>
              <li><button class="dropdown-item theme-item" :class="{ active: currentTheme === 'gangster' }" @click="changeTheme('gangster')">Gangster</button></li>
              <li><button class="dropdown-item theme-item" :class="{ active: currentTheme === 'teen' }" @click="changeTheme('teen')">Teen</button></li>
            </ul>
          </div>

          <!-- ── Auth Buttons ── -->
          <template v-if="!globalStore.isAuthenticated">
            <router-link to="/login" class="btn-nav btn-outline-nav px-3 py-2">Log In</router-link>
            <router-link to="/register" class="btn-nav btn-solid-nav px-3 py-2">Register</router-link>
          </template>

          <template v-else-if="!globalStore.isAdmin">
            <span 
              class="text-white fw-bold me-2" 
              style="cursor: pointer;" 
              @click="goToProfile"
              title="Go to profile"
            >
              {{ globalStore.user?.username }}
            </span>
            <button class="btn-nav btn-outline-nav px-3 py-2" @click="handleLogout">Logout</button>
          </template>

          <template v-else>
            <button class="btn-nav btn-outline-nav px-3 py-2" @click="goToAdmin">Admin</button>
            <button class="btn-nav btn-solid-nav px-3 py-2" @click="handleLogout">Logout</button>
          </template>
        </div>

      </div>
    </div>
  </nav>
</template>